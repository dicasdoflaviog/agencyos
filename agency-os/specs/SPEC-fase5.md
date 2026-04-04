# SPEC-fase5 — Agency OS
> Software Design Document · Fase 5 — Distribuição & Receita

---

## 1. Arquivos a Criar

```
web/app/(dashboard)/clients/[id]/schedule/
└── page.tsx                         # Calendário de publicações

web/app/(dashboard)/settings/billing/
└── page.tsx                         # Portal Stripe (plano, fatura, upgrade)

web/app/api/
├── cron/
│   └── publish-scheduled-posts/route.ts  # Cron 15min: executa publicações
├── webhooks/
│   └── stripe/route.ts              # Webhook Stripe
├── notifications/
│   └── subscribe/route.ts           # POST: salvar push subscription
└── stripe/
    └── checkout/route.ts            # POST: criar checkout session

web/components/
├── schedule/
│   ├── PublishCalendar.tsx          # Calendário mensal de posts agendados
│   └── SchedulePostCard.tsx         # Card de post agendado com status
└── billing/
    ├── PlanCard.tsx                 # Card de plano (starter/pro/agency)
    └── BillingPortalButton.tsx      # Botão "Gerenciar assinatura"

public/
├── manifest.json                    # PWA manifest
└── sw.js                            # Service Worker (gerado por next-pwa)
```

---

## 2. Bloco A — Publicação Direta

### Cron: `GET /api/cron/publish-scheduled-posts`

```typescript
// Verifica posts com publish_at <= NOW() e status = 'scheduled'
// Para cada post:
//   1. Busca integration_configs do cliente (instagram/linkedin/tiktok)
//   2. Chama a API da plataforma correta
//   3. Atualiza scheduled_posts.status = 'published' ou 'failed'
//   4. Insere em publish_logs

// Instagram:
const igResponse = await fetch(
  `https://graph.facebook.com/v18.0/${ig_user_id}/media`,
  { method: 'POST', body: JSON.stringify({ image_url, caption, access_token }) }
)
// Publica container criado:
await fetch(`https://graph.facebook.com/v18.0/${ig_user_id}/media_publish`, {
  method: 'POST', body: JSON.stringify({ creation_id: igResponse.id, access_token })
})
```

### `vercel.json` — adicionar cron de 15 minutos:
```json
{ "path": "/api/cron/publish-scheduled-posts", "schedule": "*/15 * * * *" }
```

### Page `/clients/[id]/schedule`

Layout tipo calendário (grade 7x5 do mês):
- Cada dia mostra bolhas coloridas por plataforma (🟠 Instagram, 🔵 LinkedIn)
- Clicar no post abre modal com status + conteúdo
- Botão "Agendar novo post" → redireciona para output com agendamento

---

## 3. Bloco B — Stripe Billing

### Variáveis de ambiente necessárias:
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_STARTER=price_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_AGENCY=price_...
```

### `POST /api/stripe/checkout`
```typescript
// Body: { price_id: string, workspace_id: string }
// 1. Cria ou busca Stripe Customer pelo workspace_id
// 2. Cria Checkout Session com trial_period_days: 14
// 3. Retorna { url: checkoutUrl }
```

### `POST /api/webhooks/stripe`
```typescript
// Valida assinatura: stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)
// Eventos tratados:
// checkout.session.completed → INSERT subscriptions
// customer.subscription.updated → UPDATE subscriptions.status
// customer.subscription.deleted → UPDATE status='cancelled'
// invoice.payment_failed → UPDATE status='past_due' + notificação
```

### Page `/settings/billing`

```
┌──────────────────────────────────────────────────────────────┐
│ Plano Atual: Pro                                             │
│ Status: Ativo · Renova em 15/Mai/2026                        │
├──────────────────────────────────────────────────────────────┤
│ [Starter R$97/mês]  [● Pro R$197/mês]  [Agency R$497/mês]   │
│ 1 usuário           5 usuários           Ilimitado           │
│                                                              │
│ [Gerenciar assinatura no Stripe]  [Cancelar plano]           │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Bloco C — PWA

### `public/manifest.json`
```json
{
  "name": "Agency OS",
  "short_name": "Agency OS",
  "theme_color": "#09090B",
  "background_color": "#09090B",
  "display": "standalone",
  "start_url": "/",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### `next.config.ts` — adicionar next-pwa:
```typescript
import withPWA from 'next-pwa'
export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
})(nextConfig)
```

### `POST /api/notifications/subscribe`
```typescript
// Body: { endpoint, keys: { p256dh, auth } }
// INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
// ON CONFLICT (endpoint) DO NOTHING
```

---

## 5. Ordem de Implementação

1. Bloco B (Stripe) — monetização imediata
2. Bloco A (Publicação Direta) — diferencial de produto
3. Bloco C (PWA) — melhorias progressivas

---

## 6. Dependências

- Fase 3: `scheduled_posts`, `integration_configs`, `vercel.json` crons
- Fase 4: `workspaces` table
