'use client'
// T06 — Fundo Sólido + Preview + Ícones
// Fundo âmbar/accent sólido → seta → headline → preview card → 4 ícones → logo
// Uso: destaque de feature, lançamento de módulo, CTA de marca

import React from 'react'
import { sc, canvasBase } from './tokens'

export interface T06Icon {
  emoji: string
  label: string
}

export interface T06Props {
  title: string
  subtitle: string        // usado no preview card
  backgroundImage?: string
  icons?: T06Icon[]
  brandName?: string
  brandTagline?: string
  accentColor?: string    // tokens do cliente (default âmbar)
  size?: number
}

const DEFAULT_ICONS: T06Icon[] = [
  { emoji: '🤖', label: 'Agentes IA' },
  { emoji: '📋', label: 'Kanban' },
  { emoji: '💬', label: 'Briefing' },
  { emoji: '📈', label: 'Relatórios' },
]

export function T06FundoSolido({
  title,
  subtitle,
  backgroundImage,
  icons = DEFAULT_ICONS,
  brandName = 'Agency OS',
  brandTagline = 'Gestão de Agências',
  accentColor = '#F59E0B',
  size = 540,
}: T06Props) {
  const s = (px: number) => sc(px, size)

  // T06 usa o accentColor como FUNDO — texto é dark (invertido)
  const textOnAccent = '#0C0C0E'
  const textOnAccentMuted = 'rgba(0,0,0,0.55)'
  const overlayDark = 'rgba(0,0,0,0.22)'
  const overlayBorder = 'rgba(255,255,255,0.2)'

  return (
    <div style={{
      ...canvasBase(size),
      background: accentColor,
      display: 'flex',
      flexDirection: 'column',
      padding: `${s(36)}px ${s(32)}px ${s(28)}px`,
    }}>
      {backgroundImage && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.12,
          mixBlendMode: 'multiply',
        }} />
      )}

      {/* Seta decorativa */}
      <div style={{ fontSize: s(18), color: textOnAccent, marginBottom: s(10), opacity: 0.9, position: 'relative', zIndex: 1 }}>→</div>

      {/* Headline */}
      <div style={{
        fontSize: s(28), fontWeight: 800,
        letterSpacing: '-0.02em', lineHeight: 1.2,
        color: textOnAccent,
        marginBottom: s(20),
        position: 'relative', zIndex: 1,
      }}>
        {title}
      </div>

      {/* Preview card */}
      <div style={{
        background: overlayDark,
        border: `1px solid ${overlayBorder}`,
        borderRadius: s(16),
        padding: `${s(14)}px ${s(16)}px`,
        marginBottom: s(20),
        display: 'flex',
        alignItems: 'center',
        gap: s(12),
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: s(13), fontWeight: 700, color: '#fff', marginBottom: s(4) }}>
            {brandName} · Dashboard
          </div>
          <div style={{ fontSize: s(11), color: 'rgba(255,255,255,0.7)' }}>{subtitle}</div>
        </div>
        <div style={{
          width: s(72), height: s(54),
          background: 'rgba(0,0,0,0.3)',
          borderRadius: s(8),
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: s(24),
        }}>📊</div>
      </div>

      {/* Grid de ícones 4-col */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr 1fr',
        gap: s(10),
        marginBottom: 'auto',
        position: 'relative', zIndex: 1,
      }}>
        {icons.slice(0, 4).map((icon, i) => (
          <div key={i} style={{
            aspectRatio: '1',
            background: 'rgba(0,0,0,0.2)',
            border: `1px solid ${overlayBorder}`,
            borderRadius: s(16),
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: s(5),
          }}>
            <span style={{ fontSize: s(22) }}>{icon.emoji}</span>
            <div style={{ fontSize: s(9), fontWeight: 600, color: 'rgba(255,255,255,0.75)', textAlign: 'center' }}>
              {icon.label}
            </div>
          </div>
        ))}
      </div>

      {/* Logo row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: s(8), marginTop: s(16), position: 'relative', zIndex: 1 }}>
        <div style={{
          width: s(28), height: s(28),
          background: 'rgba(0,0,0,0.2)',
          border: `1px solid ${overlayBorder}`,
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: s(12),
        }}>⚡</div>
        <div style={{ fontSize: s(13), fontWeight: 800, color: textOnAccentMuted }}>{brandName}</div>
        <div style={{ fontSize: s(10), color: textOnAccentMuted, marginLeft: s(4) }}>{brandTagline}</div>
      </div>
    </div>
  )
}
