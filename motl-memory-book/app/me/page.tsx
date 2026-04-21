'use client'


import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function MePage() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const stored = localStorage.getItem('attendee')
    if (stored) setUser(JSON.parse(stored))
  }, [])

  const update = async () => {
    await supabase
      .from('attendees')
      .update({
        email: user.email,
        phone: user.phone,
        why_trip: user.why_trip,
        reflection: user.reflection
      })
      .eq('attendee_id', user.attendee_id)

    alert('Saved')
  }

  if (!user) return <p>Loading...</p>

  return (
    <div>
      <h2>{user.first_name}</h2>

      <input value={user.email || ''} onChange={e => setUser({ ...user, email: e.target.value })} placeholder="Email" /><br/>

      <textarea value={user.why_trip || ''} onChange={e => setUser({ ...user, why_trip: e.target.value })} placeholder="Why did you come?" /><br/>

      <textarea value={user.reflection || ''} onChange={e => setUser({ ...user, reflection: e.target.value })} placeholder="Reflection" /><br/>

      <button onClick={update}>Save</button>
    </div>
  )
}
