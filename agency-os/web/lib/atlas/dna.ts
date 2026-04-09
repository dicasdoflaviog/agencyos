// lib/atlas/dna.ts
// Extrai TODO o DNA disponível do cliente de todas as fontes e injeta em qualquer agente.

import { SupabaseClient } from '@supabase/supabase-js'

export interface ClientDNAContext {
  client_name: string
  niche: string

  // Brand voice completo — prioridade: dna_document > pilares client_assets > client_dna
  brand_voice_text: string
  // Styleguide visual em texto (ex: guia de cores, tipografia, referências)
  styleguide_text: string

  // Identidade visual (client_dna ou defaults)
  primary_color: string
  secondary_colors: string[]
  font_heading: string
  font_body: string
  logo_url: string
  visual_style: string
  tone: string

  // Contexto de negócio
  target_audience: string
  key_message: string
  reference_images: string[]
}

export async function getClientDNA(
  clientId: string,
  supabase: SupabaseClient
): Promise<ClientDNAContext> {
  // 1. Busca paralela em TODAS as fontes possíveis
  const [clientRes, assetsRes, dnaRes, memoriesRes] = await Promise.all([
    supabase
      .from('clients')
      .select('name, niche')
      .eq('id', clientId)
      .single(),

    // client_assets: inclui name para identificar cada pilar
    supabase
      .from('client_assets')
      .select('type, content, file_url, name')
      .eq('client_id', clientId)
      .in('type', ['brandvoice', 'styleguide', 'logo', 'font']),

    // client_dna: pode não ter todos os campos preenchidos
    supabase
      .from('client_dna')
      .select('*')
      .eq('client_id', clientId)
      .maybeSingle(),

    // client_memories: fonte PRIMÁRIA do Brand DNA completo (dna_document + knowledge_files)
    supabase
      .from('client_memories')
      .select('source, content')
      .eq('client_id', clientId)
      .in('source', ['dna_document', 'dna_field', 'knowledge_file'])
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const client   = clientRes.data
  const assets   = assetsRes.data ?? []
  const dna      = dnaRes.data
  const memories = memoriesRes.data ?? []

  // 2. Extrair brand voice em ordem de prioridade:
  //    a) dna_document (Brand DNA curado — mais completo)
  const dnaDoc = memories.find((m) => m.source === 'dna_document')

  //    b) client_assets brandvoice (pilares individuais se existirem)
  const brandVoiceAssets = assets.filter((a) => a.type === 'brandvoice')
  const brandVoiceFromAssets = brandVoiceAssets
    .filter((a) => a.content)
    .map((a) => (a.name ? `### ${a.name}\n${a.content}` : a.content))
    .join('\n\n')

  //    c) brand_voice_text do client_dna ou campo legado 'voz'
  const brand_voice_text =
    dnaDoc?.content ||
    brandVoiceFromAssets ||
    dna?.brand_voice_text ||
    (dna as Record<string, string> | null)?.voz ||
    ''

  // 3. Styleguide: assets de styleguide + knowledge_files de styleguide
  const styleguideAssets = assets.filter((a) => a.type === 'styleguide')
  const styleguideFromAssets = styleguideAssets
    .filter((a) => a.content)
    .map((a) => (a.name ? `### ${a.name}\n${a.content}` : a.content))
    .join('\n\n')

  // knowledge_file de styleguide (ex: brand-voice.txt, styleguide.txt)
  const styleguideMemory = memories
    .filter((m) => m.source === 'knowledge_file' && m.content?.includes('STYLE GUIDE'))
    .map((m) => m.content)
    .join('\n\n')

  const styleguide_text = styleguideFromAssets || styleguideMemory || ''

  // 4. Logo: client_dna > client_assets
  const logoAsset = assets.find((a) => a.type === 'logo')
  const fontAsset = assets.find((a) => a.type === 'font')

  return {
    client_name:      client?.name ?? '',
    niche:            client?.niche ?? '',
    brand_voice_text,
    styleguide_text,
    primary_color:    dna?.primary_color ?? '#F59E0B',
    secondary_colors: dna?.secondary_colors ?? [],
    font_heading:     dna?.font_heading ?? fontAsset?.content ?? 'Inter',
    font_body:        dna?.font_body ?? 'Inter',
    logo_url:         dna?.logo_url ?? logoAsset?.file_url ?? '',
    visual_style:     dna?.visual_style ?? 'minimalista',
    tone:             dna?.tone ?? 'profissional',
    target_audience:  dna?.target_audience ?? '',
    key_message:      dna?.key_message ?? '',
    reference_images: dna?.reference_images ?? [],
  }
}

// Formata o DNA como bloco de contexto injetável em qualquer system prompt de agente.
export function formatDNAContext(dna: ClientDNAContext): string {
  const sections: string[] = [
    `=== DNA DO CLIENTE: ${dna.client_name} ===`,
    `Nicho: ${dna.niche}`,
  ]

  if (dna.target_audience) sections.push(`Público-alvo: ${dna.target_audience}`)
  if (dna.key_message)      sections.push(`Mensagem central: ${dna.key_message}`)
  if (dna.primary_color)    sections.push(`Cor primária da marca: ${dna.primary_color}`)
  if (dna.visual_style)     sections.push(`Estilo visual: ${dna.visual_style}`)
  if (dna.tone)             sections.push(`Tom de voz: ${dna.tone}`)
  if (dna.font_heading)     sections.push(`Fonte de destaque: ${dna.font_heading}`)

  if (dna.brand_voice_text) {
    sections.push(`\n--- BRAND VOICE (leia com atenção antes de escrever qualquer palavra) ---\n${dna.brand_voice_text}`)
  }

  if (dna.styleguide_text) {
    sections.push(`\n--- STYLEGUIDE VISUAL ---\n${dna.styleguide_text}`)
  }

  sections.push('=== FIM DO DNA ===')

  return sections.join('\n')
}
