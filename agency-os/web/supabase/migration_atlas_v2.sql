-- ─────────────────────────────────────────────────────────────────────────────
-- ATLAS v2 Migration — Agency OS
-- Run in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── ALTER: client_dna — adicionar colunas ATLAS v2 ─────────────────────────
-- (tabela já existe com: biografia, voz, credenciais, proibidas)

ALTER TABLE client_dna
  ADD COLUMN IF NOT EXISTS primary_color     TEXT DEFAULT '#000000',
  ADD COLUMN IF NOT EXISTS secondary_colors  TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS font_heading      TEXT DEFAULT 'Inter',
  ADD COLUMN IF NOT EXISTS font_body         TEXT DEFAULT 'Inter',
  ADD COLUMN IF NOT EXISTS logo_url          TEXT,
  ADD COLUMN IF NOT EXISTS visual_style      TEXT DEFAULT 'minimalista',
  ADD COLUMN IF NOT EXISTS tone              TEXT DEFAULT 'profissional',
  ADD COLUMN IF NOT EXISTS brand_voice_text  TEXT,
  ADD COLUMN IF NOT EXISTS target_audience   TEXT,
  ADD COLUMN IF NOT EXISTS key_message       TEXT,
  ADD COLUMN IF NOT EXISTS reference_images  TEXT[] DEFAULT '{}';

-- Constraint de enum (usa IF NOT EXISTS pattern via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'client_dna_visual_style_check'
  ) THEN
    ALTER TABLE client_dna
      ADD CONSTRAINT client_dna_visual_style_check
      CHECK (visual_style IN ('minimalista','bold','cinematografico','colorido','profile'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'client_dna_tone_check'
  ) THEN
    ALTER TABLE client_dna
      ADD CONSTRAINT client_dna_tone_check
      CHECK (tone IN ('profissional','casual','inspiracional','tecnico','humor'));
  END IF;
END $$;

-- ─── ALTER: creative_assets — colunas para carrossel ────────────────────────

ALTER TABLE creative_assets
  ADD COLUMN IF NOT EXISTS template             TEXT DEFAULT 'minimalista',
  ADD COLUMN IF NOT EXISTS slide_count          INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS slides_data          JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS caption              TEXT,
  ADD COLUMN IF NOT EXISTS dna_snapshot         JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reference_image_url  TEXT;
