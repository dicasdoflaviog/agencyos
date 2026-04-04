import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

async function validateApiKey(req: NextRequest): Promise<string | null> {
  const key = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!key) return null
  const keyHash = crypto.createHash('sha256').update(key).digest('hex')
  const supabase = createAdminClient()
  const { data } = await supabase.from('api_keys').select('workspace_id').eq('key_hash', keyHash).single()
  return data?.workspace_id ?? null
}

export async function POST(req: NextRequest) {
  const workspaceId = await validateApiKey(req)
  if (!workspaceId) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })

  const body = await req.json() as {
    agent_id: string
    prompt: string
    client_id?: string
  }

  if (!body.agent_id || !body.prompt) {
    return NextResponse.json({ error: 'Missing required fields: agent_id, prompt' }, { status: 400 })
  }

  const outputId = crypto.randomUUID()
  const content = `[Agency OS Agent Response]\n\nAgent: ${body.agent_id}\nPrompt received: ${body.prompt.slice(0, 100)}...\n\nThis is a stub response. Connect to your AI provider to get real outputs.`

  return NextResponse.json({
    output_id: outputId,
    content,
    agent_id: body.agent_id,
    workspace_id: workspaceId,
  })
}
