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

const PROFILE_MAX_DIMENSION = 2000
const PROFILE_JPEG_QUALITY = 0.85

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not read this image file.'))
    }

    image.src = objectUrl
  })
}

async function normalizeProfilePhoto(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.')
  }

  const image = await loadImageFromFile(file)
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height

  if (!width || !height) {
    throw new Error('Could not read this image file.')
  }

  const scale = Math.min(1, PROFILE_MAX_DIMENSION / Math.max(width, height))
  const targetWidth = Math.max(1, Math.round(width * scale))
  const targetHeight = Math.max(1, Math.round(height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Your browser could not process this image.')
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight)

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', PROFILE_JPEG_QUALITY)
  })

  if (!blob) {
    throw new Error('Could not prepare this photo for upload.')
  }

  const baseName = (file.name || 'profile-photo').replace(/\.[^.]+$/, '')

  return new File([blob], `${baseName}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  })
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
      const processedPhoto = await normalizeProfilePhoto(selectedPhoto)
      const formData = new FormData()
      formData.append('attendee_id', attendee.attendee_id)
      formData.append('file', processedPhoto)

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
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'Something went wrong while uploading your photo.')
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
            <p className="photo-helper">
              Choose any clear image of yourself. We will resize and optimize it automatically.
            </p>

            <div className="upload-field">
              <label htmlFor="profile-photo-upload">Choose photo</label>
              <input
                ref={fileInputRef}
                id="profile-photo-upload"
                type="file"
                accept="image/*"
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
          box-sizing: border-box;
          overflow-x: hidden;
          background:
            radial-gradient(circle at top, rgba(255, 248, 235, 0.95), rgba(244, 237, 225, 0.98) 35%, #efe6d7 100%);
          color: #231a12;
        }

        .me-card {
          width: 100%;
          box-sizing: border-box;
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
          width: 100%;
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
          width: 100%;
          padding-bottom: 8px;
        }

        .name-block h1 {
          margin: 0;
          word-break: break-word;
          font-size: clamp(34px, 6vw, 60px);
          line-height: 0.96;
          letter-spacing: -0.05em;
          color: #23160f;
        }

        .back-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-top: 4px;
          padding: 12px 16px;
          border: 1px solid #d6c19a;
          border-radius: 16px;
          background: #f7ecd7;
          color: #6b5430;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          flex-shrink: 0;
        }

        .back-button:hover {
          background: #f1e3c5;
        }

        .form-shell {
          margin-top: 8px;
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
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #8a6a34;
        }

        .field-group input,
        .field-group textarea {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          border: 1px solid #dbc8a8;
          background: #fffdf9;
          border-radius: 18px;
          padding: 16px 18px;
          font-size: 16px;
          color: #231a12;
          outline: none;
          font-family: inherit;
        }

        .field-group textarea {
          min-height: 132px;
          resize: vertical;
        }

        .toggle-row {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          margin: -2px 0 -6px 0;
        }

        .checkbox-row {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          font-size: 15px;
          font-weight: 600;
          color: #4b3d30;
          cursor: pointer;
        }

        .checkbox-row input {
          width: 18px;
          height: 18px;
          margin: 0;
          flex-shrink: 0;
        }

        .message {
          margin: 18px 0 0 0;
          color: #355f32;
          font-weight: 600;
        }

        .save-button,
        .secondary-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 50px;
          padding: 14px 20px;
          border-radius: 16px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.18s ease, opacity 0.18s ease;
        }

        .save-button {
          width: 100%;
          margin-top: 22px;
          border: none;
          background: #231a12;
          color: white;
        }

        .save-button:disabled,
        .secondary-button:disabled {
          opacity: 0.6;
          cursor: default;
        }

        .secondary-button {
          border: 1px solid #d6c19a;
          background: #f7ecd7;
          color: #6b5430;
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
          border-radius: 30px;
          background: #fffdf9;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.28);
          padding: 28px;
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
          margin: 12px 0 0 0;
          color: #5d4d3c;
          font-size: 14px;
        }

        .photo-error {
          margin: 12px 0 0 0;
          color: #8b2f2f;
          font-size: 14px;
        }

        .photo-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 22px;
        }

        .modal-save-button {
          margin-top: 0;
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
          .me-shell {
            padding: 10px;
          }

          .me-card {
            padding: 18px;
            border-radius: 24px;
          }

          .me-top {
            flex-direction: column;
            align-items: stretch;
            gap: 18px;
          }

          .identity-block {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
          }

          .portrait-button {
            align-self: center;
          }

          .portrait,
          .portrait-fallback {
            width: 180px;
            height: 180px;
          }

          .back-button {
            width: 100%;
          }
        }

        @media (max-width: 640px) {
          .me-shell {
            padding: 8px;
          }

          .me-card {
            padding: 14px;
            border-radius: 20px;
          }

          .identity-block {
            gap: 14px;
          }

          .portrait,
          .portrait-fallback {
            width: 148px;
            height: 148px;
            border-radius: 22px;
          }

          .portrait-button {
            width: 148px;
          }

          .name-block {
            padding-bottom: 0;
          }

          .name-block h1 {
            font-size: clamp(28px, 10vw, 42px);
            line-height: 1;
          }

          .field-group label {
            margin-bottom: 8px;
            font-size: 11px;
            letter-spacing: 0.14em;
          }

          .field-group input,
          .field-group textarea {
            border-radius: 16px;
            padding: 14px 14px;
            font-size: 16px;
          }

          .field-group textarea {
            min-height: 110px;
          }

          .checkbox-row {
            align-items: flex-start;
            line-height: 1.4;
          }

          .photo-panel {
            padding: 18px;
            border-radius: 22px;
            box-sizing: border-box;
          }

          .photo-actions {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 420px) {
          .me-shell {
            padding: 6px;
          }

          .me-card {
            padding: 12px;
            border-radius: 18px;
          }

          .portrait,
          .portrait-fallback {
            width: 132px;
            height: 132px;
          }

          .portrait-button {
            width: 132px;
          }

          .back-button,
          .save-button,
          .secondary-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
