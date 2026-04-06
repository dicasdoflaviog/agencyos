import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractDesignTokens } from '@/lib/ai/extract-design-tokens'

// Text-based types that can be auto-synced immediately (no AI/credits needed)
const TEXT_TYPES = new Set(['HTML', 'CSS', 'JSON', 'MD', 'TXT'])

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('knowledge_files')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${id}/${Date.now()}-${safeName}`
  const fileType =
    ext === 'pdf' ? 'PDF' :
    ext === 'txt' ? 'TXT' :
    ['docx', 'doc'].includes(ext) ? 'DOCX' :
    ext.toUpperCase()

  const buffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('knowledge-files')
    .upload(storagePath, buffer, { contentType: file.type, upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  // For text-based types, decode content immediately and mark as synced (no extra step needed)
  let autoSyncFields: Record<string, unknown> = {}
  if (TEXT_TYPES.has(fileType)) {
    const contentText = new TextDecoder('utf-8').decode(buffer)
    const isVisual = fileType === 'HTML' || fileType === 'CSS'
    const forOracle = contentText.slice(0, isVisual ? 16000 : 8000)

    autoSyncFields = {
      sync_status: 'synced',
      synced_at: new Date().toISOString(),
      // HTML/CSS stored in full for visual rendering; others use oracle limit
      content_text: isVisual ? contentText : forOracle,
    }
  }

  const { data, error } = await supabase
    .from('knowledge_files')
    .insert({
      client_id: id,
      workspace_id: member?.workspace_id,
      name: file.name,
      file_type: fileType,
      storage_path: storagePath,
      file_size: file.size,
      created_by: user.id,
      ...autoSyncFields,
    })
    .select()
    .single()

  if (error) {
    await supabase.storage.from('knowledge-files').remove([storagePath])
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // For auto-synced text files: write compact oracle memory now that we have the file id
  if (TEXT_TYPES.has(fileType) && data?.id) {
    const contentText = new TextDecoder('utf-8').decode(buffer)
    const isVisual = fileType === 'HTML' || fileType === 'CSS'
    const forOracle = contentText.slice(0, isVisual ? 16000 : 8000)

    // Inject design token summary for HTML/CSS into oracle memory
    let oracleContent = `[Arquivo: ${file.name}]\n\n${forOracle}`
    if (isVisual) {
      try {
        const { rawSummary } = extractDesignTokens(contentText)
        if (rawSummary) oracleContent = `[Arquivo: ${file.name}]\n\n${rawSummary}\n\n---\n${forOracle}`
      } catch { /* non-critical */ }
    }

    // Remove stale memory and insert fresh
    await supabase
      .from('client_memories')
      .delete()
      .eq('client_id', id)
      .eq('source', 'knowledge_file')
      .eq('source_id', data.id)

    await supabase.from('client_memories').insert({
      client_id: id,
      source: 'knowledge_file',
      source_id: data.id,
      content: oracleContent,
    })
  }

  return NextResponse.json({ data })
}
