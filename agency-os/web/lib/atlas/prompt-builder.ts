// lib/atlas/prompt-builder.ts
// Constrói o prompt de imagem para cada slide com DNA aplicado

import { ClientDNAContext } from './dna'
import { SlideContent } from './vera-copy'

const VISUAL_STYLE_MAP: Record<string, string> = {
  minimalista:    'cinematic, dramatic lighting, high contrast, dark moody atmosphere, editorial photography, film grain',
  bold:           'bold graphic design, vibrant saturated colors, strong geometric elements, energetic composition',
  cinematografico:'epic cinematic composition, dramatic storytelling, atmospheric depth, film quality lighting',
  colorido:       'colorful, modern, clean, bright, energetic, optimistic lighting',
  profile:        'clean neutral background, soft professional lighting, editorial portrait style, minimal',
}

const TONE_VISUAL_MAP: Record<string, string> = {
  profissional:  'sophisticated, polished, corporate aesthetic',
  casual:        'warm tones, natural lighting, approachable feel',
  inspiracional: 'uplifting composition, golden hour light, aspirational mood',
  tecnico:       'precise, technical, structured, data visualization aesthetic',
  humor:         'playful colors, dynamic angles, fun energy',
}

const FORMAT_ASPECT_MAP: Record<string, string> = {
  // ── Instagram ────────────────────────────────────────────────
  ig_feed_portrait: '4:5',     // 1080×1350 — mais alcance no feed
  ig_feed_square:   '1:1',     // 1080×1080 — feed quadrado clássico
  ig_stories:       '9:16',    // 1080×1920 — Stories e Reels
  ig_reels:         '9:16',    // 1080×1920 — Reels (mesmo que stories)
  // ── Facebook ─────────────────────────────────────────────────
  fb_feed:          '1:1',     // 1080×1080 — feed do Facebook
  fb_stories:       '9:16',    // 1080×1920 — Stories
  fb_ad:            '1.91:1',  // 1200×628  — anúncio padrão (Link + carrossel)
  // ── TikTok ───────────────────────────────────────────────────
  tiktok:           '9:16',    // 1080×1920 — vertical nativo
  // ── YouTube ──────────────────────────────────────────────────
  yt_thumbnail:     '16:9',    // 1280×720  — thumbnail padrão
  // ── LinkedIn ─────────────────────────────────────────────────
  linkedin_post:    '1.91:1',  // 1200×627  — post do feed
  // ── Twitter / X ──────────────────────────────────────────────
  twitter_post:     '16:9',    // 1600×900  — imagem no tweet
  // ── Legacy (retrocompatibilidade) ────────────────────────────
  feed:      '4:5',
  stories:   '9:16',
  banner:    '16:9',
  thumbnail: '16:9',
  portrait:  '9:16',
  carousel:  '4:5',
  square:    '1:1',
}

export function buildImagePrompt(
  slide: SlideContent,
  dna: ClientDNAContext,
  template: string,
  customStyle?: string
): string {
  const parts = [
    // Contexto da cena — derivado do conteúdo do slide (mais importante)
    slide.image_context || `Professional marketing visual for: ${slide.title}`,

    // Estilo visual da marca
    VISUAL_STYLE_MAP[dna.visual_style] ?? VISUAL_STYLE_MAP.minimalista,
    TONE_VISUAL_MAP[dna.tone] ?? TONE_VISUAL_MAP.profissional,

    // Cor primária da marca
    dna.primary_color ? `Color palette includes ${dna.primary_color} as accent` : '',

    // Contexto do negócio
    dna.niche ? `Industry context: ${dna.niche}` : '',
    dna.target_audience ? `Target audience visual style: ${dna.target_audience}` : '',

    // Diretriz de template
    template === 'minimalista'
      ? 'Leave dark area at bottom third for text overlay. Dramatic foreground subject.'
      : 'Clean background with visual breathing room. Subject centered or left-aligned.',

    // Estilo de referência personalizado
    customStyle || '',

    // Técnicas de viralização
    'High visual impact, scroll-stopping composition, professional quality',
    'No text, no watermarks, no logos in the image',
    'Suitable for Instagram marketing creative',
  ]

  return parts.filter(Boolean).join('. ')
}

export function getAspectRatio(format: string): string {
  return FORMAT_ASPECT_MAP[format] ?? '4:5'
}
