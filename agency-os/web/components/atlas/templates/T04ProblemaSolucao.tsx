'use client'
// T04 — Problema → Solução + Stats
// Logo → Headline → Balões empilhados (dor/solução) → Stats × 3 → CTA âmbar
// Uso: prova social, copy de dor/solução, anúncio de benefício

import React from 'react'
import { T, sc, canvasBase } from './tokens'

export interface T04Stat {
  icon: string
  value: string
  label: string
}

export interface T04Props {
  title: string           // headline (ex: "Gerenciar clientes não precisa ser caos.")
  subtitle: string        // texto da bolha de solução
  problemText?: string    // texto da bolha do problema (default: derivado do subtitle)
  stats?: T04Stat[]       // 3 stats numéricos
  ctaText?: string
  brandName?: string
  brandUrl?: string
  accentPhrase?: string   // palavra no título a destacar em âmbar
  size?: number
}

const DEFAULT_STATS: T04Stat[] = [
  { icon: '🚀', value: '10×', label: 'Mais velocidade' },
  { icon: '✅', value: '100%', label: 'Consistência' },
  { icon: '💰', value: '3×', label: 'Capacidade' },
]

export function T04ProblemaSolucao({
  title,
  subtitle,
  problemText,
  stats = DEFAULT_STATS,
  ctaText = 'Quero saber mais ↗',
  brandName = 'Agency OS',
  brandUrl,
  accentPhrase,
  size = 540,
}: T04Props) {
  const s = (px: number) => sc(px, size)

  // Se problemText não fornecido, deriva do subtitle (problema = frase negativa implícita)
  const problem = problemText || `Antes: perdia tempo com tarefas manuais e resultados inconsistentes.`
  const solution = subtitle

  function renderTitle(text: string) {
    if (!accentPhrase || !text.includes(accentPhrase)) return text
    const [before, after] = text.split(accentPhrase)
    return <>{before}<em style={{ color: T.accent, fontStyle: 'normal' }}>{accentPhrase}</em>{after}</>
  }

  return (
    <div style={{
      ...canvasBase(size),
      background: T.bgSurface,
      display: 'flex',
      flexDirection: 'column',
      padding: `${s(36)}px ${s(32)}px ${s(32)}px`,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: s(7), marginBottom: s(20) }}>
        <div style={{
          width: s(22), height: s(22),
          background: T.accent,
          borderRadius: s(8),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: s(11),
        }}>⚡</div>
        <span style={{ fontSize: s(13), fontWeight: 700, color: T.textPrimary }}>{brandName}</span>
      </div>

      {/* Headline */}
      <div style={{
        fontSize: s(26), fontWeight: 800,
        letterSpacing: '-0.02em', lineHeight: 1.2,
        color: T.textPrimary, marginBottom: s(20),
      }}>
        {renderTitle(title)}
      </div>

      {/* Balões empilhados */}
      <div style={{ position: 'relative', height: s(130), marginBottom: s(24) }}>
        {/* Bolha escura (problema) */}
        <div style={{
          position: 'absolute', top: 0, left: 0,
          background: T.bgOverlay,
          border: `1px solid ${T.borderDefault}`,
          borderRadius: s(16),
          padding: `${s(14)}px ${s(18)}px`,
          fontSize: s(13),
          color: T.textPrimary,
          maxWidth: '78%', lineHeight: 1.5,
          boxShadow: T.shadowMd,
          zIndex: 1,
        }}>
          {problem}
        </div>
        {/* Bolha âmbar (solução) */}
        <div style={{
          position: 'absolute', bottom: 0, right: 0,
          background: T.accent,
          borderRadius: s(16),
          padding: `${s(14)}px ${s(18)}px`,
          fontSize: s(13),
          color: T.textInverse,
          maxWidth: '78%', lineHeight: 1.5,
          boxShadow: T.shadowMd,
          fontWeight: 600,
          zIndex: 2,
        }}>
          {solution}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', marginBottom: s(24) }}>
        {stats.slice(0, 3).map((stat, i) => (
          <div key={i} style={{
            flex: 1, textAlign: 'center',
            padding: `${s(14)}px ${s(8)}px`,
            borderTop: `1px solid ${T.borderSubtle}`,
            borderBottom: `1px solid ${T.borderSubtle}`,
            borderRight: i < 2 ? `1px solid ${T.borderSubtle}` : 'none',
          }}>
            <div style={{ fontSize: s(20), marginBottom: s(6), color: T.accent }}>{stat.icon}</div>
            <div style={{ fontSize: s(18), fontWeight: 800, color: T.textPrimary, lineHeight: 1, marginBottom: s(3) }}>
              {stat.value}
            </div>
            <div style={{ fontSize: s(10), color: T.textMuted, lineHeight: 1.4 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{
        width: '100%', height: s(48),
        background: T.accent,
        borderRadius: '9999px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: s(8),
        fontSize: s(14), fontWeight: 700, color: T.textInverse,
      }}>
        {ctaText}
      </div>

      {brandUrl && (
        <div style={{ textAlign: 'center', marginTop: s(10), fontSize: s(11), color: T.textMuted }}>
          {brandUrl}
        </div>
      )}
    </div>
  )
}
