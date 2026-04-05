-- Migration 22: Credit system
-- Adds credit_balance to workspaces + credit_transactions log

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS credit_balance   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credits_granted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  amount       INTEGER NOT NULL,           -- positive = add, negative = spend
  type         TEXT NOT NULL CHECK (type IN ('monthly_grant','purchase','usage','refund')),
  agent_used   TEXT,                       -- 'oracle_message', 'vox_narration', etc.
  description  TEXT,
  balance_after INTEGER,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS credit_transactions_workspace_idx
  ON public.credit_transactions (workspace_id, created_at DESC);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_transactions_workspace_access" ON public.credit_transactions
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Give all existing workspaces a starter grant so they aren't stuck at 0
UPDATE public.workspaces
  SET credit_balance = 500,
      credits_granted_at = NOW()
  WHERE credit_balance IS NULL OR credit_balance = 0;
