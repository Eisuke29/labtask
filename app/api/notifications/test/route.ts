import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/webpush'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    const { sent, failed } = await sendPushToUser(user.id, {
      title: '🔔 テスト通知',
      body: 'プッシュ通知が正常に動作しています！',
      url: '/dashboard',
    })

    if (sent === 0 && failed === 0) {
      return NextResponse.json({ error: '登録済みデバイスがありません' }, { status: 400 })
    }
    if (sent === 0) {
      return NextResponse.json({ error: `送信失敗 (${failed}件) — サーバーログを確認してください` }, { status: 500 })
    }
    return NextResponse.json({ success: true, sent, failed })
  } catch (e) {
    console.error('[test notification] error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
