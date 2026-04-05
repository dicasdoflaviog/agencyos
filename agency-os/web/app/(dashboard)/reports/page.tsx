import Link from 'next/link'
import { Plus, FileText, Download, Share2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import type { Report } from '@/types/database'

export const metadata = { title: 'Relatórios | Agency OS' }

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending:    { label: 'Pendente',   className: 'bg-white/[0.06] text-[var(--color-text-secondary)]' },
  generating: { label: 'Gerando…',  className: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' },
  ready:      { label: 'Pronto',    className: 'bg-[var(--color-success)]/10 text-[var(--color-success)]' },
  failed:     { label: 'Falhou',    className: 'bg-[var(--color-error)]/10 text-[var(--color-error)]' },
}

export default async function ReportsPage() {
  const supabase = await createClient()

  const { data: reports } = await supabase
    .from('reports')
    .select('*, client:clients(id, name)')
    .order('created_at', { ascending: false })

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .eq('status', 'active')
    .order('name')

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display text-[var(--color-text-primary)] tracking-tight">Relatórios</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {reports?.length ?? 0} relatório{(reports?.length ?? 1) !== 1 ? 's' : ''} gerado{(reports?.length ?? 1) !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Gerar novo relatório por cliente */}
      {clients && clients.length > 0 && (
        <div className="mb-6 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4">
          <p className="mb-3 text-sm font-medium text-[var(--color-text-primary)]">Gerar relatório para:</p>
          <div className="flex flex-wrap gap-2">
            {clients.map((c) => (
              <Link key={c.id} href={`/reports/${c.id}/new`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[var(--color-border-subtle)] bg-transparent text-[var(--color-text-secondary)] hover:bg-white/[0.05] hover:text-[var(--color-text-primary)] cursor-pointer"
                >
                  <Plus size={13} className="mr-1.5" />
                  {c.name}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Lista de relatórios */}
      {!reports || reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] py-16">
          <FileText size={32} className="mb-3 text-[var(--color-text-secondary)]" strokeWidth={1.5} />
          <p className="text-sm font-medium text-[var(--color-text-primary)]">Nenhum relatório gerado</p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">Selecione um cliente acima para gerar o primeiro relatório</p>
          {clients && clients.length > 0 ? (
            <Link
              href={`/reports/${clients[0].id}/new`}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 px-4 py-2 text-sm font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 transition-colors"
            >
              <Plus size={14} />
              Criar Relatório
            </Link>
          ) : (
            <Link
              href="/clients"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 px-4 py-2 text-sm font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 transition-colors"
            >
              <Plus size={14} />
              Cadastrar Cliente
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-subtle)]">
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Título</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Período</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Formato</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(reports as (Report & { client: { id: string; name: string } | null })[]).map((report) => {
                const status = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.pending
                return (
                  <tr key={report.id} className="border-b border-[var(--color-border-subtle)] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-[var(--color-text-primary)] font-medium">{report.title}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{report.client?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                      {report.period_start} → {report.period_end}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)] uppercase text-xs">{report.format}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {report.file_url && (
                          <a
                            href={report.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-white/[0.05] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
                          >
                            <Download size={12} />
                            Baixar
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
