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
  
    if (month.length < 1 || day.length < 1 || year.length !== 4) {
      setError('Please enter a valid date')
      return
    }
  
    const formattedDob = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lastName: lastName.trim(),
        dob: formattedDob,
      }),
    })
    
    const json = await res.json()
    
    if (!res.ok) {
      setError(json.error || 'Not found')
      return
    }
  
    localStorage.setItem('attendee', JSON.stringify(json.attendee))
    window.location.href = '/me'
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
