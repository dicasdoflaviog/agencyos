import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { IGMetricsChart } from '@/components/metrics/IGMetricsChart'
import { AdsMetricsChart } from '@/components/metrics/AdsMetricsChart'
import { MetricCard } from '@/components/metrics/MetricCard'
import { Users, Eye, TrendingUp, DollarSign } from 'lucide-react'

export default async function ClientMetricsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const since = thirtyDaysAgo.toISOString().slice(0, 10)

  const [{ data: client }, { data: igMetrics }, { data: adsMetrics }] = await Promise.all([
    supabase.from('clients').select('id, name').eq('id', id).single(),
    supabase.from('ig_metrics').select('*').eq('client_id', id).gte('date', since).order('date'),
    supabase.from('ads_metrics').select('*').eq('client_id', id).gte('date', since).order('date'),
  ])

  if (!client) notFound()

  const latestIG = igMetrics?.[igMetrics.length - 1]
  const avgEngagement = igMetrics?.length
    ? (igMetrics.reduce((acc, m) => acc + (m.engagement_rate ?? 0), 0) / igMetrics.length).toFixed(2)
    : null
  const totalSpend = adsMetrics?.reduce((acc, m) => acc + (m.spend ?? 0), 0) ?? 0
  const totalClicks = adsMetrics?.reduce((acc, m) => acc + (m.clicks ?? 0), 0) ?? 0

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Seguidores" value={latestIG?.followers?.toLocaleString('pt-BR') ?? '—'} icon={<Users size={16} />} />
        <MetricCard label="Eng. Médio" value={avgEngagement ? `${avgEngagement}%` : '—'} icon={<TrendingUp size={16} />} />
        <MetricCard label="Gasto em Ads" value={totalSpend > 0 ? `R$ ${totalSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'} icon={<DollarSign size={16} />} />
        <MetricCard label="Cliques" value={totalClicks > 0 ? totalClicks.toLocaleString('pt-BR') : '—'} icon={<Eye size={16} />} />
      </div>

      {/* Charts */}
      <div className="space-y-4">
        {igMetrics && igMetrics.length > 0 && (
          <div className="rounded-md border border-white/[0.07] bg-[#18181B] p-5">
            <h3 className="mb-4 text-sm font-semibold text-[#FAFAFA]">Instagram — Crescimento</h3>
            <IGMetricsChart data={igMetrics} />
          </div>
        )}
        {adsMetrics && adsMetrics.length > 0 && (
          <div className="rounded-md border border-white/[0.07] bg-[#18181B] p-5">
            <h3 className="mb-4 text-sm font-semibold text-[#FAFAFA]">Ads — Performance por Campanha</h3>
            <AdsMetricsChart data={adsMetrics} />
          </div>
        )}
        {(!igMetrics || igMetrics.length === 0) && (!adsMetrics || adsMetrics.length === 0) && (
          <div className="flex items-center justify-center rounded-md border border-white/[0.07] bg-[#18181B] py-16">
            <p className="text-sm text-[#71717A]">Nenhuma métrica disponível para este cliente.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default async function ClientMetricsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const since = thirtyDaysAgo.toISOString().slice(0, 10)

  const [{ data: client }, { data: igMetrics }, { data: adsMetrics }] = await Promise.all([
    supabase.from('clients').select('id, name').eq('id', id).single(),
    supabase.from('ig_metrics').select('*').eq('client_id', id).gte('date', since).order('date'),
    supabase.from('ads_metrics').select('*').eq('client_id', id).gte('date', since).order('date'),
  ])

  if (!client) notFound()

  const latestIG = igMetrics?.[igMetrics.length - 1]
  const avgEngagement = igMetrics?.length
    ? (igMetrics.reduce((acc, m) => acc + (m.engagement_rate ?? 0), 0) / igMetrics.length).toFixed(2)
    : null
  const totalSpend = adsMetrics?.reduce((acc, m) => acc + (m.spend ?? 0), 0) ?? 0
  const totalClicks = adsMetrics?.reduce((acc, m) => acc + (m.clicks ?? 0), 0) ?? 0

  return (
    <div>
      <div className="mb-4">
        <Link href="/clients" className="inline-flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors mb-3">
          <ArrowLeft size={13} strokeWidth={2} />
          Voltar para Clientes
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-[#FAFAFA] tracking-tight">{client.name}</h2>
          <p className="text-sm text-[#A1A1AA] mt-0.5">Métricas — últimos 30 dias</p>
        </div>
      </div>

      <ClientTabs clientId={id} />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-6">
        <MetricCard label="Seguidores" value={latestIG?.followers?.toLocaleString('pt-BR') ?? '—'} icon={<Users size={16} />} />
        <MetricCard label="Eng. Médio" value={avgEngagement ? `${avgEngagement}%` : '—'} icon={<TrendingUp size={16} />} />
        <MetricCard label="Gasto em Ads" value={totalSpend > 0 ? `R$ ${totalSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'} icon={<DollarSign size={16} />} />
        <MetricCard label="Cliques" value={totalClicks > 0 ? totalClicks.toLocaleString('pt-BR') : '—'} icon={<Eye size={16} />} />
      </div>

      {/* Charts */}
      <div className="space-y-4">
        {igMetrics && igMetrics.length > 0 && (
          <div className="rounded-md border border-white/[0.07] bg-[#18181B] p-5">
            <h3 className="mb-4 text-sm font-semibold text-[#FAFAFA]">Instagram — Crescimento</h3>
            <IGMetricsChart data={igMetrics} />
          </div>
        )}
        {adsMetrics && adsMetrics.length > 0 && (
          <div className="rounded-md border border-white/[0.07] bg-[#18181B] p-5">
            <h3 className="mb-4 text-sm font-semibold text-[#FAFAFA]">Ads — Performance por Campanha</h3>
            <AdsMetricsChart data={adsMetrics} />
          </div>
        )}
        {(!igMetrics || igMetrics.length === 0) && (!adsMetrics || adsMetrics.length === 0) && (
          <div className="flex items-center justify-center rounded-md border border-white/[0.07] bg-[#18181B] py-16">
            <p className="text-sm text-[#71717A]">Nenhuma métrica disponível para este cliente.</p>
          </div>
        )}
      </div>
    </div>
  )
}
