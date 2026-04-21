'use client'

import { useState } from 'react'

export default function LoginPage() {
  const [lastName, setLastName] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [year, setYear] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setError('')

    if (!lastName || !month || !day || !year) {
      setError('Please fill out all fields.')
      return
    }

    if (year.length !== 4) {
      setError('Please enter a 4-digit year.')
      return
    }

    const mm = month.replace(/\D/g, '').padStart(2, '0')
    const dd = day.replace(/\D/g, '').padStart(2, '0')
    const yyyy = year.replace(/\D/g, '')

    if (!mm || !dd || !yyyy) {
      setError('Please enter a valid date of birth.')
      return
    }

    const formattedDob = `${yyyy}-${mm}-${dd}`

    setLoading(true)
    try {
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
        setLoading(false)
        return
      }

      localStorage.setItem('attendee', JSON.stringify(json.attendee))
      window.location.href = '/me'
    } catch (e) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0b0b0c',
      color: '#fff',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: '#121214',
        padding: '30px',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
      }}>
        <h1 style={{ marginBottom: '20px', fontSize: '24px' }}>
          Welcome Back
        </h1>

        <input
          placeholder="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          style={{ width: '100%', marginBottom: '10px', padding: '10px' }}
        />

        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <input
            placeholder="MM"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{ flex: 1, padding: '10px' }}
          />
          <input
            placeholder="DD"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            style={{ flex: 1, padding: '10px' }}
          />
          <input
            placeholder="YYYY"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            style={{ flex: 2, padding: '10px' }}
          />
        </div>

        {error && (
          <div style={{ color: '#ff6b6b', marginBottom: '10px' }}>
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            background: '#6c5ce7',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </div>
    </div>
  )
}
