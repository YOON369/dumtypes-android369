/**
 * File-system storage: reads/writes JSON in the data/ directory.
 * Works both locally (dev) and on Vercel (read-only from committed data).
 */

import fs from 'fs'
import path from 'path'

export interface StudyCard { id: string; content: string; pageNum: number }
export interface Subject { id: string; title: string; description: string; createdAt: string; cardCount: number; filename: string }
export interface SubjectContent { id: string; cards: StudyCard[] }

const DATA = path.join(process.cwd(), 'data')
const CONTENT = path.join(DATA, 'content')

function ensure() {
  if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true })
  if (!fs.existsSync(CONTENT)) fs.mkdirSync(CONTENT, { recursive: true })
}

function read<T>(p: string, def: T): T {
  try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : def } catch { return def }
}

export function getSubjects(): Subject[] {
  ensure(); return read<Subject[]>(path.join(DATA, 'subjects.json'), [])
}

export function saveSubjects(s: Subject[]) {
  ensure(); fs.writeFileSync(path.join(DATA, 'subjects.json'), JSON.stringify(s, null, 2))
}

export function getSubjectContent(id: string): SubjectContent | null {
  ensure(); return read<SubjectContent | null>(path.join(CONTENT, `${id}.json`), null)
}

export function saveSubjectContent(c: SubjectContent) {
  ensure(); fs.writeFileSync(path.join(CONTENT, `${c.id}.json`), JSON.stringify(c, null, 2))
}

export function deleteSubject(id: string) {
  ensure()
  const cp = path.join(CONTENT, `${id}.json`)
  if (fs.existsSync(cp)) fs.unlinkSync(cp)
  saveSubjects(getSubjects().filter(s => s.id !== id))
}
