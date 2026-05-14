'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@/types'

interface Props {
  user: User
  partner: User | null
}

export default function Header({ user, partner }: Props) {
  const pathname = usePathname()
  const supabase = createClient()
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const navItems = [
    { href: '/dashboard', label: 'タスク' },
    { href: '/completed', label: '完了済み' },
    { href: '/settings', label: '設定' },
  ]

  return (
    <header className="hidden md:flex items-center justify-between px-6 py-4 border-b border-[#1e1e2e] bg-[#13131a] sticky top-0 z-40">
      <div className="flex items-center gap-8">
        <Link href="/dashboard" className="text-xl font-heading font-bold text-[#00d4ff]">
          LabTask
        </Link>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                pathname === item.href
                  ? 'bg-[#1e1e2e] text-[#e8e8f0] font-medium'
                  : 'text-[#6b6b8a] hover:text-[#e8e8f0]'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#39ff14]" />
            <span className="text-[#e8e8f0]">{user.display_name}</span>
          </div>
          {partner && (
            <>
              <span className="text-[#6b6b8a]">/</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#7c3aed]" />
                <span className="text-[#6b6b8a]">{partner.display_name}</span>
              </div>
            </>
          )}
        </div>
        <button
          onClick={handleSignOut}
          className="text-xs text-[#6b6b8a] hover:text-[#e8e8f0] px-3 py-1.5 rounded-lg border border-[#1e1e2e] hover:border-[#6b6b8a] transition-colors"
        >
          ログアウト
        </button>
      </div>
    </header>
  )
}
