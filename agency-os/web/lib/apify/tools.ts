import 'server-only'
import { type SupabaseClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface IGMetrics {
  username: string
  followers: number
  following: number
  posts: number
  engagement_rate: number | null
  date: string
}

export interface StyleData {
  colors: string[]
  fonts: string[]
  source_url: string
}

// ─────────────────────────────────────────────────────────────
// DB helpers (fast — no API call)
// ─────────────────────────────────────────────────────────────

/** Returns latest synced IG metrics for a client from the DB. */
export async function getClientIGMetrics(
  clientId: string,
  supabase: SupabaseClient,
): Promise<IGMetrics | null> {
  const { data } = await supabase
    .from('ig_metrics')
    .select('username, followers, following, posts, engagement_rate, date')
    .eq('client_id', clientId)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data ?? null
}

/** Returns last 7 days of IG metrics for trend context. */
export async function getClientIGTrend(
  clientId: string,
  supabase: SupabaseClient,
): Promise<IGMetrics[]> {
  const { data } = await supabase
    .from('ig_metrics')
    .select('username, followers, following, posts, engagement_rate, date')
    .eq('client_id', clientId)
    .order('date', { ascending: false })
    .limit(7)

  return data ?? []
}

// ─────────────────────────────────────────────────────────────
// Live Apify scrape (triggers API call — use sparingly)
// ─────────────────────────────────────────────────────────────

/** Scrapes a fresh Instagram profile via Apify and returns metrics.
 *  Use only when user explicitly requests "atualizar" or "sincronizar". */
export async function scrapeInstagramProfile(
  username: string,
  clientId: string,
): Promise<IGMetrics | null> {
  const token = process.env.APIFY_API_TOKEN
  if (!token) return null

  try {
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/runs?token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames: [username.replace('@', '')], resultsLimit: 1 }),
      },
    )
    if (!runRes.ok) return null

    const { data: run } = await runRes.json() as { data: { id: string } }
    const runId = run.id

    // Poll until done (max 60s)
    let status = 'RUNNING'
    for (let i = 0; i < 12 && status === 'RUNNING'; i++) {
      await new Promise(r => setTimeout(r, 5000))
      const s = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`)
      const { data: runData } = await s.json() as { data: { status: string } }
      status = runData.status
    }
    if (status !== 'SUCCEEDED') return null

    const dataRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${token}&limit=1`,
    )
    const items = await dataRes.json() as Array<Record<string, unknown>>
    const p = items[0]
    if (!p) return null

    return {
      username: username.replace('@', ''),
      followers: Number(p.followersCount ?? p.followers_count ?? 0),
      following: Number(p.followsCount ?? p.following_count ?? 0),
      posts: Number(p.postsCount ?? p.media_count ?? 0),
      engagement_rate: p.engagementRate != null ? Number(p.engagementRate) : null,
      date: new Date().toISOString().split('T')[0],
    }
  } catch {
    return null
  }
}

/** Extracts brand colors and fonts from a website URL via Apify. */
export async function scrapeWebsiteStyle(url: string): Promise<StyleData | null> {
  const token = process.env.APIFY_API_TOKEN
  if (!token) return null

  try {
    const { ApifyClient } = await import('apify-client')
    const client = new ApifyClient({ token })
    const run = await client.actor('apify/web-scraper').call({
      startUrls: [{ url }],
      pageFunction: `async function pageFunction({ page }) {
        return page.evaluate(() => {
          const colors = new Set(), fonts = new Set()
          document.querySelectorAll('*').forEach(el => {
            const s = window.getComputedStyle(el)
            if (s.backgroundColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)') colors.add(s.backgroundColor)
            if (s.color) colors.add(s.color)
            if (s.fontFamily) s.fontFamily.split(',').forEach(f => fonts.add(f.trim().replace(/['"]/g,'')))
          })
          return { colors: [...colors].slice(0, 15), fonts: [...fonts].slice(0, 8) }
        })
      }`,
      maxPagesPerCrawl: 1,
    })

    const { items } = await client.dataset(run.defaultDatasetId).listItems()
    const result = items[0] as { colors?: string[]; fonts?: string[] } | undefined

    return {
      source_url: url,
      colors: result?.colors ?? [],
      fonts: result?.fonts ?? [],
    }
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────
// Context formatters — convert data into agent-readable text
// ─────────────────────────────────────────────────────────────

export function formatIGContext(metrics: IGMetrics): string {
  const eng = metrics.engagement_rate != null
    ? `${(metrics.engagement_rate * 100).toFixed(2)}%`
    : 'não calculado'
  return `\n\n📊 MÉTRICAS DO INSTAGRAM (@${metrics.username}) — ${metrics.date}:
- Seguidores: ${metrics.followers.toLocaleString('pt-BR')}
- Seguindo: ${metrics.following.toLocaleString('pt-BR')}
- Posts: ${metrics.posts.toLocaleString('pt-BR')}
- Taxa de engajamento: ${eng}`
}

export function formatIGTrendContext(trend: IGMetrics[]): string {
  if (trend.length < 2) return ''
  const latest = trend[0]
  const oldest = trend[trend.length - 1]
  const followerGrowth = latest.followers - oldest.followers
  const sign = followerGrowth >= 0 ? '+' : ''
  return `\n\n📈 TENDÊNCIA (últimos ${trend.length} dias): Seguidores ${sign}${followerGrowth.toLocaleString('pt-BR')} (de ${oldest.date} a ${latest.date})`
}

export function formatStyleContext(style: StyleData): string {
  return `\n\n🎨 ESTILO VISUAL (extraído de ${style.source_url}):
- Cores encontradas: ${style.colors.slice(0, 8).join(', ')}
- Fontes encontradas: ${style.fonts.slice(0, 5).join(', ')}`
}

/** Detect if message is asking to sync/update Instagram data. */
export function isIGSyncRequest(message: string): boolean {
  const lower = message.toLowerCase()
  return /atualiz|sincroniz|buscar\s+métricas|puxar\s+dados|refresh/.test(lower)
    && /instagram|ig\b|@\w+|seguidores|perfil/.test(lower)
}

/** Extract @handle or bare username from a message. */
export function extractIGHandle(message: string): string | null {
  const atMatch = message.match(/@([\w.]+)/)
  if (atMatch) return atMatch[1]
  return null
}
