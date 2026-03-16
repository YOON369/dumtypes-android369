import { NextResponse } from 'next/server'
import { getSubjects } from '@/lib/storage'

export const dynamic = 'force-dynamic'

export async function GET() {
  const subjects = await getSubjects()
  return NextResponse.json(subjects)
}
