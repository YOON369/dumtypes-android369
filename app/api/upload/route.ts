import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { extractCardsFromPdf } from '@/lib/pdf-processor'
import { getSubjects, saveSubjects, saveSubjectContent, getUploadsDir } from '@/lib/storage'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const title = formData.get('title') as string | null
    const description = (formData.get('description') as string) || ''

    if (!file || !title) {
      return NextResponse.json({ error: '파일과 제목은 필수입니다' }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'PDF 파일만 업로드 가능합니다' }, { status: 400 })
    }

    const id = uuidv4()
    const filename = `${id}.pdf`
    const filePath = path.join(getUploadsDir(), filename)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    const cards = await extractCardsFromPdf(filePath)

    if (cards.length === 0) {
      return NextResponse.json({ error: 'PDF에서 텍스트를 추출할 수 없습니다' }, { status: 400 })
    }

    const subjects = getSubjects()
    subjects.push({
      id,
      title: title.trim(),
      description: description.trim(),
      createdAt: new Date().toISOString(),
      cardCount: cards.length,
      filename,
    })
    saveSubjects(subjects)
    saveSubjectContent({ id, cards })

    return NextResponse.json({ id, cardCount: cards.length })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: '업로드 중 오류가 발생했습니다' }, { status: 500 })
  }
}
