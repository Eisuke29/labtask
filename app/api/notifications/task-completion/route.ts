import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/webpush'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { taskId, completedByUserId } = await request.json()
  if (!taskId || !completedByUserId) {
    return NextResponse.json({ error: '無効なリクエスト' }, { status: 400 })
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: task } = await supabaseAdmin
    .from('tasks')
    .select('id, title, owner_type')
    .eq('id', taskId)
    .single()

  if (!task || task.owner_type !== 'shared') {
    return NextResponse.json({ sent: 0 })
  }

  const { data: completingUser } = await supabaseAdmin
    .from('users')
    .select('id, display_name, partner_id')
    .eq('id', completedByUserId)
    .single()

  if (!completingUser?.partner_id) {
    return NextResponse.json({ sent: 0 })
  }

  const partnerId = completingUser.partner_id

  // パートナーがすでに完了済みか確認
  const { data: partnerCompletion } = await supabaseAdmin
    .from('task_completions')
    .select('id')
    .eq('task_id', taskId)
    .eq('user_id', partnerId)
    .maybeSingle()

  const senderName = completingUser.display_name || 'ペア'
  const body = partnerCompletion
    ? `${senderName} も「${task.title}」を完了！2人とも完了しました 🎉`
    : `${senderName} が「${task.title}」を完了しました！あなたもどうぞ`

  const { sent } = await sendPushToUser(partnerId, {
    title: '✅ タスク完了！',
    body,
    url: '/dashboard',
  })

  return NextResponse.json({ sent })
}
