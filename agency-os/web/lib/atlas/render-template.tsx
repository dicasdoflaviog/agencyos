// lib/atlas/render-template.tsx
// Motor de Renderização: converte template + copy do DNA → PNG via next/og (Satori)
// Roda server-side — substitui o FLUX para slides com Blueprint

import 'server-only'
import { ImageResponse } from 'next/og'
import React from 'react'
import type { SlideContent } from './vera-copy'
import type { ClientDNAContext } from './dna'

// Canvas 1080×1080 (2× o design system de 540px)
const W = 1080
const H = 1080

// Scale helper: de 540px → 1080px
const s = (px: number) => Math.round(px * 2)

// Design tokens (server-side constants — não usa CSS vars)
const TK = {
  bgBase:        '#0C0C0E',
  bgSurface:     '#131317',
  bgElevated:    '#1C1C22',
  bgOverlay:     '#26262F',
  borderSubtle:  '#1E1E28',
  borderDefault: '#2C2C3A',
  textPrimary:   '#F0F0F5',
  textSecondary: '#A0A0B8',
  textMuted:     '#686880',
  textInverse:   '#0C0C0E',
  accentDefault: '#F59E0B',
} as const

// ─── Font loading ──────────────────────────────────────────────────────────────
// Módulo-level promise — uma única requisição por cold start, compartilhada entre slides
let _fontPromise: Promise<ArrayBuffer> | null = null

function loadInterBold(): Promise<ArrayBuffer> {
  if (!_fontPromise) {
    _fontPromise = fetch(
      // Inter Bold (woff) — URL estável do CDN Google Fonts Static
      'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuBWYAZ9hiJ-Ek-_EeA.woff'
    ).then(r => r.arrayBuffer())
  }
  return _fontPromise
}

// ─── T05 — Título Bold (Capa, Posicionamento, Value Prop) ─────────────────────
function T05JSX({
  title, subtitle, tags, brandName, accentColor, bgUrl,
}: {
  title: string
  subtitle: string
  tags?: string[]
  brandName?: string
  accentColor?: string
  bgUrl?: string
}) {
  const ac = accentColor || TK.accentDefault
  const chips = (tags && tags.length > 0) ? tags.slice(0, 5) : ['Digital', 'Automação', 'Resultado']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, background: TK.bgBase, padding: `${s(44)}px ${s(36)}px ${s(36)}px`, position: 'relative' }}>
      {/* Background sutil */}
      {bgUrl && (
        <img src={bgUrl} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.06 }} />
      )}

      {/* Decoração: dot grid */}
      <div style={{ position: 'absolute', top: s(30), right: s(30), width: s(100), height: s(100), opacity: 0.18, backgroundImage: `radial-gradient(circle, ${ac} 1.5px, transparent 1.5px)`, backgroundSize: `${s(14)}px ${s(14)}px` }} />

      {/* Accent bar */}
      <div style={{ width: s(48), height: s(4), background: ac, borderRadius: '4px', marginBottom: s(40), position: 'relative' }} />

      {/* Headline principal — centralizada verticalmente */}
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', position: 'relative' }}>
        <div style={{ fontSize: s(60), fontWeight: 800, color: TK.textPrimary, lineHeight: 1.1, letterSpacing: '-0.03em', maxWidth: '88%' }}>
          {title}
        </div>
      </div>

      {/* Subtitle */}
      <div style={{ display: 'flex', fontSize: s(15), color: TK.textSecondary, lineHeight: 1.6, marginBottom: s(24), position: 'relative' }}>
        {subtitle}
      </div>

      {/* Chip tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: s(8), marginBottom: s(28), position: 'relative' }}>
        {chips.map((tag, i) => (
          <div key={i} style={{
            background: i === 0 ? ac : 'rgba(255,255,255,0.06)',
            border: `1px solid ${i === 0 ? ac : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '9999px',
            padding: `${s(6)}px ${s(16)}px`,
            fontSize: s(12), fontWeight: 500,
            color: i === 0 ? TK.textInverse : TK.textSecondary,
          }}>
            {tag}
          </div>
        ))}
      </div>

      {/* Brand footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: s(8), position: 'relative' }}>
        <div style={{ width: s(24), height: s(24), background: ac, borderRadius: s(8), display: 'flex', alignItems: 'center', justifyContent: 'center', color: TK.textInverse, fontSize: s(13), fontWeight: 800 }}>A</div>
        <div style={{ fontSize: s(12), color: TK.textMuted }}>{brandName || 'Agency OS'}</div>
      </div>
    </div>
  )
}

// ─── T04 — Problema → Solução + Stats (slides internos) ──────────────────────
function T04JSX({
  title, subtitle, problemText, stats, ctaText, brandName, accentColor,
}: {
  title: string
  subtitle: string
  problemText?: string
  stats?: { icon: string; value: string; label: string }[]
  ctaText?: string
  brandName?: string
  accentColor?: string
}) {
  const ac = accentColor || TK.accentDefault
  const problem = problemText || 'Antes: tempo perdido com processos manuais e resultados inconsistentes.'

  const defaultStats = [
    { icon: '→', value: '10×', label: 'Velocidade' },
    { icon: '→', value: '100%', label: 'Consistência' },
    { icon: '→', value: '3×', label: 'Capacidade' },
  ]
  const activeStats = (stats && stats.length >= 1) ? stats.map(st => ({ ...st, icon: '→' })) : defaultStats

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, background: TK.bgSurface, padding: `${s(36)}px ${s(32)}px ${s(32)}px` }}>
      {/* Logo row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: s(7), marginBottom: s(24) }}>
        <div style={{ width: s(22), height: s(22), background: ac, borderRadius: s(8), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: s(12), color: TK.textInverse, fontWeight: 800 }}>A</div>
        <span style={{ fontSize: s(13), fontWeight: 700, color: TK.textPrimary }}>{brandName || 'Agency OS'}</span>
      </div>

      {/* Headline */}
      <div style={{ display: 'flex', fontSize: s(28), fontWeight: 800, color: TK.textPrimary, marginBottom: s(24), lineHeight: 1.2, letterSpacing: '-0.02em' }}>
        {title}
      </div>

      {/* Balões de conversa — dor / solução */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: s(14), marginBottom: s(28) }}>
        {/* Bolha escura — problema */}
        <div style={{ display: 'flex', background: TK.bgOverlay, border: `1px solid ${TK.borderDefault}`, borderRadius: s(16), padding: `${s(16)}px ${s(20)}px`, fontSize: s(14), color: TK.textPrimary, lineHeight: 1.5, maxWidth: '78%' }}>
          {problem}
        </div>
        {/* Bolha âmbar — solução */}
        <div style={{ display: 'flex', background: ac, borderRadius: s(16), padding: `${s(16)}px ${s(20)}px`, fontSize: s(14), color: TK.textInverse, lineHeight: 1.5, fontWeight: 600, maxWidth: '78%', alignSelf: 'flex-end' }}>
          {subtitle}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', borderTop: `1px solid ${TK.borderSubtle}`, borderBottom: `1px solid ${TK.borderSubtle}`, marginBottom: s(28) }}>
        {activeStats.slice(0, 3).map((stat, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: `${s(16)}px ${s(8)}px`, borderRight: i < 2 ? `1px solid ${TK.borderSubtle}` : 'none' }}>
            <div style={{ display: 'flex', fontSize: s(14), color: ac, marginBottom: s(6) }}>{stat.icon}</div>
            <div style={{ display: 'flex', fontSize: s(22), fontWeight: 800, color: TK.textPrimary, lineHeight: 1 }}>{stat.value}</div>
            <div style={{ display: 'flex', fontSize: s(10), color: TK.textMuted, marginTop: s(4) }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* CTA button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: s(52), background: ac, borderRadius: '9999px', fontSize: s(15), fontWeight: 700, color: TK.textInverse }}>
        {ctaText || 'Quero saber mais'}
      </div>
    </div>
  )
}

// ─── T01 — Produto Flutuante (lançamento, showcase) ───────────────────────────
function T01JSX({
  title, subtitle, features, ctaText, brandName, accentColor, bgUrl,
}: {
  title: string; subtitle: string; features?: string[]; ctaText?: string; brandName?: string; accentColor?: string; bgUrl?: string
}) {
  const ac = accentColor || TK.accentDefault
  const pills = (features && features.length > 0) ? features.slice(0, 4) : ['Automatizado', 'Rápido', 'Escalável', 'Inteligente']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, background: TK.bgBase, padding: `${s(48)}px ${s(40)}px`, position: 'relative' }}>
      {bgUrl && <img src={bgUrl} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.08 }} />}

      {/* Ring decorativo */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', width: s(480), height: s(480), borderRadius: '50%', border: `1px solid ${ac}22`, transform: 'translate(-50%, -50%)' }} />
      <div style={{ position: 'absolute', top: '50%', left: '50%', width: s(360), height: s(360), borderRadius: '50%', border: `1px solid ${ac}14`, transform: 'translate(-50%, -50%)' }} />

      {/* Título */}
      <div style={{ display: 'flex', position: 'relative', fontSize: s(48), fontWeight: 800, color: TK.textPrimary, lineHeight: 1.15, letterSpacing: '-0.025em', marginBottom: s(20) }}>
        {title}
      </div>

      {/* Card flutuante */}
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ display: 'flex', flexDirection: 'column', background: TK.bgSurface, border: `1px solid ${TK.borderDefault}`, borderRadius: s(24), padding: `${s(28)}px`, width: '85%', boxShadow: `0 ${s(24)}px ${s(48)}px rgba(0,0,0,0.6)` }}>
          <div style={{ display: 'flex', fontSize: s(14), color: TK.textSecondary, lineHeight: 1.6, marginBottom: s(20) }}>{subtitle}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: s(8) }}>
            {pills.map((pill, i) => (
              <div key={i} style={{ background: i === 0 ? ac : TK.bgElevated, border: `1px solid ${TK.borderSubtle}`, borderRadius: '9999px', padding: `${s(5)}px ${s(12)}px`, fontSize: s(11), color: i === 0 ? TK.textInverse : TK.textSecondary }}>
                {pill}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', marginTop: s(20) }}>
        <div style={{ fontSize: s(12), color: TK.textMuted }}>{brandName || 'Agency OS'}</div>
        <div style={{ background: ac, borderRadius: '9999px', padding: `${s(8)}px ${s(20)}px`, fontSize: s(13), fontWeight: 700, color: TK.textInverse }}>{ctaText || 'Saiba mais →'}</div>
      </div>
    </div>
  )
}

// ─── T06 — Fundo Sólido (CTA, destaque, alta energia) ────────────────────────
function T06JSX({
  title, subtitle, icons, brandName, accentColor,
}: {
  title: string; subtitle: string; icons?: { emoji: string; label: string }[]; brandName?: string; accentColor?: string
}) {
  const ac = accentColor || TK.accentDefault
  const iconList = (icons && icons.length > 0) ? icons.slice(0, 4) : [
    { emoji: 'A', label: 'Agentes IA' }, { emoji: 'K', label: 'Kanban' },
    { emoji: 'B', label: 'Briefing' },   { emoji: 'R', label: 'Relatórios' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, background: ac, padding: `${s(36)}px ${s(32)}px ${s(28)}px` }}>
      <div style={{ display: 'flex', fontSize: s(18), color: TK.textInverse, marginBottom: s(10), opacity: 0.8 }}>→</div>

      <div style={{ display: 'flex', fontSize: s(30), fontWeight: 800, color: TK.textInverse, lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: s(28) }}>
        {title}
      </div>

      {/* Preview card */}
      <div style={{ display: 'flex', alignItems: 'center', gap: s(14), background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: s(16), padding: `${s(16)}px ${s(18)}px`, marginBottom: s(24) }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontSize: s(14), fontWeight: 700, color: '#fff', marginBottom: s(4) }}>{brandName || 'Agency OS'} · Dashboard</div>
          <div style={{ fontSize: s(11), color: 'rgba(255,255,255,0.7)' }}>{subtitle}</div>
        </div>
        <div style={{ width: s(72), height: s(54), background: 'rgba(0,0,0,0.3)', borderRadius: s(8), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: s(24) }}>[ ]</div>
      </div>

      {/* Grid 2×2 de ícones */}
      <div style={{ display: 'flex', gap: s(10), flex: 1, marginBottom: s(20) }}>
        {iconList.slice(0, 4).map((icon, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: s(6), background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: s(16) }}>
            <div style={{ fontSize: s(22), color: '#fff', fontWeight: 800 }}>{icon.emoji.charAt(0)}</div>
            <div style={{ fontSize: s(9), fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>{icon.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: s(8) }}>
        <div style={{ width: s(28), height: s(28), background: 'rgba(0,0,0,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: s(13), color: '#fff', fontWeight: 800 }}>A</div>
        <div style={{ fontSize: s(13), fontWeight: 800, color: 'rgba(0,0,0,0.55)' }}>{brandName || 'Agency OS'}</div>
      </div>
    </div>
  )
}

// ─── Fallback genérico dark ───────────────────────────────────────────────────
function GenericDarkJSX({
  title, subtitle, brandName, accentColor, bgUrl,
}: {
  title: string; subtitle: string; brandName?: string; accentColor?: string; bgUrl?: string
}) {
  const ac = accentColor || TK.accentDefault

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, background: TK.bgBase, padding: `${s(48)}px ${s(40)}px`, position: 'relative' }}>
      {bgUrl && <img src={bgUrl} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.08 }} />}
      <div style={{ width: s(40), height: s(3), background: ac, borderRadius: '3px', marginBottom: s(48), position: 'relative' }} />
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', position: 'relative' }}>
        <div style={{ fontSize: s(52), fontWeight: 800, color: TK.textPrimary, lineHeight: 1.15, letterSpacing: '-0.025em' }}>
          {title}
        </div>
      </div>
      <div style={{ display: 'flex', fontSize: s(16), color: TK.textSecondary, lineHeight: 1.6, marginBottom: s(32), position: 'relative' }}>
        {subtitle}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: s(8), position: 'relative' }}>
        <div style={{ width: s(8), height: s(8), background: ac, borderRadius: '50%' }} />
        <div style={{ fontSize: s(12), color: TK.textMuted }}>{brandName || 'Agency OS'}</div>
      </div>
    </div>
  )
}

// ─── Função principal ─────────────────────────────────────────────────────────

export async function renderSlideToBuffer(
  slide: SlideContent,
  dna: ClientDNAContext,
  backgroundImageUrl?: string,
): Promise<Buffer> {
  const templateId = slide.template_id || 'titulo-bold'
  const td = slide.template_data || {}
  const ac = (dna.primary_color && dna.primary_color !== '#000000') ? dna.primary_color : TK.accentDefault
  const brandName = dna.client_name || 'Agency OS'

  const fontData = await loadInterBold()

  let element: React.ReactElement

  switch (templateId) {
    case 'titulo-bold':
      element = (
        <T05JSX
          title={slide.title}
          subtitle={slide.subtitle}
          tags={td.tags}
          brandName={brandName}
          accentColor={ac}
          bgUrl={backgroundImageUrl}
        />
      )
      break

    case 'problema-solucao':
      element = (
        <T04JSX
          title={slide.title}
          subtitle={slide.subtitle}
          problemText={td.problem}
          stats={td.stats}
          ctaText={td.ctaText}
          brandName={brandName}
          accentColor={ac}
        />
      )
      break

    case 'produto-flutuante':
      element = (
        <T01JSX
          title={slide.title}
          subtitle={slide.subtitle}
          features={td.features}
          ctaText={td.ctaText}
          brandName={brandName}
          accentColor={ac}
          bgUrl={backgroundImageUrl}
        />
      )
      break

    case 'fundo-solido':
      element = (
        <T06JSX
          title={slide.title}
          subtitle={slide.subtitle}
          icons={td.icons}
          brandName={brandName}
          accentColor={ac}
        />
      )
      break

    default:
      // T02, T03, T07 e qualquer outro → fallback genérico dark
      element = (
        <GenericDarkJSX
          title={slide.title}
          subtitle={slide.subtitle}
          brandName={brandName}
          accentColor={ac}
          bgUrl={backgroundImageUrl}
        />
      )
  }

  const imageResponse = new ImageResponse(element, {
    width: W,
    height: H,
    fonts: [
      { name: 'Inter', data: fontData, weight: 700, style: 'normal' },
    ],
  })

  const ab = await imageResponse.arrayBuffer()
  return Buffer.from(ab)
}
