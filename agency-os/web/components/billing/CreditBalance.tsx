'use client'

import { useEffect, useState } from 'react'
import { Zap, TrendingDown, TrendingUp, Clock, BarChart2, CheckCircle2 } from 'lucide-react'

interface Transaction {
  id: string
  amount: number
  type: string
  agent_used: string | null
  description: string | null
  balance_after: number
  created_at: string
}

interface CreditData {
  balance: number
  plan: string
  planStatus: string
  periodEnd: string | null
  grantedAt: string | null
  transactions: Transaction[]
  usage: { thisMonth: number; byAgent: Record<string, number> }
}

const PLAN_MAX: Record<string, number>   = { starter: 500, pro: 1500, agency: 5000 }
const PLAN_LABEL: Record<string, string> = { starter: 'Starter', pro: 'Pro', agency: 'Agency' }

const AGENT_LABELS: Record<string, string> = {
  oracle_message:     'ORACLE',
  vox_narration:      'VOX',
  dna_curate:         'DNA Curator',
  knowledge_sync:     'Knowledge Sync',
  content_generation: 'Content',
  apify_scrape:       'Apify Scrape',
  monthly_grant:      'Grant Mensal',
  purchase:           'Compra',
}

const AGENT_BAR_COLOR: Record<string, string> = {
  oracle_message:     'bg-amber-500',
  vox_narration:      'bg-violet-500',
  dna_curate:         'bg-blue-500',
  knowledge_sync:     'bg-emerald-500',
  content_generation: 'bg-pink-500',
  apify_scrape:       'bg-cyan-500',
}

const TX_COLOR: Record<string, string> = {
  monthly_grant: 'text-emerald-400',
  purchase:      'text-emerald-400',
  usage:         'text-red-400',
  refund:        'text-blue-400',
}

export function CreditBalance() {
  const [data, setData]       = useState<CreditData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/credits')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .finally(() => setLoading(false))
  }, [])

  const max       = data ? (PLAN_MAX[data.plan] ?? 500) : 500
  const balance   = data?.balance ?? 0
  const pct       = Math.max(0, Math.min(100, Math.round((balance / max) * 100)))
  const low       = balance < max * 0.15
  const spent     = data?.usage?.thisMonth ?? 0
  const topAgents = Object.entries(data?.usage?.byAgent ?? {}).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-4">

      {/* ── Saldo ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                Saldo de Créditos
              </p>
              {!loading && data?.plan && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-500/15 text-amber-400 border border-amber-500/25">
                  <CheckCircle2 size={9} />
                  {PLAN_LABEL[data.plan] ?? data.plan}
                </span>
              )}
            </div>
            {loading ? (
              <div className="h-10 w-32 rounded-lg bg-[var(--color-bg-hover)] animate-pulse" />
            ) : (
              <p className="text-4xl font-bold text-[var(--color-text-primary)] tabular-nums">
                {balance.toLocaleString('pt-BR')}
                <span className="text-lg font-medium text-[var(--color-text-secondary)] ml-2">créditos</span>
              </p>
            )}
          </div>
          <div className={`flex items-center justify-center w-12 h-12 rounded-xl border ${low && !loading ? 'border-amber-500/30 bg-amber-500/10' : 'border-[var(--color-border-default)] bg-[var(--color-bg-elevated)]'}`}>
            <Zap size={20} className={low && !loading ? 'text-amber-400' : 'text-[var(--color-accent)]'} />
          </div>
        </div>

        <div className="h-2 rounded-full bg-[var(--color-bg-hover)] overflow-hidden mb-2">
          {loading ? (
            <div className="h-full w-1/3 rounded-full bg-[var(--color-bg-active)] animate-pulse" />
          ) : (
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: low
                  ? 'linear-gradient(90deg,#f59e0b,#ef4444)'
                  : 'linear-gradient(90deg,var(--color-accent,#f59e0b),#a78bfa)',
              }}
            />
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--color-text-muted)]">
            {loading ? '...' : `${balance.toLocaleString('pt-BR')} / ${max.toLocaleString('pt-BR')} créditos mensais`}
          </p>
          {!loading && data?.periodEnd && (
            <p className="text-xs text-[var(--color-text-disabled)]">
              Renova: {new Date(data.periodEnd).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </p>
          )}
        </div>

        {low && !loading && (
          <div className="mt-4 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3">
            <p className="text-sm text-amber-300 font-medium">⚠️ Saldo baixo</p>
            <p className="text-xs text-amber-400/80 mt-0.5">Seus créditos estão acabando. Considere fazer upgrade do plano.</p>
          </div>
        )}
      </div>

      {/* ── Uso este mês por agente ─────────────────────── */}
      <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 size={14} className="text-[var(--color-accent)]" />
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Uso Este Mês</p>
          {!loading && spent > 0 && (
            <span className="ml-auto text-sm font-bold text-[var(--color-text-primary)] tabular-nums">
              {spent.toLocaleString('pt-BR')} cr gastos
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-7 rounded bg-[var(--color-bg-elevated)] animate-pulse" />)}
          </div>
        ) : topAgents.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-4">Nenhum uso registrado este mês.</p>
        ) : (
          <div className="space-y-3">
            {topAgents.map(([agent, credits]) => {
              const barPct = spent > 0 ? Math.round((credits / spent) * 100) : 0
              return (
                <div key={agent}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                      {AGENT_LABELS[agent] ?? agent}
                    </span>
                    <span className="text-xs font-bold text-[var(--color-text-primary)] tabular-nums">{credits} cr</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--color-bg-hover)] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${AGENT_BAR_COLOR[agent] ?? 'bg-amber-500'}`}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Custo por ação ──────────────────────────────── */}
      <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-3">Custo por Ação</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            { label: 'ORACLE (msg)',   cost: 10 },
            { label: 'VOX (narração)', cost: 30 },
            { label: 'DNA Curador',    cost: 20 },
            { label: 'Sync Arquivo',   cost: 10 },
            { label: 'Conteúdo',       cost: 15 },
            { label: 'Scraping',       cost: 30 },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] px-3 py-2">
              <span className="text-xs text-[var(--color-text-secondary)]">{item.label}</span>
              <span className="text-xs font-bold text-[var(--color-text-primary)] tabular-nums">{item.cost} cr</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Histórico ───────────────────────────────────── */}
      <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={14} className="text-[var(--color-text-muted)]" />
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Histórico</p>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-10 rounded-lg bg-[var(--color-bg-elevated)] animate-pulse" />)}
          </div>
        ) : !data?.transactions?.length ? (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-6">Nenhuma transação ainda.</p>
        ) : (
          <div className="space-y-1">
            {data.transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[var(--color-bg-elevated)] transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`flex-shrink-0 ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.amount > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">
                      {AGENT_LABELS[tx.agent_used ?? tx.type] ?? tx.description ?? tx.type}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      {new Date(tx.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-xs font-bold tabular-nums ${TX_COLOR[tx.type] ?? 'text-[var(--color-text-secondary)]'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('pt-BR')} cr
                  </span>
                  <span className="text-[10px] text-[var(--color-text-disabled)] tabular-nums w-14 text-right">
                    = {tx.balance_after?.toLocaleString('pt-BR') ?? '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
