'use client'
import { useState } from 'react'

interface SDRAction {
  id: string
  output: { message: string; channel: string }
  leads: { name: string; company?: string | null; niche?: string | null; phone?: string | null } | null
  crm_scores: Array<{ score: number }>
}

interface Props {
  actions: SDRAction[]
}

export function PendingActions({ actions }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Record<string, string>>(
    Object.fromEntries(actions.map(a => [a.id, a.output?.message ?? '']))
  )
  const [loading, setLoading] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visible = actions.filter(a => !dismissed.has(a.id))

  async function approve(actionId: string, skipped = false) {
    setLoading(actionId)
    try {
      await fetch(`/api/sdr/action/${actionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(skipped
          ? { skipped: true }
          : { message: messages[actionId], edited: editingId === actionId }
        ),
      })
      setDismissed(prev => new Set([...prev, actionId]))
      setEditingId(null)
    } finally {
      setLoading(null)
    }
  }

  if (!visible.length) {
    return (
      <div style={{
        textAlign: 'center', padding: '3rem',
        color: 'var(--color-text-secondary)', fontSize: '14px',
        background: 'var(--color-bg-surface)',
        border: '0.5px solid var(--color-border-subtle)',
        borderRadius: '12px',
      }}>
        ✓ Nenhuma ação pendente — o SDR está operando normalmente.
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '1rem' }}>
        Aguardando aprovação ({visible.length})
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {visible.map(action => {
          const lead = action.leads
          const score = action.crm_scores?.[0]?.score
          const isEditing = editingId === action.id
          const isLoading = loading === action.id

          return (
            <div key={action.id} style={{
              background: 'var(--color-bg-surface)',
              border: '0.5px solid var(--color-border-subtle)',
              borderRadius: '12px',
              padding: '1.25rem',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  {lead?.name ?? 'Lead'}
                  {lead?.company ? ` · ${lead.company}` : ''}
                </span>
                {lead?.niche && (
                  <span style={{
                    fontSize: '11px', padding: '2px 7px', borderRadius: '10px',
                    background: 'var(--color-bg-elevated)',
                    color: 'var(--color-text-secondary)',
                  }}>
                    {lead.niche}
                  </span>
                )}
                {score != null && (
                  <span style={{
                    fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
                    background: '#fef3c7', color: '#b45309',
                  }}>
                    Score {score}/10
                  </span>
                )}
                <span style={{
                  fontSize: '10px', padding: '2px 7px', borderRadius: '10px',
                  background: action.output?.channel === 'whatsapp' ? '#dcfce7' : '#dbeafe',
                  color: action.output?.channel === 'whatsapp' ? '#15803d' : '#1d4ed8',
                }}>
                  {action.output?.channel === 'whatsapp' ? 'WhatsApp' : 'E-mail'}
                </span>
              </div>

              {/* Mensagem */}
              {isEditing ? (
                <textarea
                  value={messages[action.id]}
                  onChange={e => setMessages(p => ({ ...p, [action.id]: e.target.value }))}
                  rows={4}
                  style={{
                    width: '100%',
                    background: 'var(--color-bg-elevated)',
                    border: '0.5px solid var(--color-border-subtle)',
                    borderRadius: '8px',
                    padding: '10px',
                    fontSize: '13px',
                    color: 'var(--color-text-primary)',
                    resize: 'vertical',
                    marginBottom: '10px',
                    boxSizing: 'border-box',
                  }}
                />
              ) : (
                <p style={{
                  fontSize: '13px',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.6,
                  background: 'var(--color-bg-elevated)',
                  borderRadius: '8px',
                  padding: '10px',
                  marginBottom: '10px',
                  whiteSpace: 'pre-wrap',
                  margin: '0 0 10px',
                }}>
                  {messages[action.id]}
                </p>
              )}

              {/* Ações */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => approve(action.id)}
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    background: '#f59e0b',
                    color: '#000',
                    fontWeight: 700,
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    border: 'none',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.6 : 1,
                  }}
                >
                  {isLoading ? 'Salvando...' : 'Aprovar e enviar'}
                </button>
                <button
                  onClick={() => setEditingId(isEditing ? null : action.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    background: 'var(--color-bg-elevated)',
                    border: '0.5px solid var(--color-border-subtle)',
                    color: 'var(--color-text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  {isEditing ? 'Cancelar' : 'Editar'}
                </button>
                <button
                  onClick={() => approve(action.id, true)}
                  disabled={isLoading}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    background: 'transparent',
                    border: '0.5px solid var(--color-border-subtle)',
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Pular
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
