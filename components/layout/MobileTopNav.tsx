'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const tabs = [
  {
    href: '/dashboard',
    label: 'タスク',
    icon: (active: boolean) => (
      <svg className={`w-5 h-5 ${active ? 'text-[#00d4ff]' : 'text-[#6b6b8a]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    href: '/completed',
    label: '完了済み',
    icon: (active: boolean) => (
      <svg className={`w-5 h-5 ${active ? 'text-[#00d4ff]' : 'text-[#6b6b8a]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: '設定',
    icon: (active: boolean) => (
      <svg className={`w-5 h-5 ${active ? 'text-[#00d4ff]' : 'text-[#6b6b8a]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

function Spinner() {
  return (
    <svg className="w-5 h-5 animate-spin text-[#00d4ff]" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 22 6.477 22 12h-4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

export default function MobileTopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null)

  useEffect(() => {
    setNavigatingTo(null)
  }, [pathname])

  const handleNav = (href: string) => {
    if (pathname === href || navigatingTo === href) return
    setNavigatingTo(href)
    router.push(href)
  }

  return (
    <nav
      className="md:hidden flex-shrink-0 bg-[#13131a] border-b border-[#1e1e2e] z-40"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex">
        {tabs.map((tab) => {
          const active = pathname === tab.href
          const loading = navigatingTo === tab.href
          return (
            <button
              key={tab.href}
              onClick={() => handleNav(tab.href)}
              className="flex-1 flex flex-col items-center justify-center py-1.5 gap-0.5"
            >
              {loading ? <Spinner /> : tab.icon(active)}
              <span className={`text-[10px] ${active || loading ? 'text-[#00d4ff]' : 'text-[#6b6b8a]'}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
