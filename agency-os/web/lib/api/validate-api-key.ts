import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

export async function validateApiKey(req: NextRequest): Promise<string | null> {
  const key = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!key) return null
  const keyHash = crypto.createHash('sha256').update(key).digest('hex')
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('api_keys')
    .select('workspace_id')
    .eq('key_hash', keyHash)
    .single()
  return data?.workspace_id ?? null
}
