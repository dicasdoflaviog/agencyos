import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Stub: In production, this would sync Meta Ads metrics for each client
  // using their stored integration credentials.
  const supabase = createAdminClient()

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .eq('status', 'active')

  // TODO: for each client, fetch Meta Ads API and upsert ads_metrics
  return NextResponse.json({
    message: 'ads-metrics cron stub',
    processed: 0,
    clients: clients?.length ?? 0,
  })
}
