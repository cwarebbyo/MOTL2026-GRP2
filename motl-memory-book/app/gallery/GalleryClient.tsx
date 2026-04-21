'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

type MediaRow = {
  id: string
  media_id?: string
  attendee_id: string
  file_url: string
  file_type?: string | null
  caption?: string | null
  taken_at?: string | null
  location_text?: string | null
  location_name?: string | null
  is_profile_photo?: boolean | null
}

type AttendeeRow = {
  attendee_id: string
  first_name: string
  last_name: string
  profile_photo_url?: string | null
}

type GalleryItem = MediaRow & {
  uploaderName: string
  uploaderShortName: string
  uploaderAvatar: string | null
}

function formatShortName(firstName?: string, lastName?: string) {
  const first = (firstName || '').trim()
  const last = (lastName || '').trim()
  if (!first && !last) return 'Unknown'
  return `${first}${last ? ` ${last.charAt(0)}.` : ''}`
}

function formatLongName(firstName?: string, lastName?: string) {
  return [firstName, lastName].filter(Boolean).join(' ') || 'Unknown uploader'
}

function formatDate(value?: string | null) {
  if (!value) return 'Date unknown'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function GalleryClient({
  media,
  attendees,
}: {
  media: MediaRow[]
  attendees: AttendeeRow[]
}) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<GalleryItem | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [draftLocations, setDraftLocations] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('attendee')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setCurrentUserId(parsed.attendee_id || parsed.attendeeID || null)
      } catch {
        setCurrentUserId(null)
      }
    }
  }, [])

  const attendeeMap = useMemo(() => {
    const map = new Map<string, AttendeeRow>()
    attendees.forEach((person) => map.set(person.attendee_id, person))
    return map
  }, [attendees])

  const items = useMemo<GalleryItem[]>(() => {
    return media
      .filter((item) => !item.is_profile_photo)
      .map((item) => {
        const person = attendeeMap.get(item.attendee_id)
        return {
          ...item,
          uploaderName: formatLongName(person?.first_name, person?.last_name),
          uploaderShortName: formatShortName(person?.first_name, person?.last_name),
          uploaderAvatar: person?.profile_photo_url || null,
        }
      })
  }, [media, attendeeMap])

  useEffect(() => {
    const next: Record<string, string> = {}
    items.forEach((item) => {
      next[item.id] = item.location_name || ''
    })
    setDraftLocations(next)
  }, [items])

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) =>
      [
        item.uploaderName,
        item.uploaderShortName,
        item.location_name || '',
        item.location_text || '',
        item.caption || '',
        formatDate(item.taken_at),
      ].some((value) => value.toLowerCase().includes(q))
    )
  }, [items, search])

  async function saveLocationName(item: GalleryItem) {
    const nextValue = (draftLocations[item.id] || '').trim()
    setSavingId(item.id)
    setSaveMessage('')

    const { error } = await supabase
      .from('media')
      .update({ location_name: nextValue })
      .eq('id', item.id)

    setSavingId(null)

    if (error) {
      setSaveMessage(error.message)
      return
    }

    setSaveMessage('Location name updated.')
  }

  return (
    <div className="gallery-shell">
      <div className="gallery-hero">
        <div className="hero-copy">
          <div className="hero-kicker">MOTL 2026 · Group 2</div>
          <h1>Shared Memory Book</h1>
          <p>
            A warm, page-like gallery of witness, memory, and shared images — with uploader
            portraits, meaningful locations, and space for the story behind every photo.
          </p>
        </div>

        <div className="hero-panel">
          <label className="search-label">Search the memory book</label>
          <input
            className="search-input"
            placeholder="Search by person, place, caption, or date"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="hero-stats">
            <div>
              <span>{items.length}</span>
              <small>Photos</small>
            </div>
            <div>
              <span>{new Set(items.map((i) => i.attendee_id)).size}</span>
              <small>Contributors</small>
            </div>
          </div>
          {saveMessage ? <p className="save-message">{saveMessage}</p> : null}
        </div>
      </div>

      <div className="gallery-grid">
        {filteredItems.map((item) => {
          const isMine = currentUserId === item.attendee_id
          return (
            <article key={item.id} className="photo-card">
              <button className="image-button" onClick={() => setSelected(item)}>
                <img
                  src={item.file_url}
                  alt={item.caption || item.location_name || item.location_text || 'Memory photo'}
                  className="photo-image"
                />
              </button>

              <div className="uploader-badge">
                {item.uploaderAvatar ? (
                  <img src={item.uploaderAvatar} alt={item.uploaderName} className="uploader-avatar" />
                ) : (
                  <div className="uploader-avatar fallback">{item.uploaderShortName.charAt(0)}</div>
                )}
                <div className="uploader-meta">
                  <strong>{item.uploaderShortName}</strong>
                  <span>Uploaded this photo</span>
                </div>
              </div>

              <div className="photo-body">
                <div className="photo-topline">
                  <div>
                    <h3>{item.location_name || 'Unnamed location'}</h3>
                    <p>{item.location_text || 'Location unknown'}</p>
                  </div>
                  <time>{formatDate(item.taken_at)}</time>
                </div>

                {item.caption ? <p className="caption">{item.caption}</p> : null}
                
              </div>
            </article>
          )
        })}
      </div>

      {selected ? (
        <div className="lightbox" onClick={() => setSelected(null)}>
          <div className="lightbox-panel" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={() => setSelected(null)}>
              ×
            </button>

            <div className="lightbox-image-wrap">
              <img
                src={selected.file_url}
                alt={selected.caption || selected.location_name || selected.location_text || 'Memory photo'}
                className="lightbox-image"
              />
            </div>

            <div className="lightbox-info">
              <div className="lightbox-uploader">
                {selected.uploaderAvatar ? (
                  <img
                    src={selected.uploaderAvatar}
                    alt={selected.uploaderName}
                    className="uploader-avatar large"
                  />
                ) : (
                  <div className="uploader-avatar fallback large">
                    {selected.uploaderShortName.charAt(0)}
                  </div>
                )}
                <div>
                  <strong>{selected.uploaderName}</strong>
                  <span>Shared by {selected.uploaderShortName}</span>
                </div>
              </div>

              <h2>{selected.location_name || 'Unnamed location'}</h2>
              <p className="location-text">{selected.location_text || 'Location unknown'}</p>
              <p className="date-text">{formatDate(selected.taken_at)}</p>
              {selected.caption ? <p className="lightbox-caption">{selected.caption}</p> : null}
              
              {currentUserId === selected.attendee_id ? (
                <div className="edit-block lightbox-edit">
                  <label>Edit location name</label>
                  <div className="edit-row">
                    <input
                      value={draftLocations[selected.id] || ''}
                      onChange={(e) =>
                        setDraftLocations((prev) => ({
                          ...prev,
                          [selected.id]: e.target.value,
                        }))
                      }
                    />
                    <button
                      className="save-button"
                      onClick={() => saveLocationName(selected)}
                      disabled={savingId === selected.id}
                    >
                      {savingId === selected.id ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .gallery-shell {
          min-height: 100vh;
          padding: 24px;
          background:
            radial-gradient(circle at top, rgba(255, 248, 235, 0.95), rgba(244, 237, 225, 0.98) 35%, #efe6d7 100%);
          color: #231a12;
        }

        .gallery-hero {
          max-width: 1400px;
          margin: 0 auto 28px auto;
          display: grid;
          gap: 20px;
          grid-template-columns: 1.35fr 0.9fr;
          align-items: stretch;
        }

        .hero-copy,
        .hero-panel {
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.78);
          backdrop-filter: blur(12px);
          box-shadow: 0 18px 45px rgba(63, 46, 22, 0.12);
          border: 1px solid rgba(112, 89, 48, 0.12);
          padding: 28px;
        }

        .hero-kicker {
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

        .hero-copy h1 {
          margin: 16px 0 10px 0;
          font-size: clamp(32px, 5vw, 58px);
          line-height: 1;
          letter-spacing: -0.04em;
        }

        .hero-copy p {
          margin: 0;
          max-width: 800px;
          font-size: 18px;
          line-height: 1.75;
          color: #5f5144;
        }

        .search-label {
          display: block;
          margin-bottom: 10px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #7b6545;
        }

        .search-input {
          width: 100%;
          padding: 16px 18px;
          border-radius: 18px;
          border: 1px solid #d7c6a8;
          background: #fffdf8;
          font-size: 16px;
          outline: none;
        }

        .hero-stats {
          display: flex;
          gap: 14px;
          margin-top: 18px;
        }

        .hero-stats div {
          flex: 1;
          border-radius: 18px;
          background: #fbf5ea;
          padding: 16px;
          border: 1px solid #eadcc1;
        }

        .hero-stats span {
          display: block;
          font-size: 28px;
          font-weight: 800;
        }

        .hero-stats small {
          display: block;
          margin-top: 4px;
          color: #6c5b4d;
        }

        .save-message {
          margin: 14px 0 0 0;
          color: #355f32;
          font-size: 14px;
        }

        .gallery-grid {
          max-width: 1400px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 22px;
        }

        .photo-card {
          position: relative;
          overflow: hidden;
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid rgba(118, 93, 52, 0.12);
          box-shadow: 0 22px 40px rgba(59, 43, 21, 0.12);
        }

        .image-button {
          display: block;
          width: 100%;
          border: none;
          background: transparent;
          padding: 0;
          cursor: pointer;
        }

        .photo-image {
          display: block;
          width: 100%;
          height: 270px;
          object-fit: cover;
          background: #e7dcc8;
        }

        .uploader-badge {
          position: absolute;
          top: 16px;
          left: 16px;
          right: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 18px;
          background: rgba(22, 17, 12, 0.56);
          backdrop-filter: blur(10px);
          color: white;
        }

        .uploader-avatar {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          object-fit: cover;
          flex-shrink: 0;
          background: #cdbb9b;
        }

        .uploader-avatar.large {
          width: 56px;
          height: 56px;
          border-radius: 18px;
        }

        .uploader-avatar.fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: #3a2d1c;
          background: #f4e7cf;
        }

        .uploader-meta {
          min-width: 0;
        }

        .uploader-meta strong {
          display: block;
          font-size: 14px;
          line-height: 1.2;
        }

        .uploader-meta span {
          display: block;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.82);
          margin-top: 2px;
        }

        .photo-body {
          padding: 18px 18px 20px 18px;
        }

        .photo-topline {
          display: flex;
          gap: 12px;
          justify-content: space-between;
          align-items: flex-start;
        }

        .photo-topline h3 {
          margin: 0;
          font-size: 20px;
          line-height: 1.2;
        }

        .photo-topline p {
          margin: 6px 0 0 0;
          color: #6e5d4c;
          font-size: 14px;
        }

        .photo-topline time {
          display: inline-block;
          flex-shrink: 0;
          background: #f8f1e2;
          border: 1px solid #eadab8;
          color: #6c5632;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          padding: 8px 12px;
        }

        .caption {
          margin: 14px 0 0 0;
          color: #43382c;
          line-height: 1.7;
        }

        .edit-block {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #eee1cc;
        }

        .edit-block label {
          display: block;
          margin-bottom: 8px;
          font-size: 13px;
          font-weight: 700;
          color: #715d42;
        }

        .edit-row {
          display: flex;
          gap: 10px;
        }

        .edit-row input {
          flex: 1;
          min-width: 0;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid #dbc8a8;
          background: #fffdf9;
          font-size: 14px;
        }

        .save-button {
          border: none;
          border-radius: 14px;
          background: #231a12;
          color: white;
          font-weight: 700;
          padding: 0 16px;
          cursor: pointer;
        }

        .save-button:disabled {
          opacity: 0.6;
          cursor: default;
        }

        .lightbox {
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

        .lightbox-panel {
          position: relative;
          max-width: 1200px;
          width: 100%;
          max-height: 90vh;
          overflow: auto;
          border-radius: 30px;
          background: #fffdf9;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.28);
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
        }

        .lightbox-image-wrap {
          background: #ede2cf;
        }

        .lightbox-image {
          display: block;
          width: 100%;
          height: 100%;
          min-height: 420px;
          object-fit: cover;
        }

        .lightbox-info {
          padding: 28px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .lightbox-uploader {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 18px;
        }

        .lightbox-uploader strong {
          display: block;
          font-size: 18px;
        }

        .lightbox-uploader span {
          display: block;
          margin-top: 3px;
          color: #6c5c4d;
          font-size: 14px;
        }

        .lightbox-info h2 {
          margin: 0;
          font-size: 34px;
          line-height: 1.1;
          letter-spacing: -0.03em;
        }

        .location-text,
        .date-text {
          margin: 10px 0 0 0;
          color: #6b5b4b;
          font-size: 16px;
        }

        .lightbox-caption {
          margin-top: 20px;
          font-size: 17px;
          line-height: 1.8;
          color: #3d3328;
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
          .gallery-hero {
            grid-template-columns: 1fr;
          }

          .lightbox-panel {
            grid-template-columns: 1fr;
          }

          .lightbox-image {
            min-height: 260px;
          }
        }

        @media (max-width: 640px) {
          .gallery-shell {
            padding: 14px;
          }

          .hero-copy,
          .hero-panel,
          .photo-card {
            border-radius: 22px;
          }

          .photo-image {
            height: 230px;
          }

          .edit-row {
            flex-direction: column;
          }

          .save-button {
            height: 46px;
          }
        }
      `}</style>
    </div>
  )
}
