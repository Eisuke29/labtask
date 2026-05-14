'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AuthClient() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setError(error.message)
    setLoading(false)
  }

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

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 rounded-lg py-3 px-4 font-medium text-sm hover:bg-gray-100 transition-colors mb-4 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Googleでログイン
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-[#1e1e2e]" />
            <span className="text-[#6b6b8a] text-xs">または</span>
            <div className="flex-1 h-px bg-[#1e1e2e]" />
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
