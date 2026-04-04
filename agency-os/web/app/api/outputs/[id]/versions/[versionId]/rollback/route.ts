import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const { id: outputId, versionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: version } = await supabase
    .from('output_versions')
    .select('content')
    .eq('id', versionId)
    .eq('output_id', outputId)
    .single()

  if (!version) return NextResponse.json({ error: 'Versão não encontrada' }, { status: 404 })

  const { error } = await supabase
    .from('job_outputs')
    .update({ output_content: version.content, approval_stage: 'draft' })
    .eq('id', outputId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
