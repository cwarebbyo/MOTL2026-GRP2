import { supabaseAdmin } from '../../lib/supabase-admin'
import GalleryClient from './GalleryClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function GalleryPage() {
  const [{ data: media, error: mediaError }, { data: attendees, error: attendeesError }] =
    await Promise.all([
      supabaseAdmin.from('media').select('*').order('taken_at', { ascending: false }),
      supabaseAdmin
        .from('attendees')
        .select(
          'attendee_id, first_name, last_name, profile_photo_url, city, state, country, show_contact, email, phone, why_did_you_come, post_trip_reflection, role'
        ),
    ])

  if (mediaError) {
    return <div style={{ padding: 20 }}>Error loading media: {mediaError.message}</div>
  }

  if (attendeesError) {
    return <div style={{ padding: 20 }}>Error loading attendees: {attendeesError.message}</div>
  }

  return <GalleryClient media={media || []} attendees={attendees || []} />
}
