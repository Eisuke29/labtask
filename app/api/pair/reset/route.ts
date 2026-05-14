import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const admin = createAdminClient()

  const { data: me } = await admin.from('users').select('partner_id').eq('id', user.id).single()

  await admin.from('users').update({ partner_id: null }).eq('id', user.id)
  if (me?.partner_id) {
    await admin.from('users').update({ partner_id: null }).eq('id', me.partner_id)
  }

  await admin.from('invite_codes').delete().eq('created_by', user.id)
  await admin.from('invite_codes').delete().eq('used_by', user.id)

  return NextResponse.json({ success: true })
}
