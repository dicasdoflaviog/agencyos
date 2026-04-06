import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openrouter } from '@/lib/openrouter/client'
import { getProviderModel } from '@/lib/openrouter/models'
import { checkAndDeductCredits } from '@/lib/credits'

type Params = { params: Promise<{ id: string }> }

const CURATOR_PROMPT = `Você é o @ORACLE, Estrategista-Chefe da Agency OS. Analise TODO o conteúdo fornecido e preencha o DNA de Campanha da marca.

RESPONDA APENAS COM UM OBJETO JSON VÁLIDO, sem markdown, sem texto antes ou depois, sem bloco de código. Comece com { e termine com }.

Estrutura obrigatória:
{
  "biografia": "Texto fluido sobre história, missão, visão e marcos. Foco no porquê do negócio. Mínimo 2 parágrafos.",
  "voz": "Diretrizes em Markdown: adjetivos de personalidade, tom (formal/informal), ritmo, exemplos de frases.",
  "credenciais": "Bullet points Markdown: números, prêmios, tempo de mercado, depoimentos, selos de autoridade.",
  "proibidas": "Lista Markdown de termos, gírias, promessas e conceitos que a marca NUNCA usa."
}

REGRA: Se uma informação não estiver clara no contexto, preencha com "[Pendente: descreva o que falta]".
JAMAIS deixe um campo vazio ou null. Sempre preencha algo baseado no contexto disponível.`

export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verificar workspace e créditos ANTES de chamar a IA
  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()

  if (member?.workspace_id) {
    const credit = await checkAndDeductCredits(member.workspace_id, 'dna_curate', 'DNA — curadoria com IA')
    if (!credit.ok) {
      return NextResponse.json({ error: credit.error, balance: credit.balance, cost: credit.cost }, { status: 402 })
    }
  }

  // Gather context: existing DNA + knowledge files content + client info
  const [{ data: client }, { data: existingDNA }, { data: knowledgeFiles }, { data: memories }] =
    await Promise.all([
      supabase.from('clients').select('name, niche, description').eq('id', id).single(),
      supabase.from('client_dna').select('*').eq('client_id', id).maybeSingle(),
      supabase.from('knowledge_files').select('name, content_text').eq('client_id', id).eq('sync_status', 'synced'),
      supabase.from('client_memories').select('content, source').eq('client_id', id).limit(20),
    ])

  const contextParts: string[] = []

  if (client) {
    const desc = (client as Record<string, unknown>).description as string | undefined
    contextParts.push(
      `## Cliente\nNome: ${client.name}\nNicho: ${client.niche ?? 'Não informado'}${desc ? `\nDescrição: ${desc}` : ''}`
    )
  }

  if (existingDNA && (existingDNA.biografia || existingDNA.voz || existingDNA.credenciais || existingDNA.proibidas)) {
    contextParts.push(`## DNA Atual (refine e melhore)\n${JSON.stringify({
      biografia: existingDNA.biografia,
      voz: existingDNA.voz,
      credenciais: existingDNA.credenciais,
      proibidas: existingDNA.proibidas,
    }, null, 2)}`)
  }

  if (knowledgeFiles && knowledgeFiles.length > 0) {
    const filesText = knowledgeFiles
      .filter(f => f.content_text)
      .map(f => `### Arquivo: ${f.name}\n${(f.content_text as string).slice(0, 3000)}`)
      .join('\n\n')
    if (filesText) contextParts.push(`## Arquivos de Conhecimento\n${filesText}`)
  }

  if (memories && memories.length > 0) {
    const memText = memories
      .filter(m => m.source !== 'knowledge_file')
      .map(m => m.content)
      .join('\n\n')
    if (memText) contextParts.push(`## Histórico de Conversas\n${memText.slice(0, 4000)}`)
  }

  // Mesmo com pouco contexto, prosseguimos — a IA usará [Pendente:] nos campos vazios
  const userMessage = contextParts.length > 0
    ? contextParts.join('\n\n---\n\n')
    : `## Cliente\nNome: desconhecido\nNenhuma informação disponível ainda.`

  try {
    // Prefill with '{' is Anthropic-specific; with OpenAI-compat we just ask for JSON directly
    const response = await openrouter.chat.completions.create({
      model: getProviderModel('oracle'),
      max_tokens: 2048,
      messages: [
        { role: 'system', content: CURATOR_PROMPT },
        { role: 'user', content: userMessage },
      ],
    })

    const continuation = response.choices[0]?.message?.content ?? ''
    const raw = continuation

    // Extrai JSON (lida com blocos markdown e texto extra)
    let parsed: { biografia?: string; voz?: string; credenciais?: string; proibidas?: string } | null = null

    // Tentativa 1: parse direto
    try {
      parsed = JSON.parse(raw)
    } catch {
      // Tentativa 2: extrair primeiro bloco {...}
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0])
        } catch {
          // Tentativa 3: extrair de bloco markdown ```json ... ```
          const mdMatch = raw.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
          if (mdMatch) parsed = JSON.parse(mdMatch[1])
        }
      }
    }

    if (!parsed) {
      console.error('[DNA Curate] Falha ao parsear resposta da IA:', raw.slice(0, 500))
      return NextResponse.json(
        { error: 'A IA não retornou um formato válido. Tente novamente ou adicione mais contexto ao cliente.' },
        { status: 500 }
      )
    }

    // Salvar no client_dna
    const updatePayload: Record<string, string> = {}
    if (parsed.biografia) updatePayload.biografia = parsed.biografia
    if (parsed.voz) updatePayload.voz = parsed.voz
    if (parsed.credenciais) updatePayload.credenciais = parsed.credenciais
    if (parsed.proibidas) updatePayload.proibidas = parsed.proibidas

    const { data: saved, error: saveError } = await supabase
      .from('client_dna')
      .upsert(
        { ...updatePayload, client_id: id, workspace_id: member?.workspace_id },
        { onConflict: 'client_id' }
      )
      .select()
      .single()

    if (saveError) throw new Error(saveError.message)

    return NextResponse.json({ data: saved, parsed })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[DNA Curate] Erro:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
