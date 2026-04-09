'use client'
import { useState, useEffect } from 'react'
import { Loader2, Edit3, Copy, RotateCcw } from 'lucide-react'

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

  function copyPrompt(asset: PastAsset) {
    navigator.clipboard.writeText(asset.prompt)
    setCopiedId(asset.id)
    setTimeout(() => setCopiedId(null), 1500)
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

    // AbortController: 3 minutos máx (Flux.1 pode demorar ~30s/imagem em paralelo)
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

  // ── STEP: CONFIG ──────────────────────────────────────────────────────────
  if (step === 'config') return (
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
                {asset.image_url ? (
                  <img src={asset.image_url} alt={asset.prompt?.slice(0, 40)}
                    style={{ width: '100%', aspectRatio: '4/5', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ width: '100%', aspectRatio: '4/5', background: 'var(--color-background-secondary)' }} />
                )}

                {/* Slide count badge */}
                {asset.slide_count > 1 && (
                  <div style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '10px' }}>
                    {asset.slide_count} slides
                  </div>
                )}

                {/* Hover overlay */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 30%, rgba(0,0,0,0.85))', padding: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '4px' }}>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {asset.prompt}
                  </p>
                  <div style={{ display: 'flex', gap: '4px' }}>
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
  )

  // ── STEP: GENERATING ─────────────────────────────────────────────────────
  if (step === 'generating') return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
      <Loader2 size={32} color="#f59e0b" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
      <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '4px' }}>VERA está escrevendo o copy...</p>
      <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>ATLAS vai gerar as imagens em seguida</p>
      <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', opacity: 0.6 }}>
        Geração de imagens leva até 3 min · não feche esta janela
      </p>
    </div>
  )

  // ── STEP: PREVIEW ─────────────────────────────────────────────────────────
  const displayRatio = FORMAT_DISPLAY_RATIO[format] ?? '4/5'

  return (
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
          <div key={slide.number} onClick={() => setSelectedSlide(i)}
            style={{ cursor: 'pointer', borderRadius: '10px', overflow: 'hidden', border: selectedSlide === i ? '2px solid #f59e0b' : '0.5px solid var(--color-border-tertiary)', position: 'relative' }}>
            {slide.image_url ? (
              <img src={slide.image_url} alt={slide.title}
                style={{ width: '100%', aspectRatio: displayRatio, objectFit: 'cover', display: 'block' }} />
            ) : (
              <div style={{ width: '100%', aspectRatio: displayRatio, background: 'var(--color-background-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <span style={{ fontSize: '20px' }}>🖼️</span>
                <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '0 8px' }}>Imagem não gerada</span>
              </div>
            )}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', padding: '24px 8px 8px' }}>
              <p style={{ fontSize: '11px', color: '#fff', fontWeight: 600, margin: 0, lineHeight: 1.2 }}>{slide.title}</p>
            </div>
            <div style={{ position: 'absolute', top: '6px', left: '6px', background: 'rgba(0,0,0,0.6)', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', color: '#fff' }}>
              {slide.number}
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
  )
}

// ── SUB-COMPONENTE: SlideDetail + Editor ─────────────────────────────────────
function SlideDetail({ slide, assetId, canEdit, showEditor, onUpdate }: {
  slide: Slide
  assetId: string
  canEdit: boolean
  showEditor: boolean
  onUpdate: (updated: Slide) => void
}) {
  const [instruction, setInstruction] = useState('')
  const [isRefining, setIsRefining] = useState(false)
  const [regenImage, setRegenImage] = useState(false)

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
      <div style={{ display: 'flex', gap: '16px' }}>
        {slide.image_url && (
          <img src={slide.image_url} alt={slide.title}
            style={{ width: '120px', aspectRatio: '4/5', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />
        )}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>Slide {slide.number}</p>
          <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '4px' }}>{slide.title}</p>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>{slide.subtitle}</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <a href={slide.image_url} download={`slide-${slide.number}.png`}
              style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textDecoration: 'none', padding: '5px 10px', borderRadius: '6px', border: '0.5px solid var(--color-border-tertiary)' }}>
              Download
            </a>
            {canEdit && (
              <button onClick={() => navigator.clipboard.writeText(slide.prompt)}
                style={{ fontSize: '11px', color: 'var(--color-text-secondary)', background: 'none', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer' }}>
                Copiar prompt
              </button>
            )}
          </div>
        </div>
      </div>

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
