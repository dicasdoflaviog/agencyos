import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { memory_id } = await req.json()

  // Delete the main DNA document
  if (memory_id) {
    await supabase.from('client_memories').delete().eq('id', memory_id).eq('client_id', clientId)
  }

  // Also delete all DNA field entries so wizard shows again fresh
  await supabase
    .from('client_memories')
    .delete()
    .eq('client_id', clientId)
    .in('source', ['dna_document', 'dna_field'])

  return NextResponse.json({ success: true })
}
