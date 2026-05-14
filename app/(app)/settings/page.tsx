export const dynamic = 'force-dynamic'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import SettingsClient from '@/components/layout/SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: profile } = await admin.from('users').select('*').eq('id', user.id).single()
  if (!profile) return null

  const { data: partner } = profile.partner_id
    ? await admin.from('users').select('*').eq('id', profile.partner_id).single()
    : { data: null }

  const { data: devices } = await admin
    .from('push_subscriptions')
    .select('id, device_name, created_at')
    .eq('user_id', user.id)

  return (
    <SettingsClient
      user={profile}
      partner={partner}
      devices={devices ?? []}
    />
  )
}
