import { createClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/webpush'

export interface DailyNotificationResult {
  sent: number
  tasks: number
  today: string
  debug: string[]
}

export async function runDailyNotifications(): Promise<DailyNotificationResult> {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const today = nowJST.toISOString().split('T')[0]
  const debug: string[] = [`date=${today}`]

  const { data: targetUsers } = await supabaseAdmin
    .from('users')
    .select('id, partner_id')

  if (!targetUsers || targetUsers.length === 0) {
    debug.push('no users found')
    return { sent: 0, tasks: 0, today, debug }
  }

  debug.push(`users=${targetUsers.length}`)
  const targetUserIds = new Set(targetUsers.map((u: { id: string }) => u.id))

  // notify_end_date が NULL のタスクも含める（期限日未設定でも通知）
  const { data: tasks, error: taskError } = await supabaseAdmin
    .from('tasks')
    .select('id, title, due_date, owner_type, created_by, task_completions(user_id)')
    .lte('notify_start_date', today)
    .or(`notify_end_date.is.null,notify_end_date.gte.${today}`)

  if (taskError) debug.push(`taskError=${taskError.message}`)
  debug.push(`notifyTasks=${tasks?.length ?? 0}`)

  if (!tasks || tasks.length === 0) return { sent: 0, tasks: 0, today, debug }

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

    if (recipientIds.length === 0) continue

    const isDueToday = task.due_date === today
    const title = isDueToday ? '⏰ 今日が期限！' : '📌 タスクリマインダー'
    const body = isDueToday
      ? `今日が期限！「${task.title}」を完了させましょう`
      : `「${task.title}」の期限が近づいています`

    debug.push(`task="${task.title}" to=[${recipientIds.join(',')}]`)

    for (const userId of recipientIds) {
      notifications.push(
        sendPushToUser(userId, { title, body, url: '/dashboard' }).then(() => {})
      )
    }
  }

  await Promise.allSettled(notifications)
  return { sent: notifications.length, tasks: tasks.length, today, debug }
}
