import type { Metadata } from 'next'
import { CaptacaoForm } from '@/components/sdr/CaptacaoForm'

export const metadata: Metadata = {
  title: 'Fale com a gente',
  description: 'Preencha seus dados e entraremos em contato',
}

export default async function CaptacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; utm_source?: string; utm_campaign?: string }>
}) {
  const params = await searchParams

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0C0C0E',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <CaptacaoForm
        sourceToken={params.token ?? ''}
        utmSource={params.utm_source}
        utmCampaign={params.utm_campaign}
      />
    </div>
  )
}
