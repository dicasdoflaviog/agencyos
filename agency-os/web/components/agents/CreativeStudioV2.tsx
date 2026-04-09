'use client'
import { useState, useEffect, useCallback } from 'react'
import { Loader2, Edit3, Copy, RotateCcw, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react'

type Step = 'config' | 'generating' | 'preview'
type Template = 'minimalista' | 'profile'
type Format =
  // Instagram
  | 'ig_feed_portrait' | 'ig_feed_square' | 'ig_stories' | 'ig_reels'
  // Facebook
  | 'fb_feed' | 'fb_stories' | 'fb_ad'
  // TikTok / YouTube / LinkedIn / Twitter
  | 'tiktok' | 'yt_thumbnail' | 'linkedin_post' | 'twitter_post'
  // Legacy
  | 'feed' | 'stories' | 'banner' | 'thumbnail' | 'portrait' | 'carousel' | 'square'

// Mapa de aspect ratio para CSS (display no preview)
const FORMAT_DISPLAY_RATIO: Record<string, string> = {
  ig_feed_portrait: '4/5',   ig_feed_square:   '1/1',
  ig_stories:       '9/16',  ig_reels:         '9/16',
  fb_feed:          '1/1',   fb_stories:       '9/16',   fb_ad:            '16/9',
  tiktok:           '9/16',  yt_thumbnail:     '16/9',
  linkedin_post:    '16/9',  twitter_post:     '16/9',
  feed:             '4/5',   stories:          '9/16',
  banner:           '16/9',  thumbnail:        '16/9',
  portrait:         '9/16',  carousel:         '4/5',   square:           '1/1',
}

interface Slide {
  number: number
  title: string
  subtitle: string
  image_url: string
  prompt: string
}

interface DNAData {
  primary_color?: string
  visual_style?: string
  tone?: string
  target_audience?: string
  [key: string]: string | undefined
}

interface PastAsset {
  id: string
  image_url: string
  prompt: string
  slide_count: number
  template: string
  created_at: string
  status: string
}

interface CreativeStudioV2Props {
  clientId: string
  userRole: 'admin' | 'collaborator' | 'viewer'
}

export function CreativeStudioV2({ clientId, userRole }: CreativeStudioV2Props) {
  const [step, setStep] = useState<Step>('config')
  const [dna, setDna] = useState<DNAData | null>(null)
  const [pastAssets, setPastAssets] = useState<PastAsset[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Lightbox state
  const [lightbox, setLightbox] = useState<{ images: string[]; titles: string[]; subtitles: string[]; index: number } | null>(null)

  const closeLightbox = useCallback(() => setLightbox(null), [])
  const lightboxPrev = useCallback(() => setLightbox(l => l && l.index > 0 ? { ...l, index: l.index - 1 } : l), [])
  const lightboxNext = useCallback(() => setLightbox(l => l && l.index < l.images.length - 1 ? { ...l, index: l.index + 1 } : l), [])

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightbox) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') lightboxPrev()
      if (e.key === 'ArrowRight') lightboxNext()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox, closeLightbox, lightboxPrev, lightboxNext])

  // Config state
  const [template, setTemplate] = useState<Template>('minimalista')
  const [format, setFormat] = useState<Format>('ig_feed_portrait')
  const [slideCount, setSlideCount] = useState(6)
  const [userPrompt, setUserPrompt] = useState('')
  const [customStyle, setCustomStyle] = useState('')

  // Result state
  const [assetId, setAssetId] = useState<string | null>(null)
  const [slides, setSlides] = useState<Slide[]>([])
  const [caption, setCaption] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selectedSlide, setSelectedSlide] = useState(0)
  const [showEditor, setShowEditor] = useState(false)

  // Regeneração de imagem por slide
  const [regeneratingSlides, setRegeneratingSlides] = useState<Set<number>>(new Set())

  // Progresso de geração (simulado com base no slideCount e timing médio)
  const [genProgress, setGenProgress] = useState<{ phase: 'vera' | 'atlas'; slide: number } | null>(null)

  // Carregar DNA e histórico do cliente
  useEffect(() => {
    fetch(`/api/clients/${clientId}/dna`)
      .then(r => r.json())
      .then(d => setDna(d))
      .catch(() => {})

    fetch(`/api/agents/atlas/gallery/${clientId}?status=all&limit=12`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setPastAssets(d) })
      .catch(() => {})
  }, [clientId])

  async function regenerateSlide(slideNumber: number, imagePrompt: string) {
    if (!assetId) return
    setRegeneratingSlides(prev => new Set(prev).add(slideNumber))
    try {
      const res = await fetch('/api/agents/atlas/regenerate-slide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, slideNumber, imagePrompt }),
      })
      const data = await res.json()
      if (data.success) {
        setSlides(prev => prev.map(s =>
          s.number === slideNumber
            ? { ...s, image_url: data.image_url, prompt: imagePrompt }
            : s
        ))
      } else {
        alert(data.error ?? 'Erro ao regenerar imagem')
      }
    } catch {
      alert('Falha de rede ao regenerar imagem')
    } finally {
      setRegeneratingSlides(prev => { const next = new Set(prev); next.delete(slideNumber); return next })
    }
  }

  function copyPrompt(asset: PastAsset) {
    navigator.clipboard.writeText(asset.prompt)
    setCopiedId(asset.id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  async function deleteAsset(assetId: string) {
    if (!confirm('Remover este carrossel do banco de dados?')) return
    setDeletingId(assetId)
    try {
      await fetch(`/api/agents/atlas/asset/${assetId}`, { method: 'DELETE' })
      setPastAssets(p => p.filter(a => a.id !== assetId))
      if (slides.length > 0 && assetId === assetId) {
        // se deletou o asset atual em preview, volta para config
        setStep('config')
        setSlides([])
        setAssetId(null)
      }
    } finally {
      setDeletingId(null)
    }
  }

  function openLightboxFromSlides(index: number) {
    setLightbox({
      images:    slides.map(s => s.image_url),
      titles:    slides.map(s => s.title),
      subtitles: slides.map(s => s.subtitle),
      index,
    })
  }

  function openLightboxFromAsset(asset: PastAsset) {
    setLightbox({
      images:    [asset.image_url],
      titles:    [asset.prompt.slice(0, 60)],
      subtitles: [],
      index:     0,
    })
  }

  function reuseAsset(asset: PastAsset) {
    setUserPrompt(asset.prompt)
    if (asset.template === 'minimalista' || asset.template === 'profile') {
      setTemplate(asset.template as Template)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function generate() {
    if (!userPrompt.trim()) return
    setStep('generating')
    setError(null)
    setSlides([])

    // ── Progresso simulado ───────────────────────────────────────────────────
    // VERA leva ~4s, cada imagem ATLAS ~12-16s (paralelo, mas simulamos sequencial)
    setGenProgress({ phase: 'vera', slide: 0 })
    const ATLAS_STEP_MS = 14_000
    let currentSlide = 0
    const progressTimers: ReturnType<typeof setTimeout>[] = []

    // Após ~5s, VERA pronta → começa ATLAS
    progressTimers.push(setTimeout(() => {
      setGenProgress({ phase: 'atlas', slide: 1 })
      currentSlide = 1
    }, 5_000))

    // Cada ~14s avança 1 slide (até slideCount - 1, o último "aparece" com a resposta real)
    for (let s = 2; s < slideCount; s++) {
      const delay = 5_000 + (s - 1) * ATLAS_STEP_MS
      const slideNum = s
      progressTimers.push(setTimeout(() => {
        currentSlide = slideNum
        setGenProgress({ phase: 'atlas', slide: slideNum })
      }, delay))
    }

    // AbortController: 3 minutos máx
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3 * 60 * 1000)

    try {
      const res = await fetch('/api/agents/atlas/generate-carousel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          userPrompt,
          template,
          format,
          slideCount,
          customStyle: customStyle || undefined,
        }),
        signal: controller.signal,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Erro ${res.status}`)

      setAssetId(data.asset.id)
      setSlides(data.slides)
      setCaption(data.copy?.caption ?? '')
      setStep('preview')
    } catch (err) {
      const msg = err instanceof Error
        ? (err.name === 'AbortError' ? 'Tempo esgotado (3 min). Tente com menos slides.' : err.message)
        : 'Erro ao gerar'
      setError(msg)
      setStep('config')
    } finally {
      clearTimeout(timeout)
      progressTimers.forEach(clearTimeout)
      setGenProgress(null)
    }
  }

  async function approve() {
    if (!assetId) return
    await fetch('/api/agents/atlas/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetId, action: 'approved' }),
    })
    setStep('config')
    setUserPrompt('')
    setSlides([])
    setAssetId(null)
  }

  const canEdit = userRole === 'admin' || userRole === 'collaborator'
  const canDelete = userRole === 'admin' || userRole === 'collaborator'

  // ── LIGHTBOX ──────────────────────────────────────────────────────────────
  const LightboxOverlay = lightbox && (
    <div
      onClick={closeLightbox}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Close */}
      <button onClick={closeLightbox} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <X size={18} />
      </button>

      {/* Prev */}
      {lightbox.index > 0 && (
        <button onClick={e => { e.stopPropagation(); lightboxPrev() }} style={{ position: 'absolute', left: '16px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <ChevronLeft size={22} />
        </button>
      )}

      {/* Image canvas */}
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '480px', maxHeight: '90vh', borderRadius: '14px', overflow: 'hidden' }}>
        {lightbox.images[lightbox.index] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={lightbox.images[lightbox.index]} alt="" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <div style={{ width: '400px', aspectRatio: '4/5', background: '#1C1C22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Imagem não disponível</span>
          </div>
        )}
        {/* Scrim + text overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.35) 50%, transparent 100%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: '20px', padding: '0 20px', pointerEvents: 'none' }}>
          {lightbox.titles[lightbox.index] && (
            <p style={{ fontSize: '20px', fontWeight: 700, color: '#F0F0F5', margin: '0 0 6px', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.25 }}>
              {lightbox.titles[lightbox.index]}
            </p>
          )}
          {lightbox.subtitles[lightbox.index] && (
            <p style={{ fontSize: '13px', color: 'rgba(240,240,245,0.78)', margin: 0, fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>
              {lightbox.subtitles[lightbox.index]}
            </p>
          )}
        </div>
        {/* Counter */}
        {lightbox.images.length > 1 && (
          <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '11px', padding: '3px 8px', borderRadius: '10px' }}>
            {lightbox.index + 1}/{lightbox.images.length}
          </div>
        )}
      </div>

      {/* Next */}
      {lightbox.index < lightbox.images.length - 1 && (
        <button onClick={e => { e.stopPropagation(); lightboxNext() }} style={{ position: 'absolute', right: '16px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <ChevronRight size={22} />
        </button>
      )}
    </div>
  )

  // ── STEP: CONFIG ──────────────────────────────────────────────────────────
  if (step === 'config') return (
    <>
      {LightboxOverlay}
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ fontSize: '20px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
        Creative Studio
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
        ATLAS gera o carrossel completo com o DNA do cliente aplicado automaticamente
      </p>

      {/* DNA Preview */}
      {dna && dna.visual_style && (
        <div style={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '10px', padding: '12px 14px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {dna.primary_color && (
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: dna.primary_color, flexShrink: 0 }} />
          )}
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            DNA: <strong style={{ color: 'var(--color-text-primary)' }}>{dna.tone}</strong> · {dna.visual_style} · {dna.target_audience || 'público geral'}
          </span>
          <a href={`/clients/${clientId}?tab=dna`} style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>Editar DNA →</a>
        </div>
      )}

      {/* Template selector */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: '8px' }}>
          Estilo do carrossel
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {([
            { id: 'minimalista', label: 'Minimalista', desc: 'Imagem cinematográfica + título bold' },
            { id: 'profile', label: 'Profile / Twitter', desc: 'Texto + thumbnail, estilo notícia' },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTemplate(t.id)}
              style={{
                padding: '12px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                background: template === t.id ? '#fef3c7' : 'var(--color-background-primary)',
                border: template === t.id ? '1px solid #fcd34d' : '0.5px solid var(--color-border-tertiary)',
              }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: template === t.id ? '#b45309' : 'var(--color-text-primary)', marginBottom: '2px' }}>{t.label}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Format + Slides */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1.25rem' }}>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: '8px' }}>Formato</label>
          <select value={format} onChange={e => setFormat(e.target.value as Format)}
            style={{ width: '100%', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: 'var(--color-text-primary)' }}>
            <optgroup label="📸 Instagram">
              <option value="ig_feed_portrait">Feed Portrait 4:5 — 1080×1350 (recomendado)</option>
              <option value="ig_feed_square">Feed Square 1:1 — 1080×1080</option>
              <option value="ig_stories">Stories / Reels 9:16 — 1080×1920</option>
            </optgroup>
            <optgroup label="📘 Facebook">
              <option value="fb_feed">Feed 1:1 — 1080×1080</option>
              <option value="fb_stories">Stories 9:16 — 1080×1920</option>
              <option value="fb_ad">Anuncio 1.91:1 — 1200×628</option>
            </optgroup>
            <optgroup label="🎵 TikTok">
              <option value="tiktok">Post / Video 9:16 — 1080×1920</option>
            </optgroup>
            <optgroup label="▶️ YouTube">
              <option value="yt_thumbnail">Thumbnail 16:9 — 1280×720</option>
            </optgroup>
            <optgroup label="💼 LinkedIn">
              <option value="linkedin_post">Post 1.91:1 — 1200×627</option>
            </optgroup>
            <optgroup label="✕ Twitter / X">
              <option value="twitter_post">Post 16:9 — 1600×900</option>
            </optgroup>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: '8px' }}>Número de slides</label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[3,4,5,6,7,8,10].map(n => (
              <button key={n} onClick={() => setSlideCount(n)}
                style={{ width: '36px', height: '36px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
                  background: slideCount === n ? '#fef3c7' : 'var(--color-background-primary)',
                  border: slideCount === n ? '1px solid #fcd34d' : '0.5px solid var(--color-border-tertiary)',
                  color: slideCount === n ? '#b45309' : 'var(--color-text-primary)',
                  fontWeight: slideCount === n ? 700 : 400 }}>
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Prompt */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: '8px' }}>
          Sobre o que é o carrossel? *
        </label>
        <textarea value={userPrompt} onChange={e => setUserPrompt(e.target.value)}
          placeholder="Ex: 5 motivos para usar IA no seu negócio / Erro que está matando suas vendas / Como dobrar seu faturamento em 3 meses..."
          rows={3}
          style={{ width: '100%', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: 'var(--color-text-primary)', resize: 'vertical' }} />
      </div>

      {/* Direcionamento de estilo (opcional) */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: '8px' }}>
          Direcionamento de imagem (opcional)
        </label>
        <input value={customStyle} onChange={e => setCustomStyle(e.target.value)}
          placeholder="Ex: pessoas realistas, tons neutros, fundo branco, close no produto..."
          style={{ width: '100%', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: 'var(--color-text-primary)' }} />
      </div>

      {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '1rem' }}>{error}</p>}

      <button onClick={generate} disabled={!userPrompt.trim()}
        style={{ width: '100%', background: '#f59e0b', color: '#000', fontWeight: 700, padding: '14px', borderRadius: '10px', fontSize: '15px', border: 'none', cursor: 'pointer', opacity: !userPrompt.trim() ? 0.4 : 1 }}>
        ★ Gerar com ATLAS
      </button>

      {/* Galeria de carrosséis anteriores — Bloco 8 */}
      {pastAssets.length > 0 && (
        <div style={{ marginTop: '2.5rem' }}>
          <p style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>
            Carrosséis anteriores
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
            {pastAssets.map(asset => (
              <div key={asset.id} style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)' }}>
                {/* Clickable image for lightbox */}
                <div onClick={() => openLightboxFromAsset(asset)} style={{ cursor: 'zoom-in' }}>
                  {asset.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset.image_url} alt={asset.prompt?.slice(0, 40)}
                      style={{ width: '100%', aspectRatio: '4/5', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '4/5', background: 'var(--color-background-secondary)' }} />
                  )}
                </div>

                {/* Slide count badge */}
                {asset.slide_count > 1 && (
                  <div style={{ position: 'absolute', top: '6px', left: '6px', background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '10px' }}>
                    {asset.slide_count} slides
                  </div>
                )}

                {/* Delete button */}
                {canDelete && (
                  <button
                    onClick={() => deleteAsset(asset.id)}
                    disabled={deletingId === asset.id}
                    title="Remover"
                    style={{ position: 'absolute', top: '6px', right: '6px', width: '24px', height: '24px', borderRadius: '50%', border: 'none', background: 'rgba(239,68,68,0.85)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {deletingId === asset.id ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={10} />}
                  </button>
                )}

                {/* Hover overlay */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 30%, rgba(0,0,0,0.85))', padding: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '4px', pointerEvents: 'none' }}>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {asset.prompt}
                  </p>
                  <div style={{ display: 'flex', gap: '4px', pointerEvents: 'all' }}>
                    <button onClick={() => copyPrompt(asset)}
                      title="Copiar prompt"
                      style={{ flex: 1, fontSize: '10px', padding: '4px', borderRadius: '5px', border: '0.5px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                      <Copy size={9} />
                      {copiedId === asset.id ? '✓' : 'Prompt'}
                    </button>
                    <button onClick={() => reuseAsset(asset)}
                      title="Reusar este prompt"
                      style={{ flex: 1, fontSize: '10px', padding: '4px', borderRadius: '5px', border: '0.5px solid rgba(245,158,11,0.5)', background: 'rgba(245,158,11,0.2)', color: '#f59e0b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                      <RotateCcw size={9} />
                      Reusar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </>
  )

  // ── STEP: GENERATING ─────────────────────────────────────────────────────
  if (step === 'generating') {
    const phaseLabel = !genProgress || genProgress.phase === 'vera'
      ? 'VERA está escrevendo o copy...'
      : `ATLAS gerando slide ${genProgress.slide} de ${slideCount}...`

    const phaseSubLabel = !genProgress || genProgress.phase === 'vera'
      ? 'Em seguida ATLAS vai gerar as imagens'
      : 'Cada imagem leva ~15s · não feche esta janela'

    const pct = !genProgress || genProgress.phase === 'vera'
      ? 5
      : Math.round((genProgress.slide / slideCount) * 90) + 5

    return (
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '3rem 2rem', textAlign: 'center' }}>
        <Loader2 size={32} color="#f59e0b" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem' }} />
        <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
          {phaseLabel}
        </p>
        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
          {phaseSubLabel}
        </p>

        {/* Barra de progresso */}
        <div style={{ background: 'var(--color-background-secondary)', borderRadius: '99px', height: '4px', overflow: 'hidden', width: '100%', marginBottom: '10px' }}>
          <div style={{
            height: '100%', borderRadius: '99px', background: '#f59e0b',
            width: `${pct}%`, transition: 'width 1.2s ease',
          }} />
        </div>
        <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', opacity: 0.5 }}>
          {pct}% concluído
        </p>
      </div>
    )
  }

  // ── STEP: PREVIEW ─────────────────────────────────────────────────────────
  const displayRatio = FORMAT_DISPLAY_RATIO[format] ?? '4/5'

  return (
    <>
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
          Carrossel gerado — {slides.length} slides
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {canEdit && (
            <button onClick={() => setShowEditor(!showEditor)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', background: showEditor ? '#fef3c7' : 'var(--color-background-secondary)', border: showEditor ? '0.5px solid #fcd34d' : '0.5px solid var(--color-border-tertiary)', color: showEditor ? '#b45309' : 'var(--color-text-primary)' }}>
              <Edit3 size={13} /> {showEditor ? 'Fechar editor' : 'Editar'}
            </button>
          )}
          <button onClick={() => { setStep('config'); setSlides([]); setAssetId(null) }}
            style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', color: 'var(--color-text-secondary)' }}>
            Novo carrossel
          </button>
          <button onClick={approve}
            style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', background: '#f59e0b', border: 'none', color: '#000' }}>
            Aprovar e salvar
          </button>
        </div>
      </div>

      {/* Slides preview em grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px', marginBottom: '1.5rem' }}>
        {slides.map((slide, i) => (
          <div key={slide.number}
            onClick={() => setSelectedSlide(i)}
            style={{ cursor: 'pointer', borderRadius: '10px', overflow: 'hidden', border: selectedSlide === i ? '2px solid #f59e0b' : '0.5px solid var(--color-border-tertiary)', position: 'relative' }}>

            {/* Image (click → lightbox; separate from card click) */}
            <div onClick={e => { e.stopPropagation(); openLightboxFromSlides(i) }} style={{ cursor: 'zoom-in' }}>
              {slide.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={slide.image_url} alt={slide.title}
                  style={{ width: '100%', aspectRatio: displayRatio, objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ width: '100%', aspectRatio: displayRatio, background: 'var(--color-background-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '20px' }}>🖼️</span>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '0 8px' }}>Imagem não gerada</span>
                </div>
              )}
            </div>

            {/* Regenerating spinner overlay */}
            {regeneratingSlides.has(slide.number) && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
                <Loader2 size={24} color="#f59e0b" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            )}

            {/* Slide number badge (top-left) */}
            <div style={{ position: 'absolute', top: '6px', left: '6px', background: 'rgba(0,0,0,0.6)', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', color: '#fff', pointerEvents: 'none' }}>
              {slide.number}
            </div>

            {/* Action buttons (top-right) — só admins/collaborators */}
            {canEdit && !regeneratingSlides.has(slide.number) && (
              <div style={{ position: 'absolute', top: '6px', right: '6px', display: 'flex', gap: '4px', zIndex: 4 }}>
                <button
                  onClick={e => { e.stopPropagation(); regenerateSlide(slide.number, slide.prompt) }}
                  title="Regenerar imagem com mesmo prompt"
                  style={{ width: '24px', height: '24px', borderRadius: '50%', border: 'none', background: 'rgba(245,158,11,0.9)', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RotateCcw size={10} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setSelectedSlide(i); setShowEditor(true) }}
                  title="Editar prompt da imagem"
                  style={{ width: '24px', height: '24px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.9)', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit3 size={10} />
                </button>
              </div>
            )}

            {/* Title gradient overlay */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', padding: '24px 8px 8px', pointerEvents: 'none' }}>
              <p style={{ fontSize: '11px', color: '#fff', fontWeight: 600, margin: 0, lineHeight: 1.2 }}>{slide.title}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Slide selecionado + editor inline */}
      {slides[selectedSlide] && (
        <SlideDetail
          slide={slides[selectedSlide]}
          assetId={assetId!}
          canEdit={canEdit}
          showEditor={showEditor}
          displayRatio={displayRatio}
          slideTotal={slides.length}
          isRegenerating={regeneratingSlides.has(slides[selectedSlide].number)}
          onRegenerate={regenerateSlide}
          onUpdate={(updated) => {
            const newSlides = [...slides]
            newSlides[selectedSlide] = updated
            setSlides(newSlides)
          }}
        />
      )}

      {/* Caption */}
      {caption && (
        <div style={{ marginTop: '1.5rem', background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Legenda gerada</span>
            <button onClick={() => navigator.clipboard.writeText(caption)}
              style={{ fontSize: '11px', color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Copiar
            </button>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{caption}</p>
        </div>
      )}
    </div>
    {LightboxOverlay}
    </>
  )
}

// ── SUB-COMPONENTE: SlideDetail + Editor ─────────────────────────────────────
function SlideDetail({ slide, assetId, canEdit, showEditor, displayRatio, slideTotal, onUpdate, onRegenerate, isRegenerating }: {
  slide: Slide
  assetId: string
  canEdit: boolean
  showEditor: boolean
  displayRatio: string
  slideTotal: number
  onUpdate: (updated: Slide) => void
  onRegenerate: (slideNumber: number, prompt: string) => Promise<void>
  isRegenerating: boolean
}) {
  const [instruction, setInstruction] = useState('')
  const [isRefining, setIsRefining] = useState(false)
  const [regenImage, setRegenImage] = useState(false)

  // ── Prompt de imagem editável ─────────────────────────────────────────────
  const [editingImagePrompt, setEditingImagePrompt] = useState(false)
  const [imagePrompt, setImagePrompt] = useState(slide.prompt ?? '')
  const [regenCredits, setRegenCredits] = useState<number | null>(null)

  // Sync prompt when slide changes
  useEffect(() => {
    setImagePrompt(slide.prompt ?? '')
    setEditingImagePrompt(false)
    setRegenCredits(null)
  }, [slide.number, slide.prompt])

  async function refine() {
    if (!instruction.trim()) return
    setIsRefining(true)
    const res = await fetch('/api/agents/atlas/refine-slide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetId, slideNumber: slide.number, instruction, regenerateImage: regenImage }),
    })
    const data = await res.json()
    if (data.success) {
      onUpdate({ ...slide, ...data.slide })
      setInstruction('')
    }
    setIsRefining(false)
  }

  return (
    <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '12px', padding: '1.25rem' }}>
      <div style={{ display: 'flex', gap: '20px' }}>

        {/* ── Slide canvas: imagem + texto sobrepostos (Design System aplicado) ── */}
        <div style={{
          position: 'relative',
          width: '200px',
          aspectRatio: displayRatio,
          borderRadius: '10px',
          overflow: 'hidden',
          background: '#0C0C0E',
          flexShrink: 0,
        }}>
          {/* Background image */}
          {slide.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={slide.image_url} alt=""
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
          {/* Scrim — mesma constante do CreativeRenderer */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1,
            background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 55%, transparent 100%)',
          }} />
          {/* Text overlay — Design System tokens */}
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: '14px',
            padding: '0 12px', zIndex: 2,
            display: 'flex', flexDirection: 'column', gap: '5px',
          }}>
            {/* Slide chip */}
            <span style={{
              alignSelf: 'flex-start', fontSize: '9px', fontWeight: 700,
              padding: '2px 8px', borderRadius: '99px',
              background: '#F59E0B', color: '#0C0C0E',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {slide.number}/{slideTotal}
            </span>
            {/* Título — DM Sans Bold */}
            <p style={{
              fontSize: '14px', fontWeight: 700, lineHeight: 1.25,
              color: '#F0F0F5', margin: 0, fontFamily: "'DM Sans', sans-serif",
            }}>
              {slide.title}
            </p>
            {/* Subtítulo — Inter Regular */}
            {slide.subtitle && (
              <p style={{
                fontSize: '10px', lineHeight: 1.4,
                color: 'rgba(240,240,245,0.78)', margin: 0,
                fontFamily: "'Inter', sans-serif",
              }}>
                {slide.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* ── Metadata + controls ── */}
        <div style={{ flex: 1, paddingTop: '4px' }}>
          <p style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-secondary)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Slide {slide.number}
          </p>
          <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 4px', lineHeight: 1.3, fontFamily: "'DM Sans', sans-serif" }}>
            {slide.title}
          </p>
          {slide.subtitle && (
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 14px', lineHeight: 1.5 }}>
              {slide.subtitle}
            </p>
          )}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {slide.image_url && (
              <a href={slide.image_url} download={`slide-${slide.number}.png`}
                style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textDecoration: 'none', padding: '5px 10px', borderRadius: '6px', border: '0.5px solid var(--color-border-tertiary)' }}>
                Download
              </a>
            )}
            {canEdit && (
              <button onClick={() => navigator.clipboard.writeText(slide.prompt)}
                style={{ fontSize: '11px', color: 'var(--color-text-secondary)', background: 'none', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer' }}>
                Copiar prompt
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => setEditingImagePrompt(p => !p)}
                style={{ fontSize: '11px', color: editingImagePrompt ? '#f59e0b' : 'var(--color-text-secondary)', background: 'none', border: `0.5px solid ${editingImagePrompt ? '#f59e0b' : 'var(--color-border-tertiary)'}`, borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Edit3 size={10} /> Editar Prompt
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Seção: Editar Prompt de Imagem */}
      {canEdit && editingImagePrompt && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
          <p style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>
            Prompt de Imagem
          </p>
          <textarea
            value={imagePrompt}
            onChange={e => setImagePrompt(e.target.value)}
            rows={4}
            style={{ width: '100%', background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: 'var(--color-text-primary)', resize: 'vertical', lineHeight: 1.5, fontFamily: "'Inter', sans-serif", boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            <button
              onClick={async () => {
                if (!imagePrompt.trim()) return
                await onRegenerate(slide.number, imagePrompt.trim())
                setEditingImagePrompt(false)
              }}
              disabled={!imagePrompt.trim() || isRegenerating}
              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: '#f59e0b', border: 'none', color: '#000', opacity: !imagePrompt.trim() || isRegenerating ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isRegenerating ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <RotateCcw size={12} />}
              {isRegenerating ? 'Gerando...' : 'Regenerar com este prompt'}
            </button>
            {regenCredits !== null && (
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                ✓ {regenCredits} créditos restantes
              </span>
            )}
          </div>
        </div>
      )}

      {/* Editor inline — só admin/collaborator */}
      {canEdit && showEditor && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
          <p style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>
            Refinar com IA
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input value={instruction} onChange={e => setInstruction(e.target.value)}
              placeholder="Ex: deixe mais curto, adicione dado estatístico, tom mais urgente..."
              style={{ flex: 1, background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: 'var(--color-text-primary)' }} />
            <button onClick={refine} disabled={!instruction.trim() || isRefining}
              style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: '#f59e0b', border: 'none', color: '#000', opacity: !instruction.trim() || isRefining ? 0.5 : 1 }}>
              {isRefining ? '...' : 'Refinar'}
            </button>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '12px', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={regenImage} onChange={e => setRegenImage(e.target.checked)} />
            Regenerar imagem também
          </label>
        </div>
      )}
    </div>
  )
}
