import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ApifyClient } from 'apify-client'

interface ApifyScraperResult {
  url?: string
  colors?: string[]
  fonts?: string[]
  [key: string]: unknown
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { url, client_id } = await req.json() as { url: string; client_id?: string }
  if (!url) return Response.json({ error: 'url required' }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles').select('workspace_id').eq('id', user.id).single()

  const apiToken = process.env.APIFY_API_TOKEN
  if (!apiToken) {
    return Response.json({
      colors: ['#1a1a2e', '#16213e', '#0f3460', '#e94560'],
      fonts: ['Inter', 'DM Sans'],
      source_url: url,
      message: 'APIFY_API_TOKEN not configured — using mock data',
    })
  }

  try {
    const apifyClient = new ApifyClient({ token: apiToken })
    const run = await apifyClient.actor('apify/web-scraper').call({
      startUrls: [{ url }],
      pageFunction: `async function pageFunction({ page, request }) {
        const styles = await page.evaluate(() => {
          const colors = new Set();
          const fonts = new Set();
          document.querySelectorAll('*').forEach(el => {
            const s = window.getComputedStyle(el);
            if (s.backgroundColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)') colors.add(s.backgroundColor);
            if (s.color) colors.add(s.color);
            if (s.fontFamily) s.fontFamily.split(',').forEach(f => fonts.add(f.trim().replace(/['"]/g, '')));
          });
          return { colors: [...colors].slice(0, 20), fonts: [...fonts].slice(0, 10) };
        });
        return { url: request.url, ...styles };
      }`,
      maxPagesPerCrawl: 1,
    })

    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems()
    const result = items[0] as ApifyScraperResult | undefined

    const { data: reference } = await supabase.from('client_references').insert({
      client_id: client_id ?? null,
      workspace_id: profile?.workspace_id,
      source_url: url,
      colors: result?.colors ?? [],
      fonts: result?.fonts ?? [],
      raw_data: result ?? {},
    }).select().single()

    return Response.json({ reference, colors: result?.colors ?? [], fonts: result?.fonts ?? [] })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
