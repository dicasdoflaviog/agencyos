// GET /api/clients/[id]/dna-preview
// Retorna o contexto de DNA completo que será injetado nos agentes (VERA + ATLAS).
// Útil para debug: veja exatamente o que a IA está lendo antes de gastar créditos.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClientDNA, formatDNAContext } from '@/lib/atlas/dna'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = params.id
  if (!clientId) return NextResponse.json({ error: 'clientId obrigatório' }, { status: 400 })

  // Verifica que o usuário tem acesso ao cliente (deve ser do mesmo workspace)
  const { data: clientRow } = await supabase
    .from('clients')
    .select('id, name, workspace_id')
    .eq('id', clientId)
    .maybeSingle()

  if (!clientRow) {
    return NextResponse.json({ error: 'Cliente não encontrado ou sem acesso' }, { status: 404 })
  }

  const dna = await getClientDNA(clientId, supabase)
  const formatted = formatDNAContext(dna)

  return NextResponse.json({
    client_id:   clientId,
    client_name: clientRow.name,
    // Contexto raw — os campos individuais usados pelos agentes
    dna_raw: {
      client_name:       dna.client_name,
      niche:             dna.niche,
      tone:              dna.tone,
      visual_style:      dna.visual_style,
      primary_color:     dna.primary_color,
      secondary_colors:  dna.secondary_colors,
      font_heading:      dna.font_heading,
      font_body:         dna.font_body,
      logo_url:          dna.logo_url,
      target_audience:   dna.target_audience,
      key_message:       dna.key_message,
      // Prévia dos textos longos (primeiros 500 chars para não explodir o debug)
      brand_voice_preview: dna.brand_voice_text?.slice(0, 500) ?? '(vazio)',
      styleguide_preview:  dna.styleguide_text?.slice(0, 300) ?? '(vazio)',
      brand_voice_chars:   dna.brand_voice_text?.length ?? 0,
      styleguide_chars:    dna.styleguide_text?.length ?? 0,
    },
    // Contexto completo formatado — o bloco de sistema que vai para VERA/ATLAS
    formatted_context: formatted,
    formatted_chars:   formatted.length,
    // Indicadores de qualidade do DNA
    health: {
      has_brand_voice:    (dna.brand_voice_text?.length ?? 0) > 100,
      has_styleguide:     (dna.styleguide_text?.length ?? 0) > 100,
      has_primary_color:  !!dna.primary_color && dna.primary_color !== '#000000',
      has_logo:           !!dna.logo_url,
      has_audience:       !!dna.target_audience,
      has_key_message:    !!dna.key_message,
      brand_voice_source: (dna.brand_voice_text?.length ?? 0) > 500
        ? 'dna_document (completo)'
        : (dna.brand_voice_text?.length ?? 0) > 0
          ? 'parcial (verifique client_memories)'
          : 'vazio — VERA usará copy genérico',
    },
  })
}
