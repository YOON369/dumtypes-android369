import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Progress is now stored client-side in localStorage.
// This endpoint returns a default so old fetch calls don't break.
export async function GET() {
  return NextResponse.json({ totalXp: 0, level: 1, streak: 0, lastStudied: null, subjects: {}, badges: [] })
}
