'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <html lang="ja">
      <body className="min-h-screen bg-[#0a0a0f] text-[#e8e8f0] flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-[#ff006e]">LabTask</h1>
          <p className="text-[#6b6b8a] text-sm">エラーが発生しました: {error.message}</p>
          {error.digest && <p className="text-[#6b6b8a] text-xs">ID: {error.digest}</p>}
          <button
            onClick={reset}
            className="bg-[#00d4ff] text-[#0a0a0f] rounded-lg px-6 py-2 text-sm font-medium"
          >
            再試行
          </button>
        </div>
      </body>
    </html>
  )
}
