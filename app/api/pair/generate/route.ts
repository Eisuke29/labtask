import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

function generateCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const admin = createAdminClient()

  const displayName = (user.user_metadata?.full_name as string)
    || (user.user_metadata?.name as string)
    || user.email?.split('@')[0]
    || 'ユーザー'

  // Ensure user has a row in public.users
  await admin.from('users').upsert(
    { id: user.id, display_name: displayName },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  const code = generateCode()
  const { error } = await admin.from('invite_codes').insert({ code, created_by: user.id })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ code })
}
