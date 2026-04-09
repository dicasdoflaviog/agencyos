import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fireCarouselStatus } from '@/lib/n8n-pipeline'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { assetId?: string; action?: string }
  const { assetId, action } = body

  if (!assetId || !action) {
    return Response.json({ error: 'assetId e action são obrigatórios' }, { status: 400 })
  }

  if (!['approved', 'rejected'].includes(action)) {
    return Response.json({ error: 'action deve ser approved ou rejected' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('creative_assets')
    .update({ status: action })
    .eq('id', assetId)
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  // ── Notificar pipeline n8n (aprovado ou rejeitado) ───────────────────────────
  fireCarouselStatus({
    asset_id:    data.id,
    client_id:   data.client_id,
    action:      action as 'approved' | 'rejected',
    format:      data.format,
    template:    data.template,
    slide_count: data.slide_count,
    approved_by: user.id,
  })

  // ── Legacy: webhook individual para retrocompatibilidade ─────────────────────
  if (action === 'approved' && process.env.N8N_WEBHOOK_CAROUSEL_APPROVED) {
    fetch(process.env.N8N_WEBHOOK_CAROUSEL_APPROVED, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event:      'carousel_approved',
        asset_id:   data.id,
        client_id:  data.client_id,
        format:     data.format,
        template:   data.template,
        slide_count: data.slide_count,
        prompt:     data.prompt,
        image_url:  data.image_url,
        approved_at: new Date().toISOString(),
        approved_by: user.id,
      }),
    }).catch(() => { /* fire-and-forget — não bloqueia a resposta */ })
  }

  return Response.json({ success: true, asset: data })
}
