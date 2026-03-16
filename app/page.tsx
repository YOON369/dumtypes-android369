'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { loadProgress, type Progress } from '@/lib/progress'

interface Subject {
  id: string; title: string; description: string; createdAt: string; cardCount: number
}

const LEVELS = ['새싹','초보자','학습자','탐구자','분석가','전문가','마스터','달인','현인','전설']
const EMOJIS = ['🌱','📗','📘','📙','🔥','⚡','💎','👑','🌟','🏆']

function tier(level: number) {
  const i = Math.min(Math.floor((level - 1) / 5), LEVELS.length - 1)
  return { name: LEVELS[i], emoji: EMOJIS[i] }
}

function xpFor(level: number) { return (level - 1) ** 2 * 50 }

export default function HomePage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/subjects').then(r => r.json()).then(setSubjects).catch(() => {})
    setProgress(loadProgress())
    setLoading(false)
  }, [])

  if (loading || !progress) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">📚</div>
          <div className="text-purple-400 text-lg animate-pulse">로딩 중...</div>
        </div>
      </div>
    )
  }

  const { name, emoji } = tier(progress.level)
  const cur = xpFor(progress.level), nxt = xpFor(progress.level + 1)
  const inLevel = progress.totalXp - cur, needed = nxt - cur
  const pct = Math.min(Math.round((inLevel / needed) * 100), 100)

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#12082e] to-[#0a0a1a] px-4 pt-10 pb-6">
        <div className="max-w-md mx-auto">
          <h1 className="text-center text-2xl font-extrabold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-6">
            📚 PDF 공부센터
          </h1>

          {/* Level card */}
          <div className="bg-[#1a1040]/80 border border-purple-500/30 rounded-2xl px-5 py-4 glow-purple">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-2xl shadow-lg flex-shrink-0">
                {emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-purple-300 text-xs font-semibold uppercase tracking-wider">
                    LV.{progress.level} {name}
                  </span>
                  {progress.streak > 0 && (
                    <span className="flex items-center gap-1 bg-orange-500/20 border border-orange-500/30 rounded-full px-2 py-0.5 text-orange-300 text-xs font-bold">
                      🔥 {progress.streak}일
                    </span>
                  )}
                </div>
                <div className="text-white font-bold text-lg">{progress.totalXp.toLocaleString()} XP</div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full bar-fill transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{inLevel} XP</span>
                <span>다음 레벨까지 {needed - inLevel} XP</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          {subjects.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[
                { label: '자료', value: subjects.length, icon: '📄' },
                { label: '완료', value: subjects.filter(s => { const p = progress.subjects[s.id]; return p && p.completedCards.length >= s.cardCount }).length, icon: '✅' },
                { label: '뱃지', value: progress.badges?.length || 0, icon: '🏅' },
              ].map(s => (
                <div key={s.label} className="bg-[#1a1a2a] rounded-xl p-3 text-center">
                  <div className="text-xl">{s.icon}</div>
                  <div className="text-white font-bold text-lg leading-none mt-1">{s.value}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Subject list */}
      <div className="max-w-md mx-auto px-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-white">📖 공부 자료</h2>
          <span className="text-xs text-gray-500">{subjects.length}개</span>
        </div>

        {subjects.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4 animate-float">📄</div>
            <p className="text-gray-400 font-medium mb-1">아직 공부 자료가 없어요</p>
            <p className="text-gray-600 text-sm">관리자 페이지에서 PDF를 추가해보세요!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {subjects.map(subject => {
              const sp = progress.subjects[subject.id]
              const done = sp?.completedCards?.length || 0
              const pct = Math.round((done / subject.cardCount) * 100)
              const stars = sp?.stars || 0
              return (
                <Link key={subject.id} href={`/study/${subject.id}`}>
                  <div className="bg-gradient-to-r from-[#14142a] to-[#12121f] border border-purple-500/20 rounded-2xl p-4 active:scale-[0.97] transition-transform duration-100 cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0 mr-2">
                        <h3 className="font-bold text-white text-base truncate">{subject.title}</h3>
                        {subject.description && <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{subject.description}</p>}
                      </div>
                      {stars > 0 && <div className="text-yellow-400 text-sm flex-shrink-0">{'⭐'.repeat(stars)}</div>}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: pct === 100 ? 'linear-gradient(to right, #22c55e, #16a34a)' : 'linear-gradient(to right, #8b5cf6, #3b82f6)' }} />
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap tabular-nums">{done}/{subject.cardCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">📋 카드 {subject.cardCount}장</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pct === 100 ? 'bg-green-500/20 text-green-400' : pct > 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-700/50 text-gray-500'}`}>
                        {pct === 100 ? '완료 ✓' : pct > 0 ? `${pct}% 진행` : '시작 전'}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Admin FAB */}
      <div className="fixed bottom-6 right-4 z-50">
        <Link href="/admin">
          <button className="bg-gray-800/90 border border-gray-600/50 rounded-full px-4 py-2.5 text-sm text-gray-300 backdrop-blur-sm shadow-lg active:scale-95 transition-transform">
            ⚙️ 관리자
          </button>
        </Link>
      </div>
    </div>
  )
}
