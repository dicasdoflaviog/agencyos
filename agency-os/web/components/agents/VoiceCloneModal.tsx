'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Mic, MicOff, X, ChevronRight, Loader2,
  CheckCircle2, AlertCircle, Volume2, RotateCcw,
} from 'lucide-react'

const PARTS = [
  {
    title: 'Parte 1 — Autoridade e Apresentação',
    time: '0s – 15s',
    text: 'Olá, eu sou [Nome do Cliente]. Estou gravando esta amostra para o meu sistema de inteligência artificial da Agency OS. O objetivo aqui é capturar não só o som da minha voz, mas a autoridade e a clareza com que eu falo com meus clientes todos os dias. A tecnologia está mudando o jogo, e eu faço parte dessa evolução.',
  },
  {
    title: 'Parte 2 — Entusiasmo e Venda',
    time: '15s – 30s',
    text: 'Imagine poder escalar o seu atendimento sem perder a sua essência. Nós estamos criando algo único aqui: um sistema que entende a dor do mercado e entrega soluções rápidas, funcionais e, acima de tudo, humanas. É sobre gerar conexão e lucro real, de forma inteligente e automática!',
  },
  {
    title: 'Parte 3 — Empatia e Jargão',
    time: '30s – 45s',
    text: 'Eu sei que o marketing tradicional está morrendo, e a gente sente isso na pele. Por isso, o nosso foco é o High Ticket, é o acompanhamento de perto. Se você busca clareza e execução impecável, você está no lugar certo. Sem enrolação, direto ao ponto, com a estratégia que o seu negócio merece.',
  },
  {
    title: 'Parte 4 — Finalização e Tom Neutro',
    time: '45s – 60s',
    text: 'Para finalizar, esta é a minha voz em um tom mais calmo, ideal para narrações institucionais e conteúdos educativos. A precisão da clonagem depende desse equilíbrio. Teste finalizado. VOX, pode assumir o comando agora.',
  },
]

type Status = 'idle' | 'recording' | 'stopped' | 'uploading' | 'success' | 'error'

interface Props {
  onClose: () => void
  onSuccess: (voiceId: string, voiceName: string) => void
}

export function VoiceCloneModal({ onClose, onSuccess }: Props) {
  const [step, setStep] = useState(0)
  const [status, setStatus] = useState<Status>('idle')
  const [voiceName, setVoiceName] = useState('Minha Voz')
  const [elapsed, setElapsed] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const stopWaveform = useCallback(() => {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
  }, [])

  const cleanup = useCallback(() => {
    stopWaveform()
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
    analyserRef.current = null
  }, [stopWaveform])

  useEffect(() => () => cleanup(), [cleanup])

  const drawWaveform = useCallback(() => {
    if (!analyserRef.current || !canvasRef.current) return
    const analyser = analyserRef.current
    const canvas = canvasRef.current
    const ctx2d = canvas.getContext('2d')
    if (!ctx2d) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    const BAR_COUNT = 60

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(dataArray)
      ctx2d.clearRect(0, 0, canvas.width, canvas.height)

      const W = canvas.width
      const H = canvas.height
      const step = Math.floor(bufferLength / BAR_COUNT)
      const barW = Math.floor(W / BAR_COUNT) - 1

      for (let i = 0; i < BAR_COUNT; i++) {
        const val = dataArray[i * step] / 255
        const barH = Math.max(3, val * H)
        const x = i * (barW + 1)
        const y = (H - barH) / 2
        const alpha = 0.35 + val * 0.65
        ctx2d.fillStyle = `rgba(52,211,153,${alpha})`
        ctx2d.fillRect(x, y, barW, barH)
      }
    }
    draw()
  }, [])

  const startRecording = async () => {
    setErrorMsg('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream

      const audioCtx = new AudioContext()
      audioCtxRef.current = audioCtx
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser
      audioCtx.createMediaStreamSource(stream).connect(analyser)

      chunksRef.current = []
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus' : 'audio/webm'
      const mr = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mr

      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
      }
      mr.start(100)

      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
      setStatus('recording')
      drawWaveform()
    } catch {
      setErrorMsg('Não foi possível acessar o microfone. Verifique as permissões do navegador.')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    cleanup()
    setStatus('stopped')
  }

  const resetAll = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setStatus('idle')
    setStep(0)
    setElapsed(0)
    setAudioBlob(null)
    setAudioUrl('')
    setErrorMsg('')
  }

  const uploadVoice = async () => {
    if (!audioBlob) return
    setStatus('uploading')
    setErrorMsg('')
    try {
      const form = new FormData()
      form.append('audio', audioBlob, 'voice-clone.webm')
      form.append('name', voiceName || 'Minha Voz')
      const res = await fetch('/api/agents/vox/clone', { method: 'POST', body: form })
      const data = await res.json() as { voice_id?: string; name?: string; error?: string }
      if (!res.ok || !data.voice_id) throw new Error(data.error ?? 'Erro ao clonar voz')
      setStatus('success')
      onSuccess(data.voice_id, data.name ?? voiceName)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro desconhecido')
      setStatus('error')
    }
  }

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const part = PARTS[step]
  const isLastPart = step === PARTS.length - 1

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border-subtle)]">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Mic size={18} className="text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Clonar Minha Voz</p>
            <p className="text-xs text-[var(--color-text-secondary)] truncate">
              Roteiro de Captura Elite · Gêmeo Digital de Voz
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Step progress bar */}
        {status !== 'success' && (
          <div className="flex gap-1.5 px-5 pt-4">
            {PARTS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                  i < step ? 'bg-emerald-500' : i === step ? 'bg-emerald-400' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        )}

        {/* Body */}
        <div className="p-5 space-y-4">

          {/* ── Success state ── */}
          {status === 'success' ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-[var(--color-text-primary)]">Voz clonada com sucesso!</p>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  <span className="text-emerald-400 font-medium">"{voiceName}"</span> já aparece na lista de vozes do VOX.
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors"
              >
                Fechar e usar minha voz
              </button>
            </div>

          ) : (
            <>
              {/* Step label */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400">{part.title}</span>
                <span className="text-xs text-[var(--color-text-muted)] tabular-nums">{part.time}</span>
              </div>

              {/* Teleprompter card */}
              <div className="relative bg-[var(--color-bg-elevated)] rounded-xl p-4 border border-[var(--color-border-subtle)]">
                <p className="text-[15px] leading-relaxed text-[var(--color-text-primary)] font-medium">
                  {part.text}
                </p>
                {status === 'recording' && (
                  <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                  </span>
                )}
              </div>

              {/* Waveform visualiser */}
              <div
                className={`transition-all duration-300 ${
                  status === 'recording' ? 'opacity-100 max-h-20' : 'opacity-0 max-h-0 overflow-hidden'
                }`}
              >
                <div className="bg-[var(--color-bg-base)] rounded-xl border border-[var(--color-border-subtle)] px-4 py-2 flex items-center gap-3">
                  <span className="text-xs font-mono text-red-400 tabular-nums shrink-0">{formatTime(elapsed)}</span>
                  <canvas ref={canvasRef} width={380} height={44} className="flex-1" />
                </div>
              </div>

              {/* Audio preview + name (after stop) */}
              {(status === 'stopped' || status === 'error') && audioUrl && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Gravação pronta · {formatTime(elapsed)}
                    </p>
                  </div>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <audio src={audioUrl} controls className="w-full rounded-lg" style={{ height: 36 }} />
                  <div>
                    <p className="text-xs text-[var(--color-text-secondary)] mb-1.5">Nome para sua voz clonada</p>
                    <input
                      value={voiceName}
                      onChange={e => setVoiceName(e.target.value)}
                      maxLength={40}
                      className="w-full rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[#52525B] focus:outline-none focus:border-emerald-500/40 transition-colors"
                      placeholder="Ex: Minha Voz, João Silva..."
                    />
                  </div>
                </div>
              )}

              {/* Error banner */}
              {errorMsg && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-400">{errorMsg}</p>
                </div>
              )}

              {/* ── Action controls ── */}
              <div className="flex gap-2 pt-1">
                {status === 'idle' && (
                  <button
                    onClick={() => { void startRecording() }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white py-3 text-sm font-semibold hover:bg-emerald-500 active:scale-[0.98] transition-all"
                  >
                    <Mic size={15} /> Começar a Gravar
                  </button>
                )}

                {status === 'recording' && !isLastPart && (
                  <button
                    onClick={() => setStep(s => s + 1)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)] py-3 text-sm font-semibold hover:border-emerald-500/40 hover:text-emerald-400 active:scale-[0.98] transition-all"
                  >
                    Próxima parte <ChevronRight size={15} />
                  </button>
                )}

                {status === 'recording' && isLastPart && (
                  <button
                    onClick={stopRecording}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 py-3 text-sm font-semibold hover:bg-red-500/25 active:scale-[0.98] transition-all"
                  >
                    <MicOff size={15} /> Finalizar Gravação
                  </button>
                )}

                {(status === 'stopped' || status === 'error') && (
                  <>
                    <button
                      onClick={resetAll}
                      className="flex items-center justify-center gap-1.5 px-4 rounded-xl bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)] py-3 text-sm hover:text-[var(--color-text-primary)] active:scale-[0.98] transition-all"
                      title="Regravar"
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button
                      onClick={() => { void uploadVoice() }}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white py-3 text-sm font-semibold hover:bg-emerald-500 active:scale-[0.98] transition-all"
                    >
                      <Volume2 size={15} /> Enviar para ElevenLabs
                    </button>
                  </>
                )}

                {status === 'uploading' && (
                  <div className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600/50 text-white py-3 text-sm font-semibold cursor-not-allowed">
                    <Loader2 size={15} className="animate-spin" /> Clonando voz...
                  </div>
                )}
              </div>

              {/* Hint */}
              {status === 'recording' && (
                <p className="text-xs text-center text-[var(--color-text-muted)]">
                  Leia o texto naturalmente. Clique em "Próxima parte" ao terminar cada bloco.
                </p>
              )}
              {status === 'idle' && (
                <p className="text-xs text-center text-[var(--color-text-muted)]">
                  Leia em ambiente silencioso · 4 partes · ~60 segundos no total
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
