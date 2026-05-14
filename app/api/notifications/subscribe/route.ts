import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { subscription, device_name } = await request.json()
  if (!subscription) return NextResponse.json({ error: 'サブスクリプションが必要です' }, { status: 400 })

  const { error } = await supabase.from('push_subscriptions').insert({
    user_id: user.id,
    subscription,
    device_name,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { endpoint } = await request.json()

  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .contains('subscription', { endpoint })

  return NextResponse.json({ success: true })
}
