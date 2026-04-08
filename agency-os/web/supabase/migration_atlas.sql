-- ============================================================
-- Agency OS — Migration ATLAS
-- Execute no Supabase SQL Editor
-- Adiciona colunas spec-compliant em creative_assets
-- ============================================================

-- 1. Criar tabela caso não exista (com schema completo)
CREATE TABLE IF NOT EXISTS creative_assets (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id    UUID REFERENCES clients(id) ON DELETE CASCADE,
  job_id       UUID REFERENCES jobs(id) ON DELETE SET NULL,
  workspace_id UUID,
  format       TEXT,
  style        TEXT,
  type         TEXT,  -- legado — mantido para retrocompatibilidade
  prompt       TEXT NOT NULL,
  image_url    TEXT NOT NULL,
  model        TEXT DEFAULT 'google/gemini-2.5-flash-image',
  status       TEXT DEFAULT 'pending',
  source       TEXT DEFAULT 'manual',
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Adicionar colunas que podem não existir ainda
ALTER TABLE creative_assets
  ADD COLUMN IF NOT EXISTS format TEXT,
  ADD COLUMN IF NOT EXISTS style  TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- 3. Backfill: copiar 'type' → 'format' onde format ainda for NULL
UPDATE creative_assets
  SET format = type
  WHERE format IS NULL AND type IS NOT NULL;

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_creative_assets_client ON creative_assets (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creative_assets_job    ON creative_assets (job_id);
CREATE INDEX IF NOT EXISTS idx_creative_assets_status ON creative_assets (status);

-- 5. RLS
ALTER TABLE creative_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "creative_assets_auth" ON creative_assets;
CREATE POLICY "creative_assets_auth" ON creative_assets
  FOR ALL USING (auth.uid() IS NOT NULL);

-- 6. Bucket creative-assets (rodar no Supabase Dashboard → Storage se ainda não existir)
-- Nome: creative-assets | Public: NÃO | MIME: image/png,image/jpeg,image/webp | Max: 10MB
