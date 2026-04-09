import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { startSDRPipeline } from '@/lib/sdr/pipeline'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = createAdminClient()

    const { data: source } = await supabase
      .from('lead_sources')
      .select('id, workspace_id, config, is_active')
      .eq('webhook_token', token)
      .single()

    if (!source?.is_active) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 403 })
    }

    const body = await request.json() as Record<string, string>

    const fieldMap = (source.config as Record<string, string>) ?? {}
    const name      = body[fieldMap.name      ?? 'name']      ?? body.first_name ?? 'Lead'
    const whatsapp  = body[fieldMap.whatsapp   ?? 'whatsapp']  ?? body.phone ?? body.number ?? ''
    const company   = body[fieldMap.company    ?? 'company']   ?? body.empresa ?? null
    const instagram = body[fieldMap.instagram  ?? 'instagram'] ?? body.instagram ?? null
    const niche     = body[fieldMap.niche      ?? 'niche']     ?? body.nicho ?? null
    const pain      = body[fieldMap.pain       ?? 'pain']      ?? body.notes ?? body.mensagem ?? null

    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        name,
        phone: whatsapp,
        company,
        niche,
        notes: pain,
        source_id: source.id,
        workspace_id: source.workspace_id,
        stage: 'lead',
      })
      .select()
      .single()

    if (error || !lead) throw error ?? new Error('lead insert failed')

    if (instagram) {
      void supabase.from('lead_enrichments').upsert({
        lead_id: lead.id,
        instagram_handle: (instagram as string).replace('@', ''),
      }, { onConflict: 'lead_id' })
    }

    const { data: pipeline } = await supabase
      .from('sdr_pipelines')
      .insert({
        lead_id: lead.id,
        workspace_id: source.workspace_id,
        status: 'running',
        current_step: 0,
        next_action_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (pipeline) {
      await supabase.from('leads').update({ sdr_pipeline_id: pipeline.id }).eq('id', lead.id)
      startSDRPipeline(lead.id, pipeline.id, source.workspace_id, null).catch(console.error)
    }

    // Incrementar contador da fonte
    void supabase.rpc('increment_source_count', { p_source_id: source.id })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[sdr/webhook]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
