import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase-admin'

const BUCKET = process.env.SUPABASE_MEDIA_BUCKET || 'memory-book-media'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const mediaId = String(body.mediaId || '').trim()
    const attendeeId = String(body.attendeeId || '').trim()

    if (!mediaId || !attendeeId) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const { data: requester, error: requesterError } = await supabaseAdmin
      .from('attendees')
      .select('attendee_id, role')
      .eq('attendee_id', attendeeId)
      .maybeSingle()

    if (requesterError) {
      return NextResponse.json({ error: requesterError.message }, { status: 500 })
    }

    if (!requester) {
      return NextResponse.json({ error: 'Invalid user.' }, { status: 403 })
    }

    const { data: media, error: mediaError } = await supabaseAdmin
      .from('media')
      .select('id, attendee_id, file_name')
      .eq('id', mediaId)
      .maybeSingle()

    if (mediaError) {
      return NextResponse.json({ error: mediaError.message }, { status: 500 })
    }

    if (!media) {
      return NextResponse.json({ error: 'Media not found.' }, { status: 404 })
    }

    const normalizedRole = (requester.role || '').trim().toLowerCase()
    const hasElevatedRole = normalizedRole !== '' && normalizedRole !== 'participant'
    const isOwner = requester.attendee_id === media.attendee_id

    if (!isOwner && !hasElevatedRole) {
      return NextResponse.json({ error: 'You do not have permission to delete this media.' }, { status: 403 })
    }

    const storagePath = media.file_name && !/^https?:\/\//i.test(media.file_name) ? media.file_name : null

    if (storagePath) {
      const { error: storageError } = await supabaseAdmin.storage.from(BUCKET).remove([storagePath])

      if (storageError) {
        return NextResponse.json({ error: storageError.message }, { status: 500 })
      }
    }

    const { error: deleteError } = await supabaseAdmin.from('media').delete().eq('id', media.id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Something went wrong while deleting media.' }, { status: 500 })
  }
}
