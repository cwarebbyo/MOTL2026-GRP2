import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabase-admin'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const lastName = String(body.lastName || '').trim()
  const dob = String(body.dob || '').trim()

  const { data, error } = await supabaseAdmin
    .from('attendees')
    .select('*')
    .ilike('last_name', `%${lastName}%`)
    .eq('dob', dob)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ attendee: data })
}
