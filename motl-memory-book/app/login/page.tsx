'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function LoginPage() {
  const [lastName, setLastName] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [year, setYear] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setError('')

    if (!lastName || !month || !day || !year) {
      setError('Please fill out all fields')
      return
    }

    const formattedDob = `${month.padStart(2, '0')}/${day.padStart(2, '0')}/${year}`

    const { data, error: queryError } = await supabase
      .from('attendees')
      .select('*')
      .eq('last_name', lastName.trim())
      .eq('dob', formattedDob)
      .single()

    if (queryError || !data) {
      setError('Not found')
      return
    }

    // store session (simple localStorage approach for now)
    localStorage.setItem('attendee', JSON.stringify(data))

    window.location.href = '/gallery'
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Login</h2>

      <input
        placeholder="Last Name"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
      />

      <div style={{ marginTop: 10 }}>
        <input
          placeholder="MM"
          maxLength={2}
          value={month}
          onChange={(e) => setMonth(e.target.value.replace(/\D/g, ''))}
          style={{ width: 50, marginRight: 5 }}
        />
        <input
          placeholder="DD"
          maxLength={2}
          value={day}
          onChange={(e) => setDay(e.target.value.replace(/\D/g, ''))}
          style={{ width: 50, marginRight: 5 }}
        />
        <input
          placeholder="YYYY"
          maxLength={4}
          value={year}
          onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))}
          style={{ width: 80 }}
        />
      </div>

      <button onClick={handleLogin} style={{ marginTop: 10 }}>
        Login
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  )
}
