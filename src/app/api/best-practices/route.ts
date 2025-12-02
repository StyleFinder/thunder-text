import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAuth } from '@/lib/auth/ace-compat';
import { logger } from '@/lib/logger'

// GET - List all best practices
export const GET = requireAuth('user')(async (request: NextRequest) => {
  try {
    const { data: practices, error } = await supabaseAdmin
      .from('aie_best_practices')
      .select('*')
      .order('priority_score', { ascending: false })
      .order('uploaded_at', { ascending: false });

    if (error) {
      logger.error('Error fetching best practices:', error as Error, { component: 'best-practices' });
      return NextResponse.json(
        {
          error: 'Failed to fetch best practices',
          details: error.message,
          code: error.code,
          hint: error.hint
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      practices: practices || [],
      total: practices?.length || 0,
    });
  } catch (error) {
    logger.error('Error in best practices API:', error as Error, { component: 'best-practices' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// POST - Upload new best practice resource
export const POST = requireAuth('user')(async (request: NextRequest) => {
  try {
    const formData = await request.formData();

    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const platform = formData.get('platform') as string;
    const category = formData.get('category') as string;
    const priorityScore = parseInt(formData.get('priority_score') as string);
    const extractedText = formData.get('extracted_text') as string;
    const file = formData.get('file') as File;

    // Validation
    if (!title || !platform || !category || !file) {
      return NextResponse.json(
        { error: 'Missing required fields: title, platform, category, file' },
        { status: 400 }
      );
    }

    // Validate file size (50MB max)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      );
    }

    // Determine file type
    const fileType = getFileType(file.type);
    if (!fileType) {
      return NextResponse.json(
        { error: 'Unsupported file type. Allowed: PDF, Audio (MP3, WAV, M4A), Images (JPEG, PNG, WebP)' },
        { status: 400 }
      );
    }

    // Upload file to Supabase Storage
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = `${platform}/${category}/${fileName}`;

    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('best-practices')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      logger.error('Error uploading file:', uploadError as Error, { component: 'best-practices' });
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Get public URL (for signed URLs later)
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('best-practices')
      .getPublicUrl(filePath);

    // Extract text from PDF if applicable
    let finalExtractedText = extractedText || '';
    if (fileType === 'pdf' && !extractedText) {
      // PDF text extraction will be added when pdf-parse is installed
      // For now, leave it empty - admin can paste transcript manually
      finalExtractedText = '';
    }

    // Insert record into database
    const { data: practice, error: dbError } = await supabaseAdmin
      .from('aie_best_practices')
      .insert({
        title,
        description: description || null,
        platform,
        category,
        file_type: fileType,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        extracted_text: finalExtractedText || null,
        priority_score: priorityScore || 5,
        is_active: true,
      })
      .select()
      .single();

    if (dbError) {
      logger.error('Error inserting best practice:', dbError as Error, { component: 'best-practices' });
      // Clean up uploaded file
      await supabaseAdmin.storage
        .from('best-practices')
        .remove([filePath]);

      return NextResponse.json(
        { error: 'Failed to create best practice record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      practice,
      message: 'Resource uploaded successfully',
    }, { status: 201 });
  } catch (error) {
    logger.error('Error in best practices POST:', error as Error, { component: 'best-practices' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

function getFileType(mimeType: string): string | null {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'text/plain') return 'text';
  if (mimeType === 'text/markdown') return 'markdown';
  if (mimeType === 'application/json') return 'json';
  return null;
}
