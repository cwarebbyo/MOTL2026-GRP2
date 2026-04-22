'use client'

import { useEffect, useRef, useState } from 'react'
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
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [attendee, setAttendee] = useState<Attendee | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState('')

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

  function closePhotoModal() {
    setShowPhotoModal(false)
    setSelectedPhoto(null)
    setPhotoError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handlePhotoUpload() {
    if (!attendee || !selectedPhoto) {
      setPhotoError('Choose a photo first.')
      return
    }

    setUploadingPhoto(true)
    setPhotoError('')
    setMessage('')

    try {
      const formData = new FormData()
      formData.append('attendee_id', attendee.attendee_id)
      formData.append('file', selectedPhoto)

      const res = await fetch('/api/me/photo', {
        method: 'POST',
        body: formData,
      })

      const contentType = res.headers.get('content-type') || ''
      const json = contentType.includes('application/json') ? await res.json() : null

      if (!res.ok) {
        setPhotoError(json?.error || `Upload failed with status ${res.status}.`)
        return
      }

      localStorage.setItem('attendee', JSON.stringify(json.attendee))
      setAttendee(json.attendee)
      setMessage('Your profile photo has been updated.')
      closePhotoModal()
    } catch {
      setPhotoError('Something went wrong while uploading your photo.')
    } finally {
      setUploadingPhoto(false)
    }
  }

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
            <button
              className="portrait-button"
              onClick={() => {
                setPhotoError('')
                setSelectedPhoto(null)
                setShowPhotoModal(true)
              }}
              type="button"
              aria-label="Change profile photo"
              title="Change profile photo"
            >
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
              <span className="portrait-edit-chip">Change photo</span>
            </button>

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
          <div className="profile-grid">
            <div className="field-group">
              <label>Email</label>
              <input
                type="email"
                value={attendee.email || ''}
                onChange={(e) => setAttendee({ ...attendee, email: e.target.value })}
                placeholder="Email"
              />
            </div>

            <div className="field-group">
              <label>Phone</label>
              <input
                type="text"
                value={attendee.phone || ''}
                onChange={(e) => setAttendee({ ...attendee, phone: e.target.value })}
                placeholder="Phone"
              />
            </div>

            <div className="toggle-row">
              <label className="checkbox-row" htmlFor="show-contact">
                <input
                  id="show-contact"
                  type="checkbox"
                  checked={!!attendee.show_contact}
                  onChange={(e) => setAttendee({ ...attendee, show_contact: e.target.checked })}
                />
                <span>Show my contact information to the group</span>
              </label>
            </div>

            <div className="field-group">
              <label>City</label>
              <input
                type="text"
                value={attendee.city || ''}
                onChange={(e) => setAttendee({ ...attendee, city: e.target.value })}
                placeholder="City"
              />
            </div>

            <div className="field-group">
              <label>State/Province</label>
              <input
                type="text"
                value={attendee.state || ''}
                onChange={(e) => setAttendee({ ...attendee, state: e.target.value })}
                placeholder="State or Province"
              />
            </div>

            <div className="field-group field-group-full">
              <label>Country</label>
              <input
                type="text"
                value={attendee.country || ''}
                onChange={(e) => setAttendee({ ...attendee, country: e.target.value })}
                placeholder="Country"
              />
            </div>

            <div className="field-group field-group-full">
              <label>Why did you come on the trip?</label>
              <textarea
                rows={5}
                value={attendee.why_did_you_come || ''}
                onChange={(e) => setAttendee({ ...attendee, why_did_you_come: e.target.value })}
                placeholder="Share your reason for coming on the trip..."
              />
            </div>

            <div className="field-group field-group-full">
              <label>Post-trip reflection</label>
              <textarea
                rows={5}
                value={attendee.post_trip_reflection || ''}
                onChange={(e) => setAttendee({ ...attendee, post_trip_reflection: e.target.value })}
                placeholder="What are your reflections after the trip?"
              />
            </div>
          </div>

          {message ? <p className="message">{message}</p> : null}

          <button className="save-button" onClick={handleSave} disabled={saving} type="button">
            {saving ? 'Saving…' : 'Save My Profile'}
          </button>
        </div>
      </div>

      {showPhotoModal ? (
        <div className="photo-lightbox" onClick={closePhotoModal}>
          <div className="photo-panel" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={closePhotoModal} type="button">
              ×
            </button>

            <div className="photo-kicker">Profile Photo</div>
            <h2>Upload a new profile photo</h2>
            <p className="photo-helper">Choose a clear photo of yourself. JPG, PNG, WEBP, or GIF only.</p>

            <div className="upload-field">
              <label htmlFor="profile-photo-upload">Choose photo</label>
              <input
                ref={fileInputRef}
                id="profile-photo-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(e) => {
                  const nextFile = e.target.files?.[0] || null
                  setSelectedPhoto(nextFile)
                  setPhotoError('')
                }}
              />
            </div>

            {selectedPhoto ? (
              <p className="selected-file">Selected: {selectedPhoto.name}</p>
            ) : null}

            {photoError ? <p className="photo-error">{photoError}</p> : null}

            <div className="photo-actions">
              <button className="secondary-button" onClick={closePhotoModal} type="button">
                Cancel
              </button>
              <button
                className="save-button modal-save-button"
                onClick={handlePhotoUpload}
                disabled={uploadingPhoto}
                type="button"
              >
                {uploadingPhoto ? 'Uploading…' : 'Upload Photo'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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

        .portrait-button {
          position: relative;
          display: inline-flex;
          align-items: stretch;
          justify-content: stretch;
          padding: 0;
          border: none;
          background: transparent;
          cursor: pointer;
          border-radius: 28px;
          flex-shrink: 0;
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
          display: block;
        }

        .portrait-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 64px;
          font-weight: 800;
          color: #7a643e;
        }

        .portrait-edit-chip {
          position: absolute;
          left: 14px;
          right: 14px;
          bottom: 14px;
          padding: 10px 12px;
          border-radius: 14px;
          background: rgba(33, 22, 12, 0.8);
          color: white;
          font-size: 13px;
          font-weight: 700;
          text-align: center;
          opacity: 0;
          transform: translateY(4px);
          transition: opacity 0.18s ease, transform 0.18s ease;
          backdrop-filter: blur(6px);
        }

        .portrait-button:hover .portrait-edit-chip,
        .portrait-button:focus-visible .portrait-edit-chip {
          opacity: 1;
          transform: translateY(0);
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
          padding: 28px 38px 40px;
        }

        .profile-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 22px 20px;
          align-items: start;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .field-group-full {
          grid-column: 1 / -1;
        }

        .field-group label {
          display: block;
          margin: 0 0 10px 0;
          font-size: 12px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          font-weight: 800;
          color: #8a6a34;
        }

        .field-group input,
        .field-group textarea {
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

        .field-group input::placeholder,
        .field-group textarea::placeholder {
          color: #a5a1a0;
        }

        .field-group textarea {
          resize: vertical;
          min-height: 190px;
        }

        .toggle-row {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          margin: -2px 0 -4px 0;
        }

        .checkbox-row {
          display: inline-flex;
          align-items: center;
          gap: 14px;
          cursor: pointer;
        }

        .checkbox-row input {
          width: 24px;
          height: 24px;
          margin: 0;
          accent-color: #2c7ef7;
          flex-shrink: 0;
        }

        .checkbox-row span {
          font-size: 16px;
          font-weight: 700;
          color: #4d4032;
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

        .photo-lightbox {
          position: fixed;
          inset: 0;
          background: rgba(23, 18, 13, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 22px;
          z-index: 999;
        }

        .photo-panel {
          position: relative;
          width: 100%;
          max-width: 560px;
          padding: 28px;
          border-radius: 30px;
          background: #fffdf9;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.28);
        }

        .photo-kicker {
          display: inline-block;
          font-size: 12px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-weight: 700;
          color: #8a6a34;
          background: #f9efdb;
          padding: 8px 12px;
          border-radius: 999px;
        }

        .photo-panel h2 {
          margin: 16px 0 8px 0;
          font-size: 34px;
          line-height: 1.05;
          letter-spacing: -0.04em;
        }

        .photo-helper {
          margin: 0 0 22px 0;
          color: #6b5b4b;
          line-height: 1.6;
        }

        .upload-field label {
          display: block;
          margin-bottom: 8px;
          font-size: 13px;
          font-weight: 700;
          color: #715d42;
        }

        .upload-field input {
          width: 100%;
          min-width: 0;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid #dbc8a8;
          background: #fffdf9;
          font-size: 14px;
          box-sizing: border-box;
        }

        .selected-file {
          margin: 14px 0 0 0;
          color: #4d4032;
          font-size: 14px;
          font-weight: 600;
        }

        .photo-error {
          margin: 14px 0 0 0;
          color: #8b2f2f;
          font-size: 14px;
        }

        .photo-actions {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }

        .secondary-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 52px;
          padding: 14px 18px;
          border: 1px solid #d6c19a;
          background: #f7ecd7;
          color: #6b5430;
          border-radius: 16px;
          font-weight: 700;
          cursor: pointer;
        }

        .modal-save-button {
          min-height: 52px;
          margin-top: 0;
          padding: 14px 18px;
          border-radius: 16px;
          font-size: 16px;
          box-shadow: none;
          flex: 1;
        }

        .close-button {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 42px;
          height: 42px;
          border: none;
          border-radius: 999px;
          background: rgba(23, 18, 13, 0.78);
          color: white;
          font-size: 28px;
          line-height: 1;
          cursor: pointer;
          z-index: 2;
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

        @media (max-width: 820px) {
          .profile-grid {
            grid-template-columns: 1fr;
          }

          .field-group-full,
          .toggle-row {
            grid-column: auto;
          }
        }

        @media (max-width: 760px) {
          .identity-block {
            flex-direction: column;
            align-items: flex-start;
          }

          .portrait,
          .portrait-fallback,
          .portrait-button {
            width: 180px;
            height: 180px;
          }

          .field-group textarea {
            min-height: 150px;
          }

          .save-button {
            min-height: 60px;
            font-size: 22px;
          }

          .photo-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  )
}
