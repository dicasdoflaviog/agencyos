import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/ai/embeddings'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { client_id, content, source, source_id } = body

  if (!client_id || !content) {
    return NextResponse.json({ error: 'client_id and content required' }, { status: 400 })
  }

  const embedding = await generateEmbedding(content)

  const insertData: Record<string, unknown> = {
    client_id,
    content,
    source: source ?? null,
    source_id: source_id ?? null,
  }
  if (embedding) insertData.embedding = `[${embedding.join(',')}]`

  const { data, error } = await supabase
    .from('client_memories')
    .insert(insertData)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
