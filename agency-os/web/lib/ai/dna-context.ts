import { SupabaseClient } from '@supabase/supabase-js'
import { generateEmbedding } from './embeddings'
import { extractDesignTokens } from './extract-design-tokens'

/**
 * Busca o DNA do cliente na memória vetorial.
 * Retorna o documento DNA completo se existir, ou os fragmentos mais relevantes.
 */
export async function getClientDNAContext(
  supabase: SupabaseClient,
  clientId: string,
  query?: string,
): Promise<string> {
  const parts: string[] = []

  // 1. Tenta buscar o DNA Document completo primeiro
  const { data: dnaDoc } = await supabase
    .from('client_memories')
    .select('content')
    .eq('client_id', clientId)
    .eq('source', 'dna_document')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (dnaDoc?.content) {
    parts.push(`BRAND DNA DO CLIENTE (use como referência obrigatória para todas as respostas):\n${dnaDoc.content}`)
  } else {
    // 2. Fallback: busca semântica nos fragmentos de DNA
    if (query) {
      const embedding = await generateEmbedding(query)
      if (embedding) {
        const { data: memories } = await supabase.rpc('match_client_memories', {
          query_embedding: embedding,
          match_client_id: clientId,
          match_threshold: 0.6,
          match_count: 5,
        })
        if (memories && memories.length > 0) {
          const ctx = (memories as { content: string }[]).map(m => m.content).join('\n')
          parts.push(`CONTEXTO DO CLIENTE (memória IA):\n${ctx}`)
        }
      }
    }

    // 3. Texto fallback: busca os últimos registros de DNA
    if (parts.length === 0) {
      const { data: fields } = await supabase
        .from('client_memories')
        .select('content')
        .eq('client_id', clientId)
        .eq('source', 'dna_field')
        .order('created_at', { ascending: false })
        .limit(5)

      if (fields && fields.length > 0) {
        const ctx = fields.map(f => f.content).join('\n')
        parts.push(`IDENTIDADE DA MARCA (campos capturados):\n${ctx}`)
      }
    }
  }

  // 4. Inject styleguide design tokens (HTML/CSS files synced)
  const { data: styleguideFiles } = await supabase
    .from('knowledge_files')
    .select('name, content_text, file_type')
    .eq('client_id', clientId)
    .eq('sync_status', 'synced')
    .or('name.ilike.%.html,name.ilike.%.css,file_type.eq.html,file_type.eq.css')
    .limit(3)

  if (styleguideFiles && styleguideFiles.length > 0) {
    const tokenParts: string[] = []
    for (const file of styleguideFiles) {
      if (!file.content_text) continue
      const tokens = extractDesignTokens(file.content_text as string)
      if (tokens.rawSummary) {
        tokenParts.push(`[${file.name}]\n${tokens.rawSummary}`)
      }
    }
    if (tokenParts.length > 0) {
      parts.push(`STYLEGUIDE — DESIGN TOKENS DA MARCA (use ao descrever criativos para o ATLAS):\n${tokenParts.join('\n\n')}`)
    }
  }

  if (parts.length === 0) return ''

  return `\n\n---\n${parts.join('\n\n---\n')}\n---\n`
}
