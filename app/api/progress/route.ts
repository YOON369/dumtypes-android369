import { NextRequest, NextResponse } from 'next/server'
import { getProgress, saveProgress, calcLevel } from '@/lib/storage'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(getProgress())
}

export async function POST(request: NextRequest) {
  try {
    const update = await request.json()
    const current = getProgress()

    const merged = { ...current, ...update }
    if (update.totalXp !== undefined) {
      merged.level = calcLevel(merged.totalXp)
    }

    // Check & update streak
    const today = new Date().toDateString()
    const lastStudied = current.lastStudied ? new Date(current.lastStudied).toDateString() : null
    const yesterday = new Date(Date.now() - 86400000).toDateString()

    if (lastStudied !== today) {
      merged.lastStudied = new Date().toISOString()
      if (lastStudied === yesterday) {
        merged.streak = (current.streak || 0) + 1
      } else if (lastStudied !== today) {
        // Reset streak if more than 1 day gap (unless it's the first time today)
        if (lastStudied !== yesterday && lastStudied !== null) {
          merged.streak = 1
        } else if (lastStudied === null) {
          merged.streak = 1
        }
      }
    }

    saveProgress(merged)
    return NextResponse.json(merged)
  } catch (err) {
    console.error('Progress update error:', err)
    return NextResponse.json({ error: '진도 저장 실패' }, { status: 500 })
  }
}
