import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Quiz is now generated client-side. This endpoint is kept as a stub.
export async function POST() {
  return NextResponse.json({ questions: [] })
}
