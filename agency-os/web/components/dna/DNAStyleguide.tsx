'use client'

import { useState, useMemo, ElementType, ReactNode } from 'react'
import {
  Palette, Code2, ChevronDown, FileCode, Monitor,
  RefreshCw, Type, Layers, Ruler, Square,
} from 'lucide-react'
import { extractDesignTokens } from '@/lib/ai/extract-design-tokens'

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function wrapCss(css: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{margin:0;padding:0;background:#09090b;color:#fff;}${css}</style>
</head><body></body></html>`
}

function prepareHtml(html: string): string {
  if (!html.includes('<!DOCTYPE') && !html.includes('<html')) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`
  }
  return html
}

/** Extracts raw CSS from a CSS file or from <style> blocks inside HTML. */
function extractCss(content: string, fileType: string): string {
  if (fileType.toUpperCase() === 'CSS') return content
  const blocks: string[] = []
  const re = /<style[^>]*>([\s\S]*?)<\/style>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) blocks.push(m[1])
  return blocks.join('\n')
}

/** Prevents </style> inside injected CSS from breaking srcDoc parsing. */
function escapeCss(css: string): string {
  return css.replace(/<\/style>/gi, '<\\/style>')
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }: {
  title: string
  icon: ElementType
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--color-border-subtle)] px-3.5 py-2.5">
        <Icon size={11} className="text-amber-400/70 shrink-0" />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{title}</p>
      </div>
      <div className="p-3.5">{children}</div>
    </div>
  )
}

function ColorSwatch({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div
        className="h-9 w-full rounded-lg border border-white/10"
        style={{ background: value }}
        title={`--${name}: ${value}`}
      />
      <p className="truncate text-[8px] font-mono text-[var(--color-text-muted)] leading-tight">--{name}</p>
      <p className="truncate text-[9px] font-mono text-[var(--color-text-secondary)] -mt-0.5">{value}</p>
    </div>
  )
}

function TypographyPreview({ cssContent }: { cssContent: string }) {
  const src = useMemo(() => {
    const safe = escapeCss(cssContent)
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0;}
${safe}
body{background:transparent;padding:12px 14px;font-family:var(--font-body,var(--font-family,var(--font-sans,system-ui,sans-serif)));color:var(--color-text-primary,var(--text-primary,#f4f4f5));}
.lbl{font-size:8px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#52525b;margin-bottom:3px;}
.h1{font-family:var(--font-heading,var(--font-display,var(--font-family,system-ui,sans-serif)));font-size:20px;font-weight:700;line-height:1.2;color:var(--color-text-primary,var(--text-primary,#f4f4f5));margin-bottom:10px;}
.h2{font-family:var(--font-heading,var(--font-display,var(--font-family,system-ui,sans-serif)));font-size:14px;font-weight:600;color:var(--color-text-secondary,var(--text-secondary,#a1a1aa));margin-bottom:10px;}
.body-t{font-size:12px;line-height:1.6;color:var(--color-text-muted,var(--text-muted,#71717a));margin-bottom:10px;}
.mono-t{font-family:var(--font-mono,'Fira Code',monospace);font-size:10px;color:var(--color-accent,var(--accent,var(--primary,#f59e0b)));}
</style></head><body>
<p class="lbl">H1 — Heading</p><p class="h1">Agency OS Platform</p>
<p class="lbl">H2 — Subtitle</p><p class="h2">Gestão de Criativos com IA</p>
<p class="lbl">Body</p><p class="body-t">Crie e publique conteúdo de alto impacto para seus clientes.</p>
<p class="lbl">Mono</p><p class="mono-t">const brand = await oracle.analyze()</p>
</body></html>`
  }, [cssContent])

  return (
    <iframe
      srcDoc={src}
      sandbox="allow-scripts"
      style={{ width: '100%', height: 188, border: 'none', display: 'block' }}
      title="Typography Preview"
    />
  )
}

function ComponentGallery({ cssContent }: { cssContent: string }) {
  const src = useMemo(() => {
    const safe = escapeCss(cssContent)
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0;}
${safe}
body{background:transparent;padding:12px 14px;font-family:var(--font-body,var(--font-family,system-ui,sans-serif));display:flex;flex-direction:column;gap:11px;}
.lbl{font-size:8px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#52525b;margin-bottom:5px;}
.row{display:flex;align-items:center;gap:7px;flex-wrap:wrap;}
.btn{background:var(--color-primary,var(--primary,var(--accent,var(--color-accent,#f59e0b))));color:var(--color-on-primary,var(--on-primary,#09090b));border:none;border-radius:var(--radius-md,var(--radius,var(--border-radius,6px)));padding:6px 14px;font-size:12px;font-weight:600;font-family:inherit;cursor:default;}
.btn-ghost{background:transparent;color:var(--color-text-secondary,var(--text-secondary,#a1a1aa));border:1px solid var(--color-border,var(--border,rgba(255,255,255,.15)));border-radius:var(--radius-md,var(--radius,6px));padding:5px 14px;font-size:12px;font-family:inherit;cursor:default;}
.badge{background:var(--color-primary,var(--primary,var(--accent,#f59e0b)));color:var(--color-on-primary,var(--on-primary,#09090b));border-radius:999px;padding:2px 9px;font-size:10px;font-weight:600;font-family:inherit;}
.badge-ghost{background:var(--color-bg-elevated,var(--surface,rgba(255,255,255,.06)));color:var(--color-text-secondary,var(--text-secondary,#a1a1aa));border:1px solid var(--color-border,var(--border,rgba(255,255,255,.12)));border-radius:999px;padding:2px 9px;font-size:10px;font-family:inherit;}
.input{border:1px solid var(--color-border,var(--border,rgba(255,255,255,.12)));background:var(--color-bg-elevated,var(--surface,rgba(255,255,255,.04)));color:var(--color-text-primary,var(--text-primary,#f4f4f5));border-radius:var(--radius-md,var(--radius,6px));padding:6px 10px;font-size:12px;font-family:inherit;width:100%;outline:none;}
.input::placeholder{color:var(--color-text-muted,var(--text-muted,#52525b));}
</style></head><body>
<div><p class="lbl">Botões</p><div class="row"><button class="btn">Primário</button><button class="btn-ghost">Ghost</button></div></div>
<div><p class="lbl">Badges</p><div class="row"><span class="badge">Ativo</span><span class="badge-ghost">Rascunho</span></div></div>
<div><p class="lbl">Input</p><input class="input" placeholder="Digite aqui..." readonly /></div>
</body></html>`
  }, [cssContent])

  return (
    <iframe
      srcDoc={src}
      sandbox="allow-scripts"
      style={{ width: '100%', height: 188, border: 'none', display: 'block' }}
      title="Component Gallery"
    />
  )
}

function SpacingBlocks({ spacings }: { spacings: Record<string, string> }) {
  const hasTokens = Object.keys(spacings).length > 0
  const scale = hasTokens
    ? Object.entries(spacings).slice(0, 8)
    : [['4px', '4px'], ['8px', '8px'], ['12px', '12px'], ['16px', '16px'], ['24px', '24px'], ['32px', '32px']]

  return (
    <div className="space-y-2">
      {scale.map(([k, v]) => {
        const px = parseFloat(v) || parseFloat(k) || 8
        return (
          <div key={k} className="flex items-center gap-2.5">
            <div
              className="shrink-0 h-[10px] rounded-sm bg-amber-500/40"
              style={{ width: Math.min(px * 2.5, 100) }}
            />
            <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
              {hasTokens ? `--${k}: ${v}` : v}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function RadiusBlocks({ radii }: { radii: Record<string, string> }) {
  const hasTokens = Object.keys(radii).length > 0
  const entries = hasTokens
    ? Object.entries(radii).slice(0, 6)
    : [['sm', '4px'], ['md', '8px'], ['lg', '12px'], ['xl', '16px'], ['2xl', '24px'], ['full', '9999px']]

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {entries.map(([k, v]) => (
        <div key={k} className="flex flex-col items-center gap-1.5">
          <div
            className="h-8 w-8 border-2 border-amber-500/50 bg-amber-500/10"
            style={{ borderRadius: v }}
          />
          <div className="text-center">
            <p className="text-[8px] font-mono text-[var(--color-text-muted)] leading-tight truncate max-w-[60px]">
              {hasTokens ? `--${k}` : k}
            </p>
            <p className="text-[9px] text-[var(--color-text-secondary)]">{v}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── FileSelector ──────────────────────────────────────────────────────────────

function FileSelector({
  files, selected, onSelect, activeFile, view, onViewChange,
}: {
  files: StyleguideFile[]
  selected: string
  onSelect: (id: string) => void
  activeFile: StyleguideFile | undefined
  view: 'preview' | 'code'
  onViewChange: (v: 'preview' | 'code') => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      {files.length > 1 ? (
        <div className="relative">
          <select
            value={selected}
            onChange={e => onSelect(e.target.value)}
            className="appearance-none rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] py-1.5 pl-3 pr-8 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-amber-500/40"
          >
            {files.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
          <FileCode size={13} className="text-amber-400" />
          {activeFile?.name}
        </div>
      )}

      <div className="flex items-center rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-0.5">
        {([['preview', Monitor, 'Preview'], ['code', Code2, 'Código']] as const).map(([id, Icon, label]) => (
          <button
            key={id}
            onClick={() => onViewChange(id)}
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
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function DNAStyleguide({ files }: DNAStyleguideProps) {
  const [selected, setSelected] = useState<string>(files[0]?.id ?? '')
  const [view, setView] = useState<'preview' | 'code'>('preview')

  const activeFile = files.find(f => f.id === selected) ?? files[0]

  const htmlContent = useMemo(() => {
    if (!activeFile?.content_text) return null
    const ft = (activeFile.file_type ?? '').toUpperCase()
    if (ft === 'CSS' || activeFile.name.toLowerCase().endsWith('.css')) {
      return wrapCss(activeFile.content_text)
    }
    return prepareHtml(activeFile.content_text)
  }, [activeFile])

  const tokens = useMemo(() => {
    if (!activeFile?.content_text) return null
    return extractDesignTokens(activeFile.content_text)
  }, [activeFile])

  const cssForPreviews = useMemo(() => {
    if (!activeFile?.content_text) return ''
    return extractCss(activeFile.content_text, activeFile.file_type ?? '')
  }, [activeFile])

  const colorEntries = useMemo(
    () => (tokens ? Object.entries(tokens.colors) : []),
    [tokens],
  )

  // ── Empty state ──────────────────────────────────────────────────────────────
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
          <strong className="text-[var(--color-text-secondary)]">Arquivos de Conhecimento</strong>,
          depois clique em <strong className="text-[var(--color-text-secondary)]">Sincronizar</strong> para visualizar aqui.
        </p>
      </div>
    )
  }

  // ── Not synced ───────────────────────────────────────────────────────────────
  if (!htmlContent && view === 'preview') {
    return (
      <div className="space-y-4">
        <FileSelector files={files} selected={selected} onSelect={setSelected} activeFile={activeFile} view={view} onViewChange={setView} />
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 py-16 text-center">
          <RefreshCw size={22} className="mb-3 text-amber-400/70" />
          <p className="text-sm font-medium text-[var(--color-text-primary)]">Arquivo não sincronizado</p>
          <p className="mt-1 max-w-xs text-xs text-[var(--color-text-muted)]">
            Vá para a aba <strong className="text-amber-400">Arquivos de Conhecimento</strong>, localize{' '}
            <span className="font-mono text-amber-400">{activeFile?.name}</span> e clique em{' '}
            <strong className="text-[var(--color-text-secondary)]">Sincronizar</strong>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <FileSelector files={files} selected={selected} onSelect={setSelected} activeFile={activeFile} view={view} onViewChange={setView} />

      {/* Fixed-height grid so both columns can use height:100% */}
      <div
        className="grid grid-cols-1 gap-4 lg:grid-cols-3"
        style={{ height: 'calc(100vh - 280px)', minHeight: 560 }}
      >
        {/* ── Main preview / code — fills full height, scrolls inside ── */}
        <div className="lg:col-span-2 flex flex-col overflow-hidden rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
          {view === 'preview' ? (
            <iframe
              srcDoc={htmlContent ?? ''}
              sandbox="allow-scripts"
              style={{ width: '100%', height: '100%', border: 'none', display: 'block', flex: 1 }}
              title="Styleguide Preview"
            />
          ) : (
            <pre className="h-full overflow-auto p-4 text-[11px] leading-relaxed text-[var(--color-text-secondary)] font-mono whitespace-pre-wrap break-words">
              {activeFile?.content_text ?? ''}
            </pre>
          )}
        </div>

        {/* ── Token panel — independent scroll, never pushes iframe ── */}
        <div className="h-full overflow-y-auto space-y-3 pr-0.5">

          {/* Paleta de Cores */}
          {colorEntries.length > 0 && (
            <Section title="Paleta de Cores" icon={Palette}>
              <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                {colorEntries.slice(0, 8).map(([k, v]) => (
                  <ColorSwatch key={k} name={k} value={v} />
                ))}
              </div>
              {tokens && tokens.palette.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--color-border-subtle)] pt-3">
                  {tokens.palette.slice(0, 14).map(hex => (
                    <div key={hex} className="flex flex-col items-center gap-0.5">
                      <div
                        className="h-6 w-6 rounded-md border border-white/10"
                        style={{ background: hex }}
                        title={hex}
                      />
                      <span className="text-[7px] font-mono text-[var(--color-text-muted)]">{hex}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {/* Tipografia */}
          {cssForPreviews && (
            <Section title="Tipografia" icon={Type}>
              <TypographyPreview cssContent={cssForPreviews} />
            </Section>
          )}

          {/* Componentes Ativos */}
          {cssForPreviews && (
            <Section title="Componentes Ativos" icon={Layers}>
              <ComponentGallery cssContent={cssForPreviews} />
            </Section>
          )}

          {/* Espaçamento */}
          <Section title="Espaçamento" icon={Ruler}>
            <SpacingBlocks spacings={tokens?.spacings ?? {}} />
          </Section>

          {/* Border Radius */}
          <Section title="Border Radius" icon={Square}>
            <RadiusBlocks radii={tokens?.radii ?? {}} />
          </Section>

          {tokens?.rawSummary && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="flex items-center gap-1.5 text-[10px] text-amber-400/80">
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
