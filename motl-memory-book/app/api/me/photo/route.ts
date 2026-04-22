import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase-admin'

const BUCKET = process.env.SUPABASE_PROFILE_PHOTO_BUCKET || 'profile-photos'
const MAX_FILE_SIZE = 12 * 1024 * 1024

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase()
}

function guessExtension(fileName: string, mimeType: string) {
  const explicit = fileName.split('.').pop()?.toLowerCase()
  if (explicit && explicit !== fileName.toLowerCase()) return explicit

  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'image/gif':
      return 'gif'
    case 'image/heic':
    case 'image/heif':
      return 'heic'
    default:
      return 'jpg'
  }
}

function getBucketPathFromPublicUrl(url: string | null | undefined) {
  if (!url) return null
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const index = url.indexOf(marker)
  if (index === -1) return null
  return url.slice(index + marker.length).split('?')[0] || null
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

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Please upload an image file.' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Photo must be 12MB or smaller.' }, { status: 400 })
    }

    const { data: existingAttendee, error: attendeeError } = await supabaseAdmin
      .from('attendees')
      .select('*')
      .eq('attendee_id', attendeeId)
      .single()

    if (attendeeError || !existingAttendee) {
      return NextResponse.json({ error: attendeeError?.message || 'Attendee not found.' }, { status: 404 })
    }

    const baseName = sanitizeFileName(file.name || 'profile-photo')
    const extension = guessExtension(baseName, file.type)
    const filePath = `attendees/${attendeeId}/${Date.now()}-${baseName.replace(/\.[^.]+$/, '')}.${extension}`
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

    const oldStoragePath = getBucketPathFromPublicUrl(existingAttendee.profile_photo_url)
    if (oldStoragePath && oldStoragePath !== filePath) {
      await supabaseAdmin.storage.from(BUCKET).remove([oldStoragePath])
    }

    return NextResponse.json({ attendee })
  } catch {
    return NextResponse.json({ error: 'Something went wrong while uploading the photo.' }, { status: 500 })
  }
}
