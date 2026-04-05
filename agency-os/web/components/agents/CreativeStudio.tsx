'use client'

import { useState } from 'react'
import { Sparkles, Download, Loader2, ImageIcon, RefreshCw } from 'lucide-react'
import Image from 'next/image'

type CreativeType = 'post_feed' | 'stories' | 'banner' | 'thumbnail' | 'portrait'
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
  { value: 'post_feed',  label: 'Post Feed',  aspect: '1:1' },
  { value: 'stories',    label: 'Stories',    aspect: '9:16' },
  { value: 'banner',     label: 'Banner',     aspect: '16:9' },
  { value: 'thumbnail',  label: 'Thumbnail',  aspect: '16:9' },
  { value: 'portrait',   label: 'Retrato',    aspect: '9:16' },
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
  const [prompt, setPrompt] = useState('')
  const [type, setType] = useState<CreativeType>('post_feed')
  const [style, setStyle] = useState<StyleType>('photorealistic')
  const [isGenerating, setIsGenerating] = useState(false)
  const [assets, setAssets] = useState<CreativeAsset[]>(initialAssets)
  const [selectedAsset, setSelectedAsset] = useState<CreativeAsset | null>(null)

  const generate = async () => {
    if (!prompt.trim() || isGenerating) return
    setIsGenerating(true)
    try {
      const res = await fetch('/api/agents/atlas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, type, style, client_id: clientId }),
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
        <div className="bg-[#18181B] border border-white/[0.07] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#F59E0B]" />
            <h3 className="text-sm font-semibold text-[#FAFAFA]">ATLAS Creative Studio</h3>
            <span className="text-xs text-[#A1A1AA]">· {clientName}</span>
          </div>

          {/* Type selector */}
          <div>
            <p className="text-xs text-[#A1A1AA] mb-2">Formato</p>
            <div className="flex flex-wrap gap-2">
              {TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${type === t.value ? 'bg-[#F59E0B] text-[#0A0A0A]' : 'bg-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA]'}`}
                >
                  {t.label} <span className="opacity-60">{t.aspect}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Style selector */}
          <div>
            <p className="text-xs text-[#A1A1AA] mb-2">Estilo</p>
            <div className="flex flex-wrap gap-2">
              {STYLES.map(s => (
                <button
                  key={s.value}
                  onClick={() => setStyle(s.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${style === s.value ? 'bg-[#27272A] border border-[#F59E0B]/40 text-[#F59E0B]' : 'bg-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] border border-transparent'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt */}
          <div>
            <p className="text-xs text-[#A1A1AA] mb-2">Descreva o criativo</p>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Ex: Produto de skincare em fundo bege, iluminação suave, estilo editorial..."
              rows={3}
              className="w-full resize-none rounded-lg bg-[#09090B] border border-white/[0.07] px-3 py-2.5 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:outline-none focus:border-[#F59E0B]/40 transition-colors"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {QUICK_PROMPTS.map(q => (
                <button
                  key={q}
                  onClick={() => setPrompt(q)}
                  className="text-[10px] px-2 py-1 rounded bg-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors truncate max-w-[180px]"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={generate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#F59E0B] text-[#0A0A0A] py-2.5 text-sm font-semibold hover:bg-[#F59E0B]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
            <p className="text-xs text-[#A1A1AA] mb-2">Gerados recentemente</p>
            <div className="grid grid-cols-3 gap-2">
              {assets.slice(0, 9).map(a => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAsset(a)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${selectedAsset?.id === a.id ? 'border-[#F59E0B]' : 'border-transparent hover:border-white/20'}`}
                >
                  <Image src={a.image_url} alt={a.type} fill className="object-cover" unoptimized />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Preview Panel */}
      <div className="bg-[#18181B] border border-white/[0.07] rounded-xl overflow-hidden">
        {selectedAsset ? (
          <div className="flex flex-col h-full">
            <div className="relative flex-1 min-h-[400px] bg-[#09090B]">
              <Image
                src={selectedAsset.image_url}
                alt="Creative"
                fill
                className="object-contain p-4"
                unoptimized
              />
            </div>
            <div className="p-4 border-t border-white/[0.07] space-y-2">
              <p className="text-xs text-[#A1A1AA] line-clamp-2">{selectedAsset.prompt}</p>
              <div className="flex gap-2">
                <a
                  href={selectedAsset.image_url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#27272A] text-[#FAFAFA] py-2 text-xs font-medium hover:bg-[#3F3F46] transition-colors"
                >
                  <Download size={14} /> Download
                </a>
                <button
                  onClick={() => { setPrompt(selectedAsset.prompt); setSelectedAsset(null) }}
                  className="flex items-center justify-center gap-2 rounded-lg bg-[#27272A] text-[#A1A1AA] px-3 py-2 text-xs hover:text-[#FAFAFA] transition-colors"
                >
                  <RefreshCw size={14} /> Reusar
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-3">
            <div className="h-16 w-16 rounded-2xl bg-[#27272A] flex items-center justify-center">
              <ImageIcon size={32} className="text-[#52525B]" />
            </div>
            <p className="text-sm text-[#A1A1AA]">Seus criativos aparecem aqui</p>
            <p className="text-xs text-[#52525B]">Descreva e clique em Gerar</p>
          </div>
        )}
      </div>
    </div>
  )
}
