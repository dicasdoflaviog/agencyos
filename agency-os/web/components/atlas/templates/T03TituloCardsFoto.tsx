'use client'
// T03 — Título + Cards Foto
// Grid 2-col (headline + sub) → strip de cards com emoji/imagem + overlay + badge
// Uso: catálogo de serviços, portfólio, múltiplos produtos/agentes

import React from 'react'
import { T, sc, canvasBase } from './tokens'

export interface T03Card {
  emoji: string
  name: string
  description: string
  imageUrl?: string
}

export interface T03Props {
  title: string
  subtitle: string
  backgroundImage?: string
  cards?: T03Card[]
  ctaText?: string
  brandUrl?: string
  accentPhrase?: string
  size?: number
}

const DEFAULT_CARDS: T03Card[] = [
  { emoji: '✍️', name: 'VERA Copy',    description: 'Copywriter IA especialista' },
  { emoji: '🎨', name: 'ATLAS Design', description: 'Designer visual IA' },
  { emoji: '📈', name: 'NEXUS Ads',    description: 'Gestor de tráfego IA' },
]

export function T03TituloCardsFoto({
  title,
  subtitle,
  backgroundImage,
  cards = DEFAULT_CARDS,
  ctaText = 'Ver mais →',
  brandUrl,
  accentPhrase,
  size = 540,
}: T03Props) {
  const s = (px: number) => sc(px, size)

  function renderTitle(text: string) {
    if (!accentPhrase || !text.includes(accentPhrase)) return text
    const [before, after] = text.split(accentPhrase)
    return <>{before}<em style={{ color: T.accent, fontStyle: 'normal' }}>{accentPhrase}</em>{after}</>
  }

  return (
    <div style={{
      ...canvasBase(size),
      background: T.bgBase,
      display: 'flex',
      flexDirection: 'column',
      padding: `${s(36)}px ${s(32)}px ${s(24)}px`,
    }}>
      {backgroundImage && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.06,
        }} />
      )}

      {/* Header 2-col */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: s(16),
        marginBottom: s(24),
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          fontSize: s(26), fontWeight: 800,
          letterSpacing: '-0.02em', lineHeight: 1.2,
          color: T.textPrimary,
        }}>
          {renderTitle(title)}
        </div>
        <div style={{
          fontSize: s(13), color: T.textSecondary,
          lineHeight: 1.6, alignSelf: 'center',
        }}>
          {subtitle}
        </div>
      </div>

      {/* Card strip */}
      <div style={{ display: 'flex', gap: s(10), flex: 1, position: 'relative', zIndex: 1 }}>
        {cards.slice(0, 3).map((card, i) => (
          <div key={i} style={{
            flex: 1,
            borderRadius: s(16),
            overflow: 'hidden',
            position: 'relative',
            minHeight: s(220),
            background: T.bgElevated,
            border: `1px solid ${T.borderSubtle}`,
          }}>
            {/* Background */}
            {card.imageUrl ? (
              <img src={card.imageUrl} alt={card.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: s(48),
                background: `linear-gradient(135deg, ${T.bgOverlay}, ${T.bgElevated})`,
              }}>
                {card.emoji}
              </div>
            )}

            {/* Overlay escuro */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 55%)',
            }} />

            {/* Badge ícone âmbar */}
            <div style={{
              position: 'absolute',
              top: s(12), left: '50%', transform: 'translateX(-50%)',
              width: s(30), height: s(30),
              background: T.accent,
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: s(13), boxShadow: T.shadowMd,
            }}>
              {card.emoji}
            </div>

            {/* Text overlay */}
            <div style={{ position: 'absolute', bottom: s(14), left: s(12), right: s(12) }}>
              <div style={{ fontSize: s(12), fontWeight: 700, color: '#fff', marginBottom: s(3) }}>
                {card.name}
              </div>
              <div style={{ fontSize: s(10), color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
                {card.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: s(16), position: 'relative', zIndex: 1,
      }}>
        <div style={{
          border: `1px solid ${T.borderDefault}`,
          borderRadius: '9999px',
          padding: `${s(6)}px ${s(16)}px`,
          fontSize: s(12), fontWeight: 500,
          color: T.textSecondary,
          display: 'inline-flex', alignItems: 'center', gap: s(6),
        }}>{ctaText}</div>
        {brandUrl && (
          <div style={{ display: 'flex', alignItems: 'center', gap: s(6), fontSize: s(11), color: T.textMuted }}>
            🌐 {brandUrl}
          </div>
        )}
      </div>
    </div>
  )
}
