import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase-admin'

const BUCKET = process.env.SUPABASE_PROFILE_PHOTO_BUCKET || 'profile-photos'
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase()
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const attendeeId = String(formData.get('attendee_id') || '').trim()
    const file = formData.get('file')

    if (!attendeeId) {
      return NextResponse.json({ error: 'Missing attendee ID.' }, { status: 400 })
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing photo file.' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Please upload a JPG, PNG, WEBP, or GIF image.' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Photo must be 10MB or smaller.' }, { status: 400 })
    }

    const fileExt = sanitizeFileName(file.name || 'profile-photo')
    const filePath = `attendees/${attendeeId}/${Date.now()}-${fileExt}`
    const arrayBuffer = await file.arrayBuffer()

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json(
        {
          error:
            uploadError.message ||
            `Could not upload photo. Check that the "${BUCKET}" storage bucket exists and is writable.`,
        },
        { status: 500 }
      )
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(filePath)
    const profilePhotoUrl = publicUrlData.publicUrl

    const { data: attendee, error: updateError } = await supabaseAdmin
      .from('attendees')
      .update({
        profile_photo_url: profilePhotoUrl,
        last_updated: new Date().toISOString(),
      })
      .eq('attendee_id', attendeeId)
      .select('*')
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ attendee })
  } catch {
    return NextResponse.json({ error: 'Something went wrong while uploading the photo.' }, { status: 500 })
  }
}
