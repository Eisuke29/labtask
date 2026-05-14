'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
  displayName: string
}

export default function PairingGate({ userId: _userId, displayName }: Props) {
  const [tab, setTab] = useState<'generate' | 'join'>('generate')
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const generateCode = async () => {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/pair/generate', { method: 'POST' })
    const data = await res.json()
    if (data.code) setInviteCode(data.code)
    else setError(data.error ?? 'エラーが発生しました')
    setLoading(false)
  }

  const joinWithCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/pair/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode.trim().toUpperCase() }),
      })
      const data = await res.json()
      if (data.success) {
        window.location.href = '/dashboard'
      } else {
        setError(data.error ?? 'エラーが発生しました')
        setLoading(false)
      }
    } catch {
      setError('通信エラーが発生しました')
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth'
  }

  const handleReset = async () => {
    if (!confirm('ペアリング状態をリセットしますか？（デバッグ用）')) return
    setLoading(true)
    await fetch('/api/pair/reset', { method: 'POST' })
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading font-bold text-[#00d4ff] mb-2">LabTask</h1>
          <p className="text-[#e8e8f0]">こんにちは、<span className="font-medium">{displayName}</span>さん</p>
          <p className="text-[#6b6b8a] text-sm mt-1">友人とペアリングしてタスクを共有しましょう</p>
        </div>

        <div className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-6">
          <div className="flex mb-6 bg-[#0a0a0f] rounded-lg p-1">
            <button
              onClick={() => { setTab('generate'); setError(null) }}
              className={`flex-1 py-2 text-sm rounded-md transition-all ${
                tab === 'generate' ? 'bg-[#1e1e2e] text-[#e8e8f0] font-medium' : 'text-[#6b6b8a]'
              }`}
            >
              招待コードを発行
            </button>
            <button
              onClick={() => { setTab('join'); setError(null) }}
              className={`flex-1 py-2 text-sm rounded-md transition-all ${
                tab === 'join' ? 'bg-[#1e1e2e] text-[#e8e8f0] font-medium' : 'text-[#6b6b8a]'
              }`}
            >
              コードで参加
            </button>
          </div>

          {tab === 'generate' ? (
            <div className="space-y-4">
              <p className="text-[#6b6b8a] text-sm">
                招待コードを発行して、友人に共有してください。コードは24時間有効です。
              </p>
              {inviteCode ? (
                <div className="text-center">
                  <div className="bg-[#0a0a0f] border border-[#00d4ff]/30 rounded-xl p-6 mb-4">
                    <p className="text-[#6b6b8a] text-xs mb-2">招待コード</p>
                    <p className="text-3xl font-mono font-bold text-[#00d4ff] tracking-widest">{inviteCode}</p>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(inviteCode)}
                    className="text-sm text-[#6b6b8a] hover:text-[#e8e8f0] transition-colors"
                  >
                    コードをコピー
                  </button>
                </div>
              ) : (
                <button
                  onClick={generateCode}
                  disabled={loading}
                  className="w-full bg-[#00d4ff] text-[#0a0a0f] rounded-lg py-3 font-medium text-sm hover:bg-[#00d4ff]/90 transition-colors disabled:opacity-50"
                >
                  {loading ? '生成中...' : '招待コードを発行する'}
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={joinWithCode} className="space-y-4">
              <p className="text-[#6b6b8a] text-sm">
                友人から受け取った招待コードを入力してください。
              </p>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={8}
                required
                placeholder="XXXXXXXX"
                className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-4 py-3 text-center text-lg font-mono tracking-widest text-[#e8e8f0] placeholder-[#6b6b8a] focus:outline-none focus:border-[#00d4ff] transition-colors uppercase"
              />
              <button
                type="submit"
                disabled={loading || joinCode.length < 6}
                className="w-full bg-[#7c3aed] text-white rounded-lg py-3 font-medium text-sm hover:bg-[#7c3aed]/90 transition-colors disabled:opacity-50"
              >
                {loading ? '確認中...' : 'ペアリングする'}
              </button>
            </form>
          )}

          {error && (
            <p className="mt-4 text-[#ff006e] text-sm bg-[#ff006e]/10 rounded-lg px-4 py-2">{error}</p>
          )}
        </div>

        <button
          onClick={handleSignOut}
          className="mt-4 w-full text-[#6b6b8a] text-sm hover:text-[#e8e8f0] transition-colors"
        >
          ログアウト
        </button>
        <button
          onClick={handleReset}
          disabled={loading}
          className="mt-2 w-full text-[#3a3a5a] text-xs hover:text-[#6b6b8a] transition-colors"
        >
          ペアリングをリセット（デバッグ用）
        </button>
      </div>
    </div>
  )
}
