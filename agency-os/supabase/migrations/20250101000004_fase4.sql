-- =============================================================================
-- MIGRATION FASE 4 — Team, Contracts, CMS, Analytics, Memory, White-label
-- =============================================================================

-- BLOCK A: Team & Permissions
CREATE TABLE IF NOT EXISTS workspace_members (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'collaborator' CHECK (role IN ('admin', 'collaborator', 'viewer')),
  invited_by  UUID REFERENCES profiles(id),
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_assignments (
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  client_id   UUID REFERENCES clients(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, client_id)
);

CREATE TABLE IF NOT EXISTS invite_tokens (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email      TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'collaborator',
  token      TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES profiles(id),
  used_at    TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BLOCK B: Contracts & Billing
CREATE TABLE IF NOT EXISTS contracts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id   UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  value       NUMERIC(10,2) NOT NULL,
  billing     TEXT NOT NULL CHECK (billing IN ('monthly', 'project', 'retainer')),
  start_date  DATE NOT NULL,
  end_date    DATE,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended', 'draft')),
  notes       TEXT,
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE NOT NULL,
  amount      NUMERIC(10,2) NOT NULL,
  due_date    DATE NOT NULL,
  paid_at     TIMESTAMPTZ,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  notes       TEXT,
  pdf_url     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- BLOCK C: CMS Headless
CREATE TABLE IF NOT EXISTS posts (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id    UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  title        TEXT NOT NULL,
  slug         TEXT NOT NULL,
  content      TEXT,
  cover_url    TEXT,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published')),
  published_at TIMESTAMPTZ,
  author_id    UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, slug)
);

-- BLOCK D: Analytics
CREATE TABLE IF NOT EXISTS ig_metrics (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id       UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  date            DATE NOT NULL,
  followers       INTEGER,
  reach           INTEGER,
  impressions     INTEGER,
  engagement_rate NUMERIC(5,2),
  synced_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, date)
);

CREATE TABLE IF NOT EXISTS ads_metrics (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id      UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  campaign_id    TEXT NOT NULL,
  campaign_name  TEXT,
  spend          NUMERIC(10,2),
  impressions    INTEGER,
  clicks         INTEGER,
  cpl            NUMERIC(10,2),
  roas           NUMERIC(5,2),
  date           DATE NOT NULL,
  synced_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, campaign_id, date)
);

-- BLOCK E: AI Memory (pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS client_memories (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id  UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  content    TEXT NOT NULL,
  embedding  vector(1536),
  source     TEXT CHECK (source IN ('output_approved', 'briefing', 'manual')),
  source_id  UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  CREATE INDEX client_memories_embedding_idx ON client_memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- BLOCK F: White-label
CREATE TABLE IF NOT EXISTS workspaces (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  logo_url      TEXT,
  primary_color TEXT DEFAULT '#F59E0B',
  domain        TEXT UNIQUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN workspace_id UUID REFERENCES workspaces(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- BLOCK G: Notion
DO $$ BEGIN
  ALTER TABLE jobs ADD COLUMN notion_page_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- updated_at triggers for new tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

DO $$ BEGIN
  CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ig_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Team all access for admin/collaborator
DO $$ BEGIN
  CREATE POLICY "team_workspace_members" ON workspace_members FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','collaborator')));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "team_client_assignments" ON client_assignments FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','collaborator')));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "team_invite_tokens" ON invite_tokens FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','collaborator')));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "team_contracts" ON contracts FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','collaborator')));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "team_invoices" ON invoices FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','collaborator')));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "team_posts" ON posts FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','collaborator')));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "team_ig_metrics" ON ig_metrics FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','collaborator')));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "team_ads_metrics" ON ads_metrics FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','collaborator')));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "team_memories" ON client_memories FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','collaborator')));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "team_workspaces" ON workspaces FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','collaborator')));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Public posts (read-only, no auth)
DO $$ BEGIN
  CREATE POLICY "public_read_published_posts" ON posts FOR SELECT USING (status = 'published');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
