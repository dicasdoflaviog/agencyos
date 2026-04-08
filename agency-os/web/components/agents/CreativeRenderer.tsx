'use client'

import { useState, useRef } from 'react'
import { toPng } from 'html-to-image'
import { ChevronLeft, ChevronRight, Check, Trash2, Download, Loader2 } from 'lucide-react'

// ── Public contract (matches backend CarouselPayload) ────────────────────────
export interface CarouselPayload {
  backgroundBase64: string
  mimeType: string
  slides: Array<{
    titulo: string
    corpo: string
    textPosition: 'top' | 'bottom'
  }>
  style_tokens: {
    primary: string   // e.g. #0C0C0E
    accent:  string   // e.g. #F59E0B
    text:    string   // e.g. #F0F0F5
    surface: string   // e.g. #131317
  }
}

// ── Safe-area scrim constants ─────────────────────────────────────────────────
const SCRIM_BOTTOM = 'linear-gradient(to top,   rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 55%, transparent 100%)'
const SCRIM_TOP    = 'linear-gradient(to bottom, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 55%, transparent 100%)'

type Status = 'pending' | 'approved' | 'rejected' | 'saving'

export function CreativeRenderer({ backgroundBase64, mimeType, slides, style_tokens }: CarouselPayload) {
  const [current,     setCurrent]     = useState(0)
  const [statuses,    setStatuses]    = useState<Record<number, Status>>({})
  const [downloading, setDownloading] = useState(false)
  const slideRef = useRef<HTMLDivElement>(null)

  const slide  = slides[current]
  const status = statuses[current] ?? 'pending'
  const isBottom = slide.textPosition !== 'top'

  // ── Download 1080×1080 via html-to-image ──────────────────────────────────
  const handleDownload = async () => {
    if (!slideRef.current) return
    setDownloading(true)
    try {
      await document.fonts.ready
      const dataUrl = await toPng(slideRef.current, {
        width: 360, height: 360,
        pixelRatio: 3,   // 360 × 3 = 1080px
        cacheBust: true,
      })
      const a = document.createElement('a')
      a.href     = dataUrl
      a.download = `atlas-slide-${current + 1}-${Date.now()}.png`
      a.click()
    } catch (e) {
      console.error('[CreativeRenderer] download error', e)
    } finally {
      setDownloading(false)
    }
  }

  const handleApprove = () => setStatuses(p => ({ ...p, [current]: 'approved' }))
  const handleReject  = () => setStatuses(p => ({ ...p, [current]: 'rejected' }))
  const prev = () => setCurrent(c => Math.max(0, c - 1))
  const next = () => setCurrent(c => Math.min(slides.length - 1, c + 1))

  return (
    <div className="mt-3 max-w-[360px]">

      {/* ── Canvas 360×360 → exports 1080×1080 ───────────────────────────── */}
      <div
        ref={slideRef}
        className="relative w-[360px] h-[360px] rounded-xl overflow-hidden select-none"
        style={{ backgroundColor: style_tokens.primary, fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* Background image — single image shared across all slides */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:${mimeType};base64,${backgroundBase64}`}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Safe-area scrim */}
        <div
          className="absolute inset-x-0 h-[48%] z-10 pointer-events-none"
          style={{ background: isBottom ? SCRIM_BOTTOM : SCRIM_TOP, [isBottom ? 'bottom' : 'top']: 0 }}
        />

        {/* Text layer — CSS overlay, never baked into the AI image */}
        <div
          className="absolute inset-x-0 z-20 px-5 flex flex-col gap-2"
          style={{ [isBottom ? 'bottom' : 'top']: '16px' }}
        >
          {/* Slide chip */}
          <span
            className="self-start text-[10px] font-bold px-2.5 py-0.5 rounded-full"
            style={{ backgroundColor: style_tokens.accent, color: style_tokens.primary }}
          >
            {current + 1}/{slides.length}
          </span>

          {/* Título — DM Sans Bold */}
          <h1
            style={{
              fontSize: '19px',
              fontWeight: 700,
              lineHeight: 1.25,
              color: style_tokens.text,
              fontFamily: "'DM Sans', sans-serif",
              margin: 0,
            }}
          >
            {slide.titulo}
          </h1>

          {/* Corpo — Inter Regular */}
          {slide.corpo && (
            <p
              style={{
                fontSize: '12px',
                lineHeight: 1.5,
                color: `${style_tokens.text}CC`,
                fontFamily: "'Inter', sans-serif",
                margin: 0,
              }}
            >
              {slide.corpo}
            </p>
          )}
        </div>

        {/* Approved overlay */}
        {status === 'approved' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <span className="flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white">
              <Check size={14} /> Aprovado
            </span>
          </div>
        )}
      </div>

      {/* ── Dot navigator ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-1.5 mt-2.5">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="rounded-full transition-all duration-200"
            style={{
              width:      i === current ? '16px' : '6px',
              height:     '6px',
              background: i === current ? style_tokens.accent : 'var(--color-border-default)',
            }}
          />
        ))}
      </div>

      {/* ── Controls ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 mt-2">
        <button onClick={prev} disabled={current === 0}
          className="p-1.5 rounded-lg bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-30 transition-colors">
          <ChevronLeft size={14} />
        </button>
        <button onClick={next} disabled={current === slides.length - 1}
          className="p-1.5 rounded-lg bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-30 transition-colors">
          <ChevronRight size={14} />
        </button>

        <div className="flex-1" />

        {status === 'pending' && (
          <>
            <button onClick={handleApprove}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34D399' }}>
              <Check size={12} /> Aprovar
            </button>
            <button onClick={handleDownload} disabled={downloading}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-all bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              title="Baixar 1080×1080px">
              {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            </button>
            <button onClick={handleReject}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs transition-all"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}>
              <Trash2 size={12} />
            </button>
          </>
        )}
        {status === 'saving' && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
            <Loader2 size={12} className="animate-spin" /> Salvando...
          </div>
        )}
        {status === 'rejected' && (
          <span className="text-xs text-[var(--color-text-muted)]">Descartado</span>
        )}
      </div>
    </div>
  )
}

