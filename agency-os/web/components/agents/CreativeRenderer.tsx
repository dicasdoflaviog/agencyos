'use client'

import { useState, useRef } from 'react'
import { toPng } from 'html-to-image'
import { ChevronLeft, ChevronRight, Check, Trash2, Download, Loader2 } from 'lucide-react'

export interface CreativeSlide {
  slide: number
  imageBase64: string
  mimeType: string
  headline: string
  body: string
  textPosition: 'top' | 'bottom'
}

interface CreativeRendererProps {
  slides: CreativeSlide[]
}

type SlideStatus = 'pending' | 'approved' | 'rejected' | 'saving'

// Safe-area gradient — dark scrim where text lives
const SCRIM_TOP    = 'linear-gradient(to bottom, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.4) 55%, transparent 100%)'
const SCRIM_BOTTOM = 'linear-gradient(to top,   rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.4) 55%, transparent 100%)'

export function CreativeRenderer({ slides }: CreativeRendererProps) {
  const [current, setCurrent]   = useState(0)
  const [statuses, setStatuses] = useState<Record<number, SlideStatus>>({})
  const [downloading, setDownloading] = useState(false)
  const slideRef = useRef<HTMLDivElement>(null)

  const slide  = slides[current]
  const status = statuses[current] ?? 'pending'

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    setStatuses(prev => ({ ...prev, [current]: 'saving' }))
    await fetch('/api/agents/atlas/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approved' }),
    }).catch(() => {})
    setStatuses(prev => ({ ...prev, [current]: 'approved' }))
  }

  const handleReject = () => {
    setStatuses(prev => ({ ...prev, [current]: 'rejected' }))
  }

  const handleDownload = async () => {
    if (!slideRef.current) return
    setDownloading(true)
    try {
      await document.fonts.ready
      const dataUrl = await toPng(slideRef.current, {
        width:      360,
        height:     360,
        pixelRatio: 3,  // 360 × 3 = 1080px output
        cacheBust:  true,
      })
      const a = document.createElement('a')
      a.href     = dataUrl
      a.download = `atlas-slide-${slide.slide}-${Date.now()}.png`
      a.click()
    } catch (e) {
      console.error('[CreativeRenderer] download error', e)
    } finally {
      setDownloading(false)
    }
  }

  const prev = () => setCurrent(c => Math.max(0, c - 1))
  const next = () => setCurrent(c => Math.min(slides.length - 1, c + 1))

  const isBottom = slide.textPosition !== 'top'
  const scrim    = isBottom ? SCRIM_BOTTOM : SCRIM_TOP

  return (
    <div className="mt-3 max-w-[360px]">

      {/* ── 1:1 slide canvas ─────────────────────────────────────────────── */}
      <div
        ref={slideRef}
        className="relative w-[360px] h-[360px] rounded-xl overflow-hidden select-none"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* Background image — fills entire canvas */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:${slide.mimeType};base64,${slide.imageBase64}`}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: 'center center' }}
        />

        {/* Safe-area scrim overlay */}
        <div
          className="absolute inset-x-0 h-[45%] z-10"
          style={{
            background: scrim,
            [isBottom ? 'bottom' : 'top']: 0,
          }}
        />

        {/* Text layer — top or bottom safe area */}
        <div
          className="absolute inset-x-0 z-20 px-5 py-4 flex flex-col gap-1.5"
          style={{ [isBottom ? 'bottom' : 'top']: 0 }}
        >
          {/* Slide number chip */}
          <span
            className="self-start text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1"
            style={{ background: 'var(--color-accent)', color: '#0C0C0E' }}
          >
            {current + 1}/{slides.length}
          </span>

          <h1
            className="text-white font-bold leading-tight"
            style={{ fontSize: '18px', fontFamily: "'DM Sans', sans-serif" }}
          >
            {slide.headline}
          </h1>

          {slide.body && (
            <p
              className="leading-snug"
              style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', fontFamily: "'Inter', sans-serif" }}
            >
              {slide.body}
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

      {/* ── Dot navigator ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-1.5 mt-2.5">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="rounded-full transition-all duration-200"
            style={{
              width:  i === current ? '16px' : '6px',
              height: '6px',
              background: i === current ? 'var(--color-accent)' : 'var(--color-border-default)',
            }}
          />
        ))}
      </div>

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 mt-2">
        <button
          onClick={prev} disabled={current === 0}
          className="p-1.5 rounded-lg bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-30 transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          onClick={next} disabled={current === slides.length - 1}
          className="p-1.5 rounded-lg bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-30 transition-colors"
        >
          <ChevronRight size={14} />
        </button>

        <div className="flex-1" />

        {status === 'pending' && (
          <>
            <button
              onClick={handleApprove}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34D399' }}
            >
              <Check size={12} /> Aprovar
            </button>

            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-all bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              title="Baixar 1080×1080px"
            >
              {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            </button>

            <button
              onClick={handleReject}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs transition-all"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}
            >
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
