import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Upload, MapPin, Camera, UserRound, Pencil, BookOpen, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const samplePeople = [
  {
    id: 'MOTL233',
    name: 'Chip W.',
    fullName: 'Chip Ware',
    role: 'Guide',
    hometown: 'Houston, Texas, United States',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1200&auto=format&fit=crop',
    reflection:
      'Memory is not passive. It is something we carry, shape, and choose to keep alive together.',
  },
  {
    id: 'MOTL230',
    name: 'Shelley K.',
    fullName: 'Shelley Kier',
    role: 'Participant',
    hometown: 'Johannesburg, South Africa',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1200&auto=format&fit=crop',
    reflection:
      'This journey changed how I understand silence, family, and what it means to witness.',
  },
  {
    id: 'MOTL214',
    name: 'Judi M.',
    fullName: 'Judi Morris',
    role: 'Participant',
    hometown: 'Thornhill, Ontario, Canada',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=1200&auto=format&fit=crop',
    reflection:
      'Seeing these places in person gave shape to stories I had carried my whole life.',
  },
]

const samplePhotos = [
  {
    id: 'MEDIA001',
    attendeeId: 'MOTL233',
    uploadedBy: 'Chip W.',
    uploaderFullName: 'Chip Ware',
    uploaderAvatar: samplePeople[0].avatar,
    locationName: 'POLIN Museum of the History of Polish Jews',
    locationText: 'Warsaw, Poland',
    caption: 'Quiet, powerful, and impossibly layered.',
    date: 'April 18, 2026',
    editable: true,
    image: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?q=80&w=1600&auto=format&fit=crop',
  },
  {
    id: 'MEDIA002',
    attendeeId: 'MOTL230',
    uploadedBy: 'Shelley K.',
    uploaderFullName: 'Shelley Kier',
    uploaderAvatar: samplePeople[1].avatar,
    locationName: 'Old Town Market Square',
    locationText: 'Warsaw, Poland',
    caption: 'A city rebuilt, still carrying every scar.',
    date: 'April 18, 2026',
    editable: false,
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1600&auto=format&fit=crop',
  },
  {
    id: 'MEDIA003',
    attendeeId: 'MOTL214',
    uploadedBy: 'Judi M.',
    uploaderFullName: 'Judi Morris',
    uploaderAvatar: samplePeople[2].avatar,
    locationName: 'Nożyk Synagogue',
    locationText: 'Warsaw, Poland',
    caption: 'A moment of continuity in a city of rupture.',
    date: 'April 19, 2026',
    editable: false,
    image: 'https://images.unsplash.com/photo-1514894786521-454129113d0f?q=80&w=1600&auto=format&fit=crop',
  },
  {
    id: 'MEDIA004',
    attendeeId: 'MOTL233',
    uploadedBy: 'Chip W.',
    uploaderFullName: 'Chip Ware',
    uploaderAvatar: samplePeople[0].avatar,
    locationName: 'Majdanek',
    locationText: 'Lublin, Poland',
    caption: 'There are places where language simply fails.',
    date: 'April 20, 2026',
    editable: true,
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop',
  },
]

const pages = [
  { key: 'cover', title: 'Cover' },
  { key: 'directory', title: 'Our Group' },
  { key: 'gallery', title: 'Shared Memories' },
  { key: 'profile', title: 'My Page' },
  { key: 'upload', title: 'Add Photos' },
]

export default function MotlMemoryBookFlipbookUI() {
  const [pageIndex, setPageIndex] = useState(0)
  const [search, setSearch] = useState('')
  const [locationDrafts, setLocationDrafts] = useState<Record<string, string>>({
    MEDIA001: 'POLIN Museum of the History of Polish Jews',
    MEDIA004: 'Majdanek',
  })

  const filteredPhotos = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return samplePhotos
    return samplePhotos.filter((photo) => {
      return [
        photo.uploadedBy,
        photo.uploaderFullName,
        photo.locationName,
        photo.locationText,
        photo.caption,
        photo.date,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(q))
    })
  }, [search])

  const currentPage = pages[pageIndex]

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f7f1e4,white_40%,#efe6d2_100%)] text-stone-900 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-amber-50/80 px-4 py-1.5 text-sm font-medium text-amber-900 shadow-sm backdrop-blur">
              <BookOpen className="h-4 w-4" />
              MOTL 2026 · Group 2 Memory Book
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">A flip-book style memory archive that actually feels special</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-stone-600 md:text-lg">
              Designed for warmth, clarity, and emotional weight — with large controls, beautiful pages, profile photos,
              uploader badges, editable place names, and a gallery that feels like turning through a keepsake book instead
              of slogging through a cold database.
            </p>
          </div>

          <Card className="w-full max-w-sm rounded-[2rem] border-stone-200/80 bg-white/80 shadow-xl backdrop-blur">
            <CardContent className="p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">Core interactions</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <FeaturePill icon={UserRound} label="Profile photos" />
                <FeaturePill icon={ImageIcon} label="Flip-book pages" />
                <FeaturePill icon={Upload} label="Easy uploads" />
                <FeaturePill icon={MapPin} label="Editable POIs" />
              </div>
            </CardContent>
          </Card>
        </div>

        <section className="grid gap-6 xl:grid-cols-[260px_1fr]">
          <Card className="rounded-[2rem] border-stone-200/80 bg-white/80 shadow-xl backdrop-blur">
            <CardContent className="p-4">
              <p className="mb-4 px-2 text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">Table of contents</p>
              <div className="space-y-2">
                {pages.map((page, index) => {
                  const active = index === pageIndex
                  return (
                    <button
                      key={page.key}
                      onClick={() => setPageIndex(index)}
                      className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition ${
                        active
                          ? 'bg-stone-900 text-white shadow-md'
                          : 'bg-stone-100/80 text-stone-700 hover:bg-stone-200/80'
                      }`}
                    >
                      <span className="font-medium">{page.title}</span>
                      <span className={`text-xs ${active ? 'text-stone-300' : 'text-stone-500'}`}>{String(index + 1).padStart(2, '0')}</span>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <div className="relative overflow-hidden rounded-[2.5rem] border border-stone-200/80 bg-gradient-to-br from-white via-stone-50 to-[#f4ead7] shadow-[0_25px_80px_-20px_rgba(0,0,0,0.25)] min-h-[760px]">
            <div className="absolute inset-y-0 left-1/2 hidden w-px bg-stone-200/80 xl:block" />
            <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-stone-200/30 to-transparent" />
            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-stone-200/30 to-transparent" />

            <div className="flex items-center justify-between border-b border-stone-200/70 px-4 py-4 md:px-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">Page {pageIndex + 1}</p>
                <h2 className="text-2xl font-bold text-stone-900">{currentPage.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="rounded-2xl"
                  onClick={() => setPageIndex((prev) => Math.max(0, prev - 1))}
                  disabled={pageIndex === 0}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  className="rounded-2xl bg-stone-900 text-white hover:bg-stone-800"
                  onClick={() => setPageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
                  disabled={pageIndex === pages.length - 1}
                >
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage.key}
                initial={{ opacity: 0, rotateY: 12, x: 30 }}
                animate={{ opacity: 1, rotateY: 0, x: 0 }}
                exit={{ opacity: 0, rotateY: -10, x: -30 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="px-4 py-5 md:px-8 md:py-8"
                style={{ transformOrigin: 'center left' }}
              >
                {currentPage.key === 'cover' && <CoverSpread />}
                {currentPage.key === 'directory' && <DirectorySpread people={samplePeople} />}
                {currentPage.key === 'gallery' && (
                  <GallerySpread photos={filteredPhotos} search={search} setSearch={setSearch} />
                )}
                {currentPage.key === 'profile' && <ProfileSpread person={samplePeople[0]} />}
                {currentPage.key === 'upload' && (
                  <UploadSpread
                    myPerson={samplePeople[0]}
                    myPhotos={samplePhotos.filter((p) => p.attendeeId === 'MOTL233')}
                    locationDrafts={locationDrafts}
                    setLocationDrafts={setLocationDrafts}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      </div>
    </main>
  )
}

function FeaturePill({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-medium text-stone-700">
      <Icon className="h-4 w-4 text-stone-500" />
      <span>{label}</span>
    </div>
  )
}

function CoverSpread() {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-[2rem] bg-[linear-gradient(135deg,#3d2f1d_0%,#8f6b3a_55%,#dac28c_100%)] p-8 text-white shadow-xl">
        <p className="text-sm uppercase tracking-[0.25em] text-amber-100/80">Memory Book</p>
        <h3 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl">MOTL 2026<br />Group 2</h3>
        <p className="mt-6 max-w-md text-base leading-7 text-amber-50/90">
          A living archive of faces, places, witness, and shared memory — designed to feel intimate, respectful, and easy to use.
        </p>
      </div>

      <div className="grid gap-6">
        <Card className="rounded-[2rem] border-stone-200 bg-white/90 shadow-lg">
          <CardContent className="p-7">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">What this experience should feel like</p>
            <div className="mt-4 space-y-4 text-stone-700">
              <p>Large type. Obvious buttons. Warm pages. Nothing sterile.</p>
              <p>Each photo should feel connected to a human being, not just dumped into a gallery wall.</p>
              <p>When someone opens an image, they should immediately see who shared it, where it was taken, and why it matters.</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard number="32" label="Attendees" />
          <StatCard number="1,240+" label="Photos" />
          <StatCard number="5" label="Core pages" />
        </div>
      </div>
    </div>
  )
}

function DirectorySpread({ people }: { people: typeof samplePeople }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="rounded-[2rem] border-stone-200 bg-white/90 shadow-lg">
        <CardContent className="p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">Portrait Directory</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {people.map((person) => (
              <div key={person.id} className="rounded-[1.75rem] border border-stone-200 bg-stone-50 p-4 shadow-sm">
                <div className="flex items-start gap-4">
                  <img src={person.avatar} alt={person.fullName} className="h-16 w-16 rounded-2xl object-cover" />
                  <div>
                    <h3 className="text-lg font-bold text-stone-900">{person.name}</h3>
                    <p className="text-sm text-stone-600">{person.role}</p>
                    <p className="mt-2 text-sm text-stone-500">{person.hometown}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] border-stone-200 bg-white/90 shadow-lg">
        <CardContent className="p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">What each profile should include</p>
          <div className="mt-5 space-y-4 text-stone-700">
            <LineItem title="Profile photo upload" text="One obvious place to add or replace a portrait image." />
            <LineItem title="Contact visibility" text="Show or hide contact details without making the user hunt for it." />
            <LineItem title="Why I came" text="A meaningful prompt that gives context to each attendee’s page." />
            <LineItem title="Post-trip reflection" text="A place to hold what changed after the journey." />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function GallerySpread({ photos, search, setSearch }: { photos: typeof samplePhotos; search: string; setSearch: (v: string) => void }) {
  return (
    <div className="space-y-6">
      <Card className="rounded-[2rem] border-stone-200 bg-white/90 shadow-lg">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">Shared Memories</p>
              <p className="mt-1 text-stone-600">Search by uploader, place, caption, or date.</p>
            </div>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search photos, people, places..."
              className="max-w-md rounded-2xl border-stone-300 bg-stone-50"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {photos.map((photo) => (
          <Card key={photo.id} className="overflow-hidden rounded-[2rem] border-stone-200 bg-white/95 shadow-lg">
            <div className="relative">
              <img src={photo.image} alt={photo.caption} className="h-64 w-full object-cover" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-2xl bg-black/55 px-3 py-2 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <img src={photo.uploaderAvatar} alt={photo.uploaderFullName} className="h-10 w-10 rounded-xl object-cover ring-2 ring-white/40" />
                  <div>
                    <p className="text-sm font-semibold text-white">{photo.uploadedBy}</p>
                    <p className="text-xs text-white/80">Uploaded this photo</p>
                  </div>
                </div>
                <Camera className="h-5 w-5 text-white/80" />
              </div>
            </div>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-stone-900">{photo.locationName}</p>
                  <p className="mt-1 text-sm text-stone-600">{photo.locationText}</p>
                </div>
                <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">{photo.date}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-stone-700">{photo.caption}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function ProfileSpread({ person }: { person: (typeof samplePeople)[0] }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
      <Card className="rounded-[2rem] border-stone-200 bg-white/95 shadow-lg">
        <CardContent className="p-6">
          <img src={person.avatar} alt={person.fullName} className="h-80 w-full rounded-[1.75rem] object-cover" />
          <h3 className="mt-5 text-2xl font-bold text-stone-900">{person.fullName}</h3>
          <p className="mt-1 text-stone-600">{person.hometown}</p>
          <Button className="mt-5 w-full rounded-2xl bg-stone-900 text-white hover:bg-stone-800">
            <Upload className="mr-2 h-4 w-4" />
            Upload / Replace Profile Photo
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] border-stone-200 bg-white/95 shadow-lg">
        <CardContent className="space-y-5 p-6">
          <Field label="Email" value="chip@example.com" />
          <Field label="Phone" value="(555) 555-0199" />
          <Field label="Show my contact information" value="Yes" />
          <TextField
            label="Why did you come on the trip?"
            value="I came to guide, to witness, and to hold memory in community rather than in abstraction."
          />
          <TextField
            label="Post-trip reflection"
            value={person.reflection}
          />
          <div className="flex justify-end">
            <Button className="rounded-2xl bg-stone-900 text-white hover:bg-stone-800">Save Changes</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function UploadSpread({
  myPerson,
  myPhotos,
  locationDrafts,
  setLocationDrafts,
}: {
  myPerson: (typeof samplePeople)[0]
  myPhotos: typeof samplePhotos
  locationDrafts: Record<string, string>
  setLocationDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <Card className="rounded-[2rem] border-stone-200 bg-white/95 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <img src={myPerson.avatar} alt={myPerson.fullName} className="h-16 w-16 rounded-2xl object-cover" />
            <div>
              <h3 className="text-xl font-bold text-stone-900">Upload as {myPerson.name}</h3>
              <p className="text-sm text-stone-600">Your name and thumbnail appear on every photo you share.</p>
            </div>
          </div>

          <div className="mt-6 rounded-[1.75rem] border-2 border-dashed border-stone-300 bg-stone-50 p-8 text-center">
            <Upload className="mx-auto h-10 w-10 text-stone-500" />
            <p className="mt-4 text-base font-semibold text-stone-800">Drag and drop photos here</p>
            <p className="mt-2 text-sm text-stone-600">We’ll detect the date, location, and nearby site automatically.</p>
            <Button className="mt-5 rounded-2xl bg-stone-900 text-white hover:bg-stone-800">Choose Photos</Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-5">
        {myPhotos.map((photo) => (
          <Card key={photo.id} className="overflow-hidden rounded-[2rem] border-stone-200 bg-white/95 shadow-lg">
            <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
              <img src={photo.image} alt={photo.caption} className="h-full min-h-[260px] w-full object-cover" />
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img src={photo.uploaderAvatar} alt={photo.uploaderFullName} className="h-12 w-12 rounded-xl object-cover" />
                    <div>
                      <p className="font-semibold text-stone-900">{photo.uploaderFullName}</p>
                      <p className="text-sm text-stone-600">You uploaded this photo</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">Editable</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-stone-800">Detected location name</label>
                    <div className="flex gap-3">
                      <Input
                        value={locationDrafts[photo.id] ?? photo.locationName}
                        onChange={(e) =>
                          setLocationDrafts((prev) => ({
                            ...prev,
                            [photo.id]: e.target.value,
                          }))
                        }
                        className="rounded-2xl border-stone-300"
                      />
                      <Button variant="outline" className="rounded-2xl">
                        <Pencil className="mr-2 h-4 w-4" />
                        Save
                      </Button>
                    </div>
                  </div>

                  <Field label="General location" value={photo.locationText} />
                  <Field label="Date taken" value={photo.date} />
                  <TextField label="Caption" value={photo.caption} />
                </div>
              </CardContent>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function StatCard({ number, label }: { number: string; label: string }) {
  return (
    <Card className="rounded-[1.75rem] border-stone-200 bg-white/90 shadow-md">
      <CardContent className="p-5">
        <p className="text-3xl font-bold text-stone-900">{number}</p>
        <p className="mt-1 text-sm text-stone-600">{label}</p>
      </CardContent>
    </Card>
  )
}

function LineItem({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
      <p className="font-semibold text-stone-900">{title}</p>
      <p className="mt-1 text-sm leading-6 text-stone-600">{text}</p>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-stone-800">{label}</label>
      <Input value={value} readOnly className="rounded-2xl border-stone-300 bg-stone-50" />
    </div>
  )
}

function TextField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-stone-800">{label}</label>
      <Textarea value={value} readOnly rows={4} className="rounded-2xl border-stone-300 bg-stone-50" />
    </div>
  )
}
