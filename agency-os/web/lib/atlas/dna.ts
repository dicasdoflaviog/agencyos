// lib/atlas/dna.ts
// Busca e normaliza o DNA do cliente para injeção no ATLAS

import { SupabaseClient } from '@supabase/supabase-js'

export interface ClientDNAContext {
  client_name: string
  niche: string
  primary_color: string
  secondary_colors: string[]
  font_heading: string
  font_body: string
  logo_url: string
  visual_style: string
  tone: string
  brand_voice_text: string
  target_audience: string
  key_message: string
  reference_images: string[]
}

export async function getClientDNA(
  clientId: string,
  supabase: SupabaseClient
): Promise<ClientDNAContext> {
  // 1. Buscar cliente base
  const { data: client } = await supabase
    .from('clients')
    .select('name, niche')
    .eq('id', clientId)
    .single()

  // 2. Buscar client_dna (inclui colunas ATLAS v2 + colunas legado)
  const { data: dna } = await supabase
    .from('client_dna')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle()

  // 3. Fallback: buscar de client_assets se dna não existir
  const { data: assets } = await supabase
    .from('client_assets')
    .select('type, content, file_url')
    .eq('client_id', clientId)
    .in('type', ['brandvoice', 'logo', 'font', 'styleguide'])

  const brandVoiceAsset = assets?.find((a) => a.type === 'brandvoice')
  const logoAsset = assets?.find((a) => a.type === 'logo')
  const fontAsset = assets?.find((a) => a.type === 'font')

  // Mescla brand_voice_text: campo direto > campo legado 'voz' > client_asset
  const brandVoice =
    dna?.brand_voice_text ??
    dna?.voz ??
    brandVoiceAsset?.content ??
    ''

  return {
    client_name:      client?.name ?? '',
    niche:            client?.niche ?? '',
    primary_color:    dna?.primary_color ?? '#000000',
    secondary_colors: dna?.secondary_colors ?? [],
    font_heading:     dna?.font_heading ?? fontAsset?.content ?? 'Inter',
    font_body:        dna?.font_body ?? 'Inter',
    logo_url:         dna?.logo_url ?? logoAsset?.file_url ?? '',
    visual_style:     dna?.visual_style ?? 'minimalista',
    tone:             dna?.tone ?? 'profissional',
    brand_voice_text: brandVoice,
    target_audience:  dna?.target_audience ?? '',
    key_message:      dna?.key_message ?? '',
    reference_images: dna?.reference_images ?? [],
  }
}
