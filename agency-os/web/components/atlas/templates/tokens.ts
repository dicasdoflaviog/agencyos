// components/atlas/templates/tokens.ts
// Design tokens do Agency OS — usados por todos os templates de slide

export const T = {
  bgBase:        '#0C0C0E',
  bgSurface:     '#131317',
  bgElevated:    '#1C1C22',
  bgOverlay:     '#26262F',
  borderSubtle:  '#1E1E28',
  borderDefault: '#2C2C3A',
  borderStrong:  '#3F3F52',
  textPrimary:   '#F0F0F5',
  textSecondary: '#A0A0B8',
  textMuted:     '#686880',
  textInverse:   '#0C0C0E',
  accent:        '#F59E0B',
  accentHover:   '#D97706',
  accentSubtle:  'rgba(245,158,11,0.12)',
  accentRing:    'rgba(245,158,11,0.40)',
  success:       '#10B981',
  successSubtle: 'rgba(16,185,129,0.12)',
  successText:   '#34D399',
  successBorder: 'rgba(16,185,129,0.25)',
  error:         '#EF4444',
  errorSubtle:   'rgba(239,68,68,0.12)',
  errorText:     '#FCA5A5',
  errorBorder:   'rgba(239,68,68,0.2)',
  shadowMd:      '0 4px 16px rgba(0,0,0,0.5)',
  shadowXl:      '0 24px 48px rgba(0,0,0,0.7)',
  fontSans:      "'Inter', system-ui, sans-serif",
  fontMono:      "'JetBrains Mono', monospace",
} as const

/** Escala um valor de px baseado no tamanho do canvas (base = 540) */
export function sc(px: number, size: number): number {
  return Math.round((px * size) / 540)
}

/** Retorna estilos base do canvas para todos os templates */
export function canvasBase(size: number, extra?: React.CSSProperties): React.CSSProperties {
  return {
    width:    size,
    height:   size,
    position: 'relative',
    overflow: 'hidden',
    fontFamily: T.fontSans,
    WebkitFontSmoothing: 'antialiased' as const,
    boxSizing: 'border-box' as const,
    flexShrink: 0,
    ...extra,
  }
}
