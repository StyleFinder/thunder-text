import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

/**
 * GET /api/coach/notes?shop_id=xxx
 * Fetch all notes for a specific store
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'coach') {
      return NextResponse.json({ error: 'Unauthorized - Coach access only' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const shopId = searchParams.get('shop_id');

    if (!shopId) {
      return NextResponse.json({ error: 'shop_id is required' }, { status: 400 });
    }

    // Fetch notes with coach information
    const { data: notes, error } = await supabaseAdmin
      .from('coach_notes')
      .select(`
        id,
        shop_id,
        coach_id,
        content,
        created_at,
        updated_at,
        coach:coaches(
          name,
          email
        )
      `)
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching notes', error as Error, {
        component: 'CoachNotesRoute',
        operation: 'GET',
        shopId
      });
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
    }

    // Format notes for frontend
    const formattedNotes = (notes || []).map((note: any) => ({
      id: note.id,
      coachName: note.coach?.name || 'Unknown Coach',
      content: note.content,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
    }));

    return NextResponse.json({ notes: formattedNotes });
  } catch (error) {
    logger.error('Unexpected error fetching notes', error as Error, {
      component: 'CoachNotesRoute',
      operation: 'GET'
    });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * POST /api/coach/notes
 * Create a new note for a store
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'coach') {
      return NextResponse.json({ error: 'Unauthorized - Coach access only' }, { status: 401 });
    }

    const body = await req.json();
    const { shop_id, content } = body;

    if (!shop_id || !content) {
      return NextResponse.json({ error: 'shop_id and content are required' }, { status: 400 });
    }

    // Get coach ID from email
    const { data: coach, error: coachError } = await supabaseAdmin
      .from('coaches')
      .select('id, name')
      .eq('email', session.user.email)
      .single();

    if (coachError || !coach) {
      logger.error('Coach not found', coachError as Error, {
        component: 'CoachNotesRoute',
        operation: 'POST',
        email: session.user.email
      });
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 });
    }

    // Insert note
    const { data: note, error: insertError } = await supabaseAdmin
      .from('coach_notes')
      .insert({
        shop_id,
        coach_id: coach.id,
        content: content.trim(),
      })
      .select()
      .single();

    if (insertError) {
      logger.error('Error creating note', insertError as Error, {
        component: 'CoachNotesRoute',
        operation: 'POST',
        shopId: shop_id
      });
      return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
    }

    // Return formatted note
    const formattedNote = {
      id: note.id,
      coachName: coach.name,
      content: note.content,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
    };


    return NextResponse.json({ note: formattedNote }, { status: 201 });
  } catch (error) {
    logger.error('Unexpected error creating note', error as Error, {
      component: 'CoachNotesRoute',
      operation: 'POST'
    });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/coach/notes?id=xxx
 * Delete a note (only by the coach who created it)
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'coach') {
      return NextResponse.json({ error: 'Unauthorized - Coach access only' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const noteId = searchParams.get('id');

    if (!noteId) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Get coach ID
    const { data: coach, error: coachError } = await supabaseAdmin
      .from('coaches')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (coachError || !coach) {
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 });
    }

    // Delete note (RLS will ensure they can only delete their own)
    const { error: deleteError } = await supabaseAdmin
      .from('coach_notes')
      .delete()
      .eq('id', noteId)
      .eq('coach_id', coach.id);

    if (deleteError) {
      logger.error('Error deleting note', deleteError as Error, {
        component: 'CoachNotesRoute',
        operation: 'DELETE',
        noteId
      });
      return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
    }


    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Unexpected error deleting note', error as Error, {
      component: 'CoachNotesRoute',
      operation: 'DELETE'
    });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
