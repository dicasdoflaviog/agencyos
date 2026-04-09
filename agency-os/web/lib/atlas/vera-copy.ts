// lib/atlas/vera-copy.ts
// VERA gera a estrutura de copy do carrossel antes do ATLAS gerar imagens

import { routeChat } from '@/lib/openrouter/IntelligenceRouter'
import { ClientDNAContext, formatDNAContext } from './dna'

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

export async function generateCarouselCopy(
  userPrompt: string,
  slideCount: number,
  template: string,
  dna: ClientDNAContext
): Promise<CarouselCopy> {

  // DNA completo injetado — inclui todos os pilares (Biografia, Voz, Credenciais, Proibidas)
  const dnaContext = formatDNAContext(dna)

  const prompt = `Você é VERA, copywriter especialista em carrosséis virais para Instagram brasileiro.

${dnaContext}

TEMPLATE: ${template === 'minimalista'
  ? 'Minimalista — títulos curtos e impactantes (máx 6 palavras). Tom dramático. Ganchos contraintuitivos e polêmicos.'
  : 'Profile/Twitter — texto informativo estilo thread. Compartilhável. Dados e insights.'}

TEMA DO CARROSSEL: "${userPrompt}"
NÚMERO DE SLIDES: ${slideCount}

ATENÇÃO: Leia o DNA acima com cuidado antes de escrever qualquer palavra.
Respeite TODAS as palavras proibidas, o tom, o ritmo e as estruturas preferidas da marca.
Se houver exemplos de frases certas no Brand Voice, siga o mesmo estilo.

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
    // Remove blocos <think>...</think> do Qwen3 antes de parsear
    const stripped = result.content
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/```json|```/g, '')
      .trim()

    // Extrai o objeto JSON mesmo que haja texto antes/depois
    const jsonMatch = stripped.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error(`Nenhum JSON encontrado na resposta VERA. Preview: ${stripped.slice(0, 200)}`)

    const parsed = JSON.parse(jsonMatch[0]) as CarouselCopy

    // Garante que slides têm o número correto de entradas
    if (!Array.isArray(parsed.slides) || parsed.slides.length === 0) {
      throw new Error('VERA retornou slides vazios')
    }

    return parsed
  } catch (err) {
    console.error('[VERA] Falha ao parsear JSON:', err, '\nResposta bruta (500 chars):', result.content.slice(0, 500))
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
