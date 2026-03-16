import fs from 'fs'
import { StudyCard } from './storage'
import { v4 as uuidv4 } from 'uuid'

const CARD_MAX_WORDS = 180

export async function extractCardsFromPdf(filePath: string): Promise<StudyCard[]> {
  const pdfParse = (await import('pdf-parse')).default
  const buffer = fs.readFileSync(filePath)
  const data = await pdfParse(buffer)

  const rawText: string = data.text || ''
  const cards: StudyCard[] = []

  // Try splitting by form-feed (PDF page breaks) first
  let pages = rawText.split(/\f/).map((p: string) => p.trim()).filter((p: string) => p.length > 30)

  // Fallback: split by triple newlines (section breaks)
  if (pages.length <= 1) {
    pages = rawText.split(/\n{3,}/).map((p: string) => p.trim()).filter((p: string) => p.length > 30)
  }

  // Fallback: split entire text into chunks
  if (pages.length <= 1) {
    const words = rawText.trim().split(/\s+/)
    for (let i = 0; i < words.length; i += CARD_MAX_WORDS) {
      const chunk = words.slice(i, i + CARD_MAX_WORDS).join(' ').trim()
      if (chunk.length > 20) pages.push(chunk)
    }
  }

  let pageNum = 1
  for (const page of pages) {
    const words = page.split(/\s+/)

    if (words.length <= CARD_MAX_WORDS) {
      cards.push({ id: uuidv4(), content: page, pageNum: pageNum++ })
    } else {
      // Split long pages into multiple cards
      for (let i = 0; i < words.length; i += CARD_MAX_WORDS) {
        const chunk = words.slice(i, i + CARD_MAX_WORDS).join(' ').trim()
        if (chunk.length > 20) {
          cards.push({ id: uuidv4(), content: chunk, pageNum: pageNum++ })
        }
      }
    }
  }

  return cards
}
