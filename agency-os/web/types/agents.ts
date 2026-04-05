export type AgentType =
  // Orchestration
  | 'oracle' | 'nexus' | 'genesis' | 'lore'
  // Production
  | 'vance' | 'vera' | 'marco' | 'atlas' | 'volt' | 'pulse' | 'cipher' | 'flux'
  // Intelligence
  | 'iris' | 'vector' | 'prism'
  // Operations
  | 'bridge' | 'aegis' | 'harbor' | 'ledger'
  // Growth
  | 'surge' | 'anchor'
  // Media
  | 'vox'

// Badge color per layer
export const AGENT_COLORS: Record<AgentType, string> = {
  oracle: '#F59E0B', nexus:  '#F59E0B', genesis: '#F59E0B', lore:   '#F59E0B',
  vance:  '#3B82F6', vera:   '#3B82F6', marco:   '#3B82F6', atlas:  '#3B82F6',
  volt:   '#3B82F6', pulse:  '#3B82F6', cipher:  '#3B82F6', flux:   '#3B82F6',
  iris:   '#8B5CF6', vector: '#8B5CF6', prism:   '#8B5CF6',
  bridge: '#10B981', aegis:  '#10B981', harbor:  '#10B981', ledger: '#10B981',
  surge:  '#EC4899', anchor: '#EC4899',
  vox:    '#06B6D4',
}

export const AGENT_LABELS: Record<AgentType, string> = {
  oracle: 'ORACLE — Diretor',
  nexus:  'NEXUS — Gerente',
  genesis:'GENESIS — Criador',
  lore:   'LORE — Memória',
  vance:  'VANCE — Estrategista',
  vera:   'VERA — Copywriter',
  marco:  'MARCO — Roteirista',
  atlas:  'ATLAS — Design',
  volt:   'VOLT — Tráfego',
  pulse:  'PULSE — Engajamento',
  cipher: 'CIPHER — Publicador',
  flux:   'FLUX — Automação',
  iris:   'IRIS — Pesquisa',
  vector: 'VECTOR — Analytics',
  prism:  'PRISM — Cultura',
  bridge: 'BRIDGE — Onboarding',
  aegis:  'AEGIS — Aprovação',
  harbor: 'HARBOR — CRM',
  ledger: 'LEDGER — Financeiro',
  surge:  'SURGE — Growth',
  anchor: 'ANCHOR — CS',
  vox:    'VOX — Áudio',
}
