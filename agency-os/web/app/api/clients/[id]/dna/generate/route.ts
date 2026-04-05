import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/ai/embeddings'

export const dynamic = 'force-dynamic'

const DNA_PROMPT = (data: Record<string, unknown>) => `
Você é um especialista em branding e identidade de marca. Crie um documento de Brand DNA completo e estruturado para a marca abaixo.

DADOS DA MARCA:
Nome: ${data.clientName}
Nicho/Segmento: ${data.niche ?? 'Não informado'}
Público-alvo: ${data.targetAudience ?? 'Não informado'}

IDENTIDADE VISUAL:
- Cor Primária: ${data.primaryColor}
- Cor Secundária: ${data.secondaryColor}
- Cor de Destaque: ${data.accentColor}
- Cor de Fundo: ${data.backgroundColor}
- Restrições visuais: ${data.doNotUse || 'Nenhuma informada'}

TIPOGRAFIA:
- Fonte de Títulos: ${data.headingFont || 'A definir'}
- Fonte de Corpo: ${data.bodyFont || 'A definir'}
- Notas: ${data.fontNotes || 'Nenhuma'}

BRAND VOICE:
- Arquétipo: ${data.archetype || 'Não definido'}
- Tom de voz: ${Array.isArray(data.tones) ? (data.tones as string[]).join(', ') : 'Não definido'}
- Persona da marca: ${data.persona || 'Não definida'}
- Léxico característico: ${data.lexicon || 'Não definido'}
- Palavras/abordagens proibidas: ${data.forbidden || 'Nenhuma'}
- Notas por canal: ${data.channelNotes || 'Nenhuma'}

POSICIONAMENTO:
- Concorrentes: ${data.competitors || 'Não informados'}
- Marcas de inspiração: ${data.inspiration || 'Não informadas'}
- Diferencial competitivo: ${data.differentiation || 'Não informado'}

---

Gere o documento no seguinte formato (use ## para cada seção):

## Identidade Visual
[Descreva as cores, seu uso correto, combinações permitidas e proibidas, sensação que cada cor transmite]

## Tipografia
[Descreva as fontes, hierarquia tipográfica, uso em títulos vs corpo, tamanhos mínimos recomendados]

## Paleta de Estilos
[Descreva o estilo visual geral: moderno/clássico, flat/3D, minimalista/maximalista, regras de composição para carrosséis e posts]

## Persona da Marca
[Descreva a persona como se fosse uma pessoa real: nome simbólico, idade, personalidade, como fala, o que valoriza]

## Tom de Voz por Canal
[Explique como a marca se comunica em: Instagram Feed, Reels/Stories, Email Marketing, Anúncios pagos]

## Léxico e Vocabulário
[Liste as palavras-chave da marca, frases características, vocabulário proibido e alternativas]

## Regras para Carrosséis
[Defina estrutura de slides, número de slides ideal, hierarquia de informação, CTA padrão]

## Posicionamento
[Resumo do diferencial, como a marca se posiciona vs concorrência, proposta de valor em 1 frase]

Seja específico, prático e direto. O documento será usado por agentes de IA para gerar conteúdo consistente. Responda em português.
`

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurada' }, { status: 500 })

  // 1. Generate the DNA Document via Claude
  const prompt = DNA_PROMPT(body)
  const anthropic = new Anthropic({ apiKey: anthropicKey })

  let dnaContent: string
  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    })
    dnaContent = message.content
      .filter(b => b.type === 'text')
      .map(b => ('text' in b ? b.text : ''))
      .join('\n')
  } catch (err) {
    return NextResponse.json({ error: `Claude error: ${String(err)}` }, { status: 502 })
  }

  if (!dnaContent.trim()) {
    return NextResponse.json({ error: 'Claude retornou resposta vazia' }, { status: 502 })
  }

  // 2. Save the full DNA document in client_memories
  const embedding = await generateEmbedding(dnaContent)

  const insertPayload: Record<string, unknown> = {
    client_id: clientId,
    content: dnaContent,
    source: 'dna_document',
    source_id: `dna_${Date.now()}`,
  }
  if (embedding) insertPayload.embedding = `[${embedding.join(',')}]`

  const { error: memErr } = await supabase.from('client_memories').insert(insertPayload)
  if (memErr) return NextResponse.json({ error: memErr.message }, { status: 500 })

  // 3. Also save raw form data as separate memory entries for granular retrieval
  const rawEntries = [
    { label: 'Cores da marca', value: `Primária: ${body.primaryColor} | Secundária: ${body.secondaryColor} | Destaque: ${body.accentColor} | Fundo: ${body.backgroundColor}` },
    { label: 'Tipografia', value: `Títulos: ${body.headingFont || 'A definir'} | Corpo: ${body.bodyFont || 'A definir'}${body.fontNotes ? ' | ' + body.fontNotes : ''}` },
    { label: 'Tom de voz', value: `Arquétipo: ${body.archetype} | Tom: ${(body.tones as string[]).join(', ')} | Persona: ${body.persona}` },
    { label: 'Vocabulário da marca', value: `Léxico: ${body.lexicon} | Proibido: ${body.forbidden}` },
    { label: 'Público-alvo e posicionamento', value: `Público: ${body.targetAudience} | Diferencial: ${body.differentiation}` },
  ].filter(e => e.value.trim().replace(/\|/g, '').trim().length > 10)

  for (const entry of rawEntries) {
    const content = `[DNA — ${entry.label}] ${entry.value}`
    const emb = await generateEmbedding(content)
    const p: Record<string, unknown> = { client_id: clientId, content, source: 'dna_field' }
    if (emb) p.embedding = `[${emb.join(',')}]`
    await supabase.from('client_memories').insert(p)
  }

  return NextResponse.json({ success: true })
}
