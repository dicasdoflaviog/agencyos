import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { startSDRPipeline } from '@/lib/sdr/pipeline'

// Versão sem auth — para o formulário público /captacao da própria agência.
// Requer AGENCY_WORKSPACE_ID no Vercel env.
export async function POST(request: NextRequest) {
  const workspaceId = process.env.AGENCY_WORKSPACE_ID
  if (!workspaceId) {
    return NextResponse.json({ error: 'Formulário não configurado' }, { status: 500 })
  }

  try {
    const supabase = createAdminClient()
    const body = await request.json() as Record<string, string>

    const { data: lead } = await supabase
      .from('leads')
      .insert({
        name: body.name,
        phone: body.whatsapp,
        company: body.company ?? null,
        niche: body.niche ?? null,
        notes: body.pain ?? null,
        workspace_id: workspaceId,
        stage: 'lead',
      })
      .select()
      .single()

    if (!lead) return NextResponse.json({ error: 'Erro ao criar lead' }, { status: 500 })

    if (body.instagram) {
      void supabase.from('lead_enrichments').upsert({
        lead_id: lead.id,
        instagram_handle: body.instagram.replace('@', ''),
      }, { onConflict: 'lead_id' })
    }

    const { data: pipeline } = await supabase
      .from('sdr_pipelines')
      .insert({
        lead_id: lead.id,
        workspace_id: workspaceId,
        status: 'running',
        current_step: 0,
        next_action_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (pipeline) {
      await supabase.from('leads').update({ sdr_pipeline_id: pipeline.id }).eq('id', lead.id)
      startSDRPipeline(lead.id, pipeline.id, workspaceId, null).catch(console.error)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[sdr/intake/form]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
