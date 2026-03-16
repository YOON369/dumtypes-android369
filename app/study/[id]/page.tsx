'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { loadProgress, saveProgress, calcLevel, type Progress } from '@/lib/progress'

interface StudyCard { id: string; content: string; pageNum: number }
interface Subject { id: string; title: string; description: string; cardCount: number }
interface QuizQ { question: string; options: string[]; correctIndex: number; explanation: string }
type Mode = 'read' | 'flashcard' | 'quiz'

function mockQuiz(content: string): QuizQ[] {
  const w = content.split(/\s+/).slice(0, 15).join(' ')
  return [
    { question: `다음 중 본문의 내용과 일치하는 것은? ("${w}...")`, options: ['본문에서 설명한 핵심 개념이다','본문과 관련 없는 내용이다','본문에서 부정한 내용이다','본문에서 언급되지 않았다'], correctIndex: 0, explanation: '본문의 핵심 내용을 잘 파악하세요.' },
    { question: '이 자료의 주요 목적은?', options: ['개념 설명','문제 제기','비교 분석','실험 결과 보고'], correctIndex: 0, explanation: '전체 흐름을 파악해보세요.' },
    { question: '본문을 올바르게 이해한 사람은?', options: ['핵심을 정확히 파악한 학생','세부만 암기한 학생','다른 주제와 혼동한 학생','읽지 않은 학생'], correctIndex: 0, explanation: '핵심과 세부를 균형있게 이해하세요.' },
    { question: '이 내용을 공부한 후 할 수 있는 것은?', options: ['관련 개념을 설명할 수 있다','전혀 다른 분야에 적용','더 이상 공부 불필요','본문이 틀렸다고 주장'], correctIndex: 0, explanation: '학습 목표는 이해와 설명입니다.' },
  ]
}

function XpPop({ amount, x, y, onDone }: { amount: number; x: number; y: number; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 1200); return () => clearTimeout(t) }, [onDone])
  return <div className="xp-float pointer-events-none" style={{ left: x, top: y }}>+{amount} XP ✨</div>
}

function LevelUp({ level, onDone }: { level: number; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t) }, [onDone])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="text-center animate-bounce">
        <div className="text-8xl mb-4">🏆</div>
        <div className="text-4xl font-extrabold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent mb-2">레벨 업!</div>
        <div className="text-white text-2xl font-bold">레벨 {level}</div>
      </div>
    </div>
  )
}

export default function StudyPage({ params }: { params: { id: string } }) {
  const [subject, setSubject] = useState<Subject | null>(null)
  const [cards, setCards] = useState<StudyCard[]>([])
  const [idx, setIdx] = useState(0)
  const [mode, setMode] = useState<Mode>('read')
  const [hearts, setHearts] = useState(3)
  const [sessionXp, setSessionXp] = useState(0)
  const [streak, setStreak] = useState(0)
  const [done, setDone] = useState<Set<string>>(new Set())
  const [xpPops, setXpPops] = useState<{ id: number; amount: number; x: number; y: number }[]>([])
  const [levelUp, setLevelUp] = useState<number | null>(null)
  const [anim, setAnim] = useState('')
  const [flipped, setFlipped] = useState(false)
  const [quiz, setQuiz] = useState<QuizQ[]>([])
  const [qi, setQi] = useState(0)
  const [sel, setSel] = useState<number | null>(null)
  const [showExp, setShowExp] = useState(false)
  const [correct, setCorrect] = useState<boolean | null>(null)
  const [quizAnim, setQuizAnim] = useState('')
  const [quizLoading, setQuizLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const tx = useRef(0), ty = useRef(0), popId = useRef(0)

  useEffect(() => {
    fetch(`/api/subjects/${params.id}`).then(r => r.json()).then(d => {
      setSubject(d.subject); setCards(d.cards || [])
    }).catch(() => {})
    const p = loadProgress()
    if (p.subjects?.[params.id]?.completedCards) setDone(new Set(p.subjects[params.id].completedCards))
    setLoading(false)
  }, [params.id])

  useEffect(() => {
    if (mode === 'quiz' && cards[idx]) {
      setQuizLoading(true); setQuiz([]); setQi(0); setSel(null); setShowExp(false); setCorrect(null)
      setTimeout(() => { setQuiz(mockQuiz(cards[idx].content)); setQuizLoading(false) }, 400)
    }
  }, [mode, idx, cards])

  const giveXp = useCallback((amt: number) => {
    setSessionXp(p => p + amt)
    const id = popId.current++
    setXpPops(p => [...p, { id, amount: amt, x: window.innerWidth / 2, y: 80 }])
    const prog = loadProgress()
    const prev = prog.level, newXp = (prog.totalXp || 0) + amt, newLv = calcLevel(newXp)
    const today = new Date().toDateString()
    const last = prog.lastStudied ? new Date(prog.lastStudied).toDateString() : null
    const yest = new Date(Date.now() - 86400000).toDateString()
    const updated: Progress = { ...prog, totalXp: newXp, level: newLv, lastStudied: new Date().toISOString() }
    if (last !== today) updated.streak = last === yest ? (prog.streak || 0) + 1 : 1
    saveProgress(updated)
    if (newLv > prev) setLevelUp(newLv)
  }, [])

  const markDone = useCallback((cardId: string) => {
    if (done.has(cardId)) return
    setDone(prev => {
      const next = new Set([...prev, cardId])
      const p = loadProgress()
      p.subjects = { ...p.subjects, [params.id]: { completedCards: Array.from(next), stars: p.subjects?.[params.id]?.stars || 0, bestScore: p.subjects?.[params.id]?.bestScore || 0 } }
      saveProgress(p)
      return next
    })
    giveXp(10)
  }, [done, giveXp, params.id])

  const goNext = useCallback(() => {
    if (idx >= cards.length - 1) return
    setAnim('translate-x-full opacity-0')
    setTimeout(() => { setIdx(i => i + 1); setFlipped(false); setAnim('-translate-x-4 opacity-0'); setTimeout(() => setAnim(''), 50); markDone(cards[idx].id) }, 150)
  }, [idx, cards, markDone])

  const goPrev = useCallback(() => {
    if (idx <= 0) return
    setAnim('-translate-x-full opacity-0')
    setTimeout(() => { setIdx(i => i - 1); setFlipped(false); setAnim('translate-x-4 opacity-0'); setTimeout(() => setAnim(''), 50) }, 150)
  }, [idx])

  const onTS = (e: React.TouchEvent) => { tx.current = e.touches[0].clientX; ty.current = e.touches[0].clientY }
  const onTE = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - tx.current, dy = e.changedTouches[0].clientY - ty.current
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) { dx < 0 ? goNext() : goPrev() }
    else if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && mode === 'flashcard') setFlipped(f => !f)
  }

  function answer(i: number) {
    if (sel !== null) return
    setSel(i); const q = quiz[qi]; const ok = i === q.correctIndex; setCorrect(ok); setShowExp(true)
    setQuizAnim(ok ? 'correct-flash' : 'wrong-shake'); setTimeout(() => setQuizAnim(''), 500)
    if (ok) { setStreak(s => s + 1); giveXp(20 + Math.min(streak, 4) * 5) } else { setHearts(h => Math.max(0, h - 1)); setStreak(0) }
  }

  function nextQ() {
    if (qi < quiz.length - 1) { setQi(q => q + 1); setSel(null); setShowExp(false); setCorrect(null) } else goNext()
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-5xl animate-spin">⚡</div></div>
  if (!subject || !cards.length) return <div className="min-h-screen flex flex-col items-center justify-center gap-4"><div className="text-5xl">😅</div><p className="text-gray-400">자료를 찾을 수 없어요</p><Link href="/" className="text-purple-400 underline">← 돌아가기</Link></div>

  const card = cards[idx], pPct = Math.round(((idx + 1) / cards.length) * 100)
  const modes: Record<Mode, string> = { read: '📖 읽기', flashcard: '🃏 플래시카드', quiz: '🎯 퀴즈' }

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto">
      {xpPops.map(p => <XpPop key={p.id} amount={p.amount} x={p.x} y={p.y} onDone={() => setXpPops(pp => pp.filter(x => x.id !== p.id))} />)}
      {levelUp && <LevelUp level={levelUp} onDone={() => setLevelUp(null)} />}

      {/* HUD */}
      <div className="bg-[#0f0f28] border-b border-purple-500/20 px-4 py-3 flex items-center gap-2 flex-shrink-0">
        <Link href="/" className="text-gray-400 text-xl w-8 flex-shrink-0">←</Link>
        <div className="flex gap-0.5 flex-shrink-0">{[1,2,3].map(i => <span key={i} className={`text-base ${i <= hearts ? 'text-red-400' : 'opacity-20'}`}>❤️</span>)}</div>
        <div className="flex-1 h-2.5 bg-gray-800 rounded-full overflow-hidden mx-1"><div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-300" style={{ width: `${pPct}%` }} /></div>
        {streak > 0 && <span className="text-orange-400 text-sm font-bold flex-shrink-0">🔥{streak}</span>}
        <span className="text-yellow-400 text-sm font-bold flex-shrink-0 tabular-nums">+{sessionXp}</span>
      </div>
      <div className="text-center py-1.5 text-xs text-gray-600 font-mono flex-shrink-0"><span className="text-gray-400 font-medium">{idx + 1}</span><span className="mx-1">/</span><span>{cards.length}</span><span className="ml-2">{subject.title}</span></div>

      {/* Content */}
      <div className="flex-1 px-4 overflow-hidden">
        {mode === 'read' && (
          <div className={`h-full flex flex-col transition-all duration-150 ${anim}`} onTouchStart={onTS} onTouchEnd={onTE}>
            <div className="flex-1 bg-gradient-to-br from-[#16163a] to-[#12122a] border border-purple-500/20 rounded-3xl p-5 overflow-y-auto">
              <div className="text-xs text-purple-400 font-mono mb-3 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />페이지 {card.pageNum}</div>
              <p className="text-white text-[15px] leading-relaxed whitespace-pre-wrap">{card.content}</p>
            </div>
            <div className="text-center py-2 text-xs text-gray-700">← 스와이프하여 이동 →</div>
          </div>
        )}
        {mode === 'flashcard' && (
          <div className="h-full flex flex-col" onTouchStart={onTS} onTouchEnd={onTE}>
            <div className="flex-1 flip-card" onClick={() => { setFlipped(f => !f); if (!flipped) markDone(card.id) }}>
              <div className={`flip-inner h-full ${flipped ? 'flipped' : ''}`}>
                <div className="flip-front absolute inset-0 bg-gradient-to-br from-purple-900/80 to-blue-900/80 border border-purple-500/30 rounded-3xl p-6 flex flex-col items-center justify-center glow-purple">
                  <div className="text-6xl mb-5 animate-float">📖</div><div className="text-purple-300 text-xl font-bold">페이지 {card.pageNum}</div><div className="text-gray-500 text-sm mt-3">탭하여 내용 확인</div>
                </div>
                <div className="flip-back absolute inset-0 bg-gradient-to-br from-blue-900/80 to-indigo-900/80 border border-blue-500/30 rounded-3xl p-5 overflow-y-auto">
                  <div className="text-xs text-blue-400 font-mono mb-3">내용 ✓</div><p className="text-white text-[14px] leading-relaxed whitespace-pre-wrap">{card.content}</p>
                </div>
              </div>
            </div>
            <div className="text-center py-2 text-xs text-gray-700">탭: 뒤집기 · 스와이프: 이동</div>
          </div>
        )}
        {mode === 'quiz' && (
          <div className="h-full overflow-y-auto pb-2">
            {quizLoading ? <div className="flex flex-col items-center justify-center h-full gap-4"><div className="text-5xl animate-spin">⚡</div><p className="text-purple-400 animate-pulse">퀴즈 생성 중...</p></div>
            : !quiz.length ? <div className="flex flex-col items-center justify-center h-full gap-4"><div className="text-5xl">😔</div><p className="text-gray-400">퀴즈를 불러올 수 없어요</p></div>
            : (
              <div className={`space-y-3 ${quizAnim}`}>
                <div className="flex items-center justify-between text-xs text-gray-600"><span>문제 {qi + 1}/{quiz.length}</span>{streak > 1 && <span className="text-orange-400 font-bold">🔥 {streak}연속!</span>}</div>
                <div className="bg-gradient-to-br from-[#16163a] to-[#12122a] border border-purple-500/20 rounded-2xl p-4"><p className="text-white text-[15px] font-medium leading-relaxed">{quiz[qi]?.question}</p></div>
                <div className="space-y-2">
                  {quiz[qi]?.options.map((opt, i) => {
                    const L = ['A','B','C','D']
                    let c = 'bg-[#16162a] border border-gray-700 text-white'
                    if (sel !== null) { if (i === quiz[qi].correctIndex) c = 'bg-green-900/40 border border-green-500 text-green-200'; else if (i === sel) c = 'bg-red-900/40 border border-red-500 text-red-200' }
                    return <button key={i} onClick={() => answer(i)} disabled={sel !== null} className={`w-full text-left p-4 rounded-2xl text-sm leading-relaxed transition-all active:scale-[0.97] ${c}`}><span className="font-bold text-purple-400 mr-2">{L[i]}.</span>{opt}</button>
                  })}
                </div>
                {showExp && <div className={`p-4 rounded-2xl text-sm leading-relaxed ${correct ? 'bg-green-900/20 border border-green-500/30 text-green-300' : 'bg-red-900/20 border border-red-500/30 text-red-300'}`}><div className="font-bold text-base mb-1">{correct ? '✨ 정답!' : '❌ 오답'}</div><p>{quiz[qi]?.explanation}</p></div>}
                {showExp && <button onClick={nextQ} className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl text-white font-bold text-base active:scale-95 transition-transform">{qi < quiz.length - 1 ? '다음 문제 →' : '다음 카드 →'}</button>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      {mode !== 'quiz' && (
        <div className="px-4 pt-1 pb-2 flex gap-2 flex-shrink-0">
          <button onClick={goPrev} disabled={idx === 0} className="flex-1 py-3.5 bg-gray-800 border border-gray-700 rounded-2xl text-white font-bold text-sm disabled:opacity-25 active:scale-95 transition-transform">← 이전</button>
          <button onClick={() => { markDone(card.id); goNext() }} disabled={idx === cards.length - 1} className="flex-1 py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl text-white font-bold text-sm disabled:opacity-25 active:scale-95 transition-transform">다음 →</button>
        </div>
      )}

      {/* Mode tabs */}
      <div className="px-4 pb-6 flex-shrink-0">
        <div className="bg-[#16162a] border border-gray-700/50 rounded-2xl p-1 flex gap-1">
          {(['read','flashcard','quiz'] as Mode[]).map(m => (
            <button key={m} onClick={() => { setMode(m); setFlipped(false) }} className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${mode === m ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' : 'text-gray-500'}`}>{modes[m]}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
