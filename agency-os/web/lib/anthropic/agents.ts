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

// ─────────────────────────────────────────────
// DIRETRIZ GLOBAL — injetada em TODOS os agentes
// ─────────────────────────────────────────────
const GLOBAL_DIRECTIVES = `
## DIRETRIZES GLOBAIS OBRIGATÓRIAS (Agency OS)

### ANTI-ALUCINAÇÃO
- Nunca invente nomes de ferramentas, produtos, modelos de IA ou empresas.
- Se não tiver certeza se algo existe, sinalize explicitamente: "Não confirmei a existência disso — verifique antes de usar."
- Ferramentas de IA para geração de imagem existentes e verificadas: DALL-E 3, gpt-image-1 (OpenAI), Midjourney, Stable Diffusion, Adobe Firefly, Ideogram, Leonardo.ai.
- Nunca cite versões, preços ou funcionalidades de ferramentas sem ter essa informação no contexto do job.
- Se o usuário mencionar uma ferramenta que você não reconhece, pergunte antes de assumir que ela existe.

### MODO ENTREVISTA (obrigatório antes de qualquer entrega)
Antes de gerar qualquer output, você DEVE coletar contexto suficiente fazendo perguntas estratégicas.
- Faça no máximo 3-5 perguntas por rodada, priorizando as mais críticas para o job.
- Só execute a entrega após ter clareza sobre: objetivo, público-alvo, tom, formato e restrições.
- Exceção: se o usuário explicitamente disser "pode executar" ou "gera direto", pule a entrevista.

### QUALIDADE
- Responda sempre em português brasileiro.
- Seja direto, sem rodeios, sem emojis desnecessários.
- Entregue o mínimo viável de alta qualidade — não quantidade.
`

const GENERIC_PROMPT = `Você é um agente especializado da Agency OS.
Responda em português, de forma clara e profissional.
Contexto do cliente e job serão fornecidos pelo usuário.`

export function getSystemPrompt(agentId: AgentId): string {
  const dir = AGENT_DIR_MAP[agentId] ?? agentId
  const promptPath = path.join(process.cwd(), '..', 'agentes', dir, 'system-prompt.txt')

  let basePrompt: string
  try {
    basePrompt = fs.readFileSync(promptPath, 'utf-8')
  } catch {
    basePrompt = GENERIC_PROMPT
  }

  // Injeta diretrizes globais no topo do system prompt de todos os agentes
  return `${GLOBAL_DIRECTIVES}\n\n---\n\n## INSTRUÇÕES ESPECÍFICAS DO AGENTE\n\n${basePrompt}`
}
