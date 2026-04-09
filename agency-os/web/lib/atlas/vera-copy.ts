// lib/atlas/vera-copy.ts
// VERA gera a estrutura de copy do carrossel antes do ATLAS gerar imagens

import { routeChat } from '@/lib/openrouter/IntelligenceRouter'
import { ClientDNAContext, formatDNAContext } from './dna'
import { TemplateId, SlideTemplateData, INTENT_MAPPING_RULES } from '@/components/atlas/templates'

export interface SlideContent {
  number: number
  title: string
  subtitle: string
  image_context: string   // o que a imagem deve mostrar (em inglês)
  template_id: TemplateId // qual dos 7 blueprints usar para este slide
  template_data?: SlideTemplateData // dados opcionais específicos do template
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

  // Mapa de instruções por template Agency OS para ajudar VERA a escolher image_context adequado
  const TEMPLATE_VERA_GUIDE: Record<string, string> = {
    'produto-flutuante': 'Template escuro com card UI flutuante no centro. image_context: fundo atmosférico dark com elementos tech/circulares sutis, espaço central para card.',
    'modal-clean':       'Template minimalista dark com modal/card limpo. image_context: fundo escuro liso, sem elementos visuais complexos, espaço central vazio.',
    'foto-cards':        'Template com fotografia + strip de cards abaixo. image_context: cena fotorrealista humana ou de produto com boa iluminação natural, recortável.',
    'problema-solucao':  'Template split: problema vs. solução. image_context: composição dramática com contraste luz/sombra, duas zonas visuais distintas.',
    'titulo-bold':       'Template com título grande + tag cloud. image_context: fundo escuro simples (quase sólido), sem competir com a tipografia.',
    'fundo-solido':      'Template com fundo sólido âmbar + preview + ícones. image_context: fundo âmbar/dourado plano, quente e vibrante, muito limpo.',
    'grid-agentes':      'Template grid tech dark + cards de agentes. image_context: grid futurista com nós e conexões, atmosfera IA, azul-preto profundo.',
  }
  const templateGuide = TEMPLATE_VERA_GUIDE[template] ?? ''

  const prompt = `Você é VERA, copywriter especialista em carrosséis virais para Instagram brasileiro.

${dnaContext}

TEMPLATE VISUAL DO CARROSSEL: ${template}
${templateGuide ? templateGuide : template === 'minimalista'
  ? 'Minimalista — títulos curtos e impactantes (máx 6 palavras). Tom dramático. Ganchos contraintuitivos e polêmicos.'
  : 'Profile/Twitter — texto informativo estilo thread. Compartilhável. Dados e insights.'}

TEMA DO CARROSSEL: "${userPrompt}"
NÚMERO DE SLIDES: ${slideCount}

${INTENT_MAPPING_RULES}

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
      "image_context": "descreva a cena ideal para a imagem deste slide em inglês",
      "template_id": "titulo-bold",
      "template_data": {
        "tags": ["palavra1", "palavra2"],
        "accentPhrase": "palavra de destaque no título",
        "ctaText": "texto do botão se houver"
      }
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
- caption com emojis moderados e hashtags PT-BR relevantes ao nicho
- template_id: escolha baseado nas REGRAS DE SELEÇÃO DE TEMPLATE acima — um por slide
- template_data: inclua apenas campos relevantes para o template escolhido (tags para titulo-bold, problem/solution para problema-solucao, features para produto-flutuante, etc). Pode omitir se não houver dados específicos.`

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
        template_id: 'titulo-bold' as TemplateId,
      })),
      cta: 'Salva esse conteúdo!',
      caption: userPrompt,
    }
  }
}
