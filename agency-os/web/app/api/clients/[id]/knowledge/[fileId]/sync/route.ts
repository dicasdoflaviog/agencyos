import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openrouter } from '@/lib/openrouter/client'
import { getProviderModel } from '@/lib/openrouter/models'
import { checkAndDeductCredits } from '@/lib/credits'

type Params = { params: Promise<{ id: string; fileId: string }> }

export async function POST(_req: Request, { params }: Params) {
  const { id, fileId } = await params
  const supabase = await createClient()

  // Auth + credit check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('workspace_id').eq('id', user.id).maybeSingle()
  if (profile?.workspace_id) {
    const credit = await checkAndDeductCredits(profile.workspace_id, 'knowledge_sync', `Sync arquivo: ${fileId}`)
    if (!credit.ok) {
      return NextResponse.json({ error: credit.error, balance: credit.balance, cost: credit.cost }, { status: 402 })
    }
  }

  const { data: file } = await supabase
    .from('knowledge_files')
    .select('*')
    .eq('id', fileId)
    .eq('client_id', id)
    .single()

  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await supabase
    .from('knowledge_files')
    .update({ sync_status: 'syncing', sync_error: null })
    .eq('id', fileId)

  try {
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('knowledge-files')
      .download(file.storage_path)

    if (downloadError) throw new Error(downloadError.message)

    const fileBuffer = await fileData.arrayBuffer()
    let contentText = ''

    if (file.file_type === 'TXT' || file.file_type === 'HTML' || file.file_type === 'CSS' ||
        file.file_type === 'JSON' || file.file_type === 'MD') {
      // All text-based formats: decode as raw UTF-8 text
      contentText = new TextDecoder('utf-8').decode(fileBuffer)
    } else if (file.file_type === 'PDF') {
      const base64 = Buffer.from(fileBuffer).toString('base64')
      const response = await openrouter.chat.completions.create({
        model: getProviderModel('knowledge'),
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `O seguinte é um PDF codificado em base64. Extraia todo o texto legível deste documento e retorne apenas o conteúdo, sem comentários.\n\nBase64: ${base64.slice(0, 50000)}`,
            },
          ],
        }],
      })
      contentText = response.choices[0]?.message?.content ?? ''
    } else if (file.file_type === 'DOCX') {
      // DOCX is binary — extract raw readable text as best-effort
      // Replace null bytes and binary chars, keep printable ASCII + Latin + line breaks
      const raw = new TextDecoder('utf-8', { fatal: false }).decode(fileBuffer)
      contentText = raw.replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, ' ').replace(/ {3,}/g, ' ').trim()
      if (contentText.length < 100) throw new Error('DOCX com conteúdo binário não legível. Converta para PDF ou TXT antes de sincronizar.')
    } else {
      throw new Error(`Formato ${file.file_type} não suportado. Use PDF, TXT, HTML, CSS, JSON, MD ou DOCX.`)
    }

    // For Oracle/RAG memory: keep compact (16K structured, 8K prose)
    const isStructured = ['HTML', 'CSS', 'JSON'].includes(file.file_type)
    const forOracle = contentText.slice(0, isStructured ? 16000 : 8000)

    // For rendering (content_text): store full HTML/CSS so the iframe renders completely.
    // Other formats keep the same truncation since they're not rendered visually.
    const forStorage = ['HTML', 'CSS'].includes(file.file_type)
      ? contentText          // full content — Postgres text has no practical size limit
      : forOracle            // same as Oracle limit for non-visual formats

    // Remove old memory for this file and insert fresh
    await supabase
      .from('client_memories')
      .delete()
      .eq('client_id', id)
      .eq('source', 'knowledge_file')
      .eq('source_id', fileId)

    await supabase.from('client_memories').insert({
      client_id: id,
      source: 'knowledge_file',
      source_id: fileId,
      content: `[Arquivo: ${file.name}]\n\n${forOracle}`,
    })

    await supabase
      .from('knowledge_files')
      .update({
        sync_status: 'synced',
        synced_at: new Date().toISOString(),
        content_text: forStorage,
        sync_error: null,
      })
      .eq('id', fileId)

    return NextResponse.json({ success: true, chars: contentText.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    await supabase
      .from('knowledge_files')
      .update({ sync_status: 'error', sync_error: msg })
      .eq('id', fileId)

    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
