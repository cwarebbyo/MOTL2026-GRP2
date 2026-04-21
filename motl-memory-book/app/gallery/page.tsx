export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '../../lib/supabase-admin'

export default async function GalleryPage() {
  const { data } = await supabaseAdmin.from('media').select('*')

  return (
    <div>
      <h2>Gallery</h2>
      {data?.map((m: any) => (
        <div key={m.id}>
          <img src={m.file_url} width={300} />
          <p>{m.location_name}</p>
        </div>
      ))}
    </div>
  )
}
