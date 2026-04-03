import 'server-only'
import fs from 'fs'
import path from 'path'

export type { AgentId } from './agents-config'
export { AGENTS, LAYER_LABELS, getAgentsByLayer } from './agents-config'
import type { AgentId } from './agents-config'

const AGENT_DIR_MAP: Partial<Record<AgentId, string>> = {
  oracle:  'head',
  vance:   'estrategista',
  vera:    'copywriter',
  atlas:   'designer',
  volt:    'traffic-manager',
  pulse:   'engajador',
  cipher:  'publicador',
  genesis: 'genesis',
  lore:    'lore',
  prism:   'prism',
}

const GENERIC_PROMPT = `Você é um agente especializado da Agency OS.
Responda em português, de forma clara e profissional.
Contexto do cliente e job serão fornecidos pelo usuário.`

export function getSystemPrompt(agentId: AgentId): string {
  const dir = AGENT_DIR_MAP[agentId] ?? agentId
  const promptPath = path.join(process.cwd(), '..', 'agentes', dir, 'system-prompt.txt')
  try {
    return fs.readFileSync(promptPath, 'utf-8')
  } catch {
    return GENERIC_PROMPT
  }
}
