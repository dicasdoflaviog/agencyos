'use client'

import { useState, useRef } from 'react'
import { Sparkles, Download, Loader2, ImageIcon, RefreshCw, LayoutGrid, Upload, X, Eye, Zap } from 'lucide-react'
import Image from 'next/image'

type CreativeType = 'post_feed' | 'stories' | 'banner' | 'thumbnail' | 'portrait' | 'carrossel'
type StyleType = 'photorealistic' | 'illustration' | 'minimal' | 'bold_graphic' | 'cinematic'

export interface CreativeAsset {
  id: string
  image_url: string
  type: string
  prompt: string
  created_at: string
}

interface CreativeStudioProps {
  clientId: string
  clientName: string
  initialAssets?: CreativeAsset[]
}

const TYPES: { value: CreativeType; label: string; aspect: string }[] = [
  { value: 'post_feed',  label: 'Post Feed',  aspect: '1:1'  },
  { value: 'stories',    label: 'Stories',    aspect: '9:16' },
  { value: 'banner',     label: 'Banner',     aspect: '16:9' },
  { value: 'thumbnail',  label: 'Thumbnail',  aspect: '16:9' },
  { value: 'portrait',   label: 'Retrato',    aspect: '9:16' },
  { value: 'carrossel',  label: 'Carrossel',  aspect: '1:1'  },
]

const STYLES: { value: StyleType; label: string }[] = [
  { value: 'photorealistic', label: 'Fotorrealista' },
  { value: 'illustration',   label: 'Ilustração' },
  { value: 'minimal',        label: 'Minimalista' },
  { value: 'bold_graphic',   label: 'Bold / Gráfico' },
  { value: 'cinematic',      label: 'Cinematográfico' },
]

const QUICK_PROMPTS = [
  'Produto em estúdio com fundo neutro e iluminação profissional',
  'Lifestyle com pessoa usando o produto em ambiente natural',
  'Criativo bold com cores vibrantes e tipografia de impacto',
  'Flat lay minimalista com elementos da marca',
]

export function CreativeStudio({ clientId, clientName, initialAssets = [] }: CreativeStudioProps) {
  const [prompt, setPrompt]               = useState('')
  const [type, setType]                   = useState<CreativeType>('post_feed')
  const [style, setStyle]                 = useState<StyleType>('photorealistic')
  const [slideCount, setSlideCount]       = useState(5)
  const [isGenerating, setIsGenerating]   = useState(false)
  const [assets, setAssets]               = useState<CreativeAsset[]>(initialAssets)
  const [selectedAsset, setSelectedAsset] = useState<CreativeAsset | null>(null)

  // Reference image
  const fileRef                           = useRef<HTMLInputElement>(null)
  const [refImage, setRefImage]           = useState<string | null>(null)   // base64 data URL
  const [refAnalysis, setRefAnalysis]     = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing]     = useState(false)

  async function handleRefUpload(file: File) {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string
      setRefImage(dataUrl)
      setRefAnalysis(null)
      // Auto-analyze
      setIsAnalyzing(true)
      try {
        const res = await fetch('/api/agents/oracle/analyze-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: dataUrl }),
        })
        const data = await res.json() as { analysis?: string }
        if (data.analysis) setRefAnalysis(data.analysis)
      } catch { /* non-fatal */ }
      finally { setIsAnalyzing(false) }
    }
    reader.readAsDataURL(file)
  }

  function clearRef() {
    setRefImage(null)
    setRefAnalysis(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const generate = async () => {
    if (!prompt.trim() || isGenerating) return
    setIsGenerating(true)
    try {
      // Build enriched prompt
      let enrichedPrompt = prompt
      if (type === 'carrossel') {
        enrichedPrompt = `[CARROSSEL INSTAGRAM — ${slideCount} SLIDES] ${enrichedPrompt}. Slide 1 (capa): design atrativo e impactante. Slides 2-${slideCount - 1}: conteúdo progressivo. Slide ${slideCount}: CTA claro. Consistência visual em todos os slides.`
      }
      if (refAnalysis) {
        enrichedPrompt = `${enrichedPrompt}\n\n[REFERÊNCIA VISUAL ANALISADA] ${refAnalysis}`
      }

      const endpoint = refImage ? '/api/agents/atlas/generate-v2' : '/api/agents/atlas/generate'
      const body: Record<string, unknown> = { prompt: enrichedPrompt, type, style, client_id: clientId }
      if (refImage) body.reference_images = [refImage]

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json() as { asset?: CreativeAsset; url?: string }
      if (data.asset) {
        setAssets(prev => [data.asset!, ...prev])
        setSelectedAsset(data.asset!)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Generator Panel */}
      <div className="space-y-4">
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[var(--color-accent)]" />
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">ATLAS Creative Studio</h3>
            <span className="text-xs text-[var(--color-text-secondary)]">· {clientName}</span>
          </div>

          {/* Type selector */}
          <div>
            <p className="text-xs text-[var(--color-text-secondary)] mb-2">Formato</p>
            <div className="flex flex-wrap gap-2">
              {TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    type === t.value
                      ? 'bg-[var(--color-accent)] text-[var(--color-text-inverse)]'
                      : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {t.value === 'carrossel' && <LayoutGrid size={11} />}
                  {t.label} <span className="opacity-60">{t.aspect}</span>
                </button>
              ))}
            </div>

            {/* Slide count — only when carrossel */}
            {type === 'carrossel' && (
              <div className="mt-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[var(--color-text-secondary)]">Número de slides</span>
                  <span className="text-sm font-bold text-[var(--color-accent)]">{slideCount}</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={10}
                  value={slideCount}
                  onChange={e => setSlideCount(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-[10px] text-[var(--color-text-muted)] mt-1">
                  <span>3</span><span>10</span>
                </div>
              </div>
            )}
          </div>

          {/* Style selector */}
          <div>
            <p className="text-xs text-[var(--color-text-secondary)] mb-2">Estilo</p>
            <div className="flex flex-wrap gap-2">
              {STYLES.map(s => (
                <button
                  key={s.value}
                  onClick={() => setStyle(s.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    style === s.value
                      ? 'bg-[var(--color-bg-elevated)] border-[var(--color-accent)]/40 text-[var(--color-accent)]'
                      : 'bg-[var(--color-bg-elevated)] border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt */}
          <div>
            <p className="text-xs text-[var(--color-text-secondary)] mb-2">Descreva o criativo</p>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Ex: Produto de skincare em fundo bege, iluminação suave, estilo editorial..."
              rows={3}
              className="w-full resize-none rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[#52525B] focus:outline-none focus:border-[var(--color-accent)]/40 transition-colors"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {QUICK_PROMPTS.map(q => (
                <button
                  key={q}
                  onClick={() => setPrompt(q)}
                  className="text-[10px] px-2 py-1 rounded bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors truncate max-w-[180px]"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Reference image upload */}
          <div>
            <p className="text-xs text-[var(--color-text-secondary)] mb-2">Imagem de referência <span className="text-[var(--color-text-muted)]">(opcional)</span></p>

            {refImage ? (
              <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 space-y-2">
                <div className="flex items-start gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={refImage} alt="Referência" className="h-16 w-16 rounded-lg object-cover shrink-0 border border-[var(--color-border-subtle)]" />
                  <div className="flex-1 min-w-0">
                    {isAnalyzing ? (
                      <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                        <Loader2 size={12} className="animate-spin text-amber-400" />
                        @ORACLE analisando estilo, cores e composição...
                      </div>
                    ) : refAnalysis ? (
                      <p className="text-xs text-[var(--color-text-secondary)] line-clamp-3">{refAnalysis}</p>
                    ) : (
                      <p className="text-xs text-[var(--color-text-muted)]">Referência carregada</p>
                    )}
                  </div>
                  <button onClick={clearRef} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors shrink-0">
                    <X size={14} />
                  </button>
                </div>
                {refAnalysis && (
                  <p className="text-[10px] text-amber-400/70 flex items-center gap-1">
                    <Zap size={9} /> Estilo extraído será aplicado na geração
                  </p>
                )}
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--color-border-subtle)] py-3 text-xs text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-secondary)] transition-all"
              >
                <Upload size={14} /> Enviar imagem de referência
              </button>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleRefUpload(f) }}
            />
          </div>

          <button
            onClick={generate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] text-[var(--color-text-inverse)] py-2.5 text-sm font-semibold hover:bg-[var(--color-accent)]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {isGenerating ? (
              <><Loader2 size={16} className="animate-spin" /> Gerando criativo...</>
            ) : (
              <><Sparkles size={16} /> Gerar com ATLAS</>
            )}
          </button>
        </div>

        {/* Recent Gallery */}
        {assets.length > 0 && (
          <div>
            <p className="text-xs text-[var(--color-text-secondary)] mb-2">Gerados recentemente</p>
            <div className="grid grid-cols-3 gap-2">
              {assets.slice(0, 9).map(a => (
                <div key={a.id} className="group relative aspect-square rounded-lg overflow-hidden">
                  <button
                    onClick={() => setSelectedAsset(a)}
                    className={`absolute inset-0 border-2 rounded-lg transition-all z-10 ${
                      selectedAsset?.id === a.id ? 'border-[var(--color-accent)]' : 'border-transparent'
                    }`}
                  />
                  <Image src={a.image_url} alt={a.type} fill className="object-cover" unoptimized />
                  {/* Iterar overlay */}
                  <div className="absolute inset-0 flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/60 to-transparent z-20">
                    <button
                      onClick={(e) => { e.stopPropagation(); setPrompt(a.prompt); setSelectedAsset(null) }}
                      className="flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-zinc-900 hover:bg-white transition-colors"
                    >
                      <RefreshCw size={9} /> Iterar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Preview Panel */}
      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden">
        {selectedAsset ? (
          <div className="flex flex-col h-full">
            <div className="relative flex-1 min-h-[400px] bg-[var(--color-bg-base)]">
              <Image
                src={selectedAsset.image_url}
                alt="Creative"
                fill
                className="object-contain p-4"
                unoptimized
              />
              {selectedAsset.type === 'carrossel' && (
                <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] text-white backdrop-blur-sm">
                  <LayoutGrid size={10} /> Capa do carrossel
                </div>
              )}
            </div>
            <div className="p-4 border-t border-[var(--color-border-subtle)] space-y-2">
              <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2">{selectedAsset.prompt}</p>
              <div className="flex gap-2">
                <a
                  href={selectedAsset.image_url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] py-2 text-xs font-medium hover:bg-[var(--color-bg-overlay)] transition-colors"
                >
                  <Download size={14} /> Download
                </a>
                <button
                  onClick={() => { setPrompt(selectedAsset.prompt); setSelectedAsset(null) }}
                  className="flex items-center justify-center gap-2 rounded-lg bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] px-4 py-2 text-xs font-medium hover:text-[var(--color-text-primary)] transition-colors"
                >
                  <RefreshCw size={14} /> Iterar
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-3">
            <div className="h-16 w-16 rounded-2xl bg-[var(--color-bg-elevated)] flex items-center justify-center">
              <ImageIcon size={32} className="text-[var(--color-text-muted)]" />
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">Seus criativos aparecem aqui</p>
            <p className="text-xs text-[var(--color-text-muted)]">Descreva e clique em Gerar</p>
          </div>
        )}
      </div>
    </div>
  )
}
