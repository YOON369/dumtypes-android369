import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const CONTENT_DIR = path.join(DATA_DIR, 'content')
const UPLOADS_DIR = path.join(process.cwd(), 'uploads')

export function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(CONTENT_DIR)) fs.mkdirSync(CONTENT_DIR, { recursive: true })
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

export interface StudyCard {
  id: string
  content: string
  pageNum: number
}

export interface Subject {
  id: string
  title: string
  description: string
  createdAt: string
  cardCount: number
  filename: string
}

export interface SubjectContent {
  id: string
  cards: StudyCard[]
}

export interface SubjectProgress {
  completedCards: string[]
  stars: number
  bestScore: number
}

export interface Progress {
  totalXp: number
  level: number
  streak: number
  lastStudied: string | null
  subjects: Record<string, SubjectProgress>
  badges: string[]
}

export function getSubjects(): Subject[] {
  ensureDirs()
  const filePath = path.join(DATA_DIR, 'subjects.json')
  if (!fs.existsSync(filePath)) return []
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    return []
  }
}

export function saveSubjects(subjects: Subject[]) {
  ensureDirs()
  fs.writeFileSync(path.join(DATA_DIR, 'subjects.json'), JSON.stringify(subjects, null, 2))
}

export function getSubjectContent(id: string): SubjectContent | null {
  ensureDirs()
  const filePath = path.join(CONTENT_DIR, `${id}.json`)
  if (!fs.existsSync(filePath)) return null
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    return null
  }
}

export function saveSubjectContent(content: SubjectContent) {
  ensureDirs()
  fs.writeFileSync(path.join(CONTENT_DIR, `${content.id}.json`), JSON.stringify(content, null, 2))
}

export function deleteSubject(id: string) {
  ensureDirs()
  const contentPath = path.join(CONTENT_DIR, `${id}.json`)
  if (fs.existsSync(contentPath)) fs.unlinkSync(contentPath)

  const subjects = getSubjects().filter(s => s.id !== id)
  saveSubjects(subjects)
}

export function getProgress(): Progress {
  ensureDirs()
  const filePath = path.join(DATA_DIR, 'progress.json')
  if (!fs.existsSync(filePath)) {
    return { totalXp: 0, level: 1, streak: 0, lastStudied: null, subjects: {}, badges: [] }
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    return { totalXp: 0, level: 1, streak: 0, lastStudied: null, subjects: {}, badges: [] }
  }
}

export function saveProgress(progress: Progress) {
  ensureDirs()
  fs.writeFileSync(path.join(DATA_DIR, 'progress.json'), JSON.stringify(progress, null, 2))
}

export function getUploadsDir(): string {
  ensureDirs()
  return UPLOADS_DIR
}

export function calcLevel(totalXp: number): number {
  return Math.floor(Math.sqrt(totalXp / 50)) + 1
}
