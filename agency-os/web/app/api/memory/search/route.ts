import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/ai/embeddings'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const clientId = searchParams.get('client_id')
  const q = searchParams.get('q')

  if (!clientId || !q) {
    return NextResponse.json({ error: 'client_id and q required' }, { status: 400 })
  }

  // Vector search via Gemini embeddings
  const embedding = await generateEmbedding(q)
  if (embedding) {
    const { data: rpcData, error: rpcError } = await supabase.rpc('match_client_memories', {
      query_embedding: embedding,
      match_client_id: clientId,
      match_threshold: 0.7,
      match_count: 10,
    })

    if (!rpcError && rpcData) {
      return NextResponse.json(rpcData)
    }
  }

  // Fallback: full-text search
  const { data, error } = await supabase
    .from('client_memories')
    .select('*')
    .eq('client_id', clientId)
    .ilike('content', `%${q}%`)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
