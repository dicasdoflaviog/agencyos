import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json() as { message?: string; edited?: boolean; skipped?: boolean }

  if (body.skipped) {
    await supabase.from('sdr_actions').update({ status: 'skipped' }).eq('id', id)
    return NextResponse.json({ success: true })
  }

  const { message, edited } = body

  // Marcar como aprovado
  const { data: action } = await supabase
    .from('sdr_actions')
    .update({
      status: 'sent',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      output: { message, channel: 'whatsapp', edited: !!edited },
    })
    .eq('id', id)
    .select('lead_id')
    .single()

  if (action?.lead_id) {
    // Registrar na lead_activities para rastreamento
    void supabase.from('lead_activities').insert({
      lead_id: action.lead_id,
      type: 'whatsapp',
      title: 'Mensagem enviada via SDR',
      notes: message,
      direction: 'outbound',
      performed_by: user.id,
    })

    // Atualizar lead: primeiro contato + stage contatado
    await supabase.from('leads')
      .update({
        first_contacted_at: new Date().toISOString(),
        stage: 'qualified',
      })
      .eq('id', action.lead_id)
      .is('first_contacted_at', null)
  }

  // ℹ️ Fase 2: disparar via Twilio WhatsApp API automaticamente.
  // Por ora: mensagem aprovada e registrada — usuário envia manualmente no WhatsApp.

  return NextResponse.json({ success: true, message })
}
