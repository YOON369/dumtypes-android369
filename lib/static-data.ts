/**
 * Reads study data from the data/ directory at build time.
 * This makes the app fully static — no database or KV needed at runtime.
 */

import fs from 'fs'
import path from 'path'

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

const DATA_DIR = path.join(process.cwd(), 'data')
const CONTENT_DIR = path.join(DATA_DIR, 'content')

function readJson<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    return fallback
  }
}

export function getSubjects(): Subject[] {
  return readJson<Subject[]>(path.join(DATA_DIR, 'subjects.json'), [])
}

export function getSubjectContent(id: string): SubjectContent | null {
  return readJson<SubjectContent | null>(path.join(CONTENT_DIR, `${id}.json`), null)
}

export function getAllSubjectIds(): string[] {
  return getSubjects().map(s => s.id)
}
