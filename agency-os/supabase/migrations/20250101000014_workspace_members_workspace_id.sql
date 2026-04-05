-- Migration 014: Add workspace_id to workspace_members
-- The table was originally created without this FK, causing membership
-- lookups to always fail (onboarding page, finalize route, admin pages).

ALTER TABLE workspace_members
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Backfill existing rows via profiles.workspace_id
UPDATE workspace_members wm
SET workspace_id = p.workspace_id
FROM profiles p
WHERE p.id = wm.user_id
  AND wm.workspace_id IS NULL;

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace
  ON workspace_members(workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user
  ON workspace_members(user_id);
