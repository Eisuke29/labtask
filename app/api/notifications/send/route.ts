import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/webpush'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { targetUserId, title, body, url } = await request.json()
  if (!targetUserId || !title) return NextResponse.json({ error: 'パラメータ不足' }, { status: 400 })

  await sendPushToUser(targetUserId, { title, body, url: url ?? '/' })

  return NextResponse.json({ success: true })
}
