'use client'
// T02 — Modal Clean / Card Form
// Fundo gradiente escuro → modal card centralizado → título + campos + CTA
// Uso: onboarding, feature highlight, processo/formulário, acesso

import React from 'react'
import { T, sc, canvasBase } from './tokens'

export interface T02Props {
  title: string
  subtitle: string
  backgroundImage?: string
  fieldLabels?: [string, string]  // labels dos dois campos [campo1, campo2]
  primaryCta?: string
  secondaryCta?: string
  accentPhrase?: string
  size?: number
}

export function T02ModalClean({
  title,
  subtitle,
  backgroundImage,
  fieldLabels = ['Passo 1', 'Passo 2'],
  primaryCta = 'Começar agora',
  secondaryCta = 'Saber mais',
  accentPhrase,
  size = 540,
}: T02Props) {
  const s = (px: number) => sc(px, size)

  function renderTitle(text: string) {
    if (!accentPhrase || !text.includes(accentPhrase)) return text
    const [before, after] = text.split(accentPhrase)
    return <>{before}<em style={{ color: T.accent, fontStyle: 'normal' }}>{accentPhrase}</em>{after}</>
  }

  return (
    <div style={{
      ...canvasBase(size),
      background: 'radial-gradient(ellipse 100% 90% at 30% 20%, #1a1232 0%, #0f0f18 50%, #0C0C0E 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: s(32),
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

      {/* Modal card */}
      <div style={{
        background: T.bgSurface,
        border: `1px solid ${T.borderDefault}`,
        borderRadius: s(24),
        width: '100%',
        maxWidth: s(340),
        overflow: 'hidden',
        boxShadow: T.shadowXl,
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Modal header */}
        <div style={{
          padding: `${s(14)}px ${s(20)}px`,
          borderBottom: `1px solid ${T.borderSubtle}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: s(13), fontWeight: 500, color: T.textSecondary }}>
            {subtitle}
          </span>
          <div style={{
            width: s(20), height: s(20),
            borderRadius: '50%',
            background: T.bgOverlay,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: s(11), color: T.textMuted,
          }}>✕</div>
        </div>

        {/* Modal body */}
        <div style={{ padding: `${s(28)}px ${s(24)}px ${s(24)}px` }}>
          <div style={{
            fontSize: s(24), fontWeight: 800,
            letterSpacing: '-0.02em',
            color: T.textPrimary,
            marginBottom: s(24),
            lineHeight: 1.2,
          }}>
            {renderTitle(title)}
          </div>

          {/* Fields */}
          {fieldLabels.map((label, i) => (
            <div key={i} style={{ marginBottom: s(14) }}>
              <div style={{ fontSize: s(11), fontWeight: 500, color: T.textSecondary, marginBottom: s(5) }}>
                {label}
              </div>
              <div style={{
                width: '100%', height: s(38),
                background: i === 1 ? T.bgElevated : T.bgOverlay,
                border: `1px solid ${i === 1 ? T.accent : T.borderDefault}`,
                borderRadius: s(8),
                padding: `0 ${s(12)}px`,
                fontSize: s(13),
                color: i === 1 ? T.textPrimary : T.textMuted,
                display: 'flex', alignItems: 'center',
                boxShadow: i === 1 ? `0 0 0 3px ${T.accentRing}` : 'none',
              }}>
                {i === 1 ? '••••••••••' : '...'}
              </div>
            </div>
          ))}

          {/* Actions */}
          <div style={{ display: 'flex', gap: s(8), marginTop: s(20) }}>
            <div style={{
              flex: 1, height: s(38),
              background: T.accent,
              borderRadius: s(8),
              fontSize: s(13), fontWeight: 700, color: T.textInverse,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{primaryCta}</div>
            <div style={{
              flex: 1, height: s(38),
              background: 'transparent',
              border: `1px solid ${T.borderStrong}`,
              borderRadius: s(8),
              fontSize: s(13), fontWeight: 500, color: T.textSecondary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{secondaryCta}</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          borderTop: `1px solid ${T.borderSubtle}`,
          padding: `${s(12)}px ${s(24)}px`,
          fontSize: s(11), color: T.textMuted, textAlign: 'center',
        }}>
          Simples. Direto. <span style={{ color: T.accent }}>Sem enrolação.</span>
        </div>
      </div>
    </div>
  )
}
