import { v4 as uuidv4 } from 'uuid'
import type { StudyCard } from './storage'

const MAX_WORDS = 180

async function extractText(buffer: Buffer): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js')
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise
  const parts: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const text = content.items.map((item: any) => item.str || '').join(' ')
    if (text.trim()) parts.push(text.trim())
  }
  return parts.join('\f')
}

export async function extractCardsFromBuffer(buffer: Buffer): Promise<StudyCard[]> {
  const raw = await extractText(buffer)
  const cards: StudyCard[] = []

  let pages = raw.split(/\f/).map(p => p.trim()).filter(p => p.length > 30)
  if (pages.length <= 1) pages = raw.split(/\n{3,}/).map(p => p.trim()).filter(p => p.length > 30)
  if (pages.length <= 1) {
    const words = raw.trim().split(/\s+/), chunks: string[] = []
    for (let i = 0; i < words.length; i += MAX_WORDS) { const c = words.slice(i, i + MAX_WORDS).join(' ').trim(); if (c.length > 20) chunks.push(c) }
    pages = chunks
  }

  let num = 1
  for (const page of pages) {
    const words = page.split(/\s+/)
    if (words.length <= MAX_WORDS) { cards.push({ id: uuidv4(), content: page, pageNum: num++ }) }
    else { for (let i = 0; i < words.length; i += MAX_WORDS) { const c = words.slice(i, i + MAX_WORDS).join(' ').trim(); if (c.length > 20) cards.push({ id: uuidv4(), content: c, pageNum: num++ }) } }
  }
  return cards
}
