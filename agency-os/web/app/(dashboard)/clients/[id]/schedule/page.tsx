import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays } from 'lucide-react'
import { PublishCalendar } from '@/components/schedule/PublishCalendar'
import type { ScheduledPostPlatform } from '@/types/database'

type CalendarPost = {
  id: string
  platform: ScheduledPostPlatform
  publish_at: string
  status: 'scheduled' | 'published' | 'failed'
  error_msg: string | null
  post: { id: string; title: string } | null
}

export default async function ClientSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: client }, { data: raw }] = await Promise.all([
    supabase.from('clients').select('id, name').eq('id', id).single(),
    supabase
      .from('scheduled_posts')
      .select('id, platform, publish_at, status, error_msg, post:posts(id, title)')
      .eq('client_id', id)
      .order('publish_at', { ascending: true }),
  ])

  if (!client) notFound()

  const scheduledPosts: CalendarPost[] = (raw ?? []).map(sp => ({
    id: sp.id as string,
    platform: sp.platform as ScheduledPostPlatform,
    publish_at: sp.publish_at as string,
    status: sp.status as 'scheduled' | 'published' | 'failed',
    error_msg: (sp.error_msg as string | null) ?? null,
    post: Array.isArray(sp.post) ? (sp.post[0] ?? null) : (sp.post as { id: string; title: string } | null),
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Link
          href={`/clients/${id}/cms`}
          className="flex items-center gap-2 rounded bg-[var(--color-accent)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-inverse)] hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          <CalendarDays size={14} strokeWidth={2.5} />
          Agendar Post
        </Link>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-[var(--color-bg-surface)] p-6">
        <PublishCalendar scheduledPosts={scheduledPosts} />
      </div>
    </div>
  )
}
