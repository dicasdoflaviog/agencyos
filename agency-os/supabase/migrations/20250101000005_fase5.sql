-- Fase 5: Scheduled Publishing, Stripe Billing

CREATE TABLE IF NOT EXISTS scheduled_posts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id   UUID REFERENCES clients(id) ON DELETE CASCADE,
  post_id     UUID REFERENCES posts(id) ON DELETE SET NULL,
  platform    TEXT NOT NULL CHECK (platform IN ('instagram','linkedin','tiktok','twitter')),
  publish_at  TIMESTAMPTZ NOT NULL,
  status      TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','published','failed')),
  external_id TEXT,
  error_msg   TEXT,
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS integration_configs (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id    UUID REFERENCES clients(id) ON DELETE CASCADE UNIQUE,
  instagram    JSONB DEFAULT '{}',
  linkedin     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id        UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  stripe_customer_id  TEXT,
  stripe_sub_id       TEXT,
  plan                TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter','pro','agency')),
  status              TEXT NOT NULL DEFAULT 'trialing',
  current_period_end  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
