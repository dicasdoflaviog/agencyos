-- ── Workspace Cloned Voice ───────────────────────────────────────────────────
-- Stores the ElevenLabs Voice ID created via the "Clonar Minha Voz" feature.

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS cloned_voice_id   TEXT,
  ADD COLUMN IF NOT EXISTS cloned_voice_name TEXT;
