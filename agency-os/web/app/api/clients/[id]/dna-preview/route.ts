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
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = params.id
  if (!clientId) return NextResponse.json({ error: 'clientId obrigatório' }, { status: 400 })

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

  const health = {
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
  }

  // Modo HTML: visualização no browser
  const format = req.nextUrl.searchParams.get('format')
  if (format === 'html') {
    const healthRows = Object.entries(health).map(([k, v]) => {
      const ok = v === true || (typeof v === 'string' && !v.startsWith('vazio'))
      const icon = ok ? '✅' : '⚠️'
      return `<tr><td>${k}</td><td>${icon} ${String(v)}</td></tr>`
    }).join('\n')

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
    .chip { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px;
            background: #1a1a1a; border: 1px solid #333; margin-right: 6px; }
    .section { background: #111; border: 1px solid #222; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    .section h2 { font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px; }
    .color-swatch { width: 28px; height: 28px; border-radius: 6px; display: inline-block;
                    border: 1px solid #333; vertical-align: middle; margin-right: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    td { padding: 6px 10px; border-bottom: 1px solid #1a1a1a; }
    td:first-child { color: #888; width: 40%; }
    pre { background: #0d0d0d; border: 1px solid #222; border-radius: 8px; padding: 16px;
          font-size: 12px; line-height: 1.6; white-space: pre-wrap; word-break: break-word;
          color: #ccc; max-height: 400px; overflow-y: auto; }
    .ok { color: #4ade80; } .warn { color: #facc15; }
    .logo { max-height: 48px; border-radius: 6px; border: 1px solid #333; }
  </style>
</head>
<body>
  <h1>🧬 DNA Preview</h1>
  <div class="sub">${clientRow.name} &nbsp;·&nbsp; ${clientId} &nbsp;·&nbsp; ${formatted.length} chars injetados na VERA</div>

  <div class="section">
    <h2>Identidade Visual</h2>
    <table>
      <tr><td>Cor primária</td><td><span class="color-swatch" style="background:${dna.primary_color}"></span>${dna.primary_color}</td></tr>
      <tr><td>Fonte (heading)</td><td>${dna.font_heading}</td></tr>
      <tr><td>Fonte (body)</td><td>${dna.font_body}</td></tr>
      <tr><td>Estilo visual</td><td>${dna.visual_style}</td></tr>
      <tr><td>Tom de voz</td><td>${dna.tone}</td></tr>
      <tr><td>Logo</td><td>${dna.logo_url ? `<img src="${dna.logo_url}" class="logo" alt="logo" />` : '(sem logo)'}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>Contexto de Negócio</h2>
    <table>
      <tr><td>Nome</td><td>${dna.client_name}</td></tr>
      <tr><td>Nicho</td><td>${dna.niche}</td></tr>
      <tr><td>Público-alvo</td><td>${dna.target_audience || '(não definido)'}</td></tr>
      <tr><td>Mensagem central</td><td>${dna.key_message || '(não definida)'}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>Health Check</h2>
    <table>${healthRows}</table>
  </div>

  <div class="section">
    <h2>Brand Voice (${dna.brand_voice_text?.length ?? 0} chars)</h2>
    <pre>${(dna.brand_voice_text || '(vazio — VERA gerará copy genérico)').replace(/</g, '&lt;')}</pre>
  </div>

  <div class="section">
    <h2>Styleguide (${dna.styleguide_text?.length ?? 0} chars)</h2>
    <pre>${(dna.styleguide_text || '(vazio)').replace(/</g, '&lt;')}</pre>
  </div>

  <div class="section">
    <h2>Contexto Formatado (injetado na VERA / ATLAS)</h2>
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
