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
      setSaving(false)
    } catch (e) {
      setMessage('Something went wrong while saving.')
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
      <div className="me-book">
        <div className="me-sidebar">
          <div className="kicker">My Page</div>
          <button
            className="back-button"
            onClick={() => router.push('/gallery')}
            type="button"
          >
            ← Back to Gallery
          </button>
          <div className="portrait-wrap">
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
          </div>

          <h1>
            {attendee.first_name} {attendee.last_name}
          </h1>
          <p className="subline">
            {[attendee.city, attendee.state, attendee.country].filter(Boolean).join(', ')}
          </p>

          <div className="sidebar-card">
            <strong>What you can update here</strong>
            <span>Email, phone, contact visibility, your profile photo link, why you came, and your reflection after the trip.</span>
          </div>

          <div className="sidebar-card">
            <strong>What comes next</strong>
            <span>Once this page is solid, we wire in profile photo upload and memory-photo uploads directly.</span>
          </div>
        </div>

        <div className="me-main">
          <div className="form-card">
            <h2>Your Information</h2>
            <p className="form-subtitle">Make changes below, then save them to your memory book page.</p>

            <div className="grid">
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

            <div className="field">
              <label>Profile Photo URL</label>
              <input
                type="text"
                value={attendee.profile_photo_url || ''}
                onChange={(e) => setAttendee({ ...attendee, profile_photo_url: e.target.value })}
                placeholder="Paste an image URL for now"
              />
            </div>

            <div className="field">
              <label>Why did you come on the trip?</label>
              <textarea
                rows={6}
                value={attendee.why_did_you_come || ''}
                onChange={(e) => setAttendee({ ...attendee, why_did_you_come: e.target.value })}
                placeholder="Share your reason for coming on the trip..."
              />
            </div>

            <div className="field">
              <label>Post-trip reflection</label>
              <textarea
                rows={8}
                value={attendee.post_trip_reflection || ''}
                onChange={(e) => setAttendee({ ...attendee, post_trip_reflection: e.target.value })}
                placeholder="What are your reflections after the trip?"
              />
            </div>

            {message ? <p className="message">{message}</p> : null}

            <button className="save-button" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save My Page'}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .me-shell {
          min-height: 100vh;
          padding: 24px;
          background:
            radial-gradient(circle at top, rgba(255, 248, 235, 0.95), rgba(244, 237, 225, 0.98) 35%, #efe6d7 100%);
          color: #231a12;
        }

        .me-book {
          width: 100%;
          max-width: 1240px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 0.9fr 1.1fr;
          gap: 24px;
          align-items: stretch;
        }

        .me-sidebar,
        .me-main {
          border-radius: 32px;
          background: rgba(255, 255, 255, 0.82);
          backdrop-filter: blur(12px);
          box-shadow: 0 24px 55px rgba(63, 46, 22, 0.12);
          border: 1px solid rgba(112, 89, 48, 0.12);
        }

        .me-sidebar {
          padding: 32px;
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

        .back-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-top: 14px;
          padding: 12px 16px;
          border: 1px solid #d6c19a;
          border-radius: 16px;
          background: #f7ecd7;
          color: #6b5430;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .back-button:hover {
          background: #f1e3c5;
        }

        .portrait-wrap {
          margin-top: 20px;
        }

        .portrait,
        .portrait-fallback {
          width: 180px;
          height: 180px;
          border-radius: 28px;
          object-fit: cover;
          background: #e9dbc2;
          box-shadow: 0 12px 26px rgba(0,0,0,0.12);
        }

        .portrait-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
          font-weight: 800;
          color: #5e4b33;
        }

        .me-sidebar h1 {
          margin: 20px 0 8px 0;
          font-size: 42px;
          line-height: 1;
          letter-spacing: -0.04em;
        }

        .subline {
          margin: 0 0 22px 0;
          color: #5f5144;
          line-height: 1.7;
        }

        .sidebar-card {
          margin-top: 14px;
          background: #fbf5ea;
          border: 1px solid #eadcc1;
          border-radius: 20px;
          padding: 18px 20px;
        }

        .sidebar-card strong {
          display: block;
          font-size: 16px;
        }

        .sidebar-card span {
          display: block;
          margin-top: 6px;
          color: #695a4b;
          line-height: 1.6;
        }

        .me-main {
          padding: 18px;
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

        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-top: 20px;
        }

        .field {
          margin-top: 20px;
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

        .field input,
        .field textarea {
          width: 100%;
          padding: 16px 18px;
          border-radius: 18px;
          border: 1px solid #d7c6a8;
          background: #fffdf8;
          font-size: 16px;
          color: #231a12;
          outline: none;
          box-sizing: border-box;
        }

        .field input:focus,
        .field textarea:focus {
          border-color: #b78b43;
          box-shadow: 0 0 0 3px rgba(183, 139, 67, 0.12);
        }

        .checkbox-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 22px;
        }

        .checkbox-row input {
          width: 18px;
          height: 18px;
          margin: 0;
        }

        .checkbox-row label {
          margin: 0;
          font-size: 15px;
          font-weight: 600;
          letter-spacing: 0;
          text-transform: none;
          color: #4c4034;
        }

        .message {
          margin-top: 16px;
          color: #355f32;
          font-weight: 600;
        }

        .save-button {
          width: 100%;
          margin-top: 24px;
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

        .save-button:disabled {
          opacity: 0.7;
          cursor: default;
        }

        @media (max-width: 980px) {
          .me-book {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .me-shell {
            padding: 14px;
          }

          .me-sidebar,
          .me-main,
          .form-card {
            border-radius: 24px;
          }

          .form-card {
            padding: 24px;
          }

          .grid {
            grid-template-columns: 1fr;
          }

          .portrait,
          .portrait-fallback {
            width: 140px;
            height: 140px;
            border-radius: 22px;
          }

          .me-sidebar h1 {
            font-size: 34px;
          }
        }
      `}</style>
    </div>
  )
}
