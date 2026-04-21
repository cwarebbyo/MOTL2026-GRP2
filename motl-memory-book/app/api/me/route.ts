import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const attendeeId = String(body.attendee_id || '').trim()

    if (!attendeeId) {
      return NextResponse.json({ error: 'Missing attendee ID.' }, { status: 400 })
    }

    const updatePayload = {
      email: String(body.email || '').trim() || null,
      phone: String(body.phone || '').trim() || null,
      show_contact: !!body.show_contact,
      why_did_you_come: String(body.why_did_you_come || '').trim() || null,
      post_trip_reflection: String(body.post_trip_reflection || '').trim() || null,
      profile_photo_url: String(body.profile_photo_url || '').trim() || null,
      last_updated: new Date().toISOString(),
    }

    const { data, error } = await supabaseAdmin
      .from('attendees')
      .update(updatePayload)
      .eq('attendee_id', attendeeId)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ attendee: data })
  } catch (error) {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
