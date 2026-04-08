import { createClient } from '@/lib/supabase/server'
import { PendingActions } from '@/components/sdr/PendingActions'
import { SDRMetrics } from '@/components/sdr/SDRMetrics'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = { title: 'SDR Autônomo | Agency OS' }

export default async function SDRPage() {
  const supabase = await createClient()

  const [pendingRes, pipelinesRes] = await Promise.all([
    supabase
      .from('sdr_actions')
      .select('*, leads(name, company, niche, phone), crm_scores(score)')
      .eq('status', 'pending')
      .eq('action_type', 'draft_message')
      .order('created_at', { ascending: true }),
    supabase
      .from('sdr_pipelines')
      .select('status'),
  ])

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center gap-3">
        <Link
          href="/crm"
          className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h2 className="text-xl font-semibold font-display text-[var(--color-text-primary)] tracking-tight">
            SDR Autônomo
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            Pipeline de captação e qualificação automática de leads
          </p>
        </div>
      </div>

      <SDRMetrics pipelines={pipelinesRes.data ?? []} />

      <PendingActions actions={(pendingRes.data ?? []) as Parameters<typeof PendingActions>[0]['actions']} />
    </div>
  )
}
