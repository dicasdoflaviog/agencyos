import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Extrai o path de storage a partir de uma signed URL do Supabase
// Ex: https://xxx.supabase.co/storage/v1/object/sign/creative-assets/clientId/uuid.png?token=...
function extractStoragePath(signedUrl: string): string | null {
  try {
    const url = new URL(signedUrl)
    const match = url.pathname.match(/\/sign\/creative-assets\/(.+)/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Buscar asset com slides_data para limpar storage
  const { data: asset, error: fetchErr } = await supabase
    .from('creative_assets')
    .select('id, client_id, image_url, slides_data, created_by')
    .eq('id', id)
    .single()

  if (fetchErr || !asset) {
    return NextResponse.json({ error: 'Asset não encontrado' }, { status: 404 })
  }

  // Apenas o criador ou admin pode deletar
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  if (asset.created_by !== user.id && !isAdmin) {
    return NextResponse.json({ error: 'Sem permissão para deletar este asset' }, { status: 403 })
  }

  // Coletar todos os paths de storage para remover
  const adminSupabase = createAdminClient()
  const pathsToDelete: string[] = []

  // Thumbnail principal
  const mainPath = extractStoragePath(asset.image_url ?? '')
  if (mainPath) pathsToDelete.push(mainPath)

  // Imagens dos slides individuais
  const slidesData = asset.slides_data as Array<{ image_url?: string }> | null
  if (Array.isArray(slidesData)) {
    for (const slide of slidesData) {
      const path = extractStoragePath(slide.image_url ?? '')
      if (path && !pathsToDelete.includes(path)) pathsToDelete.push(path)
    }
  }

  // Deletar do storage (silencioso se falhar — DB é o que importa)
  if (pathsToDelete.length > 0) {
    await adminSupabase.storage.from('creative-assets').remove(pathsToDelete)
  }

  // Deletar do banco
  const { error: deleteErr } = await supabase
    .from('creative_assets')
    .delete()
    .eq('id', id)

  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, deleted: id })
}
