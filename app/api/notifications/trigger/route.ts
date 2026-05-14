import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runDailyNotifications } from '@/lib/dailyNotifications'

// Debug endpoint: manually trigger daily notifications (requires login)
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const result = await runDailyNotifications()
  return NextResponse.json(result)
}
