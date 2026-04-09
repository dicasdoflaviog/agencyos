'use client'
import { useState, useEffect } from 'react'

const VISUAL_STYLES = ['minimalista', 'bold', 'cinematografico', 'colorido', 'profile']
const TONES = ['profissional', 'casual', 'inspiracional', 'tecnico', 'humor']

interface DNAState {
  primary_color: string
  visual_style: string
  tone: string
  target_audience: string
  key_message: string
  brand_voice_text: string
  [key: string]: string
}

export function DNACreativeConfig({ clientId, userRole }: { clientId: string; userRole: string }) {
  const [dna, setDna] = useState<DNAState>({
    primary_color: '#000000',
    visual_style: 'minimalista',
    tone: 'profissional',
    target_audience: '',
    key_message: '',
    brand_voice_text: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const canEdit = userRole === 'admin' || userRole === 'collaborator'

  useEffect(() => {
    fetch(`/api/clients/${clientId}/dna`)
      .then(r => r.json())
      .then(d => { if (d.client_id) setDna(d) })
  }, [clientId])

  async function save() {
    setSaving(true)
    await fetch(`/api/clients/${clientId}/dna`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dna),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--color-background-primary)',
    border: '0.5px solid var(--color-border-tertiary)',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '13px',
    color: 'var(--color-text-primary)',
    opacity: canEdit ? 1 : 0.6,
  }

  const label = (text: string) => (
    <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: '6px' }}>
      {text}
    </label>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '600px' }}>
      <div>
        {label('Cor primária da marca')}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="color"
            value={dna.primary_color}
            disabled={!canEdit}
            onChange={e => setDna(p => ({ ...p, primary_color: e.target.value }))}
            style={{ width: '40px', height: '40px', borderRadius: '8px', border: 'none', cursor: canEdit ? 'pointer' : 'default' }}
          />
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
            {dna.primary_color}
          </span>
        </div>
      </div>

      <div>
        {label('Estilo visual preferido')}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {VISUAL_STYLES.map(s => (
            <button
              key={s}
              disabled={!canEdit}
              onClick={() => setDna(p => ({ ...p, visual_style: s }))}
              style={{
                padding: '6px 12px', borderRadius: '8px', fontSize: '12px',
                cursor: canEdit ? 'pointer' : 'default',
                background: dna.visual_style === s ? '#fef3c7' : 'var(--color-background-primary)',
                border: dna.visual_style === s ? '1px solid #fcd34d' : '0.5px solid var(--color-border-tertiary)',
                color: dna.visual_style === s ? '#b45309' : 'var(--color-text-primary)',
                fontWeight: dna.visual_style === s ? 600 : 400,
              }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        {label('Tom de voz')}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {TONES.map(t => (
            <button
              key={t}
              disabled={!canEdit}
              onClick={() => setDna(p => ({ ...p, tone: t }))}
              style={{
                padding: '6px 12px', borderRadius: '8px', fontSize: '12px',
                cursor: canEdit ? 'pointer' : 'default',
                background: dna.tone === t ? '#fef3c7' : 'var(--color-background-primary)',
                border: dna.tone === t ? '1px solid #fcd34d' : '0.5px solid var(--color-border-tertiary)',
                color: dna.tone === t ? '#b45309' : 'var(--color-text-primary)',
                fontWeight: dna.tone === t ? 600 : 400,
              }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        {label('Público-alvo')}
        <input
          value={dna.target_audience}
          disabled={!canEdit}
          onChange={e => setDna(p => ({ ...p, target_audience: e.target.value }))}
          placeholder="Ex: Mulheres 25-40 que querem emagrecer com saúde"
          style={inputStyle}
        />
      </div>

      <div>
        {label('Mensagem central da marca')}
        <input
          value={dna.key_message}
          disabled={!canEdit}
          onChange={e => setDna(p => ({ ...p, key_message: e.target.value }))}
          placeholder="Ex: Emagrecimento saudável sem sofrimento"
          style={inputStyle}
        />
      </div>

      <div>
        {label('Brand Voice (como a marca fala)')}
        <textarea
          value={dna.brand_voice_text}
          disabled={!canEdit}
          onChange={e => setDna(p => ({ ...p, brand_voice_text: e.target.value }))}
          placeholder="Descreva o tom, o estilo de escrita, palavras que usa e evita..."
          rows={4}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {canEdit && (
        <button
          onClick={save}
          disabled={saving}
          style={{ background: '#f59e0b', color: '#000', fontWeight: 700, padding: '12px', borderRadius: '10px', fontSize: '14px', border: 'none', cursor: 'pointer' }}>
          {saving ? 'Salvando...' : saved ? 'DNA salvo ✓' : 'Salvar DNA'}
        </button>
      )}
    </div>
  )
}
