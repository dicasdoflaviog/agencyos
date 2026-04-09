/**
 * Agency OS — Centralized n8n Pipeline
 *
 * Fire-and-forget webhooks para cada ação dos agentes.
 * Cada evento mapeia para uma env var de URL de webhook.
 * Se a env var não estiver configurada, o evento é ignorado silenciosamente.
 */

// ── Tipos de eventos ───────────────────────────────────────────────────────────
export type PipelineEvent =
  // Oracle
  | 'oracle.orchestration.complete'   // Oracle terminou planejamento + execução
  | 'oracle.review.complete'          // Oracle quality review concluído
  | 'oracle.chat.routed'              // Oracle roteou mensagem para agente específico
  // ATLAS
  | 'atlas.carousel.generated'        // Carrossel gerado (antes da aprovação)
  | 'atlas.carousel.approved'         // Carrossel aprovado pelo usuário
  | 'atlas.carousel.rejected'         // Carrossel rejeitado
  // Agentes
  | 'agent.task.complete'             // Qualquer agente concluiu uma tarefa
  | 'agent.task.failed'               // Qualquer agente falhou em uma tarefa

// ── Mapa de env vars ──────────────────────────────────────────────────────────
const EVENT_ENV_MAP: Record<PipelineEvent, string> = {
  'oracle.orchestration.complete': 'N8N_WEBHOOK_ORCHESTRATION_COMPLETE',
  'oracle.review.complete':        'N8N_WEBHOOK_REVIEW_COMPLETE',
  'oracle.chat.routed':            'N8N_WEBHOOK_CHAT_ROUTED',
  'atlas.carousel.generated':      'N8N_WEBHOOK_CAROUSEL_GENERATED',
  'atlas.carousel.approved':       'N8N_WEBHOOK_CAROUSEL_APPROVED',
  'atlas.carousel.rejected':       'N8N_WEBHOOK_CAROUSEL_APPROVED',
  'agent.task.complete':           'N8N_WEBHOOK_AGENT_TASK',
  'agent.task.failed':             'N8N_WEBHOOK_AGENT_TASK',
}

// ── Função core ────────────────────────────────────────────────────────────────
/**
 * Dispara um webhook para o pipeline n8n. Sempre fire-and-forget — nunca lança erro.
 * Todo evento inclui `source: "agency-os"` para roteamento no n8n.
 */
export function fireEvent(
  event: PipelineEvent,
  payload: Record<string, unknown>,
): void {
  const envKey = EVENT_ENV_MAP[event]
  const webhookUrl = process.env[envKey]
  if (!webhookUrl) return // silencioso se não configurado

  const body = JSON.stringify({
    event,
    source:    'agency-os',
    timestamp: new Date().toISOString(),
    ...payload,
  })

  fetch(webhookUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  }).catch(() => { /* fire-and-forget — nunca bloqueia a resposta */ })
}

// ── Helpers tipados por evento ─────────────────────────────────────────────────

export function fireOrchestrationComplete(payload: {
  campaign_title: string
  mode:           'parallel' | 'sequential'
  workspace_id?:  string
  client_id?:     string | null
  agents_used:    Array<{ agent: string; label: string; status: string; chars: number }>
  review?:        { quality_score: number; verdict: string; summary: string } | null
}): void {
  fireEvent('oracle.orchestration.complete', payload)
}

export function fireReviewComplete(payload: {
  campaign_title:  string
  quality_score:   number
  verdict:         string
  summary:         string
  agents_revised?: string[]
  client_id?:      string | null
}): void {
  fireEvent('oracle.review.complete', payload)
}

export function fireChatRouted(payload: {
  agent:           string
  agent_label:     string
  message_preview: string
  client_id?:      string
  workspace_id?:   string
}): void {
  fireEvent('oracle.chat.routed', payload)
}

export function fireCarouselGenerated(payload: {
  asset_id:     string
  client_id:    string
  format:       string
  template:     string
  slide_count:  number
  prompt:       string
  workspace_id?: string
}): void {
  fireEvent('atlas.carousel.generated', payload)
}

export function fireCarouselStatus(payload: {
  asset_id:     string
  client_id:    string
  action:       'approved' | 'rejected'
  format?:      string
  template?:    string
  slide_count?: number
  approved_by:  string
}): void {
  const event: PipelineEvent = payload.action === 'approved'
    ? 'atlas.carousel.approved'
    : 'atlas.carousel.rejected'
  fireEvent(event, payload)
}

export function fireAgentTask(payload: {
  agent:      string
  label:      string
  task:       string
  status:     'complete' | 'failed'
  chars?:     number
  output_id?: string | null
  client_id?: string | null
  job_id?:    string
}): void {
  const event: PipelineEvent = payload.status === 'complete'
    ? 'agent.task.complete'
    : 'agent.task.failed'
  fireEvent(event, payload)
}
