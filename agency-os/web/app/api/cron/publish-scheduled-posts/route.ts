import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const { data: posts, error } = await supabase
    .from('scheduled_posts')
    .select('*, post:posts(id, title, content, cover_url), client:clients(id, name)')
    .lte('publish_at', new Date().toISOString())
    .eq('status', 'scheduled')

  if (error) {
    console.error('[cron] fetch scheduled_posts error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!posts || posts.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  const results: { id: string; status: string }[] = []

  for (const sp of posts) {
    try {
      // Stub: log the platform publish action (real API integration is future work)
      console.log(`[cron] Publishing post ${sp.id} to ${sp.platform}`, {
        client: sp.client?.name,
        post: sp.post?.title,
        publish_at: sp.publish_at,
      })

      const { error: updateError } = await supabase
        .from('scheduled_posts')
        .update({ status: 'published', external_id: `stub_${Date.now()}` })
        .eq('id', sp.id)

      if (updateError) throw updateError

      results.push({ id: sp.id, status: 'published' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[cron] Failed to publish ${sp.id}:`, msg)

      await supabase
        .from('scheduled_posts')
        .update({ status: 'failed', error_msg: msg })
        .eq('id', sp.id)

      results.push({ id: sp.id, status: 'failed' })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
