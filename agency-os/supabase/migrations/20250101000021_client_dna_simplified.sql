-- Migration 21: Simplify client_dna to 4 arOS pillars
-- Drop the complex columns and replace with 4 markdown text pillars

ALTER TABLE public.client_dna
  DROP COLUMN IF EXISTS company_name,
  DROP COLUMN IF EXISTS website,
  DROP COLUMN IF EXISTS business_description,
  DROP COLUMN IF EXISTS founded_year,
  DROP COLUMN IF EXISTS team_size,
  DROP COLUMN IF EXISTS primary_color,
  DROP COLUMN IF EXISTS secondary_color,
  DROP COLUMN IF EXISTS fonts,
  DROP COLUMN IF EXISTS tone_of_voice,
  DROP COLUMN IF EXISTS brand_style,
  DROP COLUMN IF EXISTS brand_personality,
  DROP COLUMN IF EXISTS persona_name,
  DROP COLUMN IF EXISTS persona_age,
  DROP COLUMN IF EXISTS persona_pain_points,
  DROP COLUMN IF EXISTS persona_desires,
  DROP COLUMN IF EXISTS demographics,
  DROP COLUMN IF EXISTS main_product,
  DROP COLUMN IF EXISTS price_range,
  DROP COLUMN IF EXISTS key_differentiators,
  DROP COLUMN IF EXISTS offers,
  DROP COLUMN IF EXISTS monthly_revenue_goal,
  DROP COLUMN IF EXISTS primary_channels,
  DROP COLUMN IF EXISTS priority_actions,
  DROP COLUMN IF EXISTS business_goals;

-- Add the 4 arOS pillars
ALTER TABLE public.client_dna
  ADD COLUMN IF NOT EXISTS biografia        TEXT,
  ADD COLUMN IF NOT EXISTS biografia_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS voz              TEXT,
  ADD COLUMN IF NOT EXISTS voz_active       BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS credenciais      TEXT,
  ADD COLUMN IF NOT EXISTS credenciais_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS proibidas        TEXT,
  ADD COLUMN IF NOT EXISTS proibidas_active BOOLEAN DEFAULT true;
