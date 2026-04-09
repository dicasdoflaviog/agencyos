import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { startSDRPipeline } from '@/lib/sdr/pipeline'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as Record<string, string>
    const { name, whatsapp, company, instagram, niche, pain, source_id } = body

    if (!name || !whatsapp) {
      return NextResponse.json({ error: 'name e whatsapp são obrigatórios' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('workspace_id')
      .eq('id', user.id)
      .single()

    const workspace_id = (profile as { workspace_id?: string } | null)?.workspace_id ?? user.id
    const admin = createAdminClient()

    const { data: lead, error: leadErr } = await admin
      .from('leads')
      .insert({
        name,
        phone: whatsapp,
        company: company ?? null,
        niche: niche ?? null,
        notes: pain ?? null,
        source_id: source_id ?? null,
        stage: 'lead',
        workspace_id,
        created_by: user.id,
      })
      .select()
      .single()

    if (leadErr || !lead) {
      console.error('[sdr/intake] lead error', leadErr)
      return NextResponse.json({ error: 'Erro ao criar lead' }, { status: 500 })
    }

    if (instagram) {
      void admin.from('lead_enrichments').upsert({
        lead_id: lead.id,
        instagram_handle: instagram.replace('@', ''),
      }, { onConflict: 'lead_id' })
    }

    const { data: pipeline } = await admin
      .from('sdr_pipelines')
      .insert({
        lead_id: lead.id,
        workspace_id,
        user_id: user.id,
        status: 'running',
        current_step: 0,
        next_action_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (pipeline) {
      await admin.from('leads').update({ sdr_pipeline_id: pipeline.id }).eq('id', lead.id)
      startSDRPipeline(lead.id, pipeline.id, workspace_id, user.id).catch(console.error)
    }

    return NextResponse.json({ success: true, lead_id: lead.id })
  } catch (error) {
    console.error('[sdr/intake]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
