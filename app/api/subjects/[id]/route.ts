import { NextRequest, NextResponse } from 'next/server'
import { getSubjects, getSubjectContent, deleteSubject } from '@/lib/storage'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const subject = getSubjects().find(s => s.id === params.id)
  if (!subject) return NextResponse.json({ error: '자료를 찾을 수 없습니다' }, { status: 404 })
  const content = getSubjectContent(params.id)
  return NextResponse.json({ subject, cards: content?.cards || [] })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  deleteSubject(params.id)
  return NextResponse.json({ ok: true })
}
