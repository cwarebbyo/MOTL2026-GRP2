'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Attendee = {
  attendee_id: string
  first_name: string
  last_name: string
  email?: string | null
  phone?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  show_contact?: boolean | null
  why_did_you_come?: string | null
  post_trip_reflection?: string | null
  profile_photo_url?: string | null
  role?: string | null
}

export default function MePage() {
  const router = useRouter()
  const [attendee, setAttendee] = useState<Attendee | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('attendee')
    if (stored) {
      try {
        setAttendee(JSON.parse(stored))
      } catch {
        setAttendee(null)
      }
    }
    setLoading(false)
  }, [])

  async function handleSave() {
    if (!attendee) return
    setSaving(true)
    setMessage('')

    const payload = {
      attendee_id: attendee.attendee_id,
      email: attendee.email || '',
      phone: attendee.phone || '',
      city: attendee.city || '',
      state: attendee.state || '',
      country: attendee.country || '',
      show_contact: !!attendee.show_contact,
      why_did_you_come: attendee.why_did_you_come || '',
      post_trip_reflection: attendee.post_trip_reflection || '',
      profile_photo_url: attendee.profile_photo_url || '',
    }

    try {
      const res = await fetch('/api/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok) {
        setMessage(json.error || 'Could not save changes.')
        setSaving(false)
        return
      }

      localStorage.setItem('attendee', JSON.stringify(json.attendee))
      setAttendee(json.attendee)
      setMessage('Your profile has been updated.')
    } catch {
      setMessage('Something went wrong while saving.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Loading…</div>
  }

  if (!attendee) {
    return <div style={{ padding: 24 }}>No attendee profile found. Please log in again.</div>
  }

  return (
    <div className="me-shell">
      <div className="me-card">
        <div className="me-top">
          <div className="identity-block">
            {attendee.profile_photo_url ? (
              <img
                src={attendee.profile_photo_url}
                alt={`${attendee.first_name} ${attendee.last_name}`}
                className="portrait"
              />
            ) : (
              <div className="portrait-fallback">
                {attendee.first_name?.charAt(0)}
                {attendee.last_name?.charAt(0)}
              </div>
            )}

            <div className="name-block">
              <h1>
                {attendee.first_name} {attendee.last_name}
              </h1>
            </div>
          </div>

          <button
            className="back-button"
            onClick={() => router.push('/gallery')}
            type="button"
          >
            ← Back to Gallery
          </button>
        </div>

        <div className="form-shell">
          <div className="grid two-up">
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={attendee.email || ''}
                onChange={(e) => setAttendee({ ...attendee, email: e.target.value })}
                placeholder="Email"
              />
            </div>

            <div className="field">
              <label>Phone</label>
              <input
                type="text"
                value={attendee.phone || ''}
                onChange={(e) => setAttendee({ ...attendee, phone: e.target.value })}
                placeholder="Phone"
              />
            </div>
          </div>

          <div className="field checkbox-row">
            <input
              id="show-contact"
              type="checkbox"
              checked={!!attendee.show_contact}
              onChange={(e) => setAttendee({ ...attendee, show_contact: e.target.checked })}
            />
            <label htmlFor="show-contact">Show my contact information to the group</label>
          </div>

          <div className="grid two-up compact-gap">
            <div className="field">
              <label>City</label>
              <input
                type="text"
                value={attendee.city || ''}
                onChange={(e) => setAttendee({ ...attendee, city: e.target.value })}
                placeholder="City"
              />
            </div>

            <div className="field">
              <label>State/Province</label>
              <input
                type="text"
                value={attendee.state || ''}
                onChange={(e) => setAttendee({ ...attendee, state: e.target.value })}
                placeholder="State or Province"
              />
            </div>
          </div>

          <div className="field country-field">
            <label>Country</label>
            <input
              type="text"
              value={attendee.country || ''}
              onChange={(e) => setAttendee({ ...attendee, country: e.target.value })}
              placeholder="Country"
            />
          </div>

          <div className="field">
            <label>Why did you come on the trip?</label>
            <textarea
              rows={5}
              value={attendee.why_did_you_come || ''}
              onChange={(e) => setAttendee({ ...attendee, why_did_you_come: e.target.value })}
              placeholder="Share your reason for coming on the trip..."
            />
          </div>

          <div className="field">
            <label>Post-trip reflection</label>
            <textarea
              rows={5}
              value={attendee.post_trip_reflection || ''}
              onChange={(e) => setAttendee({ ...attendee, post_trip_reflection: e.target.value })}
              placeholder="What are your reflections after the trip?"
            />
          </div>

          {message ? <p className="message">{message}</p> : null}

          <button className="save-button" onClick={handleSave} disabled={saving} type="button">
            {saving ? 'Saving…' : 'Save My Profile'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .me-shell {
          min-height: 100vh;
          padding: 12px;
          background:
            radial-gradient(circle at top, rgba(255, 248, 235, 0.95), rgba(244, 237, 225, 0.98) 35%, #efe6d7 100%);
          color: #231a12;
        }

        .me-card {
          width: 100%;
          max-width: 1040px;
          margin: 0 auto;
          border-radius: 36px;
          background: rgba(255, 255, 255, 0.82);
          backdrop-filter: blur(12px);
          box-shadow: 0 24px 55px rgba(63, 46, 22, 0.12);
          border: 1px solid rgba(112, 89, 48, 0.12);
          padding: 28px 30px;
        }

        .me-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 22px;
        }

        .identity-block {
          display: flex;
          align-items: flex-end;
          gap: 24px;
          min-width: 0;
        }

        .portrait,
        .portrait-fallback {
          width: 250px;
          height: 250px;
          border-radius: 28px;
          object-fit: cover;
          background: #e9dbc2;
          box-shadow: 0 12px 26px rgba(0, 0, 0, 0.12);
          flex-shrink: 0;
        }

        .portrait-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 64px;
          font-weight: 800;
          color: #7a643e;
        }

        .name-block {
          min-width: 0;
          padding-bottom: 10px;
        }

        .name-block h1 {
          margin: 0;
          font-size: clamp(48px, 6vw, 74px);
          line-height: 0.95;
          letter-spacing: -0.05em;
          font-weight: 800;
          color: #23160f;
        }

        .back-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          padding: 16px 24px;
          border: 1px solid #ccb27a;
          border-radius: 22px;
          background: #f6ecd7;
          color: #7b6033;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .back-button:hover {
          background: #f2e3c0;
        }

        .form-shell {
          border-radius: 32px;
          background: rgba(253, 249, 241, 0.9);
          border: 1px solid #eadcc1;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5), 0 14px 30px rgba(63, 46, 22, 0.06);
          padding: 28px 42px 40px;
        }

        .grid {
          display: grid;
          gap: 22px;
        }

        .two-up {
          grid-template-columns: 1fr 1fr;
        }

        .compact-gap {
          gap: 22px;
        }

        .field {
          margin-top: 18px;
        }

        .field:first-child {
          margin-top: 0;
        }

        .field label {
          display: block;
          margin-bottom: 10px;
          font-size: 12px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          font-weight: 800;
          color: #8a6a34;
        }

        .field input,
        .field textarea {
          width: 100%;
          box-sizing: border-box;
          padding: 16px 24px;
          border-radius: 22px;
          border: 1px solid #d9c29a;
          background: #fffefb;
          font-size: 16px;
          line-height: 1.45;
          color: #231a12;
          outline: none;
          font-family: inherit;
        }

        .field input::placeholder,
        .field textarea::placeholder {
          color: #a5a1a0;
        }

        .field textarea {
          resize: vertical;
          min-height: 190px;
        }

        .checkbox-row {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-top: 22px;
        }

        .checkbox-row input {
          width: 24px;
          height: 24px;
          margin: 0;
          accent-color: #2c7ef7;
          flex-shrink: 0;
        }

        .checkbox-row label {
          margin: 0;
          letter-spacing: 0;
          text-transform: none;
          font-size: 16px;
          font-weight: 700;
          color: #4d4032;
        }

        .country-field {
          max-width: calc(50% - 11px);
        }

        .message {
          margin: 20px 0 0 0;
          color: #355f32;
          font-size: 14px;
          font-weight: 600;
        }

        .save-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-height: 72px;
          margin-top: 26px;
          padding: 18px 20px;
          border: none;
          border-radius: 26px;
          background: linear-gradient(90deg, #2a190d 0%, #1d1008 100%);
          color: white;
          font-size: 26px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 16px 30px rgba(38, 22, 10, 0.18);
        }

        .save-button:disabled {
          opacity: 0.7;
          cursor: default;
        }

        @media (max-width: 980px) {
          .me-card {
            padding: 22px;
          }

          .me-top {
            flex-direction: column;
            align-items: stretch;
          }

          .identity-block {
            align-items: center;
          }

          .back-button {
            width: 100%;
          }

          .form-shell {
            padding: 24px;
          }
        }

        @media (max-width: 760px) {
          .identity-block {
            flex-direction: column;
            align-items: flex-start;
          }

          .portrait,
          .portrait-fallback {
            width: 180px;
            height: 180px;
          }

          .two-up {
            grid-template-columns: 1fr;
          }

          .country-field {
            max-width: 100%;
          }

          .field textarea {
            min-height: 150px;
          }

          .save-button {
            min-height: 60px;
            font-size: 22px;
          }
        }

        @media (max-width: 640px) {
          .me-shell {
            padding: 10px;
          }

          .me-card,
          .form-shell {
            border-radius: 24px;
          }

          .form-shell {
            padding: 18px;
          }

          .field input,
          .field textarea {
            padding: 14px 18px;
            border-radius: 18px;
          }

          .name-block h1 {
            font-size: 48px;
          }
        }
      `}</style>
    </div>
  )
}
