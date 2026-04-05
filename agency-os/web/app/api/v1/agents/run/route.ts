import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/api/validate-api-key'
import crypto from 'crypto'

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
