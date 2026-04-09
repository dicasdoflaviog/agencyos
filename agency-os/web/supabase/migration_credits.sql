-- ─────────────────────────────────────────────────────────────────────────────
-- Agency OS — Migration Credits
-- Run in Supabase SQL Editor
-- Cria o sistema de créditos (workspaces.credit_balance + credit_transactions)
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Adicionar colunas de crédito na tabela workspaces ────────────────────
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS credit_balance     INTEGER  NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS credits_granted_at TIMESTAMPTZ;

-- ─── 2. Criar tabela subscriptions (plano por workspace) ─────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  plan         TEXT NOT NULL DEFAULT 'starter'
                 CHECK (plan IN ('starter', 'pro', 'agency')),
  status       TEXT NOT NULL DEFAULT 'trialing'
                 CHECK (status IN ('active', 'trialing', 'canceled', 'past_due')),
  stripe_id    TEXT,
  period_start TIMESTAMPTZ DEFAULT NOW(),
  period_end   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id)
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscriptions_auth" ON subscriptions;
CREATE POLICY "subscriptions_auth" ON subscriptions
  FOR ALL USING (auth.uid() IS NOT NULL);

-- ─── 3. Criar tabela credit_transactions ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS credit_transactions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  amount       INTEGER NOT NULL,            -- positivo = crédito, negativo = débito
  type         TEXT NOT NULL
                 CHECK (type IN ('monthly_grant', 'usage', 'manual_grant', 'api_usage')),
  agent_used   TEXT,
  description  TEXT,
  balance_after INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_workspace
  ON credit_transactions (workspace_id, created_at DESC);
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "credit_transactions_auth" ON credit_transactions;
CREATE POLICY "credit_transactions_auth" ON credit_transactions
  FOR ALL USING (auth.uid() IS NOT NULL);

-- ─── 4. Garantir que todo workspace existente tenha crédito inicial ───────────
-- (500 créditos starter para workspaces sem crédito atribuído)
UPDATE workspaces
  SET credit_balance = 500
  WHERE credit_balance IS NULL OR credit_balance = 0;

-- ─── 5. Criar subscription starter para workspaces sem plano ─────────────────
INSERT INTO subscriptions (workspace_id, plan, status)
  SELECT id, 'starter', 'trialing'
  FROM workspaces
  WHERE id NOT IN (SELECT workspace_id FROM subscriptions)
ON CONFLICT (workspace_id) DO NOTHING;
