'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'

interface StudyCard {
  id: string
  content: string
  pageNum: number
}

interface Subject {
  id: string
  title: string
  description: string
  cardCount: number
}

interface QuizQuestion {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

type Mode = 'read' | 'flashcard' | 'quiz'

/* ─── XP floating text ─── */
function XpPop({ amount, x, y, onDone }: { amount: number; x: number; y: number; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1200)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div
      className="xp-float pointer-events-none"
      style={{ left: x, top: y }}
    >
      +{amount} XP ✨
    </div>
  )
}

/* ─── Level-up overlay ─── */
function LevelUpOverlay({ level, onDone }: { level: number; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="text-center animate-bounce-in">
        <div className="text-8xl mb-4">🏆</div>
        <div className="text-4xl font-extrabold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent mb-2">
          레벨 업!
        </div>
        <div className="text-white text-2xl font-bold">레벨 {level}</div>
        <div className="text-gray-400 mt-2 text-sm">계속 열심히 하세요!</div>
      </div>
    </div>
  )
}

export default function StudyPage({ params }: { params: { id: string } }) {
  const [subject, setSubject] = useState<Subject | null>(null)
  const [cards, setCards] = useState<StudyCard[]>([])
  const [idx, setIdx] = useState(0)
  const [mode, setMode] = useState<Mode>('read')

  /* Game state */
  const [hearts, setHearts] = useState(3)
  const [sessionXp, setSessionXp] = useState(0)
  const [streak, setStreak] = useState(0)
  const [completedCards, setCompletedCards] = useState<Set<string>>(new Set())
  const [xpPops, setXpPops] = useState<{ id: number; amount: number; x: number; y: number }[]>([])
  const [showLevelUp, setShowLevelUp] = useState<number | null>(null)
  const [cardAnim, setCardAnim] = useState('')

  /* Flashcard */
  const [flipped, setFlipped] = useState(false)

  /* Quiz */
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [quizIdx, setQuizIdx] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [quizLoading, setQuizLoading] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [quizAnim, setQuizAnim] = useState('')

  /* Loading */
  const [loading, setLoading] = useState(true)

  /* Touch */
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const xpPopCounter = useRef(0)

  /* ─── Load data ─── */
  useEffect(() => {
    async function load() {
      const [sr, pr] = await Promise.all([
        fetch(`/api/subjects/${params.id}`),
        fetch('/api/progress'),
      ])
      const sd = await sr.json()
      const pd = await pr.json()
      setSubject(sd.subject)
      setCards(sd.cards || [])
      if (pd.subjects?.[params.id]?.completedCards) {
        setCompletedCards(new Set(pd.subjects[params.id].completedCards))
      }
      setLoading(false)
    }
    load()
  }, [params.id])

  /* ─── Load quiz when entering quiz mode or changing card ─── */
  useEffect(() => {
    if (mode === 'quiz' && cards[idx]) {
      loadQuiz(cards[idx].content)
    }
  }, [mode, idx]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadQuiz(content: string) {
    setQuizLoading(true)
    setQuizQuestions([])
    setQuizIdx(0)
    setSelected(null)
    setShowExplanation(false)
    setIsCorrect(null)

    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const data = await res.json()
      setQuizQuestions(data.questions || [])
    } catch (e) {
      console.error(e)
    }
    setQuizLoading(false)
  }

  /* ─── Award XP ─── */
  const awardXp = useCallback(async (amount: number, screenX?: number, screenY?: number) => {
    setSessionXp(prev => prev + amount)

    // Floating XP text
    const popId = xpPopCounter.current++
    setXpPops(prev => [
      ...prev,
      { id: popId, amount, x: screenX ?? window.innerWidth / 2, y: screenY ?? 80 },
    ])

    // Persist
    try {
      const pr = await fetch('/api/progress')
      const progress = await pr.json()
      const prevLevel = progress.level
      const newXp = (progress.totalXp || 0) + amount
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...progress,
          totalXp: newXp,
          subjects: {
            ...progress.subjects,
            [params.id]: {
              completedCards: Array.from(completedCards),
              stars: progress.subjects?.[params.id]?.stars || 0,
              bestScore: progress.subjects?.[params.id]?.bestScore || 0,
            },
          },
        }),
      })
      const updated = await res.json()
      if (updated.level > prevLevel) setShowLevelUp(updated.level)
    } catch (e) {
      console.error(e)
    }
  }, [completedCards, params.id])

  const markDone = useCallback(async (cardId: string) => {
    if (completedCards.has(cardId)) return
    setCompletedCards(prev => new Set([...prev, cardId]))
    await awardXp(10)
  }, [completedCards, awardXp])

  /* ─── Navigation ─── */
  const goNext = useCallback(() => {
    if (idx >= cards.length - 1) return
    setCardAnim('translate-x-full opacity-0')
    setTimeout(() => {
      setIdx(prev => prev + 1)
      setFlipped(false)
      setCardAnim('-translate-x-4 opacity-0')
      setTimeout(() => setCardAnim(''), 50)
      markDone(cards[idx].id)
    }, 150)
  }, [idx, cards, markDone])

  const goPrev = useCallback(() => {
    if (idx <= 0) return
    setCardAnim('-translate-x-full opacity-0')
    setTimeout(() => {
      setIdx(prev => prev - 1)
      setFlipped(false)
      setCardAnim('translate-x-4 opacity-0')
      setTimeout(() => setCardAnim(''), 50)
    }, 150)
  }, [idx])

  /* ─── Touch swipe ─── */
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) goNext()
      else goPrev()
    } else if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && mode === 'flashcard') {
      setFlipped(f => !f)
    }
  }

  /* ─── Quiz answer ─── */
  async function handleAnswer(optIdx: number) {
    if (selected !== null) return
    setSelected(optIdx)
    const q = quizQuestions[quizIdx]
    const correct = optIdx === q.correctIndex
    setIsCorrect(correct)
    setShowExplanation(true)
    setQuizAnim(correct ? 'correct-flash' : 'wrong-shake')
    setTimeout(() => setQuizAnim(''), 500)

    if (correct) {
      const bonus = Math.min(streak, 4) * 5
      const gained = 20 + bonus
      setStreak(s => s + 1)
      await awardXp(gained)
    } else {
      setHearts(h => Math.max(0, h - 1))
      setStreak(0)
    }
  }

  function nextQuestion() {
    if (quizIdx < quizQuestions.length - 1) {
      setQuizIdx(q => q + 1)
      setSelected(null)
      setShowExplanation(false)
      setIsCorrect(null)
    } else {
      goNext()
    }
  }

  /* ─── Render ─── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-spin">⚡</div>
          <div className="text-purple-400 animate-pulse">불러오는 중...</div>
        </div>
      </div>
    )
  }

  if (!subject || cards.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex flex-col items-center justify-center gap-4">
        <div className="text-5xl">😅</div>
        <p className="text-gray-400">자료를 찾을 수 없어요</p>
        <Link href="/" className="text-purple-400 underline">← 돌아가기</Link>
      </div>
    )
  }

  const card = cards[idx]
  const progressPct = Math.round(((idx + 1) / cards.length) * 100)
  const modeLabels: Record<Mode, string> = { read: '📖 읽기', flashcard: '🃏 플래시카드', quiz: '🎯 퀴즈' }

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex flex-col max-w-md mx-auto">
      {/* XP pops */}
      {xpPops.map(p => (
        <XpPop
          key={p.id}
          amount={p.amount}
          x={p.x}
          y={p.y}
          onDone={() => setXpPops(prev => prev.filter(x => x.id !== p.id))}
        />
      ))}

      {/* Level up overlay */}
      {showLevelUp && (
        <LevelUpOverlay level={showLevelUp} onDone={() => setShowLevelUp(null)} />
      )}

      {/* ─── Top HUD ─── */}
      <div className="bg-[#0f0f28] border-b border-purple-500/20 px-4 py-3 flex items-center gap-2 flex-shrink-0">
        <Link href="/" className="text-gray-400 text-xl w-8 flex-shrink-0">←</Link>

        {/* Hearts */}
        <div className="flex gap-0.5 flex-shrink-0">
          {[1, 2, 3].map(i => (
            <span key={i} className={`text-base transition-all ${i <= hearts ? 'text-red-400' : 'opacity-20 grayscale'}`}>
              ❤️
            </span>
          ))}
        </div>

        {/* Progress bar */}
        <div className="flex-1 h-2.5 bg-gray-800 rounded-full overflow-hidden mx-1">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Streak */}
        {streak > 0 && (
          <span className="text-orange-400 text-sm font-bold flex-shrink-0">🔥{streak}</span>
        )}

        {/* Session XP */}
        <span className="text-yellow-400 text-sm font-bold flex-shrink-0 tabular-nums">
          +{sessionXp}
        </span>
      </div>

      {/* Card counter */}
      <div className="text-center py-1.5 text-xs text-gray-600 font-mono flex-shrink-0">
        <span className="text-gray-400 font-medium">{idx + 1}</span>
        <span className="mx-1">/</span>
        <span>{cards.length}</span>
        <span className="ml-2 text-gray-600">{subject.title}</span>
      </div>

      {/* ─── Main content ─── */}
      <div className="flex-1 px-4 overflow-hidden">

        {/* READ MODE */}
        {mode === 'read' && (
          <div
            className={`h-full flex flex-col transition-all duration-150 ${cardAnim}`}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div className="flex-1 bg-gradient-to-br from-[#16163a] to-[#12122a] border border-purple-500/20 rounded-3xl p-5 overflow-y-auto">
              <div className="text-xs text-purple-400 font-mono mb-3 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
                페이지 {card.pageNum}
              </div>
              <p className="text-white text-[15px] leading-relaxed whitespace-pre-wrap">
                {card.content}
              </p>
            </div>

            {/* Swipe hint */}
            <div className="text-center py-2 text-xs text-gray-700">
              ← 스와이프하여 이동 →
            </div>
          </div>
        )}

        {/* FLASHCARD MODE */}
        {mode === 'flashcard' && (
          <div
            className="h-full flex flex-col"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div
              className="flex-1 flip-card"
              onClick={() => {
                setFlipped(f => !f)
                if (!flipped) markDone(card.id)
              }}
            >
              <div className={`flip-inner h-full ${flipped ? 'flipped' : ''}`}>
                {/* Front */}
                <div className="flip-front absolute inset-0 bg-gradient-to-br from-purple-900/80 to-blue-900/80 border border-purple-500/30 rounded-3xl p-6 flex flex-col items-center justify-center glow-purple">
                  <div className="text-6xl mb-5 animate-float">📖</div>
                  <div className="text-purple-300 text-xl font-bold">페이지 {card.pageNum}</div>
                  <div className="text-gray-500 text-sm mt-3">탭하여 내용 확인</div>
                  <div className="mt-6 flex gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>

                {/* Back */}
                <div className="flip-back absolute inset-0 bg-gradient-to-br from-blue-900/80 to-indigo-900/80 border border-blue-500/30 rounded-3xl p-5 overflow-y-auto">
                  <div className="text-xs text-blue-400 font-mono mb-3">내용 ✓</div>
                  <p className="text-white text-[14px] leading-relaxed whitespace-pre-wrap">
                    {card.content}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center py-2 text-xs text-gray-700">
              탭: 뒤집기 · 스와이프: 이동
            </div>
          </div>
        )}

        {/* QUIZ MODE */}
        {mode === 'quiz' && (
          <div className="h-full overflow-y-auto pb-2">
            {quizLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="text-5xl animate-spin">⚡</div>
                <p className="text-purple-400 animate-pulse">AI가 퀴즈를 만들고 있어요...</p>
                <p className="text-gray-600 text-sm">잠시만 기다려주세요</p>
              </div>
            ) : quizQuestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="text-5xl">😔</div>
                <p className="text-gray-400">퀴즈를 불러올 수 없어요</p>
                <button
                  onClick={() => loadQuiz(card.content)}
                  className="bg-purple-600 px-4 py-2 rounded-xl text-white text-sm"
                >
                  다시 시도
                </button>
              </div>
            ) : (
              <div className={`space-y-3 ${quizAnim}`}>
                {/* Q progress */}
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>문제 {quizIdx + 1} / {quizQuestions.length}</span>
                  {streak > 1 && (
                    <span className="text-orange-400 font-bold">🔥 {streak}연속!</span>
                  )}
                </div>

                {/* Question */}
                <div className="bg-gradient-to-br from-[#16163a] to-[#12122a] border border-purple-500/20 rounded-2xl p-4">
                  <p className="text-white text-[15px] font-medium leading-relaxed">
                    {quizQuestions[quizIdx]?.question}
                  </p>
                </div>

                {/* Options */}
                <div className="space-y-2">
                  {quizQuestions[quizIdx]?.options.map((opt, i) => {
                    const LABELS = ['A', 'B', 'C', 'D']
                    let cls = 'bg-[#16162a] border border-gray-700 text-white'
                    if (selected !== null) {
                      if (i === quizQuestions[quizIdx].correctIndex) {
                        cls = 'bg-green-900/40 border border-green-500 text-green-200'
                      } else if (i === selected) {
                        cls = 'bg-red-900/40 border border-red-500 text-red-200'
                      }
                    }
                    return (
                      <button
                        key={i}
                        onClick={() => handleAnswer(i)}
                        disabled={selected !== null}
                        className={`w-full text-left p-4 rounded-2xl text-sm leading-relaxed transition-all active:scale-[0.97] ${cls}`}
                      >
                        <span className="font-bold text-purple-400 mr-2">{LABELS[i]}.</span>
                        {opt}
                      </button>
                    )
                  })}
                </div>

                {/* Result feedback */}
                {showExplanation && (
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    isCorrect
                      ? 'bg-green-900/20 border border-green-500/30 text-green-300'
                      : 'bg-red-900/20 border border-red-500/30 text-red-300'
                  }`}>
                    <div className="font-bold text-base mb-1">
                      {isCorrect ? '✨ 정답!' : '❌ 오답'}
                    </div>
                    <p>{quizQuestions[quizIdx]?.explanation}</p>
                    {isCorrect && streak > 1 && (
                      <div className="mt-2 text-orange-400 font-bold text-xs">
                        🔥 {streak}연속 정답 보너스!
                      </div>
                    )}
                  </div>
                )}

                {showExplanation && (
                  <button
                    onClick={nextQuestion}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl text-white font-bold text-base active:scale-95 transition-transform"
                  >
                    {quizIdx < quizQuestions.length - 1 ? '다음 문제 →' : '다음 카드 →'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Nav buttons (Read & Flashcard) ─── */}
      {mode !== 'quiz' && (
        <div className="px-4 pt-1 pb-2 flex gap-2 flex-shrink-0">
          <button
            onClick={goPrev}
            disabled={idx === 0}
            className="flex-1 py-3.5 bg-gray-800 border border-gray-700 rounded-2xl text-white font-bold text-sm disabled:opacity-25 active:scale-95 transition-transform"
          >
            ← 이전
          </button>
          <button
            onClick={() => { markDone(card.id); goNext() }}
            disabled={idx === cards.length - 1}
            className="flex-1 py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl text-white font-bold text-sm disabled:opacity-25 active:scale-95 transition-transform"
          >
            다음 →
          </button>
        </div>
      )}

      {/* ─── Mode tabs ─── */}
      <div className="px-4 pb-6 flex-shrink-0">
        <div className="bg-[#16162a] border border-gray-700/50 rounded-2xl p-1 flex gap-1">
          {(['read', 'flashcard', 'quiz'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setFlipped(false) }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                mode === m
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                  : 'text-gray-500'
              }`}
            >
              {modeLabels[m]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
