'use client'
import { useState } from 'react'

const NICHES = [
  'E-commerce', 'Serviços Locais', 'Saúde e Estética', 'Educação',
  'Alimentação', 'Imóveis', 'Moda', 'Tecnologia', 'Outro',
]

interface Props {
  sourceToken: string
  utmSource?: string
  utmCampaign?: string
}

type Step = 'form' | 'sending' | 'done' | 'error'

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '0.5px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  padding: '12px 14px',
  fontSize: '14px',
  color: '#F5F2EC',
  outline: 'none',
  boxSizing: 'border-box',
}

export function CaptacaoForm({ sourceToken, utmSource, utmCampaign }: Props) {
  const [step, setStep] = useState<Step>('form')
  const [form, setForm] = useState({
    name: '', whatsapp: '', company: '', instagram: '', niche: '', pain: '',
  })

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))
  const canSubmit = form.name.trim().length > 0 && form.whatsapp.trim().length > 0

  async function submit() {
    if (!canSubmit) return
    setStep('sending')
    try {
      const endpoint = sourceToken
        ? `/api/sdr/intake/webhook/${sourceToken}`
        : '/api/sdr/intake/form'

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, utm_source: utmSource, utm_campaign: utmCampaign }),
      })
      if (!res.ok) throw new Error('request failed')
      setStep('done')
    } catch {
      setStep('error')
    }
  }

  if (step === 'done') {
    return (
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <div style={{ fontSize: '48px', marginBottom: '1rem', color: '#F59E0B' }}>✓</div>
        <h2 style={{ fontSize: '22px', color: '#F5F2EC', marginBottom: '8px', fontWeight: 500 }}>
          Recebemos!
        </h2>
        <p style={{ color: '#888880', fontSize: '14px', lineHeight: 1.7 }}>
          Em breve entraremos em contato pelo WhatsApp informado.
        </p>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', maxWidth: '480px' }}>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', color: '#F5F2EC', fontWeight: 500, marginBottom: '8px' }}>
          Fale com a gente
        </h1>
        <p style={{ color: '#888880', fontSize: '14px' }}>
          Preencha e nossa equipe entra em contato em breve
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input
          placeholder="Seu nome *"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="WhatsApp com DDD *"
          value={form.whatsapp}
          onChange={e => set('whatsapp', e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="Nome da empresa (opcional)"
          value={form.company}
          onChange={e => set('company', e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="@instagram da empresa (opcional)"
          value={form.instagram}
          onChange={e => set('instagram', e.target.value)}
          style={inputStyle}
        />
        <select
          value={form.niche}
          onChange={e => set('niche', e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value="">Segmento do negócio (opcional)</option>
          {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <textarea
          placeholder="O que você precisa? Como podemos ajudar? (opcional)"
          value={form.pain}
          onChange={e => set('pain', e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />

        <button
          onClick={submit}
          disabled={!canSubmit || step === 'sending'}
          style={{
            background: canSubmit ? '#F59E0B' : 'rgba(245,158,11,0.4)',
            color: '#000',
            fontWeight: 700,
            padding: '14px',
            borderRadius: '10px',
            fontSize: '15px',
            border: 'none',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            marginTop: '4px',
            transition: 'opacity 0.2s',
          }}
        >
          {step === 'sending' ? 'Enviando...' : 'Quero saber mais →'}
        </button>

        {step === 'error' && (
          <p style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center' }}>
            Erro ao enviar. Tente novamente.
          </p>
        )}
      </div>
    </div>
  )
}
