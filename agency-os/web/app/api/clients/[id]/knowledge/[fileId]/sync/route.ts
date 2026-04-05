import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

type Params = { params: Promise<{ id: string; fileId: string }> }

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(_req: Request, { params }: Params) {
  const { id, fileId } = await params
  const supabase = await createClient()

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

    if (file.file_type === 'TXT') {
      contentText = new TextDecoder('utf-8').decode(fileBuffer)
    } else if (file.file_type === 'PDF') {
      const base64 = Buffer.from(fileBuffer).toString('base64')
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 },
            },
            { type: 'text', text: 'Extraia todo o texto deste documento. Retorne apenas o conteúdo, sem comentários.' },
          ],
        }] as Anthropic.MessageParam[],
      })
      contentText = response.content[0].type === 'text' ? response.content[0].text : ''
    } else {
      throw new Error(`Extração de texto não suportada para ${file.file_type}. Use PDF ou TXT.`)
    }

    const truncated = contentText.slice(0, 8000)

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
      content: `[Arquivo: ${file.name}]\n\n${truncated}`,
    })

    await supabase
      .from('knowledge_files')
      .update({
        sync_status: 'synced',
        synced_at: new Date().toISOString(),
        content_text: truncated,
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
