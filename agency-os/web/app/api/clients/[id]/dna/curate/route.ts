import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkAndDeductCredits } from '@/lib/credits'

type Params = { params: Promise<{ id: string }> }

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const CURATOR_PROMPT = `Você é o @ORACLE, o Estrategista-Chefe da Agency OS. Sua missão é extrair a essência de uma marca a partir dos documentos e informações fornecidas, preenchendo o DNA de Campanha com precisão cirúrgica.

Analise todo o conteúdo disponível e retorne um JSON com exatamente estas 4 chaves:

{
  "biografia": "Texto fluido e inspirador sobre a história, missão, visão e marcos principais. Foco no 'porquê' do negócio.",
  "voz": "Lista de diretrizes de escrita em Markdown. Inclua: adjetivos de personalidade, tom (formal/informal), ritmo, exemplos de frases.",
  "credenciais": "Bullet points em Markdown com fatos incontestáveis: números, prêmios, tempo de mercado, depoimentos, selos de autoridade.",
  "proibidas": "Lista em Markdown de termos, gírias, promessas e conceitos que a marca NUNCA usa."
}

REGRA CRÍTICA: Se uma informação não estiver clara, use o marcador [Pendente: descreva o que falta] no lugar.
Retorne APENAS o JSON, sem texto extra.`

export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Gather context: existing DNA + knowledge files content + client info
  const [{ data: client }, { data: existingDNA }, { data: knowledgeFiles }, { data: memories }] =
    await Promise.all([
      supabase.from('clients').select('name, niche').eq('id', id).single(),
      supabase.from('client_dna').select('*').eq('client_id', id).maybeSingle(),
      supabase.from('knowledge_files').select('name, content_text').eq('client_id', id).eq('sync_status', 'synced'),
      supabase.from('client_memories').select('content, source').eq('client_id', id).limit(10),
    ])

  const contextParts: string[] = []

  if (client) {
    contextParts.push(`## Cliente\nNome: ${client.name}\nNicho: ${client.niche ?? 'Não informado'}`)
  }

  if (existingDNA && (existingDNA.biografia || existingDNA.voz || existingDNA.credenciais || existingDNA.proibidas)) {
    contextParts.push(`## DNA Atual (para melhorar)\n${JSON.stringify(existingDNA, null, 2)}`)
  }

  if (knowledgeFiles && knowledgeFiles.length > 0) {
    const filesText = knowledgeFiles
      .filter(f => f.content_text)
      .map(f => `### Arquivo: ${f.name}\n${f.content_text}`)
      .join('\n\n')
    if (filesText) contextParts.push(`## Arquivos de Conhecimento\n${filesText}`)
  }

  if (memories && memories.length > 0) {
    const memText = memories
      .filter(m => m.source !== 'knowledge_file')
      .map(m => m.content)
      .join('\n\n')
    if (memText) contextParts.push(`## Memórias e Briefings Anteriores\n${memText.slice(0, 4000)}`)
  }

  if (contextParts.length === 0) {
    return NextResponse.json(
      { error: 'Nenhum conteúdo disponível para análise. Adicione arquivos de conhecimento ou converse com o ORACLE primeiro.' },
      { status: 400 }
    )
  }

  const userMessage = contextParts.join('\n\n---\n\n')

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      system: CURATOR_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : ''

    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Resposta inválida da IA')
    const parsed = JSON.parse(jsonMatch[0]) as {
      biografia?: string
      voz?: string
      credenciais?: string
      proibidas?: string
    }

    const { data: member } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single()

    // Credit check
    if (member?.workspace_id) {
      const credit = await checkAndDeductCredits(member.workspace_id, 'dna_curate', 'DNA — curadoria com IA')
      if (!credit.ok) {
        return NextResponse.json({ error: credit.error, balance: credit.balance, cost: credit.cost }, { status: 402 })
      }
    }

    // Save to client_dna (only fill non-empty fields from AI)
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
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
