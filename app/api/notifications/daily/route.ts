import { NextResponse } from 'next/server'
import { runDailyNotifications } from '@/lib/dailyNotifications'

// Vercel Cron Jobs send GET requests (0 22 * * * = 07:00 JST)
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runDailyNotifications()
  return NextResponse.json(result)
}
