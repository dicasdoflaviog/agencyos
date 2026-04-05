import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const { client_id, username } = await req.json()

    if (!client_id || !username) {
      return NextResponse.json({ error: 'client_id and username are required' }, { status: 400 })
    }

    const token = process.env.APIFY_API_TOKEN
    if (!token) {
      return NextResponse.json({ error: 'APIFY_API_TOKEN not configured' }, { status: 500 })
    }

    // Run Apify Instagram profile scraper
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/runs?token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernames: [username.replace('@', '')],
          resultsLimit: 1,
        }),
      }
    )

    if (!runRes.ok) {
      const err = await runRes.text()
      return NextResponse.json({ error: `Apify error: ${err}` }, { status: 502 })
    }

    const { data: run } = await runRes.json()
    const runId: string = run.id

    // Poll until finished (max 60s)
    let attempts = 0
    let status = 'RUNNING'
    while (status === 'RUNNING' && attempts < 12) {
      await new Promise(r => setTimeout(r, 5000))
      attempts++
      const statusRes = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`
      )
      const { data: runData } = await statusRes.json()
      status = runData.status
    }

    if (status !== 'SUCCEEDED') {
      return NextResponse.json({ error: `Apify run ended with status: ${status}` }, { status: 502 })
    }

    // Fetch results
    const datasetRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${token}&limit=1`
    )
    const items = await datasetRes.json()
    const profile = items[0]

    if (!profile) {
      return NextResponse.json({ error: 'No profile data returned' }, { status: 404 })
    }

    const followers = profile.followersCount ?? profile.followers_count ?? 0
    const following = profile.followsCount ?? profile.following_count ?? 0
    const posts = profile.postsCount ?? profile.media_count ?? 0
    const engagement = profile.engagementRate ?? null

    const supabase = createAdminClient()

    // Upsert today's metrics
    const today = new Date().toISOString().split('T')[0]
    const { error: upsertErr } = await supabase
      .from('ig_metrics')
      .upsert(
        {
          client_id,
          date: today,
          username: username.replace('@', ''),
          followers,
          following,
          posts,
          engagement_rate: engagement,
          raw_data: profile,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'client_id,date' }
      )

    if (upsertErr) {
      console.error('[apify/instagram] upsert error:', upsertErr)
      return NextResponse.json({ error: upsertErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      metrics: { followers, following, posts, engagement_rate: engagement, date: today },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[apify/instagram]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
