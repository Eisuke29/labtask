import { NextResponse } from 'next/server'
import { createClient as createRawClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const checks: Record<string, string> = {}

  checks.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'MISSING'
  checks.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'MISSING'
  checks.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'MISSING'

  let dbReachable = false
  try {
    const admin = createRawClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { error } = await admin.from('users').select('id').limit(1)
    dbReachable = !error
    checks.db = error ? `error: ${error.message}` : 'ok'
  } catch (e) {
    checks.db = `throw: ${e instanceof Error ? e.message : String(e)}`
  }

  return NextResponse.json({ ok: dbReachable, checks, ts: new Date().toISOString() })
}
