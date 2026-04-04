'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, Play, Download, Loader2, Volume2, StopCircle } from 'lucide-react'

interface Voice {
  id: string
  name: string
  lang: string
  description: string
}

interface AudioAsset {
  id: string
  text_content: string
  voice_id: string
  audio_url: string
  created_at: string
}

interface VoxStudioProps {
  clientId: string
  clientName: string
  initialAssets?: AudioAsset[]
}

const QUICK_TEXTS = [
  'Transforme seu negócio com soluções inteligentes. Entre em contato hoje.',
  'Produto de qualidade superior, feito para quem exige o melhor.',
  'Não perca essa oportunidade única. Acesse agora e garanta o seu.',
]

export function VoxStudio({ clientId, clientName, initialAssets = [] }: VoxStudioProps) {
  const [text, setText] = useState('')
  const [selectedVoice, setSelectedVoice] = useState('pNInz6obpgDQGcFmaJgB')
  const [voices, setVoices] = useState<Voice[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [assets, setAssets] = useState<AudioAsset[]>(initialAssets)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    fetch('/api/agents/vox/voices')
      .then(r => r.json())
      .then((v: Voice[]) => setVoices(v))
      .catch(() => {})
  }, [])

  const generate = async () => {
    if (!text.trim() || isGenerating) return
    setIsGenerating(true)
    try {
      const res = await fetch('/api/agents/vox/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice_id: selectedVoice, client_id: clientId }),
      })
      const data = await res.json() as { asset: AudioAsset }
      if (data.asset) setAssets(prev => [data.asset, ...prev])
    } catch { /* noop */ } finally {
      setIsGenerating(false)
    }
  }

  const togglePlay = (asset: AudioAsset) => {
    if (playingId === asset.id) {
      audioRef.current?.pause()
      setPlayingId(null)
    } else {
      if (audioRef.current) { audioRef.current.pause() }
      audioRef.current = new Audio(asset.audio_url)
      audioRef.current.play().catch(() => {})
      audioRef.current.onended = () => setPlayingId(null)
      setPlayingId(asset.id)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Generator */}
      <div className="bg-[#18181B] border border-white/[0.07] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Mic size={16} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#FAFAFA]">VOX</p>
            <p className="text-xs text-[#A1A1AA]">Narração com IA · {clientName}</p>
          </div>
        </div>

        {/* Voice selector */}
        <div>
          <p className="text-xs text-[#A1A1AA] mb-2">Voz</p>
          <div className="space-y-2">
            {voices.map(v => (
              <button key={v.id} onClick={() => setSelectedVoice(v.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${selectedVoice === v.id ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/[0.07] hover:border-white/20'}`}>
                <div className="flex items-center gap-2">
                  <Volume2 size={14} className={selectedVoice === v.id ? 'text-emerald-400' : 'text-[#A1A1AA]'} />
                  <span className={`text-sm font-medium ${selectedVoice === v.id ? 'text-emerald-400' : 'text-[#FAFAFA]'}`}>{v.name}</span>
                  <span className="text-xs text-[#52525B] ml-auto">{v.lang}</span>
                </div>
                <p className="text-xs text-[#71717A] mt-0.5 pl-6">{v.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Text input */}
        <div>
          <p className="text-xs text-[#A1A1AA] mb-2">Texto para narrar</p>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={4}
            placeholder="Cole aqui o texto que o VOX irá narrar..."
            className="w-full resize-none rounded-lg bg-[#09090B] border border-white/[0.07] px-3 py-2.5 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:outline-none focus:border-emerald-500/40 transition-colors" />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {QUICK_TEXTS.map(q => (
              <button key={q} onClick={() => setText(q)}
                className="text-[10px] px-2 py-1 rounded bg-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors truncate max-w-[200px]">
                {q}
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => { void generate() }} disabled={isGenerating || !text.trim()}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 text-white py-2.5 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
          {isGenerating
            ? <><Loader2 size={16} className="animate-spin" />Gerando narração...</>
            : <><Mic size={16} />Narrar com VOX</>}
        </button>
      </div>

      {/* Audio list */}
      <div className="space-y-3">
        <p className="text-xs text-[#A1A1AA]">Narrações geradas</p>
        {assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 bg-[#18181B] border border-white/[0.07] rounded-xl gap-3">
            <Volume2 size={32} className="text-[#3F3F46]" />
            <p className="text-sm text-[#52525B]">Suas narrações aparecem aqui</p>
          </div>
        ) : (
          assets.map(a => (
            <div key={a.id} className="bg-[#18181B] border border-white/[0.07] rounded-xl p-4">
              <p className="text-sm text-[#FAFAFA] line-clamp-2 mb-3">{a.text_content}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => togglePlay(a)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${playingId === a.id ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA]'}`}>
                  {playingId === a.id
                    ? <><StopCircle size={12} /> Pausar</>
                    : <><Play size={12} /> Ouvir</>}
                </button>
                <a href={a.audio_url} download
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] text-xs transition-colors">
                  <Download size={12} /> Download
                </a>
                <span className="text-xs text-[#52525B] ml-auto">
                  {new Date(a.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
