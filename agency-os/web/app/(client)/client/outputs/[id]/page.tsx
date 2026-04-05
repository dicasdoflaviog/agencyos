import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ClientApproveForm } from '@/components/client-portal/ClientApproveForm'

export default async function ClientOutputDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/client/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('client_id')
    .eq('id', user.id)
    .single()

  const { data: output } = await supabase
    .from('job_outputs')
    .select('*, job:jobs(id, title)')
    .eq('id', id)
    .eq('client_id', profile?.client_id ?? '')
    .single()

  if (!output) notFound()

  const STAGE_LABELS: Record<string, string> = {
    client_review: 'Aguardando aprovação',
    approved: 'Aprovado',
    published: 'Publicado',
    rejected: 'Revisão solicitada',
    draft: 'Rascunho',
    internal_review: 'Revisão interna',
  }

  return (
    <div>
      <Link href="/client/outputs" className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors mb-4">
        <ArrowLeft size={13} strokeWidth={2} />
        Voltar
      </Link>

      <div className="mb-4">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">{output.job?.title ?? 'Conteúdo'}</h1>
        <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${
          output.approval_stage === 'client_review' ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' :
          output.approval_stage === 'approved' ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' :
          output.approval_stage === 'published' ? 'bg-blue-500/10 text-blue-400' :
          'bg-white/[0.06] text-[var(--color-text-secondary)]'
        }`}>
          {STAGE_LABELS[output.approval_stage] ?? output.approval_stage}
        </span>
      </div>

      <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-6 mb-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">Conteúdo</h2>
        <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed">{output.output_content}</p>
      </div>

      {output.approval_stage === 'client_review' && (
        <ClientApproveForm outputId={output.id} />
      )}
    </div>
  )
}
