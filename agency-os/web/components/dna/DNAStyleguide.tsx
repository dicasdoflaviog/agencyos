'use client'

import { useState, useMemo, useEffect, useRef, useCallback, ElementType, ReactNode } from 'react'
import {
  Palette, FileCode, ChevronDown, RefreshCw,
  Type, Layers, Ruler, Square, Eye, AlertTriangle,
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

function extractCss(content: string, fileType: string): string {
  if (fileType.toUpperCase() === 'CSS') return content
  const blocks: string[] = []
  const re = /<style[^>]*>([\s\S]*?)<\/style>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) blocks.push(m[1])
  return blocks.join('\n')
}

function escapeCss(css: string): string {
  return css.replace(/<\/style>/gi, '<\\/style>')
}

// ── Token section wrapper ─────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }: {
  title: string
  icon: ElementType
  children: ReactNode
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] overflow-hidden">
      <div className="flex items-center gap-1.5 border-b border-[var(--color-border-subtle)] px-3 py-2">
        <Icon size={10} className="text-amber-400/70 shrink-0" />
        <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{title}</p>
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}

// ── Token sub-components ──────────────────────────────────────────────────────

function ColorSwatch({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="h-8 w-full rounded-md border border-white/10" style={{ background: value }} title={`--${name}: ${value}`} />
      <p className="truncate text-[8px] font-mono text-[var(--color-text-muted)] leading-tight">--{name}</p>
      <p className="truncate text-[8px] font-mono text-[var(--color-text-secondary)]">{value}</p>
    </div>
  )
}

function TypographyPreview({ cssContent }: { cssContent: string }) {
  const src = useMemo(() => {
    const safe = escapeCss(cssContent)
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0;}${safe}
body{background:transparent;padding:10px 12px;font-family:var(--font-body,var(--font-family,system-ui,sans-serif));color:var(--color-text-primary,#f4f4f5);}
.lbl{font-size:7px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#52525b;margin-bottom:2px;}
.h1{font-family:var(--font-heading,var(--font-display,system-ui,sans-serif));font-size:18px;font-weight:700;color:var(--color-text-primary,#f4f4f5);margin-bottom:8px;}
.h2{font-family:var(--font-heading,var(--font-display,system-ui,sans-serif));font-size:13px;font-weight:600;color:var(--color-text-secondary,#a1a1aa);margin-bottom:8px;}
.body-t{font-size:11px;line-height:1.55;color:var(--color-text-muted,#71717a);margin-bottom:8px;}
.mono-t{font-family:var(--font-mono,'Fira Code',monospace);font-size:9px;color:var(--color-accent,var(--accent,#f59e0b));}
</style></head><body>
<p class="lbl">H1</p><p class="h1">Agency OS Platform</p>
<p class="lbl">H2</p><p class="h2">Gestão de Criativos com IA</p>
<p class="lbl">Body</p><p class="body-t">Crie conteúdo de alto impacto para seus clientes.</p>
<p class="lbl">Mono</p><p class="mono-t">const brand = await oracle.analyze()</p>
</body></html>`
  }, [cssContent])
  return <iframe srcDoc={src} sandbox="allow-scripts" style={{ width: '100%', height: 170, border: 'none', display: 'block' }} title="Typography" />
}

function ComponentGallery({ cssContent }: { cssContent: string }) {
  const src = useMemo(() => {
    const safe = escapeCss(cssContent)
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0;}${safe}
body{background:transparent;padding:10px 12px;font-family:var(--font-body,var(--font-family,system-ui,sans-serif));display:flex;flex-direction:column;gap:9px;}
.lbl{font-size:7px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#52525b;margin-bottom:4px;}
.row{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
.btn{background:var(--color-primary,var(--primary,var(--accent,#f59e0b)));color:var(--color-on-primary,var(--on-primary,#09090b));border:none;border-radius:var(--radius-md,var(--radius,6px));padding:5px 12px;font-size:11px;font-weight:600;font-family:inherit;cursor:default;}
.btn-ghost{background:transparent;color:var(--color-text-secondary,#a1a1aa);border:1px solid var(--color-border,rgba(255,255,255,.15));border-radius:var(--radius-md,var(--radius,6px));padding:4px 12px;font-size:11px;font-family:inherit;cursor:default;}
.badge{background:var(--color-primary,var(--primary,var(--accent,#f59e0b)));color:var(--color-on-primary,#09090b);border-radius:999px;padding:1px 8px;font-size:9px;font-weight:600;font-family:inherit;}
.badge-ghost{background:rgba(255,255,255,.06);color:var(--color-text-secondary,#a1a1aa);border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:1px 8px;font-size:9px;font-family:inherit;}
.input{border:1px solid var(--color-border,rgba(255,255,255,.12));background:rgba(255,255,255,.04);color:var(--color-text-primary,#f4f4f5);border-radius:var(--radius-md,var(--radius,6px));padding:5px 9px;font-size:11px;font-family:inherit;width:100%;outline:none;}
.input::placeholder{color:#52525b;}
</style></head><body>
<div><p class="lbl">Botões</p><div class="row"><button class="btn">Primário</button><button class="btn-ghost">Ghost</button></div></div>
<div><p class="lbl">Badges</p><div class="row"><span class="badge">Ativo</span><span class="badge-ghost">Rascunho</span></div></div>
<div><p class="lbl">Input</p><input class="input" placeholder="Digite aqui..." readonly /></div>
</body></html>`
  }, [cssContent])
  return <iframe srcDoc={src} sandbox="allow-scripts" style={{ width: '100%', height: 170, border: 'none', display: 'block' }} title="Components" />
}

function SpacingBlocks({ spacings }: { spacings: Record<string, string> }) {
  const hasTokens = Object.keys(spacings).length > 0
  const scale = hasTokens
    ? Object.entries(spacings).slice(0, 8)
    : [['4px', '4px'], ['8px', '8px'], ['12px', '12px'], ['16px', '16px'], ['24px', '24px'], ['32px', '32px']]
  return (
    <div className="space-y-1.5">
      {scale.map(([k, v]) => {
        const px = parseFloat(v) || parseFloat(k) || 8
        return (
          <div key={k} className="flex items-center gap-2">
            <div className="shrink-0 h-2 rounded-sm bg-amber-500/40" style={{ width: Math.min(px * 2.5, 90) }} />
            <span className="text-[9px] font-mono text-[var(--color-text-muted)]">{hasTokens ? `--${k}: ${v}` : v}</span>
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
    <div className="grid grid-cols-3 gap-2">
      {entries.map(([k, v]) => (
        <div key={k} className="flex flex-col items-center gap-1">
          <div className="h-7 w-7 border-2 border-amber-500/50 bg-amber-500/10" style={{ borderRadius: v }} />
          <p className="text-[7px] font-mono text-[var(--color-text-muted)] truncate max-w-[52px]">{hasTokens ? `--${k}` : k}</p>
          <p className="text-[8px] text-[var(--color-text-secondary)] -mt-0.5">{v}</p>
        </div>
      ))}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

type ViewMode = 'preview' | 'code'

export function DNAStyleguide({ files }: DNAStyleguideProps) {
  const [selected, setSelected]               = useState<string>(files[0]?.id ?? '')
  const [viewMode, setViewMode]               = useState<ViewMode>('preview')
  const [editableContent, setEditableContent] = useState<string>(files[0]?.content_text ?? '')
  const [liveContent, setLiveContent]         = useState<string>(files[0]?.content_text ?? '')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeFile = files.find(f => f.id === selected) ?? files[0]

  useEffect(() => {
    const c = activeFile?.content_text ?? ''
    setEditableContent(c)
    setLiveContent(c)
  }, [activeFile?.id])  // eslint-disable-line react-hooks/exhaustive-deps

  const handleCodeChange = useCallback((value: string) => {
    setEditableContent(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setLiveContent(value), 300)
  }, [])

  const htmlContent = useMemo(() => {
    if (!liveContent) return null
    const ft = (activeFile?.file_type ?? '').toUpperCase()
    if (ft === 'CSS' || activeFile?.name.toLowerCase().endsWith('.css')) return wrapCss(liveContent)
    return prepareHtml(liveContent)
  }, [liveContent, activeFile])

  // Detect truncated HTML: if it doesn't end with </html> it was cut off by the old sync
  const isTruncated  = useMemo(() => {
    if (!liveContent) return false
    const ft = (activeFile?.file_type ?? '').toUpperCase()
    if (ft !== 'HTML' && !activeFile?.name.toLowerCase().endsWith('.html')) return false
    const tail = liveContent.slice(-200).toLowerCase()
    return !tail.includes('</html') && !tail.includes('</body')
  }, [liveContent, activeFile])

  const tokens         = useMemo(() => liveContent ? extractDesignTokens(liveContent) : null, [liveContent])
  const cssForPreviews = useMemo(
    () => liveContent ? extractCss(liveContent, activeFile?.file_type ?? '') : '',
    [liveContent, activeFile],
  )
  const colorEntries = useMemo(() => tokens ? Object.entries(tokens.colors) : [], [tokens])

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
          <strong className="text-[var(--color-text-secondary)]">Arquivos de Conhecimento</strong>.
        </p>
      </div>
    )
  }

  // ── Not synced ───────────────────────────────────────────────────────────────
  if (!activeFile?.content_text) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 py-16 text-center">
        <RefreshCw size={22} className="mb-3 text-amber-400/70" />
        <p className="text-sm font-medium text-[var(--color-text-primary)]">Arquivo não sincronizado</p>
        <p className="mt-1 max-w-xs text-xs text-[var(--color-text-muted)]">
          Vá para <strong className="text-amber-400">Arquivos de Conhecimento</strong>, localize{' '}
          <span className="font-mono text-amber-400">{activeFile?.name}</span> e clique em{' '}
          <strong className="text-[var(--color-text-secondary)]">Sincronizar</strong>.
        </p>
      </div>
    )
  }

  return (
    <div className="flex gap-3" style={{ height: 'calc(100vh - 240px)', minHeight: 560 }}>

      {/* ── MAIN CANVAS ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--color-border-subtle)]">

        {/* Top bar: file selector + toggle */}
        <div className="flex shrink-0 items-center gap-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-2">

          {/* File selector */}
          {files.length > 1 ? (
            <div className="relative">
              <select
                value={selected}
                onChange={e => setSelected(e.target.value)}
                className="appearance-none rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] py-1 pl-3 pr-7 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-amber-500/40"
              >
                {files.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <ChevronDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
              <FileCode size={12} className="text-amber-400" />
              <span>{activeFile?.name}</span>
            </div>
          )}

          {/* Preview / Code toggle */}
          <div className="flex rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-0.5">
            <button
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === 'preview'
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              <Eye size={11} />
              Preview
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === 'code'
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              <FileCode size={11} />
              Código
            </button>
          </div>

          {viewMode === 'code' && (
            <span className="ml-auto text-[9px] text-[var(--color-text-muted)]">
              Edições atualizam o preview em tempo real
            </span>
          )}
        </div>

        {/* Canvas area — full remaining height */}
        <div className="relative flex-1 min-h-0">

          {/* Truncation warning */}
          {isTruncated && (
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-2 bg-amber-500/10 border-b border-amber-500/30 px-3 py-2">
              <AlertTriangle size={12} className="text-amber-400 shrink-0" />
              <p className="text-[10px] text-amber-400/90">
                Preview incompleto — arquivo sincronizado antes da correção.{' '}
                <strong>Vá em Arquivos de Conhecimento e clique Sincronizar.</strong>
              </p>
            </div>
          )}

          {/* PREVIEW — iframe fills canvas */}
          <iframe
            srcDoc={htmlContent ?? '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body></body></html>'}
            sandbox="allow-scripts"
            title="Styleguide Preview"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              border: 'none',
              display: viewMode === 'preview' ? 'block' : 'none',
            }}
          />

          {/* CODE EDITOR — same space, toggled */}
          {viewMode === 'code' && (
            <textarea
              value={editableContent}
              onChange={e => handleCodeChange(e.target.value)}
              className="absolute inset-0 w-full h-full resize-none bg-[var(--color-bg-surface)] p-4 text-[11px] leading-relaxed text-[var(--color-text-secondary)] outline-none"
              style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace" }}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
          )}
        </div>
      </div>

      {/* ── TOKEN SIDEBAR ───────────────────────────────────────────────────── */}
      <div className="flex w-60 shrink-0 flex-col overflow-hidden rounded-xl border border-[var(--color-border-subtle)]">

        {/* Sidebar header */}
        <div className="shrink-0 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-2">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            <Palette size={10} className="text-amber-400/70" />
            Design Tokens
          </p>
        </div>

        {/* Scrollable token cards */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2.5 bg-[var(--color-bg-surface)]">

          {colorEntries.length > 0 && (
            <Section title="Paleta de Cores" icon={Palette}>
              <div className="grid grid-cols-2 gap-2">
                {colorEntries.slice(0, 6).map(([k, v]) => <ColorSwatch key={k} name={k} value={v} />)}
              </div>
              {tokens && tokens.palette.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-[var(--color-border-subtle)] pt-2.5">
                  {tokens.palette.slice(0, 12).map(hex => (
                    <div key={hex} className="flex flex-col items-center gap-0.5">
                      <div className="h-5 w-5 rounded border border-white/10" style={{ background: hex }} title={hex} />
                      <span className="text-[6px] font-mono text-[var(--color-text-muted)]">{hex}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {cssForPreviews && (
            <Section title="Tipografia" icon={Type}>
              <TypographyPreview cssContent={cssForPreviews} />
            </Section>
          )}

          {cssForPreviews && (
            <Section title="Componentes Ativos" icon={Layers}>
              <ComponentGallery cssContent={cssForPreviews} />
            </Section>
          )}

          <Section title="Espaçamento" icon={Ruler}>
            <SpacingBlocks spacings={tokens?.spacings ?? {}} />
          </Section>

          <Section title="Border Radius" icon={Square}>
            <RadiusBlocks radii={tokens?.radii ?? {}} />
          </Section>

        </div>

        {/* Oracle badge */}
        <div className="shrink-0 border-t border-amber-500/20 bg-amber-500/5 px-3 py-2">
          <p className="flex items-center gap-1.5 text-[9px] text-amber-400/80">
            <Palette size={9} />
            Tokens injetados no contexto do @ORACLE.
          </p>
        </div>
      </div>

    </div>
  )
}
