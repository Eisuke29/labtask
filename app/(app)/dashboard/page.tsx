export const dynamic = 'force-dynamic'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import Dashboard from '@/components/tasks/Dashboard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: profile } = await admin.from('users').select('*').eq('id', user.id).single()
  if (!profile) return null

  const { data: partner } = profile.partner_id
    ? await admin.from('users').select('*').eq('id', profile.partner_id).single()
    : { data: null }

  return <Dashboard currentUser={profile} partner={partner} />
}
