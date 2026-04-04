'use client'

import { useState, useEffect, useCallback } from 'react'
import { Video, Loader2, Play, Download, Film, Clock } from 'lucide-react'

type VideoFormat = 'reels' | 'tiktok' | 'shorts' | 'banner'
type JobStatus = 'pending' | 'processing' | 'done' | 'failed'

interface VideoJob {
  id: string
  format: string
  prompt: string
  status: JobStatus
  video_url: string | null
  duration_s: number
  created_at: string
  error_msg: string | null
}

interface VulcanStudioProps {
  clientId: string
  clientName: string
  initialJobs?: VideoJob[]
}

const FORMATS: { value: VideoFormat; label: string; ratio: string; icon: string }[] = [
  { value: 'reels',  label: 'Reels',  ratio: '9:16', icon: '📱' },
  { value: 'tiktok', label: 'TikTok', ratio: '9:16', icon: '🎵' },
  { value: 'shorts', label: 'Shorts', ratio: '9:16', icon: '▶️' },
  { value: 'banner', label: 'Banner', ratio: '16:9', icon: '🖥️' },
]

const DURATIONS = [8, 15, 30, 60]

export function VulcanStudio({ clientId, clientName, initialJobs = [] }: VulcanStudioProps) {
  const [prompt, setPrompt] = useState('')
  const [format, setFormat] = useState<VideoFormat>('reels')
  const [duration, setDuration] = useState(15)
  const [isGenerating, setIsGenerating] = useState(false)
  const [jobs, setJobs] = useState<VideoJob[]>(initialJobs)
  const [pollingIds, setPollingIds] = useState<Set<string>>(new Set())

  const pollJob = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/agents/vulcan/status/${jobId}`)
      const data = await res.json() as VideoJob
      setJobs(prev => prev.map(j => j.id === jobId ? data : j))
      if (data.status === 'done' || data.status === 'failed') {
        setPollingIds(prev => { const n = new Set(prev); n.delete(jobId); return n })
      }
    } catch { /* noop */ }
  }, [])

  useEffect(() => {
    const pending = jobs.filter(j => j.status === 'pending' || j.status === 'processing')
    pending.forEach(j => {
      if (!pollingIds.has(j.id)) {
        setPollingIds(prev => new Set([...prev, j.id]))
      }
    })
  }, [jobs, pollingIds])

  useEffect(() => {
    if (pollingIds.size === 0) return
    const interval = setInterval(() => {
      pollingIds.forEach(id => { void pollJob(id) })
    }, 10000)
    return () => clearInterval(interval)
  }, [pollingIds, pollJob])

  const generate = async () => {
    if (!prompt.trim() || isGenerating) return
    setIsGenerating(true)
    try {
      const res = await fetch('/api/agents/vulcan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, format, duration_s: duration, client_id: clientId }),
      })
      const data = await res.json() as { job_id: string; status: string }
      if (data.job_id) {
        const newJob: VideoJob = {
          id: data.job_id,
          format,
          prompt,
          status: 'processing',
          video_url: null,
          duration_s: duration,
          created_at: new Date().toISOString(),
          error_msg: null,
        }
        setJobs(prev => [newJob, ...prev])
        setPollingIds(prev => new Set([...prev, data.job_id]))
      }
    } catch { /* noop */ } finally {
      setIsGenerating(false)
    }
  }

  const statusConfig: Record<JobStatus, { label: string; color: string }> = {
    pending:    { label: 'Na fila',    color: 'text-[#A1A1AA]' },
    processing: { label: 'Gerando...', color: 'text-[#F59E0B]' },
    done:       { label: 'Pronto',     color: 'text-emerald-500' },
    failed:     { label: 'Erro',       color: 'text-red-500' },
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Generator */}
      <div className="bg-[#18181B] border border-white/[0.07] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Video size={16} className="text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#FAFAFA]">VULCAN</p>
            <p className="text-xs text-[#A1A1AA]">Agente Cinematográfico · {clientName}</p>
          </div>
        </div>

        <div>
          <p className="text-xs text-[#A1A1AA] mb-2">Formato</p>
          <div className="grid grid-cols-4 gap-2">
            {FORMATS.map(f => (
              <button key={f.value} onClick={() => setFormat(f.value)}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs font-medium transition-all ${format === f.value ? 'border-purple-500/40 bg-purple-500/10 text-purple-400' : 'border-white/[0.07] text-[#A1A1AA] hover:text-[#FAFAFA]'}`}>
                <span>{f.icon}</span>
                <span>{f.label}</span>
                <span className="text-[10px] opacity-60">{f.ratio}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-[#A1A1AA] mb-2">Duração</p>
          <div className="flex gap-2">
            {DURATIONS.map(d => (
              <button key={d} onClick={() => setDuration(d)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${duration === d ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' : 'bg-[#27272A] text-[#A1A1AA] border border-transparent'}`}>
                <Clock size={10} />{d}s
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-[#A1A1AA] mb-2">Descreva o vídeo</p>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
            placeholder="Ex: Produto de skincare em close, mãos suaves aplicando o creme, iluminação suave, música lo-fi..."
            className="w-full resize-none rounded-lg bg-[#09090B] border border-white/[0.07] px-3 py-2.5 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:outline-none focus:border-purple-500/40 transition-colors" />
        </div>

        <button onClick={() => { void generate() }} disabled={isGenerating || !prompt.trim()}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-purple-600 text-white py-2.5 text-sm font-semibold hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
          {isGenerating
            ? <><Loader2 size={16} className="animate-spin" /> Enviando para VULCAN...</>
            : <><Film size={16} /> Gerar Vídeo</>}
        </button>

        <p className="text-[11px] text-[#52525B] text-center">
          ⏱ Geração leva 2–5 minutos. Você será notificado quando estiver pronto.
        </p>
      </div>

      {/* Jobs list */}
      <div className="space-y-3">
        <p className="text-xs text-[#A1A1AA]">Vídeos gerados</p>
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 bg-[#18181B] border border-white/[0.07] rounded-xl gap-3">
            <Film size={32} className="text-[#3F3F46]" />
            <p className="text-sm text-[#52525B]">Seus vídeos aparecem aqui</p>
          </div>
        ) : (
          jobs.map(j => (
            <div key={j.id} className="bg-[#18181B] border border-white/[0.07] rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#FAFAFA] truncate">{j.prompt}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-[#A1A1AA]">{j.format} · {j.duration_s}s</span>
                    <span className={`text-xs font-medium ${statusConfig[j.status].color}`}>
                      {j.status === 'processing' && <Loader2 size={10} className="inline animate-spin mr-1" />}
                      {statusConfig[j.status].label}
                    </span>
                  </div>
                </div>
                {j.status === 'done' && j.video_url && (
                  <div className="flex gap-2 shrink-0">
                    <a href={j.video_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 rounded bg-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] text-xs">
                      <Play size={12} /> Play
                    </a>
                    <a href={j.video_url} download
                      className="flex items-center gap-1 px-2 py-1 rounded bg-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] text-xs">
                      <Download size={12} />
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
