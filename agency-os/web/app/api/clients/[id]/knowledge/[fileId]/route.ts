import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string; fileId: string }> }

export async function DELETE(_req: Request, { params }: Params) {
  const { id, fileId } = await params
  const supabase = await createClient()

  const { data: file } = await supabase
    .from('knowledge_files')
    .select('storage_path')
    .eq('id', fileId)
    .eq('client_id', id)
    .single()

  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await supabase.storage.from('knowledge-files').remove([file.storage_path])

  const { error } = await supabase
    .from('knowledge_files')
    .delete()
    .eq('id', fileId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function GET(_req: Request, { params }: Params) {
  const { id, fileId } = await params
  const supabase = await createClient()

  const { data: file } = await supabase
    .from('knowledge_files')
    .select('storage_path, name')
    .eq('id', fileId)
    .eq('client_id', id)
    .single()

  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: signedUrl } = await supabase.storage
    .from('knowledge-files')
    .createSignedUrl(file.storage_path, 300)

  return NextResponse.json({ url: signedUrl?.signedUrl })
}
