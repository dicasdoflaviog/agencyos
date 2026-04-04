# PRD — Agency OS Fase 5
> Product Requirements Document · Distribuição & Receita

---

## 1. Contexto

Com Fases 1–4 entregando uma plataforma colaborativa completa com memória de IA, contratos e portal do cliente, a Fase 5 fecha o loop de **distribuição de conteúdo** e inicia a **monetização direta** da plataforma.

## 2. Objetivo

- Publicar conteúdo diretamente nas redes sociais sem sair do sistema
- Monetizar a plataforma com Stripe (SaaS billing)
- Levar o Agency OS ao celular via PWA e notificações push

---

## 3. Blocos

### Bloco A — Publicação Direta (Direct Publishing)
**Prioridade:** ⚡ Alta

A Fase 3 agendou posts (`scheduled_posts`). A Fase 5 **executa** esse agendamento via API:

- **Instagram Graph API:** publicar imagem/vídeo via Content Publishing API (requer Facebook Business)
- **LinkedIn API:** publicar texto/imagem via Share API (OAuth 2.0)
- **TikTok API:** publicar vídeo via Content Posting API (TikTok for Developers)
- **Buffer/Hootsuite fallback:** para redes sem API direta disponível

**Cron:** `/api/cron/publish-scheduled-posts` — verifica `scheduled_posts WHERE publish_at <= NOW() AND status = 'scheduled'` a cada 15 min.

**UI:** Calendário de publicações por cliente em `/clients/[id]/schedule`.

---

### Bloco B — Stripe Billing
**Prioridade:** ⚡ Alta

Cobrança das agências clientes do Agency OS (quando em modo SaaS/white-label):

- Tabela `subscriptions` com `stripe_subscription_id`, `plan`, `status`
- Planos: `starter` (1 agência), `pro` (5 usuários), `agency` (ilimitado)
- Webhook `/api/webhooks/stripe`: processa `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`
- Portal do cliente Stripe (gerenciar assinatura): `/settings/billing`
- Trial de 14 dias sem cartão

**Variáveis:**
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_ID_STARTER
STRIPE_PRICE_ID_PRO
STRIPE_PRICE_ID_AGENCY
```

---

### Bloco C — PWA (Progressive Web App)
**Prioridade:** Média

- `manifest.json` com ícones, `theme_color: #09090B`, `display: standalone`
- Service Worker via `next-pwa` para cache offline
- Push notifications via Web Push API (server key + VAPID)
- Tabela `push_subscriptions` (user_id, endpoint, keys)
- `POST /api/notifications/subscribe` — salva subscription
- Notificações push disparadas quando: output pronto, aprovação pendente, job atrasado

---

### Bloco D — Mobile Companion (React Native — opcional)
**Prioridade:** Baixa

- App separado em `/mobile` (Expo + React Native)
- Screens: Login, Dashboard overview, Jobs list, Output viewer + aprovação
- Usa a mesma Supabase API key
- Push via Expo Push Notifications
- Design system: mesmas cores/tokens do web

---

## 4. Schema Novo

```sql
-- Bloco A
CREATE TABLE publish_logs (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scheduled_post_id UUID REFERENCES scheduled_posts(id),
  platform         TEXT NOT NULL,
  status           TEXT CHECK (status IN ('success','failed')),
  platform_post_id TEXT,
  error_message    TEXT,
  published_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Bloco B
CREATE TABLE subscriptions (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id           UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  stripe_customer_id     TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  plan                   TEXT CHECK (plan IN ('starter','pro','agency')),
  status                 TEXT CHECK (status IN ('active','trialing','past_due','cancelled')),
  trial_ends_at          TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- Bloco C
CREATE TABLE push_subscriptions (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Dependências de Fases Anteriores

| Requisito | Fase |
|-----------|------|
| `scheduled_posts` table | Fase 3 |
| `integration_configs` (tokens Instagram/Meta) | Fase 3 |
| `workspaces` table | Fase 4 |
| Resend para e-mail | Fase 3 |
| `vercel.json` crons | Fase 3 |

---

## 6. Out of Scope (Fase 6)

- Fine-tuning de modelos por cliente
- API pública para terceiros
- Marketplace de agentes
