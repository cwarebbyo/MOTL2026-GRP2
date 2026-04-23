'use client'

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as exifr from 'exifr'
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
  [key: string]: any
}

type GalleryItem = MediaRow & {
  uploaderName: string
  uploaderShortName: string
  uploaderAvatar: string | null
  uploader: AttendeeRow | null
}

type RelationshipInfo = {
  attendee: AttendeeRow
  label: string
}

type DirectoryItem = {
  attendee: AttendeeRow
  shortName: string
  location: string
  avatar: string | null
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




function normalizeRelationshipLabel(value?: string | null) {
  const raw = (value || '').trim()
  if (!raw) return 'Relationship'
  return raw
    .split(/[_-]/g)
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : ''))
    .join(' ')
}

function maybeJsonParse(value: unknown) {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return value
  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

function extractRelationships(person: AttendeeRow | null, attendeeMap: Map<string, AttendeeRow>) {
  if (!person) return [] as RelationshipInfo[]

  const raw = typeof person.relationships === 'string' ? person.relationships.trim() : ''
  if (!raw) return [] as RelationshipInfo[]

  const collected: RelationshipInfo[] = []
  const seen = new Set<string>()

  for (const entry of raw.split(',')) {
    const trimmed = entry.trim()
    if (!trimmed) continue

    const dashIndex = trimmed.lastIndexOf('-')
    if (dashIndex === -1) continue

    const label = trimmed.slice(0, dashIndex).trim()
    const relatedId = trimmed.slice(dashIndex + 1).trim()

    if (!relatedId || !label || String(relatedId) === String(person.attendee_id)) continue

    const relatedPerson = attendeeMap.get(String(relatedId))
    if (!relatedPerson) continue

    const key = `${relatedPerson.attendee_id}:${String(label).toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)

    collected.push({
      attendee: relatedPerson,
      label: normalizeRelationshipLabel(String(label)),
    })
  }

  return collected
}

function isVideoMedia(item: Pick<MediaRow, 'file_type' | 'file_url'>) {
  return (item.file_type || '').toLowerCase().startsWith('video/') || /\.(mp4|mov|m4v|webm|ogg)$/i.test(item.file_url || '')
}

function getDisplayTimestamp(file: File, exifData: Record<string, any> | null) {
  const raw =
    exifData?.DateTimeOriginal ||
    exifData?.CreateDate ||
    exifData?.ModifyDate ||
    exifData?.DateTime ||
    null

  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw.toISOString()
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = new Date(raw)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
  }

  return new Date(file.lastModified || Date.now()).toISOString()
}

async function resizeImageFile(file: File) {
  const imageUrl = URL.createObjectURL(file)

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Could not read image.'))
      img.src = imageUrl
    })

    const maxDimension = 2000
    const width = image.naturalWidth || image.width
    const height = image.naturalHeight || image.height

    let targetWidth = width
    let targetHeight = height

    if (width > maxDimension || height > maxDimension) {
      const ratio = Math.min(maxDimension / width, maxDimension / height)
      targetWidth = Math.round(width * ratio)
      targetHeight = Math.round(height * ratio)
    }

    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight

    const context = canvas.getContext('2d')
    if (!context) throw new Error('Could not prepare image for upload.')

    context.drawImage(image, 0, 0, targetWidth, targetHeight)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result)
        else reject(new Error('Could not compress image.'))
      }, 'image/jpeg', 0.85)
    })

    const safeBase = (file.name || 'image').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'image'
    return new File([blob], `${safeBase}.jpg`, { type: 'image/jpeg' })
  } finally {
    URL.revokeObjectURL(imageUrl)
  }
}

function dedupeLocations(items: GalleryItem[]) {
  return Array.from(
    new Set(
      items
        .map((item) => (item.location_text || '').trim())
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
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginLastName, setLoginLastName] = useState('')
  const [loginBirthMonth, setLoginBirthMonth] = useState('')
  const [loginBirthDay, setLoginBirthDay] = useState('')
  const [loginBirthYear, setLoginBirthYear] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [selected, setSelected] = useState<GalleryItem | null>(null)
  const [selectedPerson, setSelectedPerson] = useState<AttendeeRow | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [draftLocations, setDraftLocations] = useState<Record<string, string>>({})
  const [draftCaptions, setDraftCaptions] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState('')
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)
  const [selectedSection, setSelectedSection] = useState<'date' | 'directory'>('date')
  const [bookView, setBookView] = useState<'cover' | 'pages'>('cover')
  const [currentPage, setCurrentPage] = useState(1)
  const [mediaItems, setMediaItems] = useState<MediaRow[]>(media)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedUploadFiles, setSelectedUploadFiles] = useState<File[]>([])
  const [uploadError, setUploadError] = useState('')
  const [uploadMessage, setUploadMessage] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [relationshipMap, setRelationshipMap] = useState<Record<string, string>>({})

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

  useEffect(() => {
    setMediaItems(media)
  }, [media])


useEffect(() => {
  let isMounted = true

  async function loadRelationships() {
    const { data, error } = await supabase
      .from('attendees')
      .select('attendee_id, relationships')

    if (!isMounted || error || !data) return

    const nextMap: Record<string, string> = {}
    data.forEach((person: { attendee_id: string; relationships?: string | null }) => {
      if (person.attendee_id) {
        nextMap[person.attendee_id] = person.relationships || ''
      }
    })

    setRelationshipMap(nextMap)
  }

  loadRelationships()

  return () => {
    isMounted = false
  }
}, [])

const mergedAttendees = useMemo(
  () =>
    attendees.map((person) => ({
      ...person,
      relationships:
        relationshipMap[person.attendee_id] !== undefined
          ? relationshipMap[person.attendee_id]
          : person.relationships,
    })),
  [attendees, relationshipMap]
)

const attendeeMap = useMemo(() => {
  const map = new Map<string, AttendeeRow>()
  mergedAttendees.forEach((person) => map.set(person.attendee_id, person))
  return map
}, [mergedAttendees])

const currentUser = useMemo(
  () => (currentUserId ? mergedAttendees.find((person) => person.attendee_id === currentUserId) || null : null),
  [mergedAttendees, currentUserId]
)

  const items = useMemo<GalleryItem[]>(() => {
    return mediaItems
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
  }, [mediaItems, attendeeMap])

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
        const imageItems = dayItems.filter((item) => !isVideoMedia(item))
        const coverPool = imageItems.length ? imageItems : dayItems
        const randomItem = coverPool[Math.floor(Math.random() * coverPool.length)] || null
        return {
          key,
          label: displayDateFromKey(key),
          count: dayItems.length,
          coverPhoto: randomItem && !isVideoMedia(randomItem) ? randomItem.file_url : null,
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

  const directoryItems = useMemo<DirectoryItem[]>(() => {
    const q = search.trim().toLowerCase()
    return mergedAttendees
      .slice()
      .sort((a, b) => formatShortName(a.first_name, a.last_name).localeCompare(formatShortName(b.first_name, b.last_name)))
      .filter((person) => {
        if (!q) return true
        return [
          formatShortName(person.first_name, person.last_name),
          personLocation(person),
          person.role || '',
          person.city || '',
          person.state || '',
          person.country || '',
        ].some((value) => value.toLowerCase().includes(q))
      })
      .map((person) => ({
        attendee: person,
        shortName: formatShortName(person.first_name, person.last_name),
        location: personLocation(person) || 'Location not shared',
        avatar: person.profile_photo_url || null,
      }))
  }, [mergedAttendees, search])

  const directoryTotalPages = Math.max(1, Math.ceil(directoryItems.length / PHOTOS_PER_PAGE))

  const paginatedDirectoryItems = useMemo(() => {
    const start = (currentPage - 1) * PHOTOS_PER_PAGE
    return directoryItems.slice(start, start + PHOTOS_PER_PAGE)
  }, [directoryItems, currentPage])
 
  const resolvedSelectedPerson = useMemo(
    () => (selectedPerson ? attendeeMap.get(selectedPerson.attendee_id) || selectedPerson : null),
    [selectedPerson, attendeeMap]
  )

  const selectedPersonRelationships = useMemo(
    () => extractRelationships(resolvedSelectedPerson, attendeeMap),
    [resolvedSelectedPerson, attendeeMap]
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedDateKey, selectedSection, search])

  useEffect(() => {
    setSearch('')
  }, [selectedDateKey, selectedSection])

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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setIsLoggingIn(true)
    setLoginError('')

    if (
      loginBirthMonth.length !== 2 ||
      loginBirthDay.length !== 2 ||
      loginBirthYear.length !== 4
    ) {
      setLoginError('Please enter your full date of birth as month, day, and year.')
      setIsLoggingIn(false)
      return
    }

    const dob = `${loginBirthYear.padStart(4, '0')}-${loginBirthMonth.padStart(2, '0')}-${loginBirthDay.padStart(2, '0')}`

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lastName: loginLastName,
          dob,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setLoginError(data.error || 'Login failed.')
        return
      }

      localStorage.setItem('attendee', JSON.stringify(data.attendee))
      setCurrentUserId(data.attendee.attendee_id)
      setShowLoginModal(false)
      setLoginLastName('')
      setLoginBirthMonth('')
      setLoginBirthDay('')
      setLoginBirthYear('')
      setLoginError('')
    } catch {
      setLoginError('Something went wrong. Please try again.')
    } finally {
      setIsLoggingIn(false)
    }
  }


  function handleUploadSelection(e: ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(e.target.files || [])
    setSelectedUploadFiles(nextFiles.slice(0, 10))
    setUploadError(nextFiles.length > 10 ? 'You can upload up to 10 files at a time.' : '')
    setUploadMessage('')
  }

  async function prepareFileForUpload(file: File) {
    const isVideo = file.type.startsWith('video/')

    if (isVideo) {
      if (file.size > 50 * 1024 * 1024) {
        throw new Error(`${file.name} is larger than 50MB.`)
      }

      return {
        file,
        takenAt: new Date(file.lastModified || Date.now()).toISOString(),
        gpsLat: null as number | null,
        gpsLon: null as number | null,
      }
    }

    const exifData = await exifr.parse(file, true).catch(() => null)
    const latitude = typeof exifData?.latitude === 'number' ? exifData.latitude : null
    const longitude = typeof exifData?.longitude === 'number' ? exifData.longitude : null
    const resized = await resizeImageFile(file)

    return {
      file: resized,
      takenAt: getDisplayTimestamp(file, exifData),
      gpsLat: latitude,
      gpsLon: longitude,
    }
  }

  async function handleUploadSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!currentUserId) {
      setUploadError('Please log in before uploading media.')
      return
    }

    if (!selectedUploadFiles.length) {
      setUploadError('Choose at least one file to upload.')
      return
    }

    if (selectedUploadFiles.length > 10) {
      setUploadError('You can upload up to 10 files at a time.')
      return
    }

    setIsUploading(true)
    setUploadError('')
    setUploadMessage('Preparing your files...')

    const uploaded: MediaRow[] = []

    try {
      for (let index = 0; index < selectedUploadFiles.length; index += 1) {
        const originalFile = selectedUploadFiles[index]
        setUploadMessage(`Uploading ${index + 1} of ${selectedUploadFiles.length}...`)

        const prepared = await prepareFileForUpload(originalFile)
        const formData = new FormData()
        formData.append('file', prepared.file)
        formData.append('attendee_id', currentUserId)
        formData.append('taken_at', prepared.takenAt)
        if (prepared.gpsLat !== null) formData.append('gps_lat', String(prepared.gpsLat))
        if (prepared.gpsLon !== null) formData.append('gps_lon', String(prepared.gpsLon))

        const res = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData,
        })

        const json = await res.json()
        if (!res.ok) {
          throw new Error(json.error || `Upload failed for ${originalFile.name}.`)
        }

        uploaded.push(json.media)
      }

      if (uploaded.length) {
        setMediaItems((prev) => [...uploaded, ...prev])
        setSelectedDateKey(dateKey(uploaded[0]?.taken_at))
        setBookView('pages')
        setCurrentPage(1)
      }

      setSelectedUploadFiles([])
      setShowUploadModal(false)
      setUploadMessage(`${uploaded.length} item${uploaded.length === 1 ? '' : 's'} uploaded successfully.`)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Something went wrong while uploading.')
    } finally {
      setIsUploading(false)
    }
  }

  function openPerson(person: AttendeeRow | null, e?: React.MouseEvent) {
    if (e) e.stopPropagation()
    if (!person) return
    setSelectedPerson(person)
  }

  function canDeleteMedia(item: GalleryItem) {
    if (!currentUserId || !currentUser) return false

    const normalizedRole = (currentUser.role || '').trim().toLowerCase()
    const hasElevatedRole = normalizedRole !== '' && normalizedRole !== 'participant'
    const isOwner = currentUserId === item.attendee_id

    return isOwner || hasElevatedRole
  }

  async function handleDeleteMedia(item: GalleryItem) {
    if (!canDeleteMedia(item)) return

    const confirmed = window.confirm('Delete this photo or video from the memory book?')
    if (!confirmed) return

    setDeletingId(item.id)
    setDeleteError('')

    try {
      const res = await fetch('/api/media/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId: item.id,
          attendeeId: currentUserId,
        }),
      })

      const contentType = res.headers.get('content-type') || ''
      const json = contentType.includes('application/json') ? await res.json() : null

      if (!res.ok) {
        setDeleteError(json?.error || 'Could not delete this media.')
        return
      }

      setMediaItems((prev) => prev.filter((mediaItem) => mediaItem.id !== item.id))
      setSelected((prev) => (prev?.id === item.id ? null : prev))
      setDeleteError('')
    } catch {
      setDeleteError('Something went wrong while deleting this media.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="gallery-shell">
      <div className="gallery-hero header-card">
        <div className="header-main">
          <div className="hero-kicker">MOTL 2026 · Group 2</div>
          <div className="header-mobile-action top">
            {currentUserId ? (
              <button
                className="header-action-button"
                onClick={() => router.push('/me')}
                type="button"
              >
                Welcome, {formatShortName(currentUser?.first_name, currentUser?.last_name)}
              </button>
            ) : (
              <button
                className="header-action-button"
                onClick={() => {
                  setLoginError('')
                  setShowLoginModal(true)
                }}
                type="button"
              >
                Login
              </button>
            )}
          </div>
          <h1>Our Shared Experience</h1>
          <p>Browse each day to relive our experience in the way it originally unfolded.</p>

          <div className="header-stats-pill">
            <span>{items.length} Photos</span>
            <span className="stats-divider">•</span>
            <span>{new Set(items.map((i) => i.attendee_id)).size} Contributors</span>
          </div>
        </div>

        <div className="header-side">
          <div className="header-action desktop-only">
            {currentUserId ? (
              <button
                className="header-action-button"
                onClick={() => router.push('/me')}
                type="button"
              >
                Welcome, {formatShortName(currentUser?.first_name, currentUser?.last_name)}
              </button>
            ) : (
              <button
                className="header-action-button"
                onClick={() => {
                  setLoginError('')
                  setShowLoginModal(true)
                }}
                type="button"
              >
                Login
              </button>
            )}
          </div>
          
          <div className="header-action">
            {currentUserId ? (
              <button
                className="header-action-button secondary"
                onClick={() => {
                  setUploadError('')
                  setUploadMessage('')
                  setSelectedUploadFiles([])
                  setShowUploadModal(true)
                }}
                type="button"
              >
                Upload Photos / Videos
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className={`book-shell ${bookView === 'pages' ? 'open' : ''}`}>
        <div className="book-column">
          <div className="book-stack-shadow" />

          <div className="book-body">
            <div className="tabs-select-wrap">
              <label className="tabs-select-label" htmlFor="date-tab-select">Browse by date</label>
              <div className="tabs-select-shell">
                <select
                  id="date-tab-select"
                  className="tabs-select"
                  value={selectedSection === 'directory' ? '__directory__' : selectedDateKey || ''}
                  onChange={(e) => {
                    if (e.target.value === '__directory__') {
                      setSelectedSection('directory')
                      setBookView('pages')
                    } else {
                      setSelectedSection('date')
                      setSelectedDateKey(e.target.value)
                      setBookView('cover')
                    }
                  }}
                >
                  <option value="__directory__">Directory</option>
                  {dateTabs.map((tab) => (
                    <option key={tab.key} value={tab.key}>
                      {tab.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="tabs-rail">
              <div className="date-tabs">
                <button
                  className={`date-tab directory-tab ${selectedSection === 'directory' ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedSection('directory')
                    setBookView('pages')
                  }}
                  type="button"
                >
                  <span className="tab-label">Directory</span>
                  <span className="tab-year">Travelers</span>
                </button>

                {dateTabs.map((tab) => {
                  const parts = splitDateLabel(tab.label)
                  return (
                    <button
                      key={tab.key}
                      className={`date-tab ${selectedDateKey === tab.key ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedSection('date')
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

            {selectedSection === 'date' && bookView === 'cover' ? (
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
                      <div className="book-date-kicker">{selectedSection === 'directory' ? 'Directory' : 'Day View'}</div>
                      <h3>{selectedSection === 'directory' ? 'Trip Directory' : selectedDateTab?.label || 'Select a date'}</h3>
                      <p>
                        {selectedSection === 'directory'
                          ? `${directoryItems.length} traveler${directoryItems.length === 1 ? '' : 's'}${directoryTotalPages > 1 ? ` · Page ${currentPage} of ${directoryTotalPages}` : ''}`
                          : `${filteredItems.length} photo${filteredItems.length === 1 ? '' : 's'}${totalPages > 1 ? ` · Page ${currentPage} of ${totalPages}` : ''}`}
                      </p>
                    </div>

                    <div className="toolbar-search">
                      <label className="search-label">Search</label>
                      <div className="search-input-wrap">
                        <input
                          className="search-input"
                          placeholder={selectedSection === 'directory' ? 'Search travelers by name, location, or role' : 'Search this day by person, place, caption, or date'}
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          type="text"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="gallery-grid-wrap">
                    <div className="gallery-grid">
                      {selectedSection === 'directory'
                        ? paginatedDirectoryItems.map((item) => (
                            <article key={item.attendee.attendee_id} className="photo-card">
                              <button className="image-button" onClick={() => setSelectedPerson(item.attendee)} type="button">
                                {item.avatar ? (
                                  <img src={item.avatar} alt={item.shortName} className="photo-image" />
                                ) : (
                                  <div className="photo-image directory-fallback-image">{item.shortName.charAt(0)}</div>
                                )}
                              </button>

                              <div className="photo-body">
                                <div className="photo-topline">
                                  <div>
                                    <h3>{item.shortName}</h3>
                                    <p>{item.location}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="uploader-badge">
                                <button
                                  className="avatar-button"
                                  onClick={(e) => openPerson(item.attendee, e)}
                                  aria-label={`Open ${item.shortName}'s profile`}
                                  type="button"
                                >
                                  {item.avatar ? (
                                    <img src={item.avatar} alt={item.shortName} className="uploader-avatar" />
                                  ) : (
                                    <div className="uploader-avatar fallback">{item.shortName.charAt(0)}</div>
                                  )}
                                </button>
                                <div className="uploader-meta">
                                  <strong>{item.shortName}</strong>
                                  <span>{(item.attendee.role || '').trim() || 'Traveler'}</span>
                                </div>
                              </div>
                            </article>
                          ))
                        : paginatedItems.map((item) => (
                            <article key={item.id} className="photo-card">
                              <button className="image-button" onClick={() => setSelected(item)} type="button">
                                {isVideoMedia(item) ? (
                                  <video src={item.file_url} className="photo-image" muted playsInline preload="metadata" />
                                ) : (
                                  <img
                                    src={item.file_url}
                                    alt={item.caption || item.location_name || item.location_text || 'Memory photo'}
                                    className="photo-image"
                                  />
                                )}
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
                                  <span>Uploaded this memory</span>
                                </div>
                              </div>
                            </article>
                          ))}
                    </div>
                  </div>

                  {(selectedSection === 'directory' ? directoryTotalPages : totalPages) > 1 ? (
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
                        {Array.from({ length: selectedSection === 'directory' ? directoryTotalPages : totalPages }, (_, index) => {
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
                        onClick={() => setCurrentPage((page) => Math.min(selectedSection === 'directory' ? directoryTotalPages : totalPages, page + 1))}
                        disabled={currentPage === (selectedSection === 'directory' ? directoryTotalPages : totalPages)}
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

      {showLoginModal ? (
        <div className="person-lightbox" onClick={() => setShowLoginModal(false)}>
          <div className="login-panel" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={() => setShowLoginModal(false)} type="button">
              ×
            </button>

            <div className="person-kicker">Attendee Login</div>
            <h2>Log in to your profile</h2>
            <p className="login-helper">
              Enter your last name and date of birth to access your profile.
            </p>

            <form onSubmit={handleLogin} className="login-form">
              <div className="login-field">
                <label>Last Name</label>
                <input
                  type="text"
                  value={loginLastName}
                  onChange={(e) => setLoginLastName(e.target.value)}
                  autoComplete="family-name"
                  required
                />
              </div>

              <div className="login-field">
                <label>Date of Birth</label>
                <div className="dob-grid">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={2}
                    placeholder="MM"
                    value={loginBirthMonth}
                    onChange={(e) => setLoginBirthMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
                    required
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={2}
                    placeholder="DD"
                    value={loginBirthDay}
                    onChange={(e) => setLoginBirthDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
                    required
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    placeholder="YYYY"
                    value={loginBirthYear}
                    onChange={(e) => setLoginBirthYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    required
                  />
                </div>
              </div>

              {loginError ? <p className="login-error">{loginError}</p> : null}

              <button className="save-button" type="submit" disabled={isLoggingIn}>
                {isLoggingIn ? 'Logging in…' : 'Login'}
              </button>
            </form>
          </div>
        </div>
      ) : null}


      {showUploadModal ? (
        <div className="person-lightbox" onClick={() => !isUploading && setShowUploadModal(false)}>
          <div className="upload-panel" onClick={(e) => e.stopPropagation()}>
            <button
              className="close-button"
              onClick={() => !isUploading && setShowUploadModal(false)}
              type="button"
            >
              ×
            </button>

            <div className="person-kicker">Memory Book Upload</div>
            <h2>Add photos or videos</h2>
            <p className="login-helper upload-helper">
              Upload up to 10 files at a time. Images are resized to a maximum width or height of 2000px and saved as JPEG at 85% quality. Videos are uploaded as-is and must be 50MB or smaller.
            </p>

            <form onSubmit={handleUploadSubmit} className="upload-form">
              <label className="upload-dropzone">
                <input
                  className="upload-input"
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleUploadSelection}
                  disabled={isUploading}
                />
                <span>Choose up to 10 photos or videos</span>
                <small>JPEG, HEIC, PNG, MP4, MOV and similar formats are fine.</small>
              </label>

              {selectedUploadFiles.length ? (
                <div className="upload-file-list">
                  {selectedUploadFiles.map((file) => (
                    <div key={`${file.name}-${file.lastModified}`} className="upload-file-item">
                      <strong>{file.name}</strong>
                      <span>{file.type.startsWith('video/') ? 'Video' : 'Image'} · {(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {uploadError ? <p className="login-error">{uploadError}</p> : null}
              {uploadMessage ? <p className="upload-message">{uploadMessage}</p> : null}

              <button className="save-button" type="submit" disabled={isUploading || !selectedUploadFiles.length}>
                {isUploading ? 'Uploading…' : 'Upload to Memory Book'}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {selected ? (
        <div className="lightbox" onClick={() => setSelected(null)}>
          <div className="lightbox-panel" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={() => setSelected(null)} type="button">
              ×
            </button>

            <div className="lightbox-image-wrap">
              {isVideoMedia(selected) ? (
                <video src={selected.file_url} className="lightbox-image" controls playsInline preload="metadata" />
              ) : (
                <img
                  src={selected.file_url}
                  alt={selected.caption || selected.location_name || selected.location_text || 'Memory photo'}
                  className="lightbox-image"
                />
              )}
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
                  <span>Uploaded this memory</span>
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

              {selected && canDeleteMedia(selected) ? (
                <div className="delete-block">
                  <button
                    className="delete-button"
                    onClick={() => handleDeleteMedia(selected)}
                    disabled={deletingId === selected.id}
                    type="button"
                  >
                    {deletingId === selected.id ? 'Deleting…' : 'Delete from Memory Book'}
                  </button>
                  {deleteError ? <p className="delete-error">{deleteError}</p> : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {selectedPerson ? (
        <div className="lightbox" onClick={() => setSelectedPerson(null)}>
          <div className="lightbox-panel person-detail-panel" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={() => setSelectedPerson(null)} type="button">
              ×
            </button>

            <div className="lightbox-image-wrap person-detail-image-wrap">
              {selectedPerson.profile_photo_url ? (
                <img
                  src={selectedPerson.profile_photo_url}
                  alt={formatShortName(selectedPerson.first_name, selectedPerson.last_name)}
                  className="lightbox-image"
                />
              ) : (
                <div className="lightbox-image directory-fallback-image large">
                  {formatShortName(selectedPerson.first_name, selectedPerson.last_name).charAt(0)}
                </div>
              )}
            </div>

            <div className="lightbox-info person-detail-info">
              <div className="person-kicker">{(selectedPerson.role || '').trim() || 'Traveler'}</div>

              <h2>{formatShortName(selectedPerson.first_name, selectedPerson.last_name)}</h2>
              <p className="location-text">{personLocation(selectedPerson) || 'Location not shared'}</p>

              <div className="person-section">
                <h3>About this traveler</h3>
                <p>{selectedPerson.why_did_you_come || 'No “why I came” response has been added yet.'}</p>
              </div>

              <div className="person-section">
                <h3>Post-trip reflection</h3>
                <p>{selectedPerson.post_trip_reflection || 'No reflection has been added yet.'}</p>
              </div>

              {selectedPersonRelationships.length ? (
                <div className="person-section">
                  <h3>Relationships</h3>
                  <div className="relationship-pill-list">
                    {selectedPersonRelationships.map((relationship) => (
                      <button
                        key={`${relationship.attendee.attendee_id}-${relationship.label}`}
                        className="relationship-pill"
                        onClick={() => setSelectedPerson(relationship.attendee)}
                        type="button"
                      >
                        {relationship.attendee.profile_photo_url ? (
                          <img
                            src={relationship.attendee.profile_photo_url}
                            alt={formatShortName(relationship.attendee.first_name, relationship.attendee.last_name)}
                            className="relationship-avatar"
                          />
                        ) : (
                          <div className="relationship-avatar fallback">
                            {formatShortName(relationship.attendee.first_name, relationship.attendee.last_name).charAt(0)}
                          </div>
                        )}
                        <span className="relationship-copy">
                          <strong>{formatShortName(relationship.attendee.first_name, relationship.attendee.last_name)}</strong>
                          <small>{relationship.label}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {selectedPerson.show_contact ? (
                <div className="person-section">
                  <h3>Contact information</h3>
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

      .header-mobile-action {
        display: none;
      }

      .header-side {
        display: flex;
        flex-direction: column;
        gap: 16px;
        justify-content: center;
      }

      .desktop-only {
        display: block;
      }

      .header-action {
        width: 100%;
      }

      .header-action-stack {
        display: grid;
        gap: 10px;
      }

      .header-action-button {
        width: 100%;
        border: 1px solid #d6c19a;
        background: #f7ecd7;
        color: #6b5430;
        border-radius: 18px;
        padding: 18px 20px;
        font-size: 16px;
        font-weight: 800;
        cursor: pointer;
        text-align: center;
        box-shadow: 0 10px 22px rgba(83, 62, 28, 0.08);
      }

      .header-action-button.secondary {
        background: #fff8ec;
      }

      .header-action-button:hover {
        background: #f1e3c5;
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

      .header-stats-pill {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        align-self: flex-start;
        margin-top: 18px;
        padding: 12px 18px;
        border-radius: 999px;
        background: #f7f0e2;
        border: 1px solid #e2d0aa;
        color: #6b5430;
        font-size: 14px;
        font-weight: 700;
        box-shadow: 0 8px 18px rgba(83, 62, 28, 0.06);
      }

      .stats-divider {
        opacity: 0.5;
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
    
      .tabs-select-wrap {
        display: none;
        margin-bottom: 16px;
      }

      .tabs-select-label {
        display: block;
        margin-bottom: 8px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #7b6545;
      }

      .tabs-select-shell {
        position: relative;
      }

      .tabs-select-shell::after {
        content: '▾';
        position: absolute;
        right: 16px;
        top: 50%;
        transform: translateY(-50%);
        color: #7b6545;
        font-size: 16px;
        pointer-events: none;
      }

      .tabs-select {
        width: 100%;
        appearance: none;
        -webkit-appearance: none;
        display: block;
        box-sizing: border-box;
        padding: 16px 44px 16px 18px;
        border-radius: 18px;
        border: 1px solid #d7c6a8;
        background: #fffdf8;
        color: #231a12;
        font-size: 16px;
        font-weight: 600;
        outline: none;
        box-shadow: 0 10px 24px rgba(59, 43, 21, 0.08);
      }

      .tabs-select:focus {
        border-color: #b78b43;
        box-shadow: 0 0 0 3px rgba(183, 139, 67, 0.12);
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

      .directory-fallback-image {
        display: flex;
        align-items: center;
        justify-content: center;
        background: #eadfc9;
        color: #6d5735;
        font-size: 54px;
        font-weight: 800;
      }

      .directory-fallback-image.large {
        font-size: 96px;
      }

      .directory-tab {
        background: #efe4cf;
        border-color: #d8c29a;
      }

      .directory-tab.active {
        background: #d9e3f0;
        border-color: #a9bdd7;
        box-shadow: 0 12px 24px rgba(53, 74, 107, 0.14);
      }

      .person-detail-panel {
        max-width: 1200px;
        display: grid;
        grid-template-columns: 1.15fr 0.85fr;
      }

      .person-detail-image-wrap {
        background: #ede2cf;
      }

      .person-detail-info {
        overflow: auto;
      }

      .relationship-pill-list {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }

      .relationship-pill {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        border: 1px solid #eadcc1;
        background: #fbf5ea;
        border-radius: 999px;
        padding: 8px 12px 8px 8px;
        cursor: pointer;
        text-align: left;
      }

      .relationship-avatar {
        width: 42px;
        height: 42px;
        border-radius: 999px;
        object-fit: cover;
        background: #d7c5a8;
        flex-shrink: 0;
      }

      .relationship-avatar.fallback {
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        color: #3a2d1c;
      }

      .relationship-copy {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .relationship-copy strong {
        font-size: 14px;
        color: #231a12;
      }

      .relationship-copy small {
        font-size: 12px;
        color: #6e5d4c;
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
    
      .login-panel {
        position: relative;
        width: 100%;
        max-width: 560px;
        padding: 28px;
        border-radius: 30px;
        background: #fffdf9;
        box-shadow: 0 30px 80px rgba(0, 0, 0, 0.28);
      }

      .login-panel h2 {
        margin: 16px 0 8px 0;
        font-size: 34px;
        line-height: 1.05;
        letter-spacing: -0.04em;
      }

      .login-helper {
        margin: 0 0 22px 0;
        color: #6b5b4b;
        line-height: 1.6;
      }

      .login-form {
        display: grid;
        gap: 16px;
      }

      .login-field label {
        display: block;
        margin-bottom: 8px;
        font-size: 13px;
        font-weight: 700;
        color: #715d42;
      }

      .login-field input {
        width: 100%;
        min-width: 0;
        padding: 12px 14px;
        border-radius: 14px;
        border: 1px solid #dbc8a8;
        background: #fffdf9;
        font-size: 14px;
        box-sizing: border-box;
      }

      .login-error {
        margin: 0;
        color: #8b2f2f;
        font-size: 14px;
      }

      .upload-panel {
        position: relative;
        width: 100%;
        max-width: 640px;
        padding: 28px;
        border-radius: 30px;
        background: #fffdf9;
        box-shadow: 0 30px 80px rgba(0, 0, 0, 0.28);
      }

      .upload-helper {
        max-width: 560px;
      }

      .upload-form {
        display: grid;
        gap: 16px;
      }

      .upload-dropzone {
        display: grid;
        gap: 8px;
        border: 1px dashed #d6c19a;
        border-radius: 20px;
        padding: 24px;
        background: #fff8ec;
        color: #6b5430;
        cursor: pointer;
      }

      .upload-dropzone span {
        font-size: 18px;
        font-weight: 700;
        color: #2f2418;
      }

      .upload-dropzone small {
        color: #7a684f;
        line-height: 1.6;
      }

      .upload-input {
        display: none;
      }

      .upload-file-list {
        display: grid;
        gap: 10px;
        max-height: 220px;
        overflow: auto;
      }

      .upload-file-item {
        display: grid;
        gap: 4px;
        padding: 12px 14px;
        border-radius: 14px;
        background: #fbf5ea;
        border: 1px solid #eadcc1;
      }

      .upload-file-item strong {
        font-size: 14px;
        color: #2f2418;
        word-break: break-word;
      }

      .upload-file-item span {
        font-size: 12px;
        color: #6e5d4c;
      }

      .upload-message {
        margin: 0;
        color: #6c5632;
        font-size: 14px;
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
    
        .tabs-select-wrap {
          display: block;
        }

        .tabs-rail {
          display: none;
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

        .header-side {
          width: 100%;
          gap: 14px;
        }

        .desktop-only {
          display: none;
        }

        .header-mobile-action {
          display: block;
          width: 100%;
          margin: 0 0 14px 0;
        }

        .header-action-button {
          width: 100%;
          padding: 16px 18px;
          font-size: 16px;
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

        .login-panel {
          padding: 20px;
          border-radius: 22px;
        }

        .header-main {
          order: 1;
        }

        .header-side {
          order: 2;
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
