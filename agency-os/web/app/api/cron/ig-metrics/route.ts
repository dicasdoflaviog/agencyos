import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Fetch active clients that have an instagram_handle set
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, name, instagram_handle')
    .eq('status', 'active')
    .not('instagram_handle', 'is', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!clients || clients.length === 0) {
    return NextResponse.json({ message: 'No clients with instagram_handle', processed: 0 })
  }

  const results: { client: string; status: string; followers?: number; error?: string }[] = []
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://agency-os.vercel.app'

  for (const client of clients) {
    try {
      const res = await fetch(`${baseUrl}/api/integrations/apify/instagram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Pass service-level auth to bypass user session requirement
          'x-cron-secret': process.env.CRON_SECRET ?? '',
        },
        body: JSON.stringify({
          client_id: client.id,
          username: client.instagram_handle,
        }),
      })

      const data = await res.json() as { success?: boolean; metrics?: { followers?: number }; error?: string }

      if (res.ok && data.success) {
        results.push({ client: client.name, status: 'ok', followers: data.metrics?.followers })
      } else {
        results.push({ client: client.name, status: 'error', error: data.error })
      }
    } catch (err) {
      results.push({ client: client.name, status: 'error', error: String(err) })
    }
  }

  const succeeded = results.filter(r => r.status === 'ok').length
  const failed = results.filter(r => r.status === 'error').length

  return NextResponse.json({
    message: `ig-metrics cron completed`,
    processed: clients.length,
    succeeded,
    failed,
    results,
  })
}
