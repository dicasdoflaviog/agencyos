import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    })
    .select()
    .single()

  if (error) {
    await supabase.storage.from('knowledge-files').remove([storagePath])
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ data })
}
