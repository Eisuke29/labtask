import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

function getWebPush() {
  let subject = process.env.VAPID_SUBJECT!
  // web-push requires mailto: or https:// prefix
  if (!subject.startsWith('mailto:') && !subject.startsWith('https://')) {
    subject = `mailto:${subject}`
  }
  webpush.setVapidDetails(
    subject,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
  return webpush
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function sendPushToUser(userId: string, payload: object): Promise<{ sent: number; failed: number }> {
  const supabaseAdmin = getAdminClient()
  const { data: subscriptions } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('user_id', userId)

  if (!subscriptions || subscriptions.length === 0) return { sent: 0, failed: 0 }

  const wp = getWebPush()
  const payloadStr = JSON.stringify(payload)
  const results = await Promise.allSettled(
    subscriptions.map(({ subscription }) =>
      wp.sendNotification(subscription as webpush.PushSubscription, payloadStr)
    )
  )

  let sent = 0, failed = 0
  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    if (result.status === 'fulfilled') {
      sent++
    } else {
      failed++
      console.error(`Push to subscription ${i} failed:`, result.reason)
      // Remove expired/invalid subscriptions (410 Gone)
      const status = (result.reason as { statusCode?: number })?.statusCode
      if (status === 410 || status === 404) {
        await supabaseAdmin.from('push_subscriptions').delete().eq('id', subscriptions[i].id)
      }
    }
  }
  return { sent, failed }
}

export async function sendPushToMultiple(userIds: string[], payload: object) {
  await Promise.allSettled(userIds.map((id) => sendPushToUser(id, payload)))
}
