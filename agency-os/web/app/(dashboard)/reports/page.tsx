import Link from 'next/link'
import { Plus, FileText, Download, Share2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import type { Report } from '@/types/database'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending:    { label: 'Pendente',   className: 'bg-white/[0.06] text-[#A1A1AA]' },
  generating: { label: 'Gerando…',  className: 'bg-[#F59E0B]/10 text-[#F59E0B]' },
  ready:      { label: 'Pronto',    className: 'bg-[#22C55E]/10 text-[#22C55E]' },
  failed:     { label: 'Falhou',    className: 'bg-[#EF4444]/10 text-[#EF4444]' },
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
          <h2 className="text-2xl font-bold text-[#FAFAFA] tracking-tight">Relatórios</h2>
          <p className="mt-1 text-sm text-[#A1A1AA]">
            {reports?.length ?? 0} relatório{(reports?.length ?? 1) !== 1 ? 's' : ''} gerado{(reports?.length ?? 1) !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Gerar novo relatório por cliente */}
      {clients && clients.length > 0 && (
        <div className="mb-6 rounded-lg border border-white/[0.07] bg-[#18181B] p-4">
          <p className="mb-3 text-sm font-medium text-[#FAFAFA]">Gerar relatório para:</p>
          <div className="flex flex-wrap gap-2">
            {clients.map((c) => (
              <Link key={c.id} href={`/reports/${c.id}/new`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/[0.07] bg-transparent text-[#A1A1AA] hover:bg-white/[0.05] hover:text-[#FAFAFA] cursor-pointer"
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
        <div className="flex flex-col items-center justify-center rounded-lg border border-white/[0.07] bg-[#18181B] py-16">
          <FileText size={32} className="mb-3 text-[#A1A1AA]" strokeWidth={1.5} />
          <p className="text-sm font-medium text-[#FAFAFA]">Nenhum relatório gerado</p>
          <p className="mt-1 text-xs text-[#A1A1AA]">Selecione um cliente acima para gerar o primeiro relatório</p>
        </div>
      ) : (
        <div className="rounded-lg border border-white/[0.07] bg-[#18181B] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07]">
                <th className="px-4 py-3 text-left text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">Título</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">Período</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">Formato</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(reports as (Report & { client: { id: string; name: string } | null })[]).map((report) => {
                const status = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.pending
                return (
                  <tr key={report.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-[#FAFAFA] font-medium">{report.title}</td>
                    <td className="px-4 py-3 text-[#A1A1AA]">{report.client?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-[#A1A1AA]">
                      {report.period_start} → {report.period_end}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#A1A1AA] uppercase text-xs">{report.format}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {report.file_url && (
                          <a
                            href={report.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-[#A1A1AA] hover:bg-white/[0.05] hover:text-[#FAFAFA] transition-colors cursor-pointer"
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
