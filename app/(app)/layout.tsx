export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import MobileTopNav from '@/components/layout/MobileTopNav'
import PairingGate from '@/components/layout/PairingGate'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const admin = createAdminClient()

  let { data: profile } = await admin
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  // Create/fix profile row if missing or display_name is empty
  if (!profile || !profile.display_name) {
    const displayName = (user.user_metadata?.full_name as string)
      || (user.user_metadata?.name as string)
      || user.email?.split('@')[0]
      || 'ユーザー'
    await admin.from('users').upsert(
      { id: user.id, display_name: displayName },
      { onConflict: 'id' }
    )
    const { data: refreshed } = await admin
      .from('users').select('*').eq('id', user.id).single()
    profile = refreshed
  }

  if (!profile?.partner_id) {
    const name = profile?.display_name
      || user.email?.split('@')[0]
      || 'ユーザー'
    return (
      <div className="min-h-screen">
        <PairingGate userId={user.id} displayName={name} />
      </div>
    )
  }

  const { data: partner } = await admin
    .from('users').select('*').eq('id', profile.partner_id).single()

  return (
    <div className="flex flex-col" style={{ height: '100dvh' }}>
      <Header user={profile} partner={partner} />
      <MobileTopNav />
      <main className="flex-1 min-h-0 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
