// GET /api/clients/[id]/dna-preview
// Retorna o contexto de DNA completo que será injetado nos agentes (VERA + ATLAS).
// Útil para debug: veja exatamente o que a IA está lendo antes de gastar créditos.
//
// Query params:
//   ?format=html  → página HTML visual (abrir direto no browser)
//   ?format=json  → JSON puro (default, para fetch/curl)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClientDNA, formatDNAContext } from '@/lib/atlas/dna'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: clientId } = await params
  if (!clientId) return NextResponse.json({ error: 'clientId obrigatório' }, { status: 400 })

  const { data: clientRow } = await supabase
    .from('clients')
    .select('id, name, workspace_id')
    .eq('id', clientId)
    .maybeSingle()

  if (!clientRow) {
    return NextResponse.json({ error: 'Cliente não encontrado ou sem acesso' }, { status: 404 })
  }

  // Busca bruta de memories + dna para debug detalhado
  const [{ data: rawMemories }, { data: rawDna }, { data: rawKnowledge }] = await Promise.all([
    supabase
      .from('client_memories')
      .select('source, source_id, content, created_at')
      .eq('client_id', clientId)
      .in('source', ['dna_document', 'dna_field', 'knowledge_file'])
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('client_dna').select('*').eq('client_id', clientId).maybeSingle(),
    supabase.from('knowledge_files').select('id, name, file_type, sync_status, sync_error').eq('client_id', clientId),
  ])

  const dna = await getClientDNA(clientId, supabase)
  const formatted = formatDNAContext(dna)

  const health = {
    has_brand_voice:    (dna.brand_voice_text?.length ?? 0) > 100,
    has_styleguide:     (dna.styleguide_text?.length ?? 0) > 100,
    has_primary_color:  !!dna.primary_color && dna.primary_color !== '#000000',
    has_logo:           !!dna.logo_url,
    has_audience:       !!dna.target_audience,
    has_key_message:    !!dna.key_message,
    brand_voice_source: (dna.brand_voice_text?.length ?? 0) > 500
      ? 'completo (dna_document + fields + knowledge)'
      : (dna.brand_voice_text?.length ?? 0) > 0
        ? 'parcial — verifique knowledge_files abaixo'
        : 'VAZIO — VERA usará copy genérico (adicione documentos e sincronize)',
  }

  // Diagnóstico de documentos: quais estão sendo lidos vs ignorados
  const memorySources = (rawMemories ?? []).map(m => ({
    source: m.source,
    chars: m.content?.length ?? 0,
    preview: m.content?.slice(0, 80) ?? '',
  }))

  const knowledgeDiag = (rawKnowledge ?? []).map(kf => ({
    name: kf.name,
    type: kf.file_type,
    sync_status: kf.sync_status,
    sync_error: kf.sync_error ?? null,
    in_memory: (rawMemories ?? []).some(m => m.source === 'knowledge_file' && m.source_id === kf.id),
  }))

  const dnaFields = rawDna ? {
    biografia_chars:   rawDna.biografia?.length ?? 0,
    voz_chars:         rawDna.voz?.length ?? 0,
    credenciais_chars: rawDna.credenciais?.length ?? 0,
    proibidas_chars:   rawDna.proibidas?.length ?? 0,
  } : null

  // Modo HTML: visualização no browser
  const format = req.nextUrl.searchParams.get('format')
  if (format === 'html') {
    const healthRows = Object.entries(health).map(([k, v]) => {
      const ok = v === true || (typeof v === 'string' && !v.startsWith('VAZIO'))
      const icon = ok ? '✅' : '⚠️'
      return `<tr><td>${k}</td><td>${icon} ${String(v)}</td></tr>`
    }).join('\n')

    const kfRows = knowledgeDiag.map(kf => {
      const statusIcon = kf.sync_status === 'synced' ? '✅' : kf.sync_status === 'error' ? '❌' : '⏳'
      const memIcon = kf.in_memory ? '✅ lido pela IA' : '⚠️ NÃO está na memória'
      return `<tr><td>${kf.name}</td><td>${kf.type}</td><td>${statusIcon} ${kf.sync_status}</td><td>${memIcon}</td><td style="color:#f87171;font-size:11px">${kf.sync_error ?? ''}</td></tr>`
    }).join('\n')

    const memRows = memorySources.map(m =>
      `<tr><td>${m.source}</td><td>${m.chars.toLocaleString()} chars</td><td style="color:#888;font-size:11px">${m.preview.replace(/</g, '&lt;')}</td></tr>`
    ).join('\n')

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DNA Preview — ${clientRow.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #e5e5e5; padding: 32px; }
    h1 { font-size: 22px; margin-bottom: 4px; color: #fff; }
    .sub { color: #888; font-size: 13px; margin-bottom: 32px; }
    .section { background: #111; border: 1px solid #222; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    .section h2 { font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px; }
    .color-swatch { width: 28px; height: 28px; border-radius: 6px; display: inline-block; border: 1px solid #333; vertical-align: middle; margin-right: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    td { padding: 6px 10px; border-bottom: 1px solid #1a1a1a; vertical-align: top; }
    td:first-child { color: #888; }
    pre { background: #0d0d0d; border: 1px solid #222; border-radius: 8px; padding: 16px; font-size: 12px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; color: #ccc; max-height: 400px; overflow-y: auto; }
    .logo { max-height: 48px; border-radius: 6px; border: 1px solid #333; }
    .banner { background: #1a0a00; border: 1px solid #f59e0b44; border-radius: 8px; padding: 12px 16px; color: #f59e0b; font-size: 13px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1>🧬 DNA Preview</h1>
  <div class="sub">${clientRow.name} &nbsp;·&nbsp; ${clientId} &nbsp;·&nbsp; ${formatted.length} chars injetados na VERA</div>

  ${(dna.brand_voice_text?.length ?? 0) < 100 ? `<div class="banner">⚠️ Brand Voice está vazio ou muito curto. A VERA gerará copy genérico. Verifique a seção "Documentos" abaixo e sincronize os arquivos.</div>` : ''}

  <div class="section">
    <h2>Campos do DNA Curado (client_dna)</h2>
    <table>
      <tr><td>biografia</td><td>${dnaFields?.biografia_chars ?? 0} chars</td></tr>
      <tr><td>voz</td><td>${dnaFields?.voz_chars ?? 0} chars</td></tr>
      <tr><td>credenciais</td><td>${dnaFields?.credenciais_chars ?? 0} chars</td></tr>
      <tr><td>proibidas</td><td>${dnaFields?.proibidas_chars ?? 0} chars &nbsp; ${(dnaFields?.proibidas_chars ?? 0) === 0 ? '⚠️ VERA não tem filtro de frases proibidas!' : '✅'}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>Documentos de Conhecimento (knowledge_files)</h2>
    <table>
      <tr style="color:#666;font-size:11px"><td>Nome</td><td>Tipo</td><td>Sync</td><td>Na Memória da IA?</td><td>Erro</td></tr>
      ${kfRows || '<tr><td colspan="5" style="color:#666">(nenhum arquivo enviado)</td></tr>'}
    </table>
  </div>

  <div class="section">
    <h2>Memórias Ativas (lidas pelos agentes)</h2>
    <table>
      <tr style="color:#666;font-size:11px"><td>Fonte</td><td>Tamanho</td><td>Preview</td></tr>
      ${memRows || '<tr><td colspan="3" style="color:#f87171">Nenhuma memória encontrada — agentes estão lendo ZERO contexto!</td></tr>'}
    </table>
  </div>

  <div class="section">
    <h2>Identidade Visual</h2>
    <table>
      <tr><td>Cor primária</td><td><span class="color-swatch" style="background:${dna.primary_color}"></span>${dna.primary_color}</td></tr>
      <tr><td>Fonte (heading)</td><td>${dna.font_heading}</td></tr>
      <tr><td>Tom de voz</td><td>${dna.tone}</td></tr>
      <tr><td>Logo</td><td>${dna.logo_url ? `<img src="${dna.logo_url}" class="logo" alt="logo" />` : '(sem logo)'}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>Health Check</h2>
    <table>${healthRows}</table>
  </div>

  <div class="section">
    <h2>Brand Voice (${dna.brand_voice_text?.length ?? 0} chars) — o que VERA lê</h2>
    <pre>${(dna.brand_voice_text || '(VAZIO — VERA gerará copy genérico)').replace(/</g, '&lt;')}</pre>
  </div>

  <div class="section">
    <h2>Contexto Formatado Final (injetado na VERA / ATLAS)</h2>
    <pre>${formatted.replace(/</g, '&lt;')}</pre>
  </div>
</body>
</html>`

    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }

  // Default: JSON
  return NextResponse.json({
    client_id:   clientId,
    client_name: clientRow.name,
    dna_fields:  dnaFields,
    knowledge_files: knowledgeDiag,
    memory_sources:  memorySources,
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
      brand_voice_preview: dna.brand_voice_text?.slice(0, 500) ?? '(vazio)',
      styleguide_preview:  dna.styleguide_text?.slice(0, 300) ?? '(vazio)',
      brand_voice_chars:   dna.brand_voice_text?.length ?? 0,
      styleguide_chars:    dna.styleguide_text?.length ?? 0,
    },
    formatted_context: formatted,
    formatted_chars:   formatted.length,
    health,
  })
}
