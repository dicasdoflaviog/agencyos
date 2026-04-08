'use client'

import { useState, useRef } from 'react'
import { Sparkles, Download, Loader2, ImageIcon, RefreshCw, LayoutGrid, Upload, X, Eye, Zap, Check, Trash2 } from 'lucide-react'
import Image from 'next/image'

type CreativeFormat = 'feed' | 'stories' | 'banner' | 'thumbnail' | 'portrait' | 'carousel'
// legado — mantido para compatibilidade com assets existentes
type LegacyCreativeType = 'post_feed' | 'stories' | 'banner' | 'thumbnail' | 'portrait' | 'carrossel'
type StyleType = 'fotorrealista' | 'ilustracao' | 'minimalista' | 'bold' | 'cinematografico'

export interface CreativeAsset {
  id: string
  image_url: string
  format?: string
  type?: string          // legado
  style?: string
  status?: 'pending' | 'approved' | 'rejected'
  prompt: string
  created_at: string
}

interface CreativeStudioProps {
  clientId: string
  clientName: string
  initialAssets?: CreativeAsset[]
}

const FORMATS: { value: CreativeFormat; label: string; aspect: string }[] = [
  { value: 'feed',      label: 'Feed',       aspect: '1:1'  },
  { value: 'stories',   label: 'Stories',    aspect: '9:16' },
  { value: 'banner',    label: 'Banner',     aspect: '16:9' },
  { value: 'thumbnail', label: 'Thumbnail',  aspect: '16:9' },
  { value: 'portrait',  label: 'Retrato',    aspect: '9:16' },
  { value: 'carousel',  label: 'Carrossel',  aspect: '1:1'  },
]

const STYLES: { value: StyleType; label: string }[] = [
  { value: 'fotorrealista',  label: 'Fotorrealista' },
  { value: 'ilustracao',     label: 'Ilustração' },
  { value: 'minimalista',    label: 'Minimalista' },
  { value: 'bold',           label: 'Bold / Gráfico' },
  { value: 'cinematografico',label: 'Cinematográfico' },
]

const QUICK_PROMPTS = [
  'Produto em estúdio com fundo neutro e iluminação profissional',
  'Lifestyle com pessoa usando o produto em ambiente natural',
  'Criativo bold com cores vibrantes e tipografia de impacto',
  'Flat lay minimalista com elementos da marca',
]

export function CreativeStudio({ clientId, clientName, initialAssets = [] }: CreativeStudioProps) {
  const [prompt, setPrompt]                       = useState('')
  const [format, setFormat]                       = useState<CreativeFormat>('feed')
  const [style, setStyle]                         = useState<StyleType>('fotorrealista')
  const [slideCount, setSlideCount]               = useState(5)
  const [isGenerating, setIsGenerating]           = useState(false)
  const [isApproving, setIsApproving]             = useState(false)
  const [generateError, setGenerateError]         = useState<string | null>(null)
  const [assets, setAssets]                       = useState<CreativeAsset[]>(initialAssets)
  // pendingAsset: recém-gerado, ainda aguardando aprovação
  const [pendingAsset, setPendingAsset]           = useState<CreativeAsset | null>(null)
  const [selectedAsset, setSelectedAsset]         = useState<CreativeAsset | null>(null)

  // Reference image
  const fileRef                                   = useRef<HTMLInputElement>(null)
  const [refImage, setRefImage]                   = useState<string | null>(null)
  const [refAnalysis, setRefAnalysis]             = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing]             = useState(false)

  async function handleRefUpload(file: File) {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string
      setRefImage(dataUrl)
      setRefAnalysis(null)
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
    setGenerateError(null)
    setPendingAsset(null)
    setSelectedAsset(null)
    try {
      let enrichedPrompt = prompt
      if (format === 'carousel') {
        enrichedPrompt = `[CARROSSEL INSTAGRAM — ${slideCount} SLIDES] ${enrichedPrompt}. Slide 1 (capa): design atrativo e impactante. Slides 2-${slideCount - 1}: conteúdo progressivo. Slide ${slideCount}: CTA claro. Consistência visual em todos os slides.`
      }
      if (refAnalysis) {
        enrichedPrompt = `${enrichedPrompt}\n\n[REFERÊNCIA VISUAL ANALISADA] ${refAnalysis}`
      }

      const endpoint = refImage ? '/api/agents/atlas/generate-v2' : '/api/agents/atlas/generate'
      const body: Record<string, unknown> = {
        prompt: enrichedPrompt,
        format,
        style,
        client_id: clientId,
      }
      if (refImage) body.reference_images = [refImage]

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errData = await res.json() as { error?: string }
        throw new Error(errData.error ?? `HTTP ${res.status}`)
      }

      const data = await res.json() as { asset?: CreativeAsset; url?: string }
      if (data.asset) {
        // Muda para estado pending — não vai para galeria até ser aprovado
        setPendingAsset(data.asset)
      }
    } catch (err) {
      console.error('[ATLAS]', err)
      setGenerateError(err instanceof Error ? err.message : 'Erro ao gerar criativo. Tente novamente.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApprove = async () => {
    if (!pendingAsset || isApproving) return
    setIsApproving(true)
    try {
      const res = await fetch('/api/agents/atlas/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: pendingAsset.id, action: 'approved' }),
      })
      if (res.ok) {
        const approved = { ...pendingAsset, status: 'approved' as const }
        setAssets(prev => [approved, ...prev])
        setSelectedAsset(approved)
        setPendingAsset(null)
      }
    } catch (err) {
      console.error('[ATLAS approve]', err)
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!pendingAsset || isApproving) return
    setIsApproving(true)
    try {
      await fetch('/api/agents/atlas/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: pendingAsset.id, action: 'rejected' }),
      })
    } catch { /* non-fatal */ }
    finally {
      setIsApproving(false)
      setPendingAsset(null)
    }
  }

  const handleRegenerate = () => {
    if (pendingAsset) {
      setPrompt(pendingAsset.prompt)
      setPendingAsset(null)
    }
    void generate()
  }

  // O asset exibido no preview: pending tem prioridade, depois selecionado da galeria
  const previewAsset = pendingAsset ?? selectedAsset

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

          {/* Format selector */}
          <div>
            <p className="text-xs text-[var(--color-text-secondary)] mb-2">Formato</p>
            <div className="flex flex-wrap gap-2">
              {FORMATS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFormat(f.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    format === f.value
                      ? 'bg-[var(--color-accent)] text-[var(--color-text-inverse)]'
                      : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {f.value === 'carousel' && <LayoutGrid size={11} />}
                  {f.label} <span className="opacity-60">{f.aspect}</span>
                </button>
              ))}
            </div>

            {/* Slide count — only when carousel */}
            {format === 'carousel' && (
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

          {generateError && (
            <p className="mt-2 text-xs text-[var(--color-error)] bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-lg px-3 py-2">
              ⚠️ {generateError}
            </p>
          )}
        </div>

        {/* Recent Gallery — apenas assets aprovados */}
        {assets.length > 0 && (
          <div>
            <p className="text-xs text-[var(--color-text-secondary)] mb-2">Aprovados</p>
            <div className="grid grid-cols-3 gap-2">
              {assets.slice(0, 9).map(a => (
                <div key={a.id} className="group relative aspect-square rounded-lg overflow-hidden">
                  <button
                    onClick={() => { setPendingAsset(null); setSelectedAsset(a) }}
                    className={`absolute inset-0 border-2 rounded-lg transition-all z-10 ${
                      selectedAsset?.id === a.id && !pendingAsset ? 'border-[var(--color-accent)]' : 'border-transparent'
                    }`}
                  />
                  <Image src={a.image_url} alt={a.format ?? a.type ?? 'criativo'} fill className="object-cover" unoptimized />
                  <div className="absolute inset-0 flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/60 to-transparent z-20">
                    <button
                      onClick={(e) => { e.stopPropagation(); setPrompt(a.prompt); setPendingAsset(null); setSelectedAsset(null) }}
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
        {previewAsset ? (
          <div className="flex flex-col h-full">
            {/* Badge de status */}
            {pendingAsset && (
              <div className="px-4 pt-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-[11px] font-medium text-amber-400">
                  <Eye size={11} /> Aguardando aprovação
                </span>
              </div>
            )}

            <div className="relative flex-1 min-h-[400px] bg-[var(--color-bg-base)] flex items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewAsset.image_url}
                alt="Creative"
                className="max-h-[400px] w-full object-contain rounded-lg"
              />
              {(previewAsset.format === 'carousel' || previewAsset.type === 'carrossel') && (
                <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] text-white backdrop-blur-sm">
                  <LayoutGrid size={10} /> Capa do carrossel
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[var(--color-border-subtle)] space-y-3">
              <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2">{previewAsset.prompt}</p>

              {/* Botões de aprovação — só para assets pendentes */}
              {pendingAsset ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleApprove}
                    disabled={isApproving}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 py-2 text-xs font-semibold hover:bg-emerald-500/25 disabled:opacity-50 transition-all"
                  >
                    {isApproving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    Aprovar
                  </button>
                  <button
                    onClick={() => { void handleRegenerate() }}
                    disabled={isGenerating || isApproving}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] px-4 py-2 text-xs font-medium hover:text-[var(--color-text-primary)] disabled:opacity-50 transition-all"
                  >
                    <RefreshCw size={13} /> Regenerar
                  </button>
                  <button
                    onClick={() => { void handleReject() }}
                    disabled={isApproving}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 text-xs font-medium hover:bg-red-500/20 disabled:opacity-50 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ) : (
                /* Botões padrão — asset aprovado da galeria */
                <div className="flex gap-2">
                  <a
                    href={selectedAsset?.image_url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] py-2 text-xs font-medium hover:bg-[var(--color-bg-overlay)] transition-colors"
                  >
                    <Download size={14} /> Download
                  </a>
                  <button
                    onClick={() => { if (selectedAsset) { setPrompt(selectedAsset.prompt); setSelectedAsset(null) } }}
                    className="flex items-center justify-center gap-2 rounded-lg bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] px-4 py-2 text-xs font-medium hover:text-[var(--color-text-primary)] transition-colors"
                  >
                    <RefreshCw size={14} /> Iterar
                  </button>
                </div>
              )}
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
