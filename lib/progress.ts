/** Client-side progress stored in localStorage */

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

const STORAGE_KEY = 'study-progress'

const DEFAULT: Progress = {
  totalXp: 0, level: 1, streak: 0, lastStudied: null, subjects: {}, badges: [],
}

export function calcLevel(xp: number) {
  return Math.floor(Math.sqrt(xp / 50)) + 1
}

export function loadProgress(): Progress {
  if (typeof window === 'undefined') return DEFAULT
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT
  } catch {
    return DEFAULT
  }
}

export function saveProgress(p: Progress) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
}
