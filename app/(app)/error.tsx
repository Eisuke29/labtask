'use client'

import { useEffect } from 'react'

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[AppError]', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-bold text-[#ff006e]">エラーが発生しました</h2>
        <p className="text-[#6b6b8a] text-sm">{error.message}</p>
        {error.digest && <p className="text-[#6b6b8a] text-xs">ID: {error.digest}</p>}
        <button
          onClick={reset}
          className="bg-[#00d4ff] text-[#0a0a0f] rounded-lg px-6 py-2 text-sm font-medium"
        >
          再試行
        </button>
      </div>
    </div>
  )
}
