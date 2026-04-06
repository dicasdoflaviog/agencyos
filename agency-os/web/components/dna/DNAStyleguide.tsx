'use client'

import { useState, useMemo } from 'react'
import { Palette, Code2, ChevronDown, FileCode, Monitor } from 'lucide-react'
import { extractDesignTokens } from '@/lib/ai/extract-design-tokens'

export interface StyleguideFile {
  id: string
  name: string
  file_type: string
  content_text: string | null
  sync_status: string
}

interface DNAStyleguideProps {
  files: StyleguideFile[]
}

// Wrap bare CSS in a minimal HTML document
function wrapCss(css: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>body{margin:0;padding:0;background:#09090b;color:#fff;}${css}</style>
</head>
<body></body>
</html>`
}

// Ensure the HTML has a proper doctype / base for rendering
function prepareHtml(html: string): string {
  if (!html.includes('<!DOCTYPE') && !html.includes('<html')) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`
  }
  return html
}

function ColorSwatch({ name, value }: { name: string; value: string }) {
  const isHex = value.startsWith('#')
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-2.5 py-1.5">
      <div
        className="h-5 w-5 shrink-0 rounded border border-white/10"
        style={{ background: value }}
      />
      <div className="min-w-0">
        <p className="truncate text-[10px] font-mono text-[var(--color-text-primary)]">--{name}</p>
        <p className="truncate text-[10px] text-[var(--color-text-muted)]">{value}</p>
      </div>
    </div>
  )
}

function HexSwatch({ hex }: { hex: string }) {
  return (
    <div
      className="h-9 w-9 rounded-lg border border-white/10 shadow-sm"
      title={hex}
      style={{ background: hex }}
    />
  )
}

export function DNAStyleguide({ files }: DNAStyleguideProps) {
  const [selected, setSelected] = useState<string>(files[0]?.id ?? '')
  const [view, setView] = useState<'preview' | 'code'>('preview')

  const activeFile = files.find(f => f.id === selected)

  const htmlContent = useMemo(() => {
    if (!activeFile?.content_text) return null
    if (activeFile.file_type === 'css' || activeFile.name.endsWith('.css')) {
      return wrapCss(activeFile.content_text)
    }
    return prepareHtml(activeFile.content_text)
  }, [activeFile])

  const tokens = useMemo(() => {
    if (!activeFile?.content_text) return null
    return extractDesignTokens(activeFile.content_text)
  }, [activeFile])

  // Empty state
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--color-bg-elevated)]">
          <Palette size={24} className="text-[var(--color-text-muted)]" />
        </div>
        <p className="text-sm font-medium text-[var(--color-text-primary)]">Nenhum Styleguide encontrado</p>
        <p className="mt-1 max-w-xs text-xs text-[var(--color-text-muted)]">
          Faça upload de um arquivo <span className="font-mono text-amber-400">.html</span> ou{' '}
          <span className="font-mono text-amber-400">.css</span> na aba{' '}
          <strong className="text-[var(--color-text-secondary)]">Arquivos de Conhecimento</strong> e sincronize para visualizar
          a identidade visual da marca aqui.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        {/* File selector */}
        {files.length > 1 ? (
          <div className="relative">
            <select
              value={selected}
              onChange={e => setSelected(e.target.value)}
              className="appearance-none rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] py-1.5 pl-3 pr-8 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-amber-500/40"
            >
              {files.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
            <FileCode size={13} className="text-amber-400" />
            {activeFile?.name}
          </div>
        )}

        {/* View toggle */}
        <div className="flex items-center rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-0.5">
          {[
            { id: 'preview', icon: Monitor,  label: 'Preview' },
            { id: 'code',    icon: Code2,    label: 'Código' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setView(id as 'preview' | 'code')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                view === id
                  ? 'bg-[var(--color-bg-overlay)] text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Main view */}
        <div className="lg:col-span-2 overflow-hidden rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
          {view === 'preview' && htmlContent ? (
            <iframe
              srcDoc={htmlContent}
              sandbox="allow-scripts allow-same-origin"
              className="h-[520px] w-full border-0"
              title="Styleguide Preview"
            />
          ) : (
            <pre className="h-[520px] overflow-auto p-4 text-[11px] leading-relaxed text-[var(--color-text-secondary)] font-mono">
              {activeFile?.content_text ?? ''}
            </pre>
          )}
        </div>

        {/* Token panel */}
        <div className="space-y-4">
          {/* Hex palette */}
          {tokens && tokens.palette.length > 0 && (
            <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Paleta</p>
              <div className="flex flex-wrap gap-2">
                {tokens.palette.map(hex => <HexSwatch key={hex} hex={hex} />)}
              </div>
            </div>
          )}

          {/* CSS color tokens */}
          {tokens && Object.keys(tokens.colors).length > 0 && (
            <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Tokens de Cor</p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {Object.entries(tokens.colors).map(([k, v]) => (
                  <ColorSwatch key={k} name={k} value={v} />
                ))}
              </div>
            </div>
          )}

          {/* Typography */}
          {tokens && Object.keys(tokens.fonts).length > 0 && (
            <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Tipografia</p>
              <div className="space-y-1">
                {Object.entries(tokens.fonts).map(([k, v]) => (
                  <div key={k} className="rounded bg-[var(--color-bg-elevated)] px-2.5 py-1.5">
                    <p className="text-[10px] font-mono text-[var(--color-text-muted)]">--{k}</p>
                    <p className="text-xs text-[var(--color-text-primary)] truncate">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Border radius */}
          {tokens && Object.keys(tokens.radii).length > 0 && (
            <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Border Radius</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(tokens.radii).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-2.5 py-1 text-[10px]">
                    <span className="text-[var(--color-text-muted)] font-mono">--{k}:</span>
                    <span className="text-[var(--color-text-primary)]">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Oracle context badge */}
          {tokens && tokens.rawSummary && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-[10px] text-amber-400/80 flex items-center gap-1.5">
                <Palette size={10} />
                Tokens extraídos e injetados no contexto do @ORACLE automaticamente.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
