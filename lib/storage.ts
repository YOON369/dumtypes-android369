/**
 * Storage abstraction:
 *  - Local dev  → file system (data/ directory)
 *  - Vercel     → @vercel/kv  (Redis via Upstash)
 *
 * Detection: KV_REST_API_URL env var is auto-injected by Vercel when KV is linked.
 */

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

const useKV = !!process.env.KV_REST_API_URL

/* ─── KV helpers ─── */
async function kvGet<T>(key: string): Promise<T | null> {
  const { kv } = await import('@vercel/kv')
  return kv.get<T>(key)
}
async function kvSet(key: string, value: unknown): Promise<void> {
  const { kv } = await import('@vercel/kv')
  await kv.set(key, value)
}
async function kvDel(key: string): Promise<void> {
  const { kv } = await import('@vercel/kv')
  await kv.del(key)
}

/* ─── File-system helpers (local dev) ─── */
function fsStorage() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs') as typeof import('fs')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('path') as typeof import('path')
  const DATA_DIR = path.join(process.cwd(), 'data')
  const CONTENT_DIR = path.join(DATA_DIR, 'content')

  function ensureDirs() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    if (!fs.existsSync(CONTENT_DIR)) fs.mkdirSync(CONTENT_DIR, { recursive: true })
    const uploadsDir = path.join(process.cwd(), 'uploads')
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
  }

  function readJson<T>(filePath: string, def: T): T {
    if (!fs.existsSync(filePath)) return def
    try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')) } catch { return def }
  }

  return { fs, path, DATA_DIR, CONTENT_DIR, ensureDirs, readJson }
}

/* ─── Public API ─── */

export async function getSubjects(): Promise<Subject[]> {
  if (useKV) return (await kvGet<Subject[]>('subjects')) ?? []
  const { DATA_DIR, ensureDirs, readJson, path } = fsStorage()
  ensureDirs()
  return readJson<Subject[]>(path.join(DATA_DIR, 'subjects.json'), [])
}

export async function saveSubjects(subjects: Subject[]): Promise<void> {
  if (useKV) { await kvSet('subjects', subjects); return }
  const { DATA_DIR, ensureDirs, fs, path } = fsStorage()
  ensureDirs()
  fs.writeFileSync(path.join(DATA_DIR, 'subjects.json'), JSON.stringify(subjects, null, 2))
}

export async function getSubjectContent(id: string): Promise<SubjectContent | null> {
  if (useKV) return kvGet<SubjectContent>(`content:${id}`)
  const { CONTENT_DIR, ensureDirs, readJson, path } = fsStorage()
  ensureDirs()
  return readJson<SubjectContent | null>(path.join(CONTENT_DIR, `${id}.json`), null)
}

export async function saveSubjectContent(content: SubjectContent): Promise<void> {
  if (useKV) { await kvSet(`content:${content.id}`, content); return }
  const { CONTENT_DIR, ensureDirs, fs, path } = fsStorage()
  ensureDirs()
  fs.writeFileSync(path.join(CONTENT_DIR, `${content.id}.json`), JSON.stringify(content, null, 2))
}

export async function deleteSubject(id: string): Promise<void> {
  if (useKV) {
    const subjects = await getSubjects()
    await saveSubjects(subjects.filter(s => s.id !== id))
    await kvDel(`content:${id}`)
    return
  }
  const { CONTENT_DIR, ensureDirs, fs, path } = fsStorage()
  ensureDirs()
  const cp = path.join(CONTENT_DIR, `${id}.json`)
  if (fs.existsSync(cp)) fs.unlinkSync(cp)
  const subjects = await getSubjects()
  await saveSubjects(subjects.filter(s => s.id !== id))
}

export async function getProgress(): Promise<Progress> {
  const def: Progress = { totalXp: 0, level: 1, streak: 0, lastStudied: null, subjects: {}, badges: [] }
  if (useKV) return (await kvGet<Progress>('progress')) ?? def
  const { DATA_DIR, ensureDirs, readJson, path } = fsStorage()
  ensureDirs()
  return readJson<Progress>(path.join(DATA_DIR, 'progress.json'), def)
}

export async function saveProgress(progress: Progress): Promise<void> {
  if (useKV) { await kvSet('progress', progress); return }
  const { DATA_DIR, ensureDirs, fs, path } = fsStorage()
  ensureDirs()
  fs.writeFileSync(path.join(DATA_DIR, 'progress.json'), JSON.stringify(progress, null, 2))
}

export function calcLevel(totalXp: number): number {
  return Math.floor(Math.sqrt(totalXp / 50)) + 1
}

/* local dev only */
export function getUploadsDir(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('path') as typeof import('path')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs') as typeof import('fs')
  const dir = path.join(process.cwd(), 'uploads')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}
