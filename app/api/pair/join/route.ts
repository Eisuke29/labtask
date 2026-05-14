import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { code } = await request.json()
  if (!code) return NextResponse.json({ error: 'コードが必要です' }, { status: 400 })

  const admin = createAdminClient()

  const displayName = (user.user_metadata?.full_name as string)
    || (user.user_metadata?.name as string)
    || user.email?.split('@')[0]
    || 'ユーザー'

  // Ensure current user has a row in public.users
  await admin.from('users').upsert(
    { id: user.id, display_name: displayName },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  // Already paired → just go to dashboard
  const { data: me } = await admin
    .from('users').select('partner_id').eq('id', user.id).single()
  if (me?.partner_id) {
    return NextResponse.json({ success: true })
  }

  // Look up the invite code
  const { data: invite, error: inviteError } = await admin
    .from('invite_codes')
    .select('*')
    .eq('code', code)
    .is('used_by', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (inviteError || !invite) {
    return NextResponse.json(
      { error: '無効なコードです。期限切れまたは使用済みの可能性があります' },
      { status: 400 }
    )
  }

  if (invite.created_by === user.id) {
    return NextResponse.json({ error: '自分のコードは使用できません' }, { status: 400 })
  }

  // Update partner_id for BOTH users first, then mark code as used
  const { error: errB } = await admin
    .from('users').update({ partner_id: invite.created_by }).eq('id', user.id)
  if (errB) {
    return NextResponse.json({ error: 'ペアリングに失敗しました: ' + errB.message }, { status: 500 })
  }

  const { error: errA } = await admin
    .from('users').update({ partner_id: user.id }).eq('id', invite.created_by)
  if (errA) {
    await admin.from('users').update({ partner_id: null }).eq('id', user.id)
    return NextResponse.json({ error: 'ペアリングに失敗しました: ' + errA.message }, { status: 500 })
  }

  // Mark code as used only after both updates succeed
  await admin.from('invite_codes')
    .update({ used_by: user.id, used_at: new Date().toISOString() })
    .eq('id', invite.id)

  return NextResponse.json({ success: true })
}
