import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ client_id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { client_id } = await params
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'approved'

  const query = supabase
    .from('creative_assets')
    .select('id, client_id, format, style, type, status, prompt, image_url, model, created_at')
    .eq('client_id', client_id)
    .order('created_at', { ascending: false })
    .limit(50)

  // status='all' retorna tudo; outros valores filtram por status
  if (status !== 'all') {
    query.eq('status', status)
  }

  const { data } = await query

  return Response.json(data ?? [])
}

