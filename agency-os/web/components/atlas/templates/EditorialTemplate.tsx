'use client'
// components/atlas/templates/EditorialTemplate.tsx
// Template 05 — Título Bold + Tag Cloud
// Ref: Agency OS design system — T05 (dark bg, dot grid, amber accent, chip cloud)
// Props dinâmicas vindas do slide gerado pela VERA/Oracle.

import React from 'react'

export interface EditorialTemplateProps {
  /** Título principal do slide (headline 3 linhas máx) */
  title: string
  /** Frase de apoio (subtítulo / sub text) */
  subtitle: string
  /** URL da imagem de fundo gerada pelo ATLAS (opcional — usa dot grid se ausente) */
  backgroundImage?: string
  /** Tags/chips derivados do conteúdo (ex: pontos-chave do slide) */
  tags?: string[]
  /** Palavra ou trecho do título para destacar em âmbar */
  accentPhrase?: string
  /** Nome da marca no rodapé */
  brandName?: string
  /** URL/handle no rodapé */
  brandUrl?: string
  /** Tamanho do canvas (padrão: 540 — feed quadrado Instagram) */
  size?: number
}

// ── Design tokens do Agency OS ───────────────────────────────────────────────
const T = {
  bgBase:       '#0C0C0E',
  bgElevated:   '#1C1C22',
  bgOverlay:    '#26262F',
  borderSubtle: '#1E1E28',
  borderDefault:'#2C2C3A',
  borderStrong: '#3F3F52',
  textPrimary:  '#F0F0F5',
  textSecondary:'#A0A0B8',
  textMuted:    '#686880',
  textInverse:  '#0C0C0E',
  accent:       '#F59E0B',
  accentSubtle: 'rgba(245,158,11,0.12)',
  success:      'rgba(16,185,129,0.12)',
  successText:  '#34D399',
  successBorder:'rgba(16,185,129,0.25)',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Divide o título em partes, destacando accentPhrase em âmbar */
function renderTitle(title: string, accentPhrase?: string): React.ReactNode {
  if (!accentPhrase || !title.includes(accentPhrase)) return title
  const [before, after] = title.split(accentPhrase)
  return (
    <>
      {before}
      <span style={{ color: T.accent }}>{accentPhrase}</span>
      {after}
    </>
  )
}

/** Variante de chip baseada no índice para alternância visual */
function chipVariant(idx: number): React.CSSProperties {
  const variants: React.CSSProperties[] = [
    { background: T.accent,       color: T.textInverse, border: 'none' },
    { background: T.bgElevated,   color: T.textPrimary, border: `1px solid ${T.borderDefault}` },
    { background: T.accentSubtle, color: T.textSecondary, border: `1.5px solid ${T.borderStrong}` },
    { background: T.success,      color: T.successText, border: `1px solid ${T.successBorder}` },
  ]
  return variants[idx % variants.length]
}

// ── Componente ────────────────────────────────────────────────────────────────

export function EditorialTemplate({
  title,
  subtitle,
  backgroundImage,
  tags = [],
  accentPhrase,
  brandName = 'Agency OS',
  brandUrl   = 'agencyos.com.br',
  size = 540,
}: EditorialTemplateProps) {
  const scale = size / 540  // fator de escala para tamanhos diferentes

  const S: Record<string, React.CSSProperties> = {
    canvas: {
      width:    size,
      height:   size,
      background: T.bgBase,
      display:   'flex',
      flexDirection: 'column',
      padding:  `${Math.round(44 * scale)}px ${Math.round(36 * scale)}px ${Math.round(32 * scale)}px`,
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Inter', system-ui, sans-serif",
      WebkitFontSmoothing: 'antialiased',
      boxSizing: 'border-box',
    },

    // Imagem de fundo (gerada pelo ATLAS)
    bgImage: {
      position: 'absolute', inset: 0,
      backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      opacity: 0.18,  // overlay sutil — o texto domina
    },

    // Textura de grid pontilhado
    dotGrid: {
      position: 'absolute', inset: 0,
      backgroundImage: `radial-gradient(circle, rgba(245,158,11,0.12) 1px, transparent 1px)`,
      backgroundSize: '24px 24px',
      pointerEvents: 'none',
    },

    headline: {
      fontSize:      `${Math.round(36 * scale)}px`,
      fontWeight:    900,
      letterSpacing: '-0.03em',
      lineHeight:    1.1,
      color:         T.textPrimary,
      position:      'relative',
      zIndex:        1,
      marginBottom:  `${Math.round(24 * scale)}px`,
      whiteSpace:    'pre-wrap',
    },

    chips: {
      display:       'flex',
      flexWrap:      'wrap',
      gap:           `${Math.round(8 * scale)}px`,
      position:      'relative',
      zIndex:        1,
      marginBottom:  'auto',
    },

    chip: {
      padding:       `${Math.round(8 * scale)}px ${Math.round(18 * scale)}px`,
      borderRadius:  '9999px',
      fontSize:      `${Math.round(13 * scale)}px`,
      fontWeight:    600,
      display:       'flex',
      alignItems:    'center',
      gap:           `${Math.round(6 * scale)}px`,
    },

    sub: {
      position:      'relative',
      zIndex:        1,
      display:       'flex',
      alignItems:    'center',
      gap:           `${Math.round(8 * scale)}px`,
      fontSize:      `${Math.round(12 * scale)}px`,
      color:         T.textSecondary,
      marginTop:     `${Math.round(20 * scale)}px`,
      paddingTop:    `${Math.round(16 * scale)}px`,
      borderTop:     `1px solid ${T.borderSubtle}`,
    },

    subPlus: {
      width:         `${Math.round(18 * scale)}px`,
      height:        `${Math.round(18 * scale)}px`,
      background:    T.accentSubtle,
      borderRadius:  '9999px',
      display:       'flex',
      alignItems:    'center',
      justifyContent:'center',
      fontSize:      `${Math.round(11 * scale)}px`,
      color:         T.accent,
      fontWeight:    700,
      flexShrink:    0,
    },

    logoRow: {
      display:       'flex',
      alignItems:    'center',
      justifyContent:'space-between',
      marginTop:     `${Math.round(16 * scale)}px`,
      position:      'relative',
      zIndex:        1,
    },

    logo: {
      fontSize:      `${Math.round(13 * scale)}px`,
      fontWeight:    800,
      color:         T.textPrimary,
    },

    urlPill: {
      display:       'flex',
      alignItems:    'center',
      gap:           `${Math.round(5 * scale)}px`,
      border:        `1px solid ${T.borderDefault}`,
      borderRadius:  '9999px',
      padding:       `${Math.round(4 * scale)}px ${Math.round(10 * scale)}px`,
      fontSize:      `${Math.round(10 * scale)}px`,
      fontFamily:    "'JetBrains Mono', monospace",
      color:         T.textMuted,
    },
  }

  // Tags padrão se nenhuma for fornecida
  const displayTags = tags.length > 0
    ? tags
    : ['Estratégia', 'Marketing', 'Resultado', 'Processo', 'Foco']

  return (
    <div style={S.canvas}>
      {/* Camada de imagem de fundo (ATLAS) */}
      {backgroundImage && <div style={S.bgImage} />}

      {/* Grid pontilhado âmbar */}
      <div style={S.dotGrid} />

      {/* Headline */}
      <div style={S.headline}>
        {renderTitle(title, accentPhrase)}
      </div>

      {/* Tag Cloud */}
      <div style={S.chips}>
        {displayTags.map((tag, i) => (
          <div key={i} style={{ ...S.chip, ...chipVariant(i) }}>
            {tag}
          </div>
        ))}
        <div style={{
          width: `${Math.round(36 * scale)}px`,
          height: `${Math.round(36 * scale)}px`,
          background: T.bgElevated,
          border: `1px solid ${T.borderDefault}`,
          borderRadius: '9999px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: `${Math.round(14 * scale)}px`,
          color: T.textSecondary,
        }}>→</div>
      </div>

      {/* Subtítulo */}
      <div style={S.sub}>
        <div style={S.subPlus}>+</div>
        <span style={{ color: T.textSecondary }}>
          {subtitle.split('**').map((part, i) =>
            i % 2 === 1
              ? <strong key={i} style={{ color: T.accent }}>{part}</strong>
              : part
          )}
        </span>
      </div>

      {/* Rodapé: logo + URL */}
      <div style={S.logoRow}>
        <div style={S.logo}>
          {brandName.split(' ').map((word, i) =>
            i === brandName.split(' ').length - 1
              ? <span key={i} style={{ color: T.accent }}>{word}</span>
              : <span key={i}>{word} </span>
          )}
        </div>
        <div style={S.urlPill}>🌐 {brandUrl}</div>
      </div>
    </div>
  )
}
