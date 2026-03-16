import { StudyCard } from './storage'
import { v4 as uuidv4 } from 'uuid'

const CARD_MAX_WORDS = 180

/**
 * Extract text from a PDF buffer using pdfjs-dist
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js')
  const data = new Uint8Array(buffer)
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise

  const textParts: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item: { str?: string }) => item.str || '')
      .join(' ')
    if (pageText.trim()) {
      textParts.push(pageText.trim())
    }
  }
  return textParts.join('\f')
}

/**
 * Accepts a Buffer (works on Vercel without writing to disk)
 */
export async function extractCardsFromBuffer(buffer: Buffer): Promise<StudyCard[]> {
  const rawText = await extractTextFromPDF(buffer)
  const cards: StudyCard[] = []

  // Try form-feed page breaks first
  let pages = rawText.split(/\f/).map((p: string) => p.trim()).filter((p: string) => p.length > 30)

  // Fallback: triple newlines
  if (pages.length <= 1) {
    pages = rawText.split(/\n{3,}/).map((p: string) => p.trim()).filter((p: string) => p.length > 30)
  }

  // Fallback: chunk whole text
  if (pages.length <= 1) {
    const words = rawText.trim().split(/\s+/)
    const chunks: string[] = []
    for (let i = 0; i < words.length; i += CARD_MAX_WORDS) {
      const c = words.slice(i, i + CARD_MAX_WORDS).join(' ').trim()
      if (c.length > 20) chunks.push(c)
    }
    pages = chunks
  }

  let pageNum = 1
  for (const page of pages) {
    const words = page.split(/\s+/)
    if (words.length <= CARD_MAX_WORDS) {
      cards.push({ id: uuidv4(), content: page, pageNum: pageNum++ })
    } else {
      for (let i = 0; i < words.length; i += CARD_MAX_WORDS) {
        const chunk = words.slice(i, i + CARD_MAX_WORDS).join(' ').trim()
        if (chunk.length > 20) cards.push({ id: uuidv4(), content: chunk, pageNum: pageNum++ })
      }
    }
  }

  return cards
}
