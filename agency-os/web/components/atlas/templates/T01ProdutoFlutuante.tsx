'use client'
// T01 — Produto Flutuante
// Fundo escuro com anéis concêntricos → pills flutuantes → card central → headline + CTA
// Uso: lançamento de produto, showcase de features

import React from 'react'
import { T, sc, canvasBase } from './tokens'

export interface T01Props {
  title: string
  subtitle: string
  backgroundImage?: string
  features?: string[]   // pills flutuantes (max 4)
  ctaText?: string
  brandName?: string
  accentPhrase?: string
  size?: number
}

export function T01ProdutoFlutuante({
  title,
  subtitle,
  backgroundImage,
  features = ['Automação', 'Agentes IA', 'Relatórios', 'Segurança'],
  ctaText,
  brandName = 'Agency OS',
  accentPhrase,
  size = 540,
}: T01Props) {
  const s = (px: number) => sc(px, size)

  function renderTitle(text: string) {
    if (!accentPhrase || !text.includes(accentPhrase)) return text
    const [before, after] = text.split(accentPhrase)
    return <>{before}<em style={{ color: T.accent, fontStyle: 'normal' }}>{accentPhrase}</em>{after}</>
  }

  const pillPositions = [
    { top: s(80),  left: s(20)  },
    { top: s(195), left: s(8)   },
    { top: s(70),  right: s(16) },
    { bottom: s(160), right: s(12) },
  ]
  const pillEmojis = ['🤖', '⚡', '📊', '🔒']

  return (
    <div style={{
      ...canvasBase(size),
      background: 'radial-gradient(ellipse 80% 60% at 50% 30%, #1a1a2e 0%, #0C0C0E 70%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: `${s(40)}px ${s(32)}px ${s(32)}px`,
    }}>
      {/* Background image overlay */}
      {backgroundImage && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.08,
        }} />
      )}

      {/* Anéis concêntricos âmbar */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', width: s(380), height: s(380), borderRadius: '50%', border: `1px solid rgba(245,158,11,0.08)` }} />
        <div style={{ position: 'absolute', width: s(520), height: s(520), borderRadius: '50%', border: `1px solid rgba(245,158,11,0.05)` }} />
      </div>

      {/* Pills flutuantes */}
      {features.slice(0, 4).map((feat, i) => (
        <div key={i} style={{
          position: 'absolute',
          ...pillPositions[i],
          background: T.bgElevated,
          border: `1px solid ${T.borderDefault}`,
          borderRadius: '9999px',
          padding: `${s(8)}px ${s(14)}px`,
          fontSize: s(11),
          fontWeight: 600,
          color: T.textSecondary,
          display: 'flex',
          alignItems: 'center',
          gap: s(7),
          boxShadow: T.shadowMd,
          zIndex: 3,
          whiteSpace: 'nowrap',
        }}>
          <span style={{
            width: s(20), height: s(20),
            background: T.accentSubtle,
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: s(10),
          }}>{pillEmojis[i]}</span>
          {feat}
        </div>
      ))}

      {/* Card central */}
      <div style={{
        background: T.bgElevated,
        border: `1px solid ${T.borderDefault}`,
        borderRadius: s(16),
        padding: s(20),
        width: s(260),
        boxShadow: T.shadowXl,
        position: 'relative',
        zIndex: 2,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: s(10), marginBottom: s(14) }}>
          <div style={{
            width: s(36), height: s(36),
            background: T.accentSubtle,
            border: `2px solid ${T.accent}`,
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: s(14), fontWeight: 700, color: T.accent,
          }}>⚡</div>
          <div>
            <div style={{ fontSize: s(13), fontWeight: 700, color: T.textPrimary }}>{brandName}</div>
            <div style={{ fontSize: s(10), color: T.textMuted }}>Agente ativo</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: s(6), fontSize: s(11), fontWeight: 500, color: T.successText, marginBottom: s(10) }}>
          <span style={{ width: s(6), height: s(6), background: T.success, borderRadius: '50%', display: 'inline-block' }} />
          Processando tarefa
        </div>
        <div style={{ fontSize: s(10), color: T.textMuted, marginBottom: s(6) }}>Progresso</div>
        <div style={{ height: s(4), background: T.bgOverlay, borderRadius: '9999px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '70%', background: `linear-gradient(90deg, ${T.accent}, #FBBF24)`, borderRadius: '9999px' }} />
        </div>
      </div>

      {/* Headline + CTA */}
      <div style={{ textAlign: 'center', marginTop: s(28), position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: s(22), fontWeight: 800, letterSpacing: '-0.02em', color: T.textPrimary, lineHeight: 1.25, marginBottom: s(14) }}>
          {renderTitle(title)}
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: s(6),
          background: T.accent, color: T.textInverse,
          padding: `${s(10)}px ${s(22)}px`,
          borderRadius: '9999px',
          fontSize: s(13), fontWeight: 700,
        }}>
          {ctaText || subtitle} ↗
        </div>
      </div>
    </div>
  )
}
