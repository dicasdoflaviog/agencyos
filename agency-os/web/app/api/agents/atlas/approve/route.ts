import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { assetId?: string; action?: string }
  const { assetId, action } = body

  if (!assetId || !action) {
    return Response.json({ error: 'assetId e action são obrigatórios' }, { status: 400 })
  }

  if (!['approved', 'rejected'].includes(action)) {
    return Response.json({ error: 'action deve ser approved ou rejected' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('creative_assets')
    .update({ status: action })
    .eq('id', assetId)
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true, asset: data })
}
