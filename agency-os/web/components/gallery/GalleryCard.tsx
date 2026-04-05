'use client'

import { useState } from 'react'
import { cn, formatDate } from '@/lib/utils'
import { Copy, Check, ChevronDown, ChevronUp, ImageIcon, Video, FileText, Layers, Mic } from 'lucide-react'
import type { JobOutput } from '@/types/database'
import { MDRenderer } from './MDRenderer'
import { CarouselPreview } from './CarouselPreview'

const STATUS_CONFIG = {
  pending:  { label: 'Pendente',  cls: 'bg-white/[0.06] text-[var(--color-text-secondary)]' },
  approved: { label: 'Aprovado',  cls: 'bg-green-500/10 text-green-400' },
  rejected: { label: 'Rejeitado', cls: 'bg-red-500/10 text-red-400' },
  revision: { label: 'Revisão',   cls: 'bg-amber-500/10 text-amber-400' },
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; accent: string }> = {
  image         : { label: 'Imagem',    icon: ImageIcon,  accent: 'text-violet-400' },
  video         : { label: 'Vídeo',     icon: Video,      accent: 'text-blue-400'   },
  audio         : { label: 'Áudio',     icon: Mic,        accent: 'text-pink-400'   },
  design_preview: { label: 'Design',    icon: Layers,     accent: 'text-cyan-400'   },
  carousel      : { label: 'Carrossel', icon: Layers,     accent: 'text-amber-400'  },
  copy          : { label: 'Copy',      icon: FileText,   accent: 'text-amber-400'  },
  image_prompt  : { label: 'Prompt',    icon: ImageIcon,  accent: 'text-purple-400' },
  text          : { label: 'Texto',     icon: FileText,   accent: 'text-zinc-400'   },
  strategy      : { label: 'Estratégia',icon: FileText,   accent: 'text-zinc-400'   },
  script        : { label: 'Roteiro',   icon: FileText,   accent: 'text-zinc-400'   },
}

function isCarouselContent(content: string): boolean {
  return /(?:^|\n)(?:#{1,3}\s+)?(?:🎠\s*)?Slide\s+\d+/i.test(content)
}

function isImageUrl(content: string): boolean {
  return /^https?:\/\/.+\.(png|jpg|jpeg|webp|gif|avif)/i.test(content.trim()) ||
    content.trim().startsWith('data:image/')
}

interface Props {
  output: JobOutput
}

export function GalleryCard({ output }: Props) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const status = STATUS_CONFIG[output.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending
  const typeConfig = TYPE_CONFIG[output.output_type] ?? TYPE_CONFIG.text
  const TypeIcon = typeConfig.icon

  const content = output.output_content ?? ''
  const isImage = output.output_type === 'image' || isImageUrl(content)
  const isVideo = output.output_type === 'video'
  const isCarousel = output.output_type === 'carousel' ||
    (output.output_type === 'image_prompt' && isCarouselContent(content)) ||
    (output.output_type === 'copy' && isCarouselContent(content)) ||
    (output.output_type === 'text' && isCarouselContent(content))
  const isText = !isImage && !isVideo

  async function handleCopy() {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const PREVIEW_THRESHOLD = 600

  return (
    <div className="group flex flex-col rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] overflow-hidden transition-all hover:border-[var(--color-border-default)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded bg-[var(--color-bg-elevated)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-primary)]">
            {output.agent_name}
          </span>
          <span className={cn('flex items-center gap-1 text-[10px] font-medium', typeConfig.accent)}>
            <TypeIcon size={10} />
            {typeConfig.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', status.cls)}>
            {status.label}
          </span>
          <span className="text-[10px] text-[var(--color-text-muted)]">{formatDate(output.created_at)}</span>
        </div>
      </div>

      {/* Prompt / title */}
      {output.input_prompt && (
        <p className="truncate px-4 pb-2 text-[11px] text-[var(--color-text-muted)]">
          ↳ {output.input_prompt}
        </p>
      )}

      {/* Content area */}
      <div className="px-4 pb-4 flex-1">
        {isImage ? (
          // Image preview
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={content}
            alt={output.input_prompt ?? 'Output'}
            className="w-full rounded-lg object-cover max-h-64"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : isVideo ? (
          // Video preview
          <video
            src={content}
            controls
            className="w-full rounded-lg max-h-64 bg-black"
          />
        ) : isCarousel ? (
          // Carousel navigator
          <CarouselPreview content={content} />
        ) : (
          // Markdown text — with expand/collapse for long content
          <div>
            <div className={cn('overflow-hidden transition-all', !expanded && content.length > PREVIEW_THRESHOLD && 'max-h-48 relative')}>
              <MDRenderer content={content} />
              {!expanded && content.length > PREVIEW_THRESHOLD && (
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#18181B] to-transparent" />
              )}
            </div>
            {content.length > PREVIEW_THRESHOLD && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="mt-2 flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 transition-colors"
              >
                {expanded ? <><ChevronUp size={12} /> Ver menos</> : <><ChevronDown size={12} /> Ver mais</>}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {isText && (
        <div className="flex items-center justify-end border-t border-[var(--color-border-subtle)] px-4 py-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
          >
            {copied ? <><Check size={11} className="text-green-400" /> Copiado</> : <><Copy size={11} /> Copiar</>}
          </button>
        </div>
      )}
    </div>
  )
}
