import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const BUCKET = 'client-logos'
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']

export async function POST(req: NextRequest) {
  // Verificar autenticação do usuário
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const clientId = formData.get('clientId') as string | null

  if (!file || !clientId) {
    return NextResponse.json({ error: 'file e clientId são obrigatórios' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Arquivo deve ter no máximo 5MB' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `Tipo não suportado: ${file.type}. Use PNG, JPG, WebP ou SVG.` }, { status: 415 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  const path = `${clientId}/logo.${ext}`

  // Upload via service_role (server-side — bypass RLS, key nunca exposta no browser)
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    console.error('[upload/logo] Storage error:', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path)

  // Cachebust para forçar reload da imagem no browser
  const publicUrl = `${data.publicUrl}?t=${Date.now()}`

  return NextResponse.json({ url: publicUrl })
}
