'use client'

import { useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function GalleryClient({ media, attendees }: any) {
  const [search, setSearch] = useState('')
  const [lightbox, setLightbox] = useState<any>(null)
  const [draftLocations, setDraftLocations] = useState<Record<string, string>>({})

  const attendeeMap = useMemo(() => {
    const map = new Map()
    attendees.forEach((a: any) => map.set(a.attendee_id, a))
    return map
  }, [attendees])

  const items = useMemo(() => {
    return media.map((item: any) => {
      const person = attendeeMap.get(item.attendee_id)
      return {
        ...item,
        uploaderName: person ? `${person.first_name} ${person.last_name}` : 'Unknown',
        uploaderShortName: person
          ? `${person.first_name} ${person.last_name?.charAt(0)}.`
          : 'Unknown',
        uploaderAvatar: person?.profile_photo_url || null,
      }
    })
  }, [media, attendeeMap])

  const filtered = items.filter((i: any) =>
    (i.location_name || '').toLowerCase().includes(search.toLowerCase())
  )

  async function saveLocation(id: string) {
    const value = draftLocations[id]
    await supabase.from('media').update({ location_name: value }).eq('id', id)
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Gallery</h1>

      <input
        placeholder="Search location..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 20, padding: 8, width: '100%' }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {filtered.map((item: any) => (
          <div key={item.id}>
            <img
              src={item.file_url}
              style={{ width: '100%', cursor: 'pointer' }}
              onClick={() => setLightbox(item)}
            />
            <div>{item.uploaderShortName}</div>

            <input
              value={draftLocations[item.id] ?? item.location_name ?? ''}
              onChange={(e) =>
                setDraftLocations((prev) => ({ ...prev, [item.id]: e.target.value }))
              }
            />
            <button onClick={() => saveLocation(item.id)}>Save</button>
          </div>
        ))}
      </div>

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img src={lightbox.file_url} style={{ maxHeight: '90%', maxWidth: '90%' }} />
        </div>
      )}
    </div>
  )
}
