import { NextRequest, NextResponse } from 'next/server'
import { getProgress, saveProgress, calcLevel } from '@/lib/storage'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(await getProgress())
}

export async function POST(request: NextRequest) {
  try {
    const update = await request.json()
    const current = await getProgress()
    const merged = { ...current, ...update }

    if (update.totalXp !== undefined) {
      merged.level = calcLevel(merged.totalXp)
    }

    // Streak logic
    const today = new Date().toDateString()
    const lastStudied = current.lastStudied ? new Date(current.lastStudied).toDateString() : null
    const yesterday = new Date(Date.now() - 86400000).toDateString()

    if (lastStudied !== today) {
      merged.lastStudied = new Date().toISOString()
      if (lastStudied === yesterday) {
        merged.streak = (current.streak || 0) + 1
      } else if (lastStudied === null) {
        merged.streak = 1
      } else {
        merged.streak = 1
      }
    }

    await saveProgress(merged)
    return NextResponse.json(merged)
  } catch (err) {
    console.error('Progress error:', err)
    return NextResponse.json({ error: '진도 저장 실패' }, { status: 500 })
  }
}
