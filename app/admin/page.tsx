'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

interface Subject {
  id: string
  title: string
  description: string
  createdAt: string
  cardCount: number
}

const ADMIN_PW = 'admin123'

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (authed) loadSubjects()
  }, [authed])

  async function loadSubjects() {
    const res = await fetch('/api/subjects')
    setSubjects(await res.json())
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !title.trim()) return

    setUploading(true)
    setMsg(null)

    const fd = new FormData()
    fd.append('file', file)
    fd.append('title', title.trim())
    fd.append('description', desc.trim())

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()

      if (res.ok) {
        setMsg({ type: 'ok', text: `✅ 업로드 완료! 카드 ${data.cardCount}장 생성됨` })
        setTitle('')
        setDesc('')
        setFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        await loadSubjects()
      } else {
        setMsg({ type: 'err', text: data.error || '업로드 실패' })
      }
    } catch {
      setMsg({ type: 'err', text: '네트워크 오류가 발생했습니다' })
    }

    setUploading(false)
  }

  async function handleDelete(id: string, t: string) {
    if (!confirm(`"${t}"을(를) 삭제하시겠습니까?`)) return
    await fetch(`/api/subjects/${id}`, { method: 'DELETE' })
    await loadSubjects()
  }

  /* ─── Login screen ─── */
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-6xl mb-3">🔐</div>
            <h1 className="text-2xl font-extrabold text-white">관리자 로그인</h1>
            <p className="text-gray-500 text-sm mt-1">관리자만 접근 가능</p>
          </div>

          <div className="bg-[#1a1a2a] border border-purple-500/20 rounded-2xl p-6 space-y-4">
            <input
              type="password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (pw === ADMIN_PW) setAuthed(true)
                  else setPwError('비밀번호가 틀렸습니다')
                }
              }}
              placeholder="비밀번호 입력"
              className="w-full bg-[#0a0a1a] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
            />
            {pwError && <p className="text-red-400 text-sm">{pwError}</p>}
            <button
              onClick={() => {
                if (pw === ADMIN_PW) { setAuthed(true); setPwError('') }
                else setPwError('비밀번호가 틀렸습니다')
              }}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-bold active:scale-95 transition-transform"
            >
              로그인
            </button>
          </div>

          <div className="text-center mt-5">
            <Link href="/" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
              ← 홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    )
  }

  /* ─── Dashboard ─── */
  return (
    <div className="min-h-screen bg-[#0a0a1a] pb-16">
      {/* Header */}
      <div className="bg-[#12122a] border-b border-purple-500/20 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/" className="text-gray-400 text-xl w-8">←</Link>
        <h1 className="text-lg font-bold text-white flex-1">⚙️ 관리자 대시보드</h1>
        <span className="text-xs text-gray-500 bg-green-900/20 border border-green-700/30 rounded-full px-2 py-0.5 text-green-400">
          관리자
        </span>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6 space-y-6">
        {/* Upload card */}
        <div className="bg-[#1a1a2a] border border-purple-500/20 rounded-2xl p-5">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            📤 PDF 업로드
          </h2>

          <form onSubmit={handleUpload} className="space-y-3">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="과목 이름 *"
              required
              className="w-full bg-[#0a0a1a] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
            />
            <input
              type="text"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="설명 (선택)"
              className="w-full bg-[#0a0a1a] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
            />

            {/* File drop zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                file ? 'border-purple-500 bg-purple-900/10' : 'border-gray-700 hover:border-gray-500'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
              <div className="text-3xl mb-2">{file ? '📄' : '📁'}</div>
              <div className="text-sm text-gray-400">
                {file ? (
                  <>
                    <span className="text-purple-300 font-medium">{file.name}</span>
                    <br />
                    <span className="text-gray-600 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  </>
                ) : (
                  <>
                    <span className="text-gray-400">PDF 파일을 선택하세요</span>
                    <br />
                    <span className="text-gray-600 text-xs">최대 50MB</span>
                  </>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={uploading || !file || !title.trim()}
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-bold text-base disabled:opacity-40 active:scale-95 transition-all"
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span> 처리 중...
                </span>
              ) : (
                'PDF 업로드 및 카드 생성'
              )}
            </button>
          </form>

          {msg && (
            <div className={`mt-3 p-3 rounded-xl text-sm ${
              msg.type === 'ok'
                ? 'bg-green-900/20 border border-green-700/30 text-green-400'
                : 'bg-red-900/20 border border-red-700/30 text-red-400'
            }`}>
              {msg.text}
            </div>
          )}
        </div>

        {/* Subject list */}
        <div>
          <h2 className="text-base font-bold text-white mb-3">
            📚 등록된 자료
            <span className="ml-2 text-gray-500 font-normal text-sm">{subjects.length}개</span>
          </h2>

          <div className="space-y-2">
            {subjects.length === 0 ? (
              <div className="text-center py-10 text-gray-600 text-sm">
                아직 등록된 자료가 없습니다
              </div>
            ) : (
              subjects.map(s => (
                <div
                  key={s.id}
                  className="bg-[#1a1a2a] border border-gray-700/50 rounded-2xl p-4 flex items-center gap-3"
                >
                  <div className="text-2xl">📄</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">{s.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      카드 {s.cardCount}장 · {new Date(s.createdAt).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(s.id, s.title)}
                    className="flex-shrink-0 text-red-400 text-xs bg-red-900/20 border border-red-900/30 rounded-lg px-3 py-1.5 active:scale-95 transition-transform"
                  >
                    삭제
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
