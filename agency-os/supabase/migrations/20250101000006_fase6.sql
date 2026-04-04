-- FASE 6: SaaS Platform tables

CREATE TABLE IF NOT EXISTS api_keys (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  key_hash     TEXT NOT NULL UNIQUE,
  last_used_at TIMESTAMPTZ,
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketplace_agents (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT NOT NULL DEFAULT 'production' CHECK (category IN ('production','intelligence','operations','growth')),
  price_type  TEXT NOT NULL DEFAULT 'free' CHECK (price_type IN ('free','one_time','subscription')),
  price_brl   NUMERIC(10,2),
  rating      NUMERIC(3,2) DEFAULT 5.0,
  install_count INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketplace_installs (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id     UUID REFERENCES marketplace_agents(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  installed_by UUID REFERENCES profiles(id),
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, workspace_id)
);

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE UNIQUE,
  steps_done   TEXT[] DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usage_events (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_api_keys" ON api_keys FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','collaborator'))
);

ALTER TABLE marketplace_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_marketplace" ON marketplace_agents FOR SELECT USING (true);

ALTER TABLE marketplace_installs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_installs" ON marketplace_installs FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','collaborator'))
);

ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_onboarding" ON onboarding_progress FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
);

ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_usage_events" ON usage_events FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Seed marketplace with 6 demo agents
INSERT INTO marketplace_agents (slug, name, description, category, price_type, price_brl, rating, install_count) VALUES
  ('oracle-head', 'ORACLE', 'Head Agent orquestrador — cria estratégia e aciona os demais agentes automaticamente', 'intelligence', 'free', NULL, 4.9, 1200),
  ('vera-copy', 'VERA Copy', 'Especialista em copy persuasivo para redes sociais, anúncios e landing pages', 'production', 'free', NULL, 4.8, 980),
  ('atlas-design', 'ATLAS Design', 'Cria briefs visuais e roteiros de design com base no DNA da marca', 'production', 'subscription', 97.00, 4.7, 650),
  ('brand-voice-ai', 'Brand Voice AI', 'Extrai e codifica o tom de voz da marca a partir de exemplos existentes', 'intelligence', 'one_time', 49.00, 4.5, 430),
  ('growth-hacker', 'Growth Hacker', 'Analisa métricas e sugere experimentos de crescimento baseados em dados', 'growth', 'subscription', 197.00, 4.6, 310),
  ('ops-manager', 'Ops Manager', 'Automatiza relatórios de operações e alertas de SLA para o time', 'operations', 'free', NULL, 4.4, 220)
ON CONFLICT (slug) DO NOTHING;
