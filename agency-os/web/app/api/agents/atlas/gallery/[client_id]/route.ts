import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ client_id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { client_id } = await params
  const { data } = await supabase
    .from('creative_assets')
    .select('*')
    .eq('client_id', client_id)
    .order('created_at', { ascending: false })
    .limit(50)

  return Response.json(data ?? [])
}
