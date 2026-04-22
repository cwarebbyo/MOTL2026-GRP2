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
  city?: string | null
  state?: string | null
  country?: string | null
  show_contact?: boolean | null
  email?: string | null
  phone?: string | null
  why_did_you_come?: string | null
  post_trip_reflection?: string | null
  role?: string | null
}

type GalleryItem = MediaRow & {
  uploaderName: string
  uploaderShortName: string
  uploaderAvatar: string | null
  uploader: AttendeeRow | null
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

function formatDateTime(value?: string | null) {
  if (!value) return 'Date unknown'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function dateKey(value?: string | null) {
  if (!value) return 'unknown'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return 'unknown'
  return d.toISOString().slice(0, 10)
}

function displayDateFromKey(key: string) {
  if (key === 'unknown') return 'Unknown Date'
  const d = new Date(`${key}T00:00:00`)
  if (Number.isNaN(d.getTime())) return key
  return d.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function personLocation(person?: AttendeeRow | null) {
  if (!person) return ''
  return [person.city, person.state, person.country].filter(Boolean).join(', ')
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
  const [selectedPerson, setSelectedPerson] = useState<AttendeeRow | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [draftLocations, setDraftLocations] = useState<Record<string, string>>({})
  const [draftCaptions, setDraftCaptions] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState('')
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)
  const [bookOpen, setBookOpen] = useState(false)
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null)

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
        const person = attendeeMap.get(item.attendee_id) || null
        return {
          ...item,
          uploaderName: formatLongName(person?.first_name, person?.last_name),
          uploaderShortName: formatShortName(person?.first_name, person?.last_name),
          uploaderAvatar: person?.profile_photo_url || null,
          uploader: person,
        }
      })
  }, [media, attendeeMap])

  useEffect(() => {
    const nextLocations: Record<string, string> = {}
    const nextCaptions: Record<string, string> = {}

    items.forEach((item) => {
      nextLocations[item.id] = item.location_name || ''
      nextCaptions[item.id] = item.caption || ''
    })

    setDraftLocations(nextLocations)
    setDraftCaptions(nextCaptions)
  }, [items])

  useEffect(() => {
    if (!items.length) return
    const random = items[Math.floor(Math.random() * items.length)]
    setCoverPhoto(random.file_url)
  }, [items])

  const dateTabs = useMemo(() => {
    const map = new Map<string, number>()
    items.forEach((item) => {
      const key = dateKey(item.taken_at)
      map.set(key, (map.get(key) || 0) + 1)
    })

    return Array.from(map.entries())
      .sort(([a], [b]) => {
        if (a === 'unknown') return 1
        if (b === 'unknown') return -1
        return a.localeCompare(b)
      })
      .map(([key, count]) => ({
        key,
        label: displayDateFromKey(key),
        count,
      }))
  }, [items])

  useEffect(() => {
    if (!selectedDateKey && dateTabs.length) {
      setSelectedDateKey(dateTabs[0].key)
    }
  }, [dateTabs, selectedDateKey])

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()

    return items
      .filter((item) => {
        if (selectedDateKey && dateKey(item.taken_at) !== selectedDateKey) return false
        if (!q) return true
        return [
          item.uploaderName,
          item.uploaderShortName,
          item.location_name || '',
          item.location_text || '',
          item.caption || '',
          formatDate(item.taken_at),
        ].some((value) => value.toLowerCase().includes(q))
      })
      .sort((a, b) => {
        const aTime = a.taken_at ? new Date(a.taken_at).getTime() : 0
        const bTime = b.taken_at ? new Date(b.taken_at).getTime() : 0
        return aTime - bTime
      })
  }, [items, search, selectedDateKey])

  async function savePhotoDetails(item: GalleryItem) {
    const nextLocation = (draftLocations[item.id] || '').trim()
    const nextCaption = (draftCaptions[item.id] || '').trim()

    setSavingId(item.id)
    setSaveMessage('')

    const { error } = await supabase
      .from('media')
      .update({
        location_name: nextLocation,
        caption: nextCaption || null,
      })
      .eq('id', item.id)

    setSavingId(null)

    if (error) {
      setSaveMessage(error.message)
      return
    }

    item.location_name = nextLocation
    item.caption = nextCaption || null
    setSaveMessage('Photo details updated.')
  }

  function openPerson(person: AttendeeRow | null, e?: React.MouseEvent) {
    if (e) e.stopPropagation()
    if (!person) return
    setSelectedPerson(person)
  }

  return (
    <div className="gallery-shell">
      <div className="gallery-hero">
        <div className="hero-copy">
          <div className="hero-kicker">MOTL 2026 · Group 2</div>
          <h1>Shared Memory Book</h1>
          <p>
            Open the book by date, browse each day in order, and move through the journey
            the way it actually unfolded.
          </p>
        </div>

        <div className="hero-panel">
          <label className="search-label">Search the memory book</label>
          <input
            className="search-input"
            placeholder="Search by person, place, caption, or date"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={!bookOpen}
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

      <div className={`book-shell ${bookOpen ? 'open' : ''}`}>
        <div className="date-tabs">
          {dateTabs.map((tab) => (
            <button
              key={tab.key}
              className={`date-tab ${selectedDateKey === tab.key ? 'active' : ''}`}
              onClick={() => {
                setSelectedDateKey(tab.key)
                setBookOpen(true)
              }}
              type="button"
            >
              <span className="tab-label">{tab.label}</span>
              <span className="tab-count">{tab.count}</span>
            </button>
          ))}
        </div>

        {!bookOpen ? (
          <div className="book-cover">
            <div className="cover-image-wrap">
              {coverPhoto ? <img src={coverPhoto} alt="Memory book cover" className="cover-image" /> : null}
              <div className="cover-overlay" />
            </div>

            <div className="cover-content">
              <div className="cover-spine-mark">Memory Book</div>
              <h2>MOTL 2026</h2>
              <p>Group 2</p>
              <button
                className="open-book-button"
                onClick={() => {
                  if (!selectedDateKey && dateTabs.length) setSelectedDateKey(dateTabs[0].key)
                  setBookOpen(true)
                }}
                type="button"
              >
                Open Book
              </button>
            </div>
          </div>
        ) : (
          <div className="book-pages">
            <div className="book-toolbar">
              <div>
                <div className="book-date-kicker">Viewing Date</div>
                <h3>{selectedDateKey ? displayDateFromKey(selectedDateKey) : 'Select a date'}</h3>
                <p>{filteredItems.length} photo{filteredItems.length === 1 ? '' : 's'} shown, oldest to newest</p>
              </div>

              <button
                className="close-book-button"
                onClick={() => setBookOpen(false)}
                type="button"
              >
                Close Book
              </button>
            </div>

            <div className="gallery-grid">
              {filteredItems.map((item) => (
                <article key={item.id} className="photo-card">
                  <button className="image-button" onClick={() => setSelected(item)} type="button">
                    <img
                      src={item.file_url}
                      alt={item.caption || item.location_name || item.location_text || 'Memory photo'}
                      className="photo-image"
                    />
                  </button>

                  <div className="photo-body">
                    <div className="photo-topline">
                      <div>
                        <h3>{item.location_name || 'Unnamed location'}</h3>
                        <p>{item.location_text || 'Location unknown'}</p>
                      </div>
                      <time>{formatDateTime(item.taken_at)}</time>
                    </div>
                  </div>

                  <div className="uploader-badge">
                    <button
                      className="avatar-button"
                      onClick={(e) => openPerson(item.uploader, e)}
                      aria-label={`Open ${item.uploaderName}'s profile`}
                      type="button"
                    >
                      {item.uploaderAvatar ? (
                        <img src={item.uploaderAvatar} alt={item.uploaderName} className="uploader-avatar" />
                      ) : (
                        <div className="uploader-avatar fallback">{item.uploaderShortName.charAt(0)}</div>
                      )}
                    </button>
                    <div className="uploader-meta">
                      <strong>{item.uploaderShortName}</strong>
                      <span>Uploaded this photo</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>

      {selected ? (
        <div className="lightbox" onClick={() => setSelected(null)}>
          <div className="lightbox-panel" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={() => setSelected(null)} type="button">
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
                <button
                  className="avatar-button large"
                  onClick={(e) => openPerson(selected.uploader, e)}
                  aria-label={`Open ${selected.uploaderName}'s profile`}
                  type="button"
                >
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
                </button>
                <div>
                  <strong>{selected.uploaderShortName}</strong>
                  <span>Uploaded this photo</span>
                </div>
              </div>

              <h2>{selected.location_name || 'Unnamed location'}</h2>
              <p className="location-text">{selected.location_text || 'Location unknown'}</p>
              <p className="date-text">{formatDateTime(selected.taken_at)}</p>

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
                  </div>

                  <label style={{ marginTop: '14px' }}>Edit caption</label>
                  <div className="edit-row">
                    <textarea
                      className="caption-editor"
                      rows={4}
                      value={draftCaptions[selected.id] || ''}
                      onChange={(e) =>
                        setDraftCaptions((prev) => ({
                          ...prev,
                          [selected.id]: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="edit-actions">
                    <button
                      className="save-button"
                      onClick={() => savePhotoDetails(selected)}
                      disabled={savingId === selected.id}
                      type="button"
                    >
                      {savingId === selected.id ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                selected.caption ? <p className="lightbox-caption">{selected.caption}</p> : null
              )}
            </div>
          </div>
        </div>
      ) : null}

      {selectedPerson ? (
        <div className="person-lightbox" onClick={() => setSelectedPerson(null)}>
          <div className="person-panel" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={() => setSelectedPerson(null)} type="button">
              ×
            </button>

            <div className="person-kicker">{selectedPerson.role}</div>

            <div className="person-top">
              {selectedPerson.profile_photo_url ? (
                <img
                  src={selectedPerson.profile_photo_url}
                  alt={formatLongName(selectedPerson.first_name, selectedPerson.last_name)}
                  className="person-avatar"
                />
              ) : (
                <div className="person-avatar fallback">
                  {formatShortName(selectedPerson.first_name, selectedPerson.last_name).charAt(0)}
                </div>
              )}

              <div>
                <h2>{formatLongName(selectedPerson.first_name, selectedPerson.last_name)}</h2>
                <p className="person-location">{personLocation(selectedPerson) || 'Location not shared'}</p>
              </div>
            </div>

            <div className="person-section">
              <h3>About this traveler</h3>
              <p>{selectedPerson.why_did_you_come || 'No “why I came” response has been added yet.'}</p>
            </div>

            <div className="person-section">
              <h3>Post-trip reflection</h3>
              <p>{selectedPerson.post_trip_reflection || 'No reflection has been added yet.'}</p>
            </div>

            {currentUserId ? (
              <div className="person-section">
                <h3>Contact information</h3>
                {selectedPerson.show_contact ? (
                  <div className="contact-grid">
                    <div className="contact-card">
                      <strong>Email</strong>
                      <span>{selectedPerson.email || 'Not provided'}</span>
                    </div>
                    <div className="contact-card">
                      <strong>Phone</strong>
                      <span>{selectedPerson.phone || 'Not provided'}</span>
                    </div>
                  </div>
                ) : (
                  <p>This attendee has chosen not to share contact information.</p>
                )}
              </div>
            ) : null}
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

        .hero-kicker,
        .person-kicker,
        .book-date-kicker {
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

        .search-input:disabled {
          opacity: 0.65;
          cursor: not-allowed;
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

        .book-shell {
          max-width: 1400px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 120px 1fr;
          gap: 18px;
          align-items: stretch;
        }

        .date-tabs {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding-top: 24px;
        }

        .date-tab {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
          width: 100%;
          border: 1px solid #d8c5a4;
          background: #f9efdb;
          color: #5d4a2d;
          border-radius: 0 18px 18px 0;
          padding: 14px 14px 14px 16px;
          cursor: pointer;
          text-align: left;
          box-shadow: 0 8px 18px rgba(63, 46, 22, 0.08);
        }

        .date-tab.active {
          background: #fffaf2;
          color: #231a12;
          border-color: #b99962;
          transform: translateX(6px);
        }

        .tab-label {
          font-size: 13px;
          font-weight: 700;
          line-height: 1.35;
        }

        .tab-count {
          font-size: 12px;
          color: #7a6649;
        }

        .book-cover,
        .book-pages {
          position: relative;
          min-height: 760px;
          border-radius: 32px;
          overflow: hidden;
          background: #fffaf2;
          border: 1px solid rgba(118, 93, 52, 0.14);
          box-shadow: 0 26px 60px rgba(59, 43, 21, 0.16);
        }

        .book-cover {
          display: grid;
          grid-template-columns: 1fr;
        }

        .cover-image-wrap {
          position: absolute;
          inset: 0;
        }

        .cover-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .cover-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(37, 26, 16, 0.72), rgba(120, 88, 42, 0.44));
        }

        .cover-content {
          position: relative;
          z-index: 1;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: flex-end;
          padding: 42px;
          color: white;
        }

        .cover-spine-mark {
          font-size: 12px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          opacity: 0.9;
          margin-bottom: 12px;
        }

        .cover-content h2 {
          margin: 0;
          font-size: clamp(42px, 7vw, 92px);
          line-height: 0.92;
          letter-spacing: -0.05em;
        }

        .cover-content p {
          margin: 12px 0 0 0;
          font-size: 24px;
          opacity: 0.95;
        }

        .open-book-button,
        .close-book-button {
          margin-top: 24px;
          border: none;
          border-radius: 16px;
          padding: 14px 18px;
          background: #231a12;
          color: white;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
        }

        .open-book-button {
          background: rgba(255,255,255,0.16);
          border: 1px solid rgba(255,255,255,0.24);
          backdrop-filter: blur(6px);
        }

        .book-pages {
          padding: 28px;
          background:
            linear-gradient(90deg, #f4ead8 0%, #fffdf9 10%, #fffdf9 90%, #f4ead8 100%);
        }

        .book-pages::before {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          left: 50%;
          width: 2px;
          background: linear-gradient(180deg, rgba(180,153,98,0.06), rgba(180,153,98,0.26), rgba(180,153,98,0.06));
          transform: translateX(-50%);
        }

        .book-toolbar {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
        }

        .book-toolbar h3 {
          margin: 12px 0 6px 0;
          font-size: 34px;
          line-height: 1.05;
          letter-spacing: -0.04em;
        }

        .book-toolbar p {
          margin: 0;
          color: #6c5b4d;
        }

        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 22px;
        }

        .photo-card {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.92);
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
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #fffaf2;
          border-top: 1px solid #eadcc1;
          margin-top: auto;
        }

        .avatar-button {
          display: inline-flex;
          padding: 0;
          margin: 0;
          border: none;
          background: transparent;
          cursor: pointer;
          border-radius: 16px;
          flex-shrink: 0;
        }

        .avatar-button.large {
          border-radius: 20px;
        }

        .uploader-avatar,
        .person-avatar {
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

        .person-avatar {
          width: 120px;
          height: 120px;
          border-radius: 28px;
          box-shadow: 0 12px 24px rgba(0,0,0,0.12);
        }

        .uploader-avatar.fallback,
        .person-avatar.fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: #3a2d1c;
          background: #f4e7cf;
        }

        .person-avatar.fallback {
          font-size: 32px;
        }

        .uploader-meta {
          min-width: 0;
        }

        .uploader-meta strong {
          display: block;
          font-size: 14px;
          line-height: 1.2;
          color: #231a12;
        }

        .uploader-meta span {
          display: block;
          font-size: 12px;
          color: #6e5d4c;
          margin-top: 2px;
        }

        .photo-body {
          flex: 1;
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

        .lightbox-edit {
          margin-top: 24px;
        }

        .caption-editor {
          width: 100%;
          min-width: 0;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid #dbc8a8;
          background: #fffdf9;
          font-size: 14px;
          resize: vertical;
          font-family: inherit;
        }

        .edit-actions {
          margin-top: 14px;
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
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-height: 44px;
          padding: 12px 16px;
          border: none;
          border-radius: 12px;
          background: #231a12;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .save-button:disabled {
          opacity: 0.6;
          cursor: default;
        }

        .lightbox-edit .save-button {
          min-height: 48px;
          padding: 14px 16px;
        }

        .lightbox,
        .person-lightbox {
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

        .lightbox-panel,
        .person-panel {
          position: relative;
          width: 100%;
          max-height: 90vh;
          overflow: auto;
          border-radius: 30px;
          background: #fffdf9;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.28);
        }

        .lightbox-panel {
          max-width: 1200px;
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
        }

        .person-panel {
          max-width: 860px;
          padding: 28px;
        }

        .person-top {
          display: grid;
          grid-template-columns: 120px 1fr;
          gap: 20px;
          align-items: center;
          margin-top: 18px;
        }

        .person-top h2 {
          margin: 0;
          font-size: 36px;
          line-height: 1.05;
          letter-spacing: -0.04em;
        }

        .person-location,
        .person-role {
          margin: 8px 0 0 0;
          color: #6b5b4b;
          font-size: 16px;
        }

        .person-section {
          margin-top: 22px;
          padding-top: 22px;
          border-top: 1px solid #eadcc1;
        }

        .person-section h3 {
          margin: 0 0 10px 0;
          font-size: 18px;
        }

        .person-section p {
          margin: 0;
          color: #43382c;
          line-height: 1.8;
        }

        .contact-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .contact-card {
          background: #fbf5ea;
          border: 1px solid #eadcc1;
          border-radius: 18px;
          padding: 16px;
        }

        .contact-card strong {
          display: block;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #7a643e;
        }

        .contact-card span {
          display: block;
          margin-top: 6px;
          line-height: 1.6;
          color: #332a22;
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

        @media (max-width: 1100px) {
          .book-shell {
            grid-template-columns: 1fr;
          }

          .date-tabs {
            flex-direction: row;
            overflow-x: auto;
            padding-top: 0;
            padding-bottom: 8px;
          }

          .date-tab {
            min-width: 180px;
            border-radius: 18px;
          }

          .date-tab.active {
            transform: translateY(2px);
          }
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

          .person-top {
            grid-template-columns: 1fr;
          }

          .contact-grid {
            grid-template-columns: 1fr;
          }

          .book-pages::before {
            display: none;
          }
        }

        @media (max-width: 640px) {
          .gallery-shell {
            padding: 14px;
          }

          .hero-copy,
          .hero-panel,
          .photo-card,
          .person-panel,
          .book-cover,
          .book-pages {
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

          .person-panel {
            padding: 20px;
          }

          .book-pages {
            padding: 20px;
          }

          .cover-content {
            padding: 26px;
          }
        }
      `}</style>
    </div>
  )
}
