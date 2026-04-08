'use client'

import Image from 'next/image'
import { Sparkles, Download } from 'lucide-react'

interface AtlasAsset {
  id: string
  image_url: string
  format?: string
  type?: string
  style?: string
  status?: string
  prompt: string
  model?: string
  created_at: string
  client?: { id: string; name: string } | null
}

interface AtlasGallerySectionProps {
  assets: AtlasAsset[]
}

const FORMAT_LABELS: Record<string, string> = {
  feed: 'Feed', stories: 'Stories', banner: 'Banner',
  thumbnail: 'Thumb', portrait: 'Retrato', carousel: 'Carrossel',
  // legado
  post_feed: 'Feed', carrossel: 'Carrossel',
}

export function AtlasGallerySection({ assets }: AtlasGallerySectionProps) {
  if (!assets.length) return null

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={14} className="text-[var(--color-accent)]" />
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Criativos ATLAS</h3>
        <span className="rounded-full bg-[var(--color-bg-elevated)] px-2 py-0.5 text-[10px] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]">
          {assets.length} aprovado{assets.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
        {assets.map(asset => {
          const label = FORMAT_LABELS[asset.format ?? asset.type ?? ''] ?? asset.format ?? asset.type ?? '—'
          const isPortrait = asset.format === 'stories' || asset.format === 'portrait'

          return (
            <div key={asset.id} className="group relative overflow-hidden rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
              <div className={`relative w-full ${isPortrait ? 'aspect-[9/16]' : 'aspect-square'}`}>
                <Image
                  src={asset.image_url}
                  alt={asset.prompt.slice(0, 60)}
                  fill
                  className="object-cover"
                  unoptimized
                />

                {/* Hover overlay */}
                <div className="absolute inset-0 flex flex-col justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/70 via-transparent to-black/20">
                  {/* Top: format badge */}
                  <span className="self-start rounded-full bg-black/50 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium text-white">
                    {label}
                  </span>

                  {/* Bottom: download */}
                  <a
                    href={asset.image_url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="self-end flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-zinc-900 hover:bg-white transition-colors"
                  >
                    <Download size={9} /> Baixar
                  </a>
                </div>
              </div>

              {/* Footer */}
              <div className="px-2.5 py-2">
                <p className="text-[10px] text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">
                  {asset.prompt.slice(0, 80)}
                </p>
                {asset.client?.name && (
                  <p className="mt-0.5 text-[9px] text-[var(--color-text-muted)]">{asset.client.name}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
