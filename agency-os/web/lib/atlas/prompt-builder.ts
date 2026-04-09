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

// ── Agency OS Layout Templates (7 estilos visuais do design system) ──────────
// Cada template define o estilo de background ideal para aquele layout de slide.
// Os templates são dark-themed (bg #0C0C0E, accent amber #F59E0B, Inter font).
const TEMPLATE_IMAGE_STYLE_MAP: Record<string, { style: string; overlay: string }> = {
  // T01 — Produto Flutuante: fundo escuro radial com anéis concêntricos + card flutuante
  'produto-flutuante': {
    style: 'dark atmospheric tech background, subtle concentric circular ring patterns, deep space feel, amber-gold light accents glowing from center, ultra minimal texture',
    overlay: 'Leave ample dark space around center for floating UI card element. Radial dark gradient.',
  },
  // T02 — Modal Clean / Card Form: fundo limpo escuro, minimalista, card central
  'modal-clean': {
    style: 'clean dark charcoal background, very subtle geometric grid texture, professional minimal, no busy elements, pure depth',
    overlay: 'Centered composition with clear dark area for card overlay. Minimal and precise.',
  },
  // T03 — Título + Cards Foto: fotografia editorial real + espaço para headline
  'foto-cards': {
    style: 'editorial photography, authentic human moment or lifestyle product shot, warm natural lighting, magazine quality, real people or scenarios',
    overlay: 'Leave dark top area (1/3) for bold headline text. Vibrant subject below.',
  },
  // T04 — Problema → Solução + Stats: composição dividida, contraste dramático
  'problema-solucao': {
    style: 'dramatic split-tone composition, high contrast light and shadow, cinematic storytelling, before/after narrative mood, strong directional lighting',
    overlay: 'Two-zone composition: dark left side for text, brighter right side for visual element.',
  },
  // T05 — Título Bold + Tag Cloud: fundo escuro para tipografia grande + chips/tags
  'titulo-bold': {
    style: 'bold dark background, subtle ambient glow, smooth dark gradient surface, minimal texture, typography-ready canvas',
    overlay: 'Nearly solid dark background to support large bold text and floating tag/chip elements.',
  },
  // T06 — Fundo Sólido + Preview + Ícones: fundo âmbar sólido, limpo e vibrante
  'fundo-solido': {
    style: 'rich solid amber-golden warm background, clean and vibrant, very minimal graphic elements, brand-forward energy, flat design aesthetic',
    overlay: 'Solid warm amber/golden background — leave center clear for UI preview mockup.',
  },
  // T07 — Grid Escuro + Agentes: grid tech escuro, atmosfera IA/futurista
  'grid-agentes': {
    style: 'dark matrix grid pattern, futuristic AI network visualization, node connections glowing amber, deep dark blue-black atmosphere, tech infrastructure mood',
    overlay: 'Dark grid visible in background. Leave upper third for headline and lower area for card elements.',
  },
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
  // Per-slide template_id tem prioridade sobre o template do carrossel
  const effectiveTemplate = slide.template_id ?? template
  const agencyTemplate = TEMPLATE_IMAGE_STYLE_MAP[effectiveTemplate]

  const parts = [
    // Contexto da cena — derivado do conteúdo do slide (mais importante)
    slide.image_context || `Professional marketing visual for: ${slide.title}`,

    // Identidade de marca no estilo visual (brand context para o gerador de imagem)
    dna.client_name
      ? `Brand: ${dna.client_name}${dna.niche ? `, ${dna.niche}` : ''}`
      : '',

    // Estilo do template (Agency OS ou visual style da marca)
    agencyTemplate
      ? agencyTemplate.style
      : (VISUAL_STYLE_MAP[dna.visual_style] ?? VISUAL_STYLE_MAP.minimalista),

    // Tom visual da marca (sempre aplicado)
    TONE_VISUAL_MAP[dna.tone] ?? TONE_VISUAL_MAP.profissional,

    // Cor primária da marca — usada como accent nas imagens geradas
    dna.primary_color && dna.primary_color !== '#000000'
      ? `Use ${dna.primary_color} as the dominant accent color`
      : '',

    // Fontes da marca como dica de atmosfera visual
    dna.font_heading
      ? `Typography-forward composition inspired by ${dna.font_heading} editorial style`
      : '',

    // Público-alvo — orienta o mood da imagem
    dna.target_audience ? `Target audience visual style: ${dna.target_audience}` : '',

    // Instruções de overlay do template (como deixar espaço para o texto/UI)
    agencyTemplate
      ? agencyTemplate.overlay
      : 'Clean background with visual breathing room. Subject centered or left-aligned.',

    // Para o template editorial (titulo-bold), a imagem é fundo sutil — texto domina
    effectiveTemplate === 'titulo-bold'
      ? 'Very subtle background texture only — image will be overlaid with large typography. Keep extremely low contrast.'
      : '',

    // Estilo de referência personalizado
    customStyle || '',

    // Padrão de qualidade
    'High visual impact, scroll-stopping composition, professional quality',
    'No text, no watermarks, no logos in the image',
    'Suitable for Instagram marketing creative',
  ]

  return parts.filter(Boolean).join('. ')
}

export function getAspectRatio(format: string): string {
  return FORMAT_ASPECT_MAP[format] ?? '4:5'
}
