import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/webpush'

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Current hour in JST (UTC+9)
  const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const currentHourJST = nowJST.getUTCHours()
  const today = nowJST.toISOString().split('T')[0]

  // Only notify users whose preferred notification hour matches the current JST hour
  const { data: targetUsers } = await supabaseAdmin
    .from('users')
    .select('id, partner_id')
    .eq('notify_hour', currentHourJST)

  if (!targetUsers || targetUsers.length === 0) {
    return NextResponse.json({ sent: 0, hour: currentHourJST })
  }

  const targetUserIds = new Set(targetUsers.map((u: { id: string }) => u.id))

  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('id, title, due_date, owner_type, created_by, task_completions(user_id)')
    .lte('notify_start_date', today)
    .gte('notify_end_date', today)

  if (!tasks) return NextResponse.json({ sent: 0 })

  const notifications: Promise<void>[] = []

  for (const task of tasks) {
    const completedUserIds = (task.task_completions as { user_id: string }[]).map((c) => c.user_id)

    let candidateIds: string[] = []
    if (task.owner_type === 'shared') {
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id')
        .or(`id.eq.${task.created_by},partner_id.eq.${task.created_by}`)
      candidateIds = (users ?? []).map((u: { id: string }) => u.id)
    } else {
      candidateIds = [task.created_by]
    }

    const recipientIds = candidateIds.filter(
      (id) => targetUserIds.has(id) && !completedUserIds.includes(id)
    )

    const isDueToday = task.due_date === today
    const title = isDueToday ? '⏰ 今日が期限！' : '📌 タスクリマインダー'
    const body = isDueToday
      ? `今日が期限！「${task.title}」を完了させましょう`
      : `「${task.title}」の期限が近づいています`

    for (const userId of recipientIds) {
      notifications.push(sendPushToUser(userId, { title, body, url: '/dashboard' }).then(() => {}))
    }
  }

  await Promise.allSettled(notifications)
  return NextResponse.json({ sent: notifications.length, hour: currentHourJST })
}
