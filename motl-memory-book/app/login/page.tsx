'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [lastName, setLastName] = useState('')
  const [dob, setDob] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async () => {
    const { data } = await supabase
      .from('attendees')
      .select('*')
      .eq('last_name', lastName)
      .eq('dob', dob)
      .single()

    if (!data) {
      setError('Not found')
      return
    }

    localStorage.setItem('attendee', JSON.stringify(data))
    window.location.href = '/me'
  }

  return (
    <div>
      <h2>Login</h2>
      <input placeholder="Last Name" onChange={e => setLastName(e.target.value)} /><br/>
      <input placeholder="DOB (YYYY-MM-DD)" onChange={e => setDob(e.target.value)} /><br/>
      <button onClick={handleLogin}>Login</button>
      {error && <p>{error}</p>}
    </div>
  )
}
