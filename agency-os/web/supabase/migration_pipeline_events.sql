-- ═══════════════════════════════════════════════════════════════
-- Agency OS — Tabela de Eventos do Pipeline n8n
-- Execute este script no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── Tabela principal de eventos ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pipeline_events (
  id              UUID          DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Identificação do evento
  event           TEXT          NOT NULL,                  -- ex: 'oracle.orchestration.complete'
  source          TEXT          DEFAULT 'agency-os',       -- sempre 'agency-os'

  -- Agente relacionado (para agent.task.*)
  agent           TEXT,                                    -- ex: 'vera', 'atlas'
  label           TEXT,                                    -- ex: 'VERA', 'ATLAS'

  -- ATLAS (para atlas.carousel.*)
  asset_id        UUID,

  -- Oracle orchestration
  campaign_title  TEXT,
  quality_score   INTEGER,                                 -- 0-100
  verdict         TEXT,                                    -- 'approved' | 'needs_revision'
  summary         TEXT,
  mode            TEXT,                                    -- 'parallel' | 'sequential'
  agents_count    INTEGER,

  -- Contexto
  client_id       UUID          REFERENCES clients(id)     ON DELETE SET NULL,
  workspace_id    UUID          REFERENCES workspaces(id)  ON DELETE SET NULL,
  approved_by     UUID          REFERENCES profiles(id)    ON DELETE SET NULL,

  -- Dados de formato (carrossel)
  format          TEXT,
  template        TEXT,

  -- Payload completo em JSON (para auditoria e consultas futuras)
  payload         JSONB,

  -- Timestamps
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);

-- ── Índices para performance ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pipeline_events_event        ON pipeline_events(event);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_client_id    ON pipeline_events(client_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_workspace_id ON pipeline_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_created_at   ON pipeline_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_asset_id     ON pipeline_events(asset_id);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE pipeline_events ENABLE ROW LEVEL SECURITY;

-- Membros do workspace podem ler seus próprios eventos
CREATE POLICY "workspace_members_read_pipeline_events"
  ON pipeline_events
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

-- Service role (n8n, webhooks) pode inserir eventos
CREATE POLICY "service_role_insert_pipeline_events"
  ON pipeline_events
  FOR INSERT
  WITH CHECK (true);

-- ── View para dashboard de monitoramento ──────────────────────────────────────
CREATE OR REPLACE VIEW pipeline_events_summary AS
SELECT
  date_trunc('day', created_at)::DATE                      AS day,
  event,
  COUNT(*)                                                  AS total,
  AVG(quality_score)                                        AS avg_quality_score,
  COUNT(*) FILTER (WHERE verdict = 'approved')             AS approved_count,
  COUNT(*) FILTER (WHERE verdict = 'needs_revision')       AS revision_count
FROM pipeline_events
GROUP BY 1, 2
ORDER BY 1 DESC, 3 DESC;

-- ── Exemplos de queries úteis ──────────────────────────────────────────────────
/*
-- Últimos 10 eventos
SELECT event, campaign_title, quality_score, verdict, created_at
FROM pipeline_events
ORDER BY created_at DESC
LIMIT 10;

-- Eventos por tipo (últimos 30 dias)
SELECT event, COUNT(*) as total
FROM pipeline_events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY event
ORDER BY total DESC;

-- Score médio de qualidade por agente
SELECT
  jsonb_array_elements(payload->'agents_used') ->> 'agent' AS agent,
  AVG(quality_score) AS avg_score
FROM pipeline_events
WHERE event = 'oracle.orchestration.complete'
  AND quality_score IS NOT NULL
GROUP BY 1
ORDER BY 2 DESC;

-- Carrosseis aprovados esta semana
SELECT asset_id, client_id, created_at
FROM pipeline_events
WHERE event = 'atlas.carousel.approved'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
*/