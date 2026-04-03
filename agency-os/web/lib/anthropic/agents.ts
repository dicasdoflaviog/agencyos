import fs from 'fs'
import path from 'path'

export type AgentId = keyof typeof AGENTS

export const AGENTS = {
  oracle:  { name: 'ORACLE',  role: 'Head & Orquestrador',    layer: 'orchestration' },
  nexus:   { name: 'NEXUS',   role: 'Gerente de Cliente',      layer: 'orchestration' },
  genesis: { name: 'GENESIS', role: 'Creator de Agentes',      layer: 'meta' },
  lore:    { name: 'LORE',    role: 'Memória Institucional',   layer: 'meta' },
  vance:   { name: 'VANCE',   role: 'Estrategista',            layer: 'production' },
  vera:    { name: 'VERA',    role: 'Copywriter',               layer: 'production' },
  marco:   { name: 'MARCO',   role: 'Roteirista',              layer: 'production' },
  atlas:   { name: 'ATLAS',   role: 'UI Designer',             layer: 'production' },
  volt:    { name: 'VOLT',    role: 'Traffic Manager',         layer: 'production' },
  pulse:   { name: 'PULSE',   role: 'Engajador',               layer: 'production' },
  cipher:  { name: 'CIPHER',  role: 'Publicador',              layer: 'production' },
  flux:    { name: 'FLUX',    role: 'Automação',               layer: 'production' },
  iris:    { name: 'IRIS',    role: 'Pesquisador',             layer: 'intelligence' },
  vector:  { name: 'VECTOR',  role: 'Analytics',              layer: 'intelligence' },
  prism:   { name: 'PRISM',   role: 'Cultura & Audiência',    layer: 'intelligence' },
  bridge:  { name: 'BRIDGE',  role: 'Onboarding',             layer: 'operations' },
  aegis:   { name: 'AEGIS',   role: 'Aprovação',              layer: 'operations' },
  harbor:  { name: 'HARBOR',  role: 'CRM',                    layer: 'operations' },
  ledger:  { name: 'LEDGER',  role: 'Financeiro',             layer: 'operations' },
  surge:   { name: 'SURGE',   role: 'Growth Hacker',          layer: 'growth' },
  anchor:  { name: 'ANCHOR',  role: 'Customer Success',       layer: 'growth' },
} as const

const LAYER_LABELS: Record<string, string> = {
  orchestration: 'Orquestração',
  meta:          'Meta',
  production:    'Produção',
  intelligence:  'Inteligência',
  operations:    'Operações',
  growth:        'Growth',
}

export { LAYER_LABELS }

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

export function getAgentsByLayer() {
  const order = ['orchestration', 'meta', 'production', 'intelligence', 'operations', 'growth']
  const groups = Object.entries(AGENTS).reduce(
    (acc, [id, agent]) => {
      const layer = agent.layer
      if (!acc[layer]) acc[layer] = []
      acc[layer].push({ id: id as AgentId, ...agent })
      return acc
    },
    {} as Record<string, Array<{ id: AgentId } & (typeof AGENTS)[AgentId]>>
  )
  return order.filter((l) => groups[l]).map((layer) => ({ layer, label: LAYER_LABELS[layer], agents: groups[layer] }))
}
