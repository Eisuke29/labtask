'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthClient() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const supabase = createClient()

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (mode === 'register') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: displayName } },
      })
      if (error) {
        setError(error.message)
      } else {
        setMessage('確認メールを送信しました。メールを確認してください。')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError('メールアドレスまたはパスワードが間違っています')
      } else {
        window.location.href = '/dashboard'
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-heading font-bold text-[#00d4ff] mb-2">LabTask</h1>
          <p className="text-[#6b6b8a] text-sm">研究室タスク共有アプリ</p>
        </div>

        <div className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-8">
          <div className="flex mb-6 bg-[#0a0a0f] rounded-lg p-1">
            <button
              onClick={() => { setMode('login'); setError(null) }}
              className={`flex-1 py-2 text-sm rounded-md transition-all ${
                mode === 'login'
                  ? 'bg-[#1e1e2e] text-[#e8e8f0] font-medium'
                  : 'text-[#6b6b8a] hover:text-[#e8e8f0]'
              }`}
            >
              ログイン
            </button>
            <button
              onClick={() => { setMode('register'); setError(null) }}
              className={`flex-1 py-2 text-sm rounded-md transition-all ${
                mode === 'register'
                  ? 'bg-[#1e1e2e] text-[#e8e8f0] font-medium'
                  : 'text-[#6b6b8a] hover:text-[#e8e8f0]'
              }`}
            >
              新規登録
            </button>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm text-[#6b6b8a] mb-1">表示名</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  placeholder="名前を入力"
                  className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-4 py-3 text-sm text-[#e8e8f0] placeholder-[#6b6b8a] focus:outline-none focus:border-[#00d4ff] transition-colors"
                />
              </div>
            )}
            <div>
              <label className="block text-sm text-[#6b6b8a] mb-1">メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-4 py-3 text-sm text-[#e8e8f0] placeholder-[#6b6b8a] focus:outline-none focus:border-[#00d4ff] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-[#6b6b8a] mb-1">パスワード</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-4 py-3 text-sm text-[#e8e8f0] placeholder-[#6b6b8a] focus:outline-none focus:border-[#00d4ff] transition-colors"
              />
            </div>

            {error && (
              <p className="text-[#ff006e] text-sm bg-[#ff006e]/10 rounded-lg px-4 py-2">{error}</p>
            )}
            {message && (
              <p className="text-[#39ff14] text-sm bg-[#39ff14]/10 rounded-lg px-4 py-2">{message}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00d4ff] text-[#0a0a0f] rounded-lg py-3 font-medium text-sm hover:bg-[#00d4ff]/90 transition-colors disabled:opacity-50"
            >
              {loading ? '処理中...' : mode === 'login' ? 'ログイン' : '新規登録'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
