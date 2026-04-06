import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openrouter } from '@/lib/openrouter/client'
import { getProviderModel } from '@/lib/openrouter/models'
import { generateEmbedding } from '@/lib/ai/embeddings'

export const dynamic = 'force-dynamic'

// Full document prompt — uses form data + knowledge files as context
const DNA_PROMPT = (data: Record<string, unknown>, knowledgeContext: string) => `
Você é um especialista em branding e identidade de marca. Crie um documento de Brand DNA completo e estruturado.

MARCA: ${data.clientName}
NICHO: ${data.niche ?? 'Não informado'}
${knowledgeContext ? `\n## ARQUIVOS DE CONHECIMENTO DA MARCA\n${knowledgeContext}\n` : ''}
${!data.fromFiles ? `
DADOS ADICIONAIS FORNECIDOS:
- Público-alvo: ${data.targetAudience ?? 'Não informado'}
- Cor Primária: ${data.primaryColor} | Secundária: ${data.secondaryColor} | Destaque: ${data.accentColor} | Fundo: ${data.backgroundColor}
- Restrições visuais: ${data.doNotUse || 'Nenhuma'}
- Fontes: Títulos: ${data.headingFont || 'A definir'} | Corpo: ${data.bodyFont || 'A definir'}
- Arquétipo: ${data.archetype || 'Não definido'}
- Tom de voz: ${Array.isArray(data.tones) ? (data.tones as string[]).join(', ') : 'Não definido'}
- Persona: ${data.persona || 'Não definida'}
- Léxico: ${data.lexicon || 'Não definido'}
- Proibidos: ${data.forbidden || 'Nenhum'}
- Concorrentes: ${data.competitors || 'Não informados'}
- Diferencial: ${data.differentiation || 'Não informado'}
` : ''}
---

Gere o documento com as seções abaixo (use ## para cada uma). Use os arquivos de conhecimento como fonte principal — extraia informações reais sobre a marca, não invente.

## Identidade Visual
## Tipografia
## Paleta de Estilos
## Persona da Marca
## Tom de Voz por Canal
## Léxico e Vocabulário
## Regras para Carrosséis
## Posicionamento

Seja específico e prático. O documento será usado por agentes de IA para gerar conteúdo consistente. Responda em português.
`

// Extraction prompt — reads the generated document and extracts the 4 structured fields
const EXTRACT_PROMPT = (doc: string) => `
Com base neste documento de Brand DNA, extraia as 4 informações estruturadas da marca.
RESPONDA APENAS COM JSON VÁLIDO, sem markdown, sem texto adicional.

DOCUMENTO:
${doc.slice(0, 4000)}

JSON esperado:
{
  "biografia": "Texto sobre história, missão, visão e propósito da marca. Mínimo 2 parágrafos.",
  "voz": "Diretrizes de comunicação: arquétipo, adjetivos de personalidade, tom, exemplos de frases por canal.",
  "credenciais": "Prova social, diferenciais competitivos, números, autoridade e posicionamento de mercado.",
  "proibidas": "Lista de termos, abordagens, clichês e promessas que a marca NUNCA usa."
}

REGRA: Se não encontrar a info, use "[Inferido do contexto: ...]". NUNCA deixe campo vazio.
`

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY não configurada' }, { status: 500 })
  }

  // 1. Read client info + synced knowledge files in parallel
  const [{ data: client }, { data: knowledgeFiles }] = await Promise.all([
    supabase.from('clients').select('name, niche, description').eq('id', clientId).single(),
    supabase.from('knowledge_files').select('name, content_text').eq('client_id', clientId).eq('sync_status', 'synced'),
  ])

  const knowledgeContext = (knowledgeFiles ?? [])
    .filter(f => f.content_text)
    .map(f => `### Arquivo: ${f.name}\n${(f.content_text as string).slice(0, 3000)}`)
    .join('\n\n')

  // Merge client data into body
  const enrichedBody = {
    ...body,
    clientName: client?.name ?? body.clientName,
    niche: client?.niche ?? body.niche,
  }

  // 2. Generate the full DNA document
  const prompt = DNA_PROMPT(enrichedBody, knowledgeContext)

  let dnaContent: string
  try {
    const res = await openrouter.chat.completions.create({
      model: getProviderModel('dna'),
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    })
    dnaContent = res.choices[0]?.message?.content ?? ''
  } catch (err) {
    return NextResponse.json({ error: `OpenRouter error: ${String(err)}` }, { status: 502 })
  }

  if (!dnaContent.trim()) {
    return NextResponse.json({ error: 'Claude retornou resposta vazia' }, { status: 502 })
  }

  // 3. Save full document to client_memories
  const embedding = await generateEmbedding(dnaContent)
  const insertPayload: Record<string, unknown> = {
    client_id: clientId,
    content: dnaContent,
    source: 'dna_document',
    source_id: crypto.randomUUID(),
  }
  if (embedding) insertPayload.embedding = `[${embedding.join(',')}]`

  const { error: memErr } = await supabase.from('client_memories').insert(insertPayload)
  if (memErr) return NextResponse.json({ error: memErr.message }, { status: 500 })

  // 4. Extract structured fields from the document and save to client_dna
  try {
    const extractRes = await openrouter.chat.completions.create({
      model: getProviderModel('dna'),
      max_tokens: 1500,
      messages: [
        { role: 'user', content: EXTRACT_PROMPT(dnaContent) },
      ],
    })
    const raw = extractRes.choices[0]?.message?.content ?? ''

    let extracted: Record<string, string> | null = null
    try { extracted = JSON.parse(raw) } catch { /* ignore */ }

    if (extracted && (extracted.biografia || extracted.voz)) {
      await supabase.from('client_dna').upsert({
        client_id: clientId,
        biografia: extracted.biografia ?? null,
        voz: extracted.voz ?? null,
        credenciais: extracted.credenciais ?? null,
        proibidas: extracted.proibidas ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'client_id' })
    }
  } catch { /* non-fatal — document is already saved */ }

  // 5. Save raw form entries to client_memories (only when form was used)
  if (!body.fromFiles) {
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
  }

  return NextResponse.json({ success: true, hasKnowledgeFiles: knowledgeFiles && knowledgeFiles.length > 0 })
}
