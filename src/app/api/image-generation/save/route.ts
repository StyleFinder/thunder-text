import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { ImageProvider, AspectRatio } from '@/types/image-generation';

/**
 * POST /api/image-generation/save
 *
 * Save a generated image to the shop's image library in Supabase Storage.
 * Images are stored with a 30-day TTL.
 *
 * SECURITY: Requires session authentication. Shop ID is derived from session.
 *
 * Request body:
 * - imageUrl: string (required) - Base64 data URL of the image
 * - conversationId: string (required) - Conversation ID for tracking
 * - prompt: string (required) - Original prompt used
 * - provider: 'openai' (required) - Provider used
 * - model: string (required) - Model used
 * - aspectRatio: string (optional) - Image aspect ratio
 * - productId: string (optional) - Associated product ID
 */
export async function POST(req: NextRequest) {
  try {
    // SECURITY: Require session authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get shop domain from session
    const shopDomain = (session.user as { shopDomain?: string }).shopDomain;
    if (!shopDomain) {
      return NextResponse.json({ error: 'No shop associated with account' }, { status: 403 });
    }

    // Verify shop exists and get shop data
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id, is_active')
      .eq('shop_domain', shopDomain)
      .single();

    if (shopError || !shopData) {
      logger.error('Shop not found for image save:', shopError as Error, {
        component: 'image-generation-save',
        shopDomain,
      });
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    if (!shopData.is_active) {
      return NextResponse.json({ error: 'Shop is not active' }, { status: 403 });
    }

    const shopId = shopData.id;

    // Parse request body
    const body = await req.json();
    const {
      imageUrl,
      conversationId,
      prompt,
      provider,
      model,
      aspectRatio = '1:1',
      productId,
      costCents = 0,
    } = body;

    // Validate required fields
    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    if (!conversationId || typeof conversationId !== 'string') {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (provider !== 'openai') {
      return NextResponse.json({ error: 'Valid provider (openai) is required' }, { status: 400 });
    }

    if (!model || typeof model !== 'string') {
      return NextResponse.json({ error: 'Model is required' }, { status: 400 });
    }

    logger.info('Saving generated image to library', {
      component: 'image-generation-save',
      shopId,
      conversationId,
      provider,
      model,
    });

    // Extract base64 data from data URL
    const base64Match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!base64Match) {
      return NextResponse.json({ error: 'Invalid image format. Expected base64 data URL.' }, { status: 400 });
    }

    const mimeType = base64Match[1];
    const base64Data = base64Match[2];
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Determine file extension
    const extension = mimeType.includes('png') ? 'png' : mimeType.includes('jpeg') ? 'jpg' : 'png';

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const filename = `${shopId}/${timestamp}_${randomId}.${extension}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('generated-images')
      .upload(filename, imageBuffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      logger.error('Error uploading image to storage:', uploadError as Error, {
        component: 'image-generation-save',
        shopId,
        filename,
      });
      return NextResponse.json({ error: 'Failed to save image' }, { status: 500 });
    }

    // Get public URL for the uploaded image
    const { data: urlData } = supabaseAdmin.storage
      .from('generated-images')
      .getPublicUrl(filename);

    const permanentUrl = urlData.publicUrl;

    // Calculate expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Save record to database
    const { data: imageRecord, error: dbError } = await supabaseAdmin
      .from('generated_images')
      .insert({
        shop_id: shopId,
        conversation_id: conversationId,
        image_url: permanentUrl,
        storage_path: filename,
        prompt,
        provider: provider as ImageProvider,
        model,
        cost_cents: costCents,
        aspect_ratio: aspectRatio as AspectRatio,
        is_final: true,
        product_id: productId || null,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      logger.error('Error saving image record:', dbError as Error, {
        component: 'image-generation-save',
        shopId,
        filename,
        errorCode: dbError.code,
        errorMessage: dbError.message,
        errorDetails: dbError.details,
        errorHint: dbError.hint,
      });
      // Try to clean up uploaded file
      await supabaseAdmin.storage.from('generated-images').remove([filename]);
      return NextResponse.json({ error: 'Failed to save image record' }, { status: 500 });
    }

    // Calculate days until expiration
    const now = new Date();
    const daysUntilExpiration = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    logger.info('Image saved successfully', {
      component: 'image-generation-save',
      shopId,
      imageId: imageRecord.id,
      expiresAt: expiresAt.toISOString(),
    });

    return NextResponse.json({
      id: imageRecord.id,
      imageUrl: permanentUrl,
      conversationId,
      prompt,
      provider,
      model,
      aspectRatio,
      productId: productId || null,
      createdAt: imageRecord.created_at,
      expiresAt: expiresAt.toISOString(),
      daysUntilExpiration,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Image save error:', error as Error, {
      component: 'image-generation-save',
    });

    return NextResponse.json({ error: errorMessage || 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * GET /api/image-generation/save
 *
 * Get the shop's image library
 */
export async function GET(req: NextRequest) {
  try {
    // SECURITY: Require session authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get shop domain from session
    const shopDomain = (session.user as { shopDomain?: string }).shopDomain;
    if (!shopDomain) {
      return NextResponse.json({ error: 'No shop associated with account' }, { status: 403 });
    }

    // Verify shop exists and get shop ID
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id')
      .eq('shop_domain', shopDomain)
      .single();

    if (shopError || !shopData) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const shopId = shopData.id;

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Get images from database
    const { data: images, error: queryError, count } = await supabaseAdmin
      .from('generated_images')
      .select('*', { count: 'exact' })
      .eq('shop_id', shopId)
      .eq('is_final', true)
      .gt('expires_at', new Date().toISOString()) // Only non-expired images
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (queryError) {
      logger.error('Error fetching image library:', queryError as Error, {
        component: 'image-generation-save',
        shopId,
      });
      return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
    }

    // Calculate days until expiration for each image and map to camelCase
    const now = new Date();
    const imagesWithExpiration = (images || []).map((img) => {
      const expiresAt = new Date(img.expires_at);
      const daysUntilExpiration = Math.ceil(
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        id: img.id,
        imageUrl: img.image_url,
        prompt: img.prompt,
        provider: img.provider,
        model: img.model,
        costCents: img.cost_cents,
        aspectRatio: img.aspect_ratio,
        createdAt: img.created_at,
        expiresAt: img.expires_at,
        productId: img.product_id,
        daysUntilExpiration: Math.max(0, daysUntilExpiration),
      };
    });

    return NextResponse.json({
      images: imagesWithExpiration,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Image library fetch error:', error as Error, {
      component: 'image-generation-save',
    });

    return NextResponse.json({ error: errorMessage || 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE /api/image-generation/save
 *
 * Delete an image from the library
 */
export async function DELETE(req: NextRequest) {
  try {
    // SECURITY: Require session authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get shop domain from session
    const shopDomain = (session.user as { shopDomain?: string }).shopDomain;
    if (!shopDomain) {
      return NextResponse.json({ error: 'No shop associated with account' }, { status: 403 });
    }

    // Verify shop exists and get shop ID
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id')
      .eq('shop_domain', shopDomain)
      .single();

    if (shopError || !shopData) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const shopId = shopData.id;

    // Get image ID from query params
    const { searchParams } = new URL(req.url);
    const imageId = searchParams.get('id');

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    // Get image record to verify ownership and get storage path
    const { data: imageRecord, error: fetchError } = await supabaseAdmin
      .from('generated_images')
      .select('id, storage_path')
      .eq('id', imageId)
      .eq('shop_id', shopId) // SECURITY: Verify ownership
      .single();

    if (fetchError || !imageRecord) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Delete from storage
    if (imageRecord.storage_path) {
      const { error: storageError } = await supabaseAdmin.storage
        .from('generated-images')
        .remove([imageRecord.storage_path]);

      if (storageError) {
        logger.warn('Error deleting image from storage:', {
          component: 'image-generation-save',
          path: imageRecord.storage_path,
          error: storageError.message,
        });
        // Continue with database deletion even if storage fails
      }
    }

    // Delete from database
    const { error: deleteError } = await supabaseAdmin
      .from('generated_images')
      .delete()
      .eq('id', imageId)
      .eq('shop_id', shopId);

    if (deleteError) {
      logger.error('Error deleting image record:', deleteError as Error, {
        component: 'image-generation-save',
        imageId,
      });
      return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
    }

    logger.info('Image deleted successfully', {
      component: 'image-generation-save',
      shopId,
      imageId,
    });

    return NextResponse.json({ success: true, id: imageId });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Image delete error:', error as Error, {
      component: 'image-generation-save',
    });

    return NextResponse.json({ error: errorMessage || 'Internal Server Error' }, { status: 500 });
  }
}
