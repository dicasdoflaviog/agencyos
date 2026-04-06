-- Ecossistema de Produtos por cliente
CREATE TABLE IF NOT EXISTS client_products (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Identidade
  name            TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'produto',  -- isca_digital, produto_pago, high_ticket, servico, evento
  type            TEXT NOT NULL DEFAULT 'paid',     -- free | paid | high_ticket

  -- Conteúdo
  promise         TEXT,                             -- Maior benefício / transformação prometida
  description     TEXT,                             -- Descrição detalhada
  target_audience TEXT,                             -- Público-alvo específico deste produto

  -- Comercial
  price_cents     INTEGER,                          -- Preço em centavos (0 = grátis)
  price_label     TEXT,                             -- Ex: "R$ 97", "Grátis", "A partir de R$ 5k"
  checkout_url    TEXT,                             -- Link de checkout / inscrição

  -- Funil
  funnel_stage    TEXT NOT NULL DEFAULT 'tofu',     -- tofu | mofu | bofu
  next_product_id UUID REFERENCES client_products(id),  -- Upsell / próximo passo

  -- Status
  status          TEXT NOT NULL DEFAULT 'active',   -- active | paused | off_sale

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_client_products_client ON client_products(client_id, funnel_stage, status);

ALTER TABLE client_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_client_products" ON client_products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND workspace_id = client_products.workspace_id
    )
  );
