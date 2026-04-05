import { SupabaseClient } from '@supabase/supabase-js'
import { generateEmbedding } from './embeddings'

/**
 * Busca o DNA do cliente na memória vetorial.
 * Retorna o documento DNA completo se existir, ou os fragmentos mais relevantes.
 */
export async function getClientDNAContext(
  supabase: SupabaseClient,
  clientId: string,
  query?: string,
): Promise<string> {
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
    return `\n\n---\nBRAND DNA DO CLIENTE (use como referência obrigatória para todas as respostas):\n${dnaDoc.content}\n---\n`
  }

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
        return `\n\n---\nCONTEXTO DO CLIENTE (memória IA):\n${ctx}\n---\n`
      }
    }
  }

  // 3. Texto fallback: busca os últimos registros de DNA
  const { data: fields } = await supabase
    .from('client_memories')
    .select('content')
    .eq('client_id', clientId)
    .eq('source', 'dna_field')
    .order('created_at', { ascending: false })
    .limit(5)

  if (fields && fields.length > 0) {
    const ctx = fields.map(f => f.content).join('\n')
    return `\n\n---\nIDENTIDADE DA MARCA (campos capturados):\n${ctx}\n---\n`
  }

  return ''
}
