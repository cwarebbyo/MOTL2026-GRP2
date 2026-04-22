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

const PHOTOS_PER_PAGE = 12

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

function splitDateLabel(label: string) {
  const [monthDay = label, year = ''] = label.split(', ')
  return { monthDay, year }
}

function personLocation(person?: AttendeeRow | null) {
  if (!person) return ''
  return [person.city, person.state, person.country].filter(Boolean).join(', ')
}

function dedupeLocations(items: GalleryItem[]) {
  return Array.from(
    new Set(
      items
        .flatMap((item) => [item.location_name, item.location_text])
        .map((value) => (value || '').trim())
        .filter(Boolean)
    )
  )
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
  const [bookView, setBookView] = useState<'cover' | 'pages'>('cover')
  const [currentPage, setCurrentPage] = useState(1)

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

  const dateTabMap = useMemo(() => {
    const map = new Map<string, GalleryItem[]>()

    items.forEach((item) => {
      const key = dateKey(item.taken_at)
      const dayItems = map.get(key) || []
      dayItems.push(item)
      map.set(key, dayItems)
    })

    return map
  }, [items])

  const dateTabs = useMemo(() => {
    return Array.from(dateTabMap.entries())
      .sort(([a], [b]) => {
        if (a === 'unknown') return 1
        if (b === 'unknown') return -1
        return a.localeCompare(b)
      })
      .map(([key, dayItems]) => {
        const randomItem = dayItems[Math.floor(Math.random() * dayItems.length)] || null
        return {
          key,
          label: displayDateFromKey(key),
          count: dayItems.length,
          coverPhoto: randomItem?.file_url || null,
          locations: dedupeLocations(dayItems),
        }
      })
  }, [dateTabMap])

  useEffect(() => {
    if (!selectedDateKey && dateTabs.length) {
      setSelectedDateKey(dateTabs[0].key)
    }
  }, [dateTabs, selectedDateKey])

  const selectedDateTab = useMemo(
    () => dateTabs.find((tab) => tab.key === selectedDateKey) || null,
    [dateTabs, selectedDateKey]
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedDateKey, search])

  useEffect(() => {
    setSearch('')
  }, [selectedDateKey])

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
          formatDateTime(item.taken_at),
        ].some((value) => value.toLowerCase().includes(q))
      })
      .sort((a, b) => {
        const aTime = a.taken_at ? new Date(a.taken_at).getTime() : 0
        const bTime = b.taken_at ? new Date(b.taken_at).getTime() : 0
        return aTime - bTime
      })
  }, [items, search, selectedDateKey])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PHOTOS_PER_PAGE))

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PHOTOS_PER_PAGE
    return filteredItems.slice(start, start + PHOTOS_PER_PAGE)
  }, [filteredItems, currentPage])

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
      <div className="gallery-hero header-card">
        <div className="header-main">
          <div className="hero-kicker">MOTL 2026 · Group 2</div>
          <h1>Our Shared Experience</h1>
          <p>Browse each day to relive our experience in the way it originally unfolded.</p>
        </div>
      
        <div className="header-stats">
          <div className="hero-stat-card">
            <span>{items.length}</span>
            <small>Photos</small>
          </div>
          <div className="hero-stat-card">
            <span>{new Set(items.map((i) => i.attendee_id)).size}</span>
            <small>Contributors</small>
          </div>
        </div>
      </div>

      <div className={`book-shell ${bookView === 'pages' ? 'open' : ''}`}>
        <div className="book-column">
          <div className="book-stack-shadow" />

          <div className="book-body">
            <div className="tabs-rail">
              <div className="date-tabs">
                {dateTabs.map((tab) => {
                  const parts = splitDateLabel(tab.label)
                  return (
                    <button
                      key={tab.key}
                      className={`date-tab ${selectedDateKey === tab.key ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedDateKey(tab.key)
                        setBookView('cover')
                      }}
                      type="button"
                    >
                      <span className="tab-label">{parts.monthDay}</span>
                      <span className="tab-year">{parts.year}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {bookView === 'cover' ? (
              <div className="book-cover fixed-book-height">
                <div className="cover-image-wrap">
                  {selectedDateTab?.coverPhoto ? (
                    <img
                      src={selectedDateTab.coverPhoto}
                      alt={`Memory book cover for ${selectedDateTab.label}`}
                      className="cover-image"
                    />
                  ) : null}
                  <div className="cover-overlay" />
                </div>

                <div className="cover-content">
                  <h2>{selectedDateTab?.label || 'MOTL 2026'}</h2>
                  {selectedDateTab?.locations?.length ? (
                    <div className="cover-locations">
                      {selectedDateTab.locations.map((location) => (
                        <p key={location}>{location}</p>
                      ))}
                    </div>
                  ) : (
                    <p>Group 2</p>
                  )}
                  <button
                    className="open-book-button"
                    onClick={() => {
                      if (!selectedDateKey && dateTabs.length) setSelectedDateKey(dateTabs[0].key)
                      setBookView('pages')
                    }}
                    type="button"
                  >
                    Open Book
                  </button>
                </div>
              </div>
            ) : (
              <div className="book-pages fixed-book-height">
                <div className="book-pages-content">
                  <div className="book-toolbar">
                    <div className="toolbar-left">
                      <div className="book-date-kicker">Day View</div>
                      <h3>{selectedDateTab?.label || 'Select a date'}</h3>
                      <p>
                        {filteredItems.length} photo{filteredItems.length === 1 ? '' : 's'}
                        {totalPages > 1 ? ` · Page ${currentPage} of ${totalPages}` : ''}
                      </p>
                    </div>

                    <div className="toolbar-search">
                      <label className="search-label">Search</label>
                      <div className="search-input-wrap">
                        <input
                          className="search-input"
                          placeholder="Search this day by person, place, caption, or date"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          type="text"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="gallery-grid-wrap">
                    <div className="gallery-grid">
                      {paginatedItems.map((item) => (
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
                              <time>{formatDate(item.taken_at)}</time>
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

                  {totalPages > 1 ? (
                    <div className="pagination">
                      <button
                        className="pagination-button"
                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                        disabled={currentPage === 1}
                        type="button"
                      >
                        Previous
                      </button>

                      <div className="pagination-pages">
                        {Array.from({ length: totalPages }, (_, index) => {
                          const page = index + 1
                          return (
                            <button
                              key={page}
                              className={`pagination-page ${page === currentPage ? 'active' : ''}`}
                              onClick={() => setCurrentPage(page)}
                              type="button"
                            >
                              {page}
                            </button>
                          )
                        })}
                      </div>

                      <button
                        className="pagination-button"
                        onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                        disabled={currentPage === totalPages}
                        type="button"
                      >
                        Next
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
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
              <p className="date-text">{formatDate(selected.taken_at)}</p>

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
      }
    
      .gallery-hero.header-card {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 320px;
        gap: 28px;
        align-items: stretch;
        padding: 18px 20px;
        border-radius: 36px;
        background: rgba(255, 255, 255, 0.82);
        backdrop-filter: blur(12px);
        box-shadow: 0 18px 45px rgba(63, 46, 22, 0.1);
        border: 1px solid rgba(112, 89, 48, 0.12);
        overflow: hidden;
      }
    
      .header-main {
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 18px 20px;
      }
    
      .hero-kicker,
      .person-kicker,
      .book-date-kicker {
        display: inline-block;
        align-self: flex-start;
        font-size: 12px;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        font-weight: 800;
        color: #8a6a34;
        background: #f3e7cf;
        padding: 10px 18px;
        border-radius: 999px;
      }
    
      .header-main .hero-kicker {
        margin-bottom: 18px;
      }
    
      .header-main h1 {
        margin: 0;
        font-size: clamp(46px, 6vw, 84px);
        line-height: 0.95;
        letter-spacing: -0.05em;
        font-weight: 800;
        color: #23160f;
      }
    
      .header-main p {
        margin: 22px 0 0 0;
        max-width: 900px;
        font-size: clamp(18px, 2vw, 27px);
        line-height: 1.35;
        color: #5e4d3d;
        font-weight: 500;
      }
    
      .header-stats {
        display: flex;
        flex-direction: column;
        gap: 16px;
        justify-content: center;
      }
    
      .hero-stat-card {
        border-radius: 28px;
        background: #f7f0e2;
        border: 1px solid #e2d0aa;
        padding: 22px 24px;
        min-height: 118px;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
    
      .hero-stat-card span {
        display: block;
        font-size: 44px;
        line-height: 1;
        font-weight: 800;
        color: #23160f;
      }
    
      .hero-stat-card small {
        display: block;
        margin-top: 8px;
        font-size: 18px;
        color: #665546;
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
    
      .search-input-wrap {
        width: 100%;
        max-width: 100%;
      }
    
      .search-input {
        width: 100%;
        max-width: 100%;
        display: block;
        box-sizing: border-box;
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
    
      .save-message {
        margin: 14px 0 0 0;
        color: #355f32;
        font-size: 14px;
      }
    
      .book-shell {
        max-width: 1400px;
        margin: 0 auto;
      }
    
      .book-column {
        position: relative;
      }
    
      .book-stack-shadow {
        position: absolute;
        inset: 12px 14px -10px 14px;
        border-radius: 34px;
        background: rgba(115, 85, 42, 0.08);
        filter: blur(16px);
        z-index: 0;
      }
    
      .book-body {
        position: relative;
        z-index: 1;
        padding-left: 152px;
      }
    
      .tabs-rail {
        position: absolute;
        left: 0;
        top: 34px;
        bottom: 34px;
        width: 180px;
        display: flex;
        align-items: flex-start;
        pointer-events: none;
      }
    
      .date-tabs {
        pointer-events: auto;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 12px;
        width: 100%;
      }
    
      .date-tab {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 3px;
        width: 132px;
        min-height: 92px;
        border: 1px solid #d9c8aa;
        border-right: none;
        background: #f9efdb;
        color: #2f2418;
        border-radius: 20px 0 0 20px;
        padding: 18px 16px 16px 18px;
        cursor: pointer;
        text-align: left;
        box-shadow: 0 10px 20px rgba(63, 46, 22, 0.07);
        transition: transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
      }
    
      .date-tab:hover {
        transform: translateX(-6px);
      }
    
      .date-tab.active {
        width: 146px;
        transform: translateX(-16px);
        background: #f3d4d0;
        border-color: #d7a4a0;
        box-shadow: 0 12px 24px rgba(101, 56, 52, 0.14);
      }
    
      .tab-label,
      .tab-year {
        display: block;
        font-weight: 800;
        line-height: 1.15;
      }
    
      .tab-label {
        font-size: 16px;
      }
    
      .tab-year {
        font-size: 16px;
      }
    
      .book-cover,
      .book-pages {
        position: relative;
        border-radius: 32px;
        background: #fffaf2;
        border: 1px solid rgba(118, 93, 52, 0.14);
        box-shadow: 0 26px 60px rgba(59, 43, 21, 0.16);
      }
    
      .book-cover {
        overflow: hidden;
        display: grid;
        grid-template-columns: 1fr;
      }
    
      .fixed-book-height {
        min-height: 760px;
        height: auto;
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
        justify-content: flex-start;
        padding: 52px 42px 42px 42px;
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
        font-size: clamp(42px, 7vw, 72px);
        line-height: 0.92;
        letter-spacing: -0.05em;
      }
    
      .cover-content p {
        margin: 0;
        font-size: 20px;
        opacity: 0.95;
      }
    
      .cover-locations {
        margin-top: 14px;
        display: grid;
        gap: 4px;
      }
    
      .open-book-button {
        margin-top: 20px;
        border: 1px solid rgba(255, 255, 255, 0.24);
        border-radius: 16px;
        padding: 14px 18px;
        background: rgba(255, 255, 255, 0.16);
        color: white;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        backdrop-filter: blur(6px);
      }
    
      .book-pages {
        overflow: visible;
        background: linear-gradient(90deg, #f4ead8 0%, #fffdf9 12%, #fffdf9 88%, #f4ead8 100%);
      }
    
      .book-pages-content {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-rows: auto 1fr auto;
        height: 100%;
        padding: 28px;
      }
    
      .book-toolbar {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 22px;
      }
    
      .toolbar-left {
        flex: 1;
        min-width: 0;
      }
    
      .toolbar-search {
        width: 360px;
        max-width: 100%;
        flex-shrink: 0;
      }
    
      .toolbar-search .search-label {
        margin-bottom: 8px;
      }
    
      .toolbar-search .search-input-wrap,
      .toolbar-search .search-input {
        width: 100%;
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
    
      .gallery-grid-wrap {
        min-height: 0;
        overflow: visible;
      }
    
      .gallery-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 22px;
      }
    
      .photo-card {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
        border-radius: 28px;
        background: rgba(255, 255, 255, 0.96);
        border: 1px solid rgba(118, 93, 52, 0.12);
        box-shadow: 0 18px 34px rgba(59, 43, 21, 0.1);
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
        aspect-ratio: 4 / 3;
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
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
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
    
      .uploader-avatar.fallback.large,
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
    
      .pagination {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        margin-top: 22px;
      }
    
      .pagination-pages {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 10px;
      }
    
      .pagination-button,
      .pagination-page {
        border: 1px solid #d6c19a;
        background: #f7ecd7;
        color: #6b5430;
        border-radius: 14px;
        padding: 10px 14px;
        font-weight: 700;
        cursor: pointer;
        min-width: 46px;
      }
    
      .pagination-page.active {
        background: #d7b67b;
        color: #2f2418;
        border-color: #c8a462;
      }
    
      .pagination-button:disabled,
      .pagination-page:disabled {
        opacity: 0.45;
        cursor: default;
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
    
      @media (min-width: 1200px) {
        .fixed-book-height {
          min-height: 1725px;
          height: auto;
        }
      }
    
      @media (max-width: 1199px) {
        .gallery-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    
        .fixed-book-height {
          height: auto;
        }
      }
    
      @media (max-width: 1100px) {
        .book-body {
          padding-left: 0;
        }
    
        .tabs-rail {
          position: static;
          width: 100%;
          margin-bottom: 14px;
        }
    
        .date-tabs {
          flex-direction: row;
          justify-content: flex-start;
          align-items: stretch;
          overflow-x: auto;
          padding-bottom: 8px;
        }
    
        .date-tab {
          min-width: 180px;
          width: 180px;
          min-height: auto;
          border-right: 1px solid #d9c8aa;
          border-radius: 18px;
        }
    
        .date-tab.active,
        .date-tab:hover {
          transform: none;
        }
      }
    
      @media (max-width: 1024px) {
        .gallery-hero.header-card {
          grid-template-columns: 1fr;
        }
    
        .header-stats {
          flex-direction: row;
        }
    
        .hero-stat-card {
          flex: 1;
          min-height: 100px;
        }
      }
    
      @media (max-width: 980px) {
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
      }
    
      @media (max-width: 900px) {
        .book-toolbar {
          flex-direction: column;
        }
    
        .toolbar-search {
          width: 100%;
        }
      }
    
      @media (max-width: 720px) {
        .gallery-grid {
          grid-template-columns: 1fr;
        }
    
        .pagination {
          flex-direction: column;
        }
    
        .book-pages-content {
          padding: 20px;
        }
      }
    
      @media (max-width: 640px) {
        .gallery-shell {
          padding: 14px;
        }
    
        .gallery-hero.header-card,
        .photo-card,
        .person-panel,
        .book-cover,
        .book-pages {
          border-radius: 22px;
        }
    
        .header-main {
          padding: 14px;
        }
    
        .header-stats {
          flex-direction: column;
        }
    
        .header-main h1 {
          font-size: clamp(38px, 12vw, 56px);
        }
    
        .header-main p {
          font-size: 18px;
        }
    
        .hero-stat-card span {
          font-size: 36px;
        }
    
        .hero-stat-card small {
          font-size: 16px;
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
    
        .cover-content {
          padding: 26px;
        }
    
        .cover-content h2 {
          font-size: 44px;
        }
      }
    `}</style>
    </div>
  )
}
