import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase-admin'

const BUCKET = process.env.SUPABASE_MEDIA_BUCKET || 'memory-book-media'

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
    case 'image/heic':
    case 'image/heif':
      return 'heic'
    case 'video/mp4':
      return 'mp4'
    case 'video/quicktime':
      return 'mov'
    case 'video/webm':
      return 'webm'
    default:
      return 'bin'
  }
}

async function reverseGeocode(lat: number, lon: number) {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse')
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('lat', String(lat))
    url.searchParams.set('lon', String(lon))
    url.searchParams.set('zoom', '18')
    url.searchParams.set('addressdetails', '1')
    url.searchParams.set('namedetails', '1')
    url.searchParams.set('accept-language', 'en')

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'motl-memory-book/1.0',
      },
      cache: 'no-store',
    })

    if (!res.ok) return { location_text: null, location_name: null }

    const data = await res.json()
    const address = data?.address || {}

    const city =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.hamlet ||
      address.county ||
      null

    const country = address.country || null

    const poi =
      data?.namedetails?.name ||
      data?.name ||
      address.attraction ||
      address.tourism ||
      address.amenity ||
      address.historic ||
      address.building ||
      address.leisure ||
      address.natural ||
      address.shop ||
      null

    const location_text = [city, country].filter(Boolean).join(', ') || country || null
    const location_name = poi || location_text

    return { location_text, location_name }
  } catch {
    return { location_text: null, location_name: null }
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const attendeeId = String(formData.get('attendee_id') || '').trim()
    const takenAt = String(formData.get('taken_at') || '').trim()
    const gpsLatRaw = String(formData.get('gps_lat') || '').trim()
    const gpsLonRaw = String(formData.get('gps_lon') || '').trim()

    if (!file) {
      return NextResponse.json({ error: 'Missing file.' }, { status: 400 })
    }

    if (!attendeeId) {
      return NextResponse.json({ error: 'Missing attendee ID.' }, { status: 400 })
    }

    if (file.type.startsWith('video/') && file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'Videos must be 50MB or smaller.' }, { status: 400 })
    }

    const extension = guessExtension(file.name || 'upload', file.type || 'application/octet-stream')
    const safePrefix = file.type.startsWith('video/') ? 'videos' : 'images'
    const filePath = `${safePrefix}/${attendeeId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`

    const arrayBuffer = await file.arrayBuffer()
    const upload = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filePath, arrayBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (upload.error) {
      return NextResponse.json({ error: upload.error.message }, { status: 500 })
    }

    const { data: publicData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(filePath)

    const gpsLat = gpsLatRaw ? Number(gpsLatRaw) : null
    const gpsLon = gpsLonRaw ? Number(gpsLonRaw) : null
    const location =
      typeof gpsLat === 'number' && !Number.isNaN(gpsLat) && typeof gpsLon === 'number' && !Number.isNaN(gpsLon)
        ? await reverseGeocode(gpsLat, gpsLon)
        : { location_text: null, location_name: null }

    const insertPayload = {
      media_id: `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      attendee_id: attendeeId,
      file_name: file.name,
      file_url: publicData.publicUrl,
      file_type: file.type || null,
      caption: null,
      taken_at: takenAt || new Date().toISOString(),
      location_text: location.location_text,
      location_name: location.location_name,
      is_profile_photo: false,
    }

    const { data, error } = await supabaseAdmin
      .from('media')
      .insert(insertPayload)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ media: data })
  } catch (error) {
    return NextResponse.json({ error: 'Something went wrong while uploading media.' }, { status: 500 })
  }
}
