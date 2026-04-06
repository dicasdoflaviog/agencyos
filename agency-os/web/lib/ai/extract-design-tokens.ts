/**
 * Extracts design tokens (CSS custom properties + hex colors) from HTML or CSS content.
 * Returns a compact representation for Oracle context injection.
 */

export interface DesignTokens {
  colors:   Record<string, string>
  fonts:    Record<string, string>
  radii:    Record<string, string>
  spacings: Record<string, string>
  palette:  string[]           // raw hex values found in the file
  rawSummary: string           // compact text for AI context
}

export function extractDesignTokens(content: string): DesignTokens {
  const colors:   Record<string, string> = {}
  const fonts:    Record<string, string> = {}
  const radii:    Record<string, string> = {}
  const spacings: Record<string, string> = {}

  // CSS custom properties: --name: value
  const propRegex = /--([\w-]+)\s*:\s*([^;}\n]{1,120})/g
  let m: RegExpExecArray | null

  while ((m = propRegex.exec(content)) !== null) {
    const name  = m[1].toLowerCase()
    const value = m[2].trim()

    if (isColorValue(value)) {
      if (name.match(/color|bg|background|surface|text|foreground|primary|secondary|accent|border|ring/)) {
        colors[name] = value
      }
    } else if (name.match(/font|family|typeface/)) {
      fonts[name] = value
    } else if (name.match(/radius|rounded|corner/)) {
      radii[name] = value
    } else if (name.match(/space|gap|padding|margin|gutter|indent/)) {
      spacings[name] = value
    }
  }

  // Raw hex palette
  const hexSet = new Set<string>()
  const hexRegex = /#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b/g
  while ((m = hexRegex.exec(content)) !== null) {
    hexSet.add('#' + m[1].toUpperCase())
  }
  const palette = [...hexSet].slice(0, 20)

  // Build compact text for Oracle
  const lines: string[] = []
  if (Object.keys(colors).length > 0) {
    lines.push('CORES CSS: ' + Object.entries(colors).map(([k, v]) => `--${k}: ${v}`).join('; '))
  }
  if (palette.length > 0) {
    lines.push('PALETA HEX: ' + palette.join(', '))
  }
  if (Object.keys(fonts).length > 0) {
    lines.push('FONTES: ' + Object.entries(fonts).map(([k, v]) => `--${k}: ${v}`).join('; '))
  }
  if (Object.keys(radii).length > 0) {
    lines.push('BORDER-RADIUS: ' + Object.entries(radii).map(([k, v]) => `--${k}: ${v}`).join('; '))
  }

  return { colors, fonts, radii, spacings, palette, rawSummary: lines.join('\n') }
}

function isColorValue(v: string): boolean {
  return /^#[0-9A-Fa-f]{3,8}$/.test(v)
    || /^rgb/.test(v)
    || /^hsl/.test(v)
    || /^oklch/.test(v)
    || /^color\(/.test(v)
    || /^transparent$/.test(v)
}
