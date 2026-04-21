import Link from 'next/link'

export default function Home() {
  return (
    <div>
      <h1>MOTL 2026 – Group 2 Memory Book</h1>
      <Link href="/login">Login</Link><br/>
      <Link href="/gallery">View Gallery</Link>
    </div>
  )
}