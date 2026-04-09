// lib/atlas/vera-copy.ts
// VERA gera a estrutura de copy do carrossel antes do ATLAS gerar imagens

import { routeChat } from '@/lib/openrouter/IntelligenceRouter'
import { ClientDNAContext } from './dna'

export interface SlideContent {
  number: number
  title: string
  subtitle: string
  image_context: string   // o que a imagem deve mostrar (em inglês)
}

export interface CarouselCopy {
  hook: string
  slides: SlideContent[]
  cta: string
  caption: string
}

const TONE_MAP: Record<string, string> = {
  profissional:  'professional, authoritative, trustworthy',
  casual:        'friendly, conversational, warm, approachable',
  inspiracional: 'motivational, aspirational, uplifting, energizing',
  tecnico:       'precise, data-driven, informative, expert',
  humor:         'playful, witty, fun, light-hearted',
}

const TEMPLATE_COPY_MAP: Record<string, string> = {
  minimalista: 'Títulos curtos e impactantes (máx 6 palavras). Tom dramático. Ganchos polêmicos ou contraintuitivos.',
  profile:     'Texto mais longo e informativo. Estilo de thread/tweet. Compartilhável. Dados e insights.',
}

export async function generateCarouselCopy(
  userPrompt: string,
  slideCount: number,
  template: string,
  dna: ClientDNAContext
): Promise<CarouselCopy> {

  const prompt = `Você é VERA, copywriter especialista em carrosséis virais para Instagram brasileiro.

CLIENTE: ${dna.client_name} — ${dna.niche}
TOM: ${TONE_MAP[dna.tone] ?? TONE_MAP.profissional}
PÚBLICO-ALVO: ${dna.target_audience || 'Não especificado'}
MENSAGEM CENTRAL: ${dna.key_message || 'Não especificada'}
BRAND VOICE: ${dna.brand_voice_text?.slice(0, 400) || 'Profissional e direto'}
TEMPLATE: ${template} — ${TEMPLATE_COPY_MAP[template] ?? ''}

TEMA DO CARROSSEL: "${userPrompt}"
NÚMERO DE SLIDES: ${slideCount}

Crie o copy completo. Retorne APENAS JSON válido sem markdown:
{
  "hook": "gancho irresistível para o slide 1 — máx 6 palavras — deve parar o scroll",
  "slides": [
    {
      "number": 1,
      "title": "título do slide — máx 6 palavras para minimalista, 15 para profile",
      "subtitle": "frase de apoio — máx 20 palavras",
      "image_context": "descreva a cena ideal para a imagem deste slide em inglês"
    }
  ],
  "cta": "chamada para ação do último slide — direta e clara",
  "caption": "legenda completa para o post — tom natural, 3-5 parágrafos curtos + hashtags relevantes"
}

REGRAS OBRIGATÓRIAS:
- Slide 1: gancho que gera curiosidade ou provoca (NÃO comece com "5 dicas de")
- Slides intermediários: cada um entrega valor isolado
- Último slide: CTA claro (comentar, salvar, seguir, enviar mensagem)
- image_context em inglês, descreve cena fotorrealista relacionada ao conteúdo do slide
- caption com emojis moderados e hashtags PT-BR relevantes ao nicho`

  const result = await routeChat('vera', [
    { role: 'user', content: prompt }
  ], { maxTokens: 2000 })

  try {
    const clean = result.content.replace(/```json|```/g, '').trim()
    return JSON.parse(clean) as CarouselCopy
  } catch {
    // Fallback estruturado caso o JSON falhe
    return {
      hook: userPrompt.slice(0, 30),
      slides: Array.from({ length: slideCount }, (_, i) => ({
        number: i + 1,
        title: i === 0 ? userPrompt : `Ponto ${i}`,
        subtitle: '',
        image_context: `Professional marketing image related to ${dna.niche}`,
      })),
      cta: 'Salva esse conteúdo!',
      caption: userPrompt,
    }
  }
}
