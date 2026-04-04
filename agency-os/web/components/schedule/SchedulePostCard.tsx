import { Clock, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ScheduledPostPlatform } from '@/types/database'

type ScheduleStatus = 'scheduled' | 'published' | 'failed'

interface SchedulePostCardProps {
  platform: ScheduledPostPlatform
  title: string | null
  publishAt: string
  status: ScheduleStatus
  errorMsg?: string | null
}

const PLATFORM_CONFIG: Record<ScheduledPostPlatform, { label: string; color: string; bg: string }> = {
  instagram: { label: 'Instagram', color: 'text-amber-400', bg: 'bg-amber-500/15' },
  linkedin:  { label: 'LinkedIn',  color: 'text-blue-400',  bg: 'bg-blue-500/15'  },
  tiktok:    { label: 'TikTok',    color: 'text-pink-400',  bg: 'bg-pink-500/15'  },
  twitter:   { label: 'Twitter',   color: 'text-sky-400',   bg: 'bg-sky-500/15'   },
}

const STATUS_CONFIG: Record<ScheduleStatus, { label: string; icon: typeof Clock; color: string }> = {
  scheduled: { label: 'Agendado',   icon: Clock,        color: 'text-zinc-400' },
  published: { label: 'Publicado',  icon: CheckCircle,  color: 'text-emerald-400' },
  failed:    { label: 'Falhou',     icon: XCircle,      color: 'text-red-400' },
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function SchedulePostCard({ platform, title, publishAt, status, errorMsg }: SchedulePostCardProps) {
  const plt = PLATFORM_CONFIG[platform]
  const st = STATUS_CONFIG[status]
  const StatusIcon = st.icon

  return (
    <div className="rounded-lg border border-zinc-800 bg-[#18181B] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', plt.bg, plt.color)}>
              {plt.label}
            </span>
            <span className={cn('inline-flex items-center gap-1 text-xs font-medium', st.color)}>
              <StatusIcon size={11} strokeWidth={2.5} />
              {st.label}
            </span>
          </div>
          <p className="truncate text-sm font-medium text-[#FAFAFA]">
            {title ?? 'Post sem título'}
          </p>
          <p className="mt-1 text-xs text-zinc-500">{formatDateTime(publishAt)}</p>
          {status === 'failed' && errorMsg && (
            <p className="mt-1.5 rounded bg-red-500/10 px-2 py-1 text-xs text-red-400">{errorMsg}</p>
          )}
        </div>
      </div>
    </div>
  )
}
