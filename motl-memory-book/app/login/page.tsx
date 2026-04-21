'use client'

import { useState } from 'react'

export default function LoginPage() {
  const [lastName, setLastName] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [year, setYear] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

    setLoading(True)
    try:
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
    <div className="login-shell">
      <div className="login-book">
        <div className="login-left">
          <div className="kicker">MOTL 2026 · Group 2</div>
          <h1>Enter the Memory Book</h1>
          <p>
            Use your last name and date of birth to access your page, upload your photos,
            and add your reflections to the shared archive of this journey.
          </p>

          <div className="notes">
            <div className="note-card">
              <strong>Private enough for Phase I</strong>
              <span>Simple access for the group, without making people fight a full account system.</span>
            </div>
            <div className="note-card">
              <strong>Easy for everyone</strong>
              <span>Large fields, clear labels, and no weird formatting guesswork.</span>
            </div>
          </div>
        </div>

        <div className="login-right">
          <div className="form-card">
            <h2>Find your profile</h2>
            <p className="form-subtitle">Please enter your information exactly as it was provided for the trip roster.</p>

            <div className="field">
              <label>Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last Name"
                autoComplete="family-name"
              />
            </div>

            <div className="field">
              <label>Date of Birth</label>
              <div className="dob-row">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  value={month}
                  onChange={(e) => setMonth(e.target.value.replace(/\D/g, ''))}
                  placeholder="MM"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  value={day}
                  onChange={(e) => setDay(e.target.value.replace(/\D/g, ''))}
                  placeholder="DD"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={year}
                  onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))}
                  placeholder="YYYY"
                />
              </div>
            </div>

            {error ? <p className="error-message">{error}</p> : null}

            <button className="login-button" onClick={handleLogin} disabled={loading}>
              {loading ? 'Checking…' : 'Continue'}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .login-shell {
          min-height: 100vh;
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(circle at top, rgba(255, 248, 235, 0.95), rgba(244, 237, 225, 0.98) 35%, #efe6d7 100%);
          color: #231a12;
        }

        .login-book {
          width: 100%;
          max-width: 1180px;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 24px;
          align-items: stretch;
        }

        .login-left,
        .login-right {
          border-radius: 32px;
          background: rgba(255, 255, 255, 0.82);
          backdrop-filter: blur(12px);
          box-shadow: 0 24px 55px rgba(63, 46, 22, 0.12);
          border: 1px solid rgba(112, 89, 48, 0.12);
        }

        .login-left {
          padding: 40px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .kicker {
          display: inline-block;
          width: fit-content;
          font-size: 12px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-weight: 700;
          color: #8a6a34;
          background: #f9efdb;
          padding: 8px 12px;
          border-radius: 999px;
        }

        .login-left h1 {
          margin: 18px 0 12px 0;
          font-size: clamp(38px, 5vw, 68px);
          line-height: 0.95;
          letter-spacing: -0.05em;
        }

        .login-left p {
          margin: 0;
          max-width: 640px;
          font-size: 18px;
          line-height: 1.8;
          color: #5f5144;
        }

        .notes {
          margin-top: 28px;
          display: grid;
          gap: 14px;
        }

        .note-card {
          background: #fbf5ea;
          border: 1px solid #eadcc1;
          border-radius: 20px;
          padding: 18px 20px;
        }

        .note-card strong {
          display: block;
          font-size: 16px;
        }

        .note-card span {
          display: block;
          margin-top: 6px;
          color: #695a4b;
          line-height: 1.6;
        }

        .login-right {
          padding: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .form-card {
          width: 100%;
          border-radius: 28px;
          background: linear-gradient(180deg, #fffdfa 0%, #f9f2e6 100%);
          border: 1px solid #eadcc1;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.85);
          padding: 32px;
        }

        .form-card h2 {
          margin: 0;
          font-size: 32px;
          line-height: 1.1;
          letter-spacing: -0.04em;
        }

        .form-subtitle {
          margin: 10px 0 0 0;
          color: #6d5d4d;
          line-height: 1.7;
        }

        .field {
          margin-top: 22px;
        }

        .field label {
          display: block;
          margin-bottom: 8px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #745f3a;
        }

        .field input {
          width: 100%;
          padding: 16px 18px;
          border-radius: 18px;
          border: 1px solid #d7c6a8;
          background: #fffdf8;
          font-size: 17px;
          color: #231a12;
          outline: none;
        }

        .field input:focus {
          border-color: #b78b43;
          box-shadow: 0 0 0 3px rgba(183, 139, 67, 0.12);
        }

        .dob-row {
          display: grid;
          grid-template-columns: 0.8fr 0.8fr 1.2fr;
          gap: 12px;
        }

        .error-message {
          margin-top: 16px;
          color: #b42318;
          font-weight: 600;
        }

        .login-button {
          width: 100%;
          margin-top: 22px;
          border: none;
          border-radius: 18px;
          padding: 16px 18px;
          background: #231a12;
          color: white;
          font-size: 17px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 10px 24px rgba(35, 26, 18, 0.18);
        }

        .login-button:disabled {
          opacity: 0.7;
          cursor: default;
        }

        @media (max-width: 900px) {
          .login-book {
            grid-template-columns: 1fr;
          }

          .login-left {
            padding: 28px;
          }
        }

        @media (max-width: 640px) {
          .login-shell {
            padding: 14px;
          }

          .login-left,
          .login-right,
          .form-card {
            border-radius: 24px;
          }

          .form-card {
            padding: 24px;
          }

          .dob-row {
            grid-template-columns: 1fr 1fr 1.25fr;
          }

          .field input {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  )
}
