# SPEC-fase6 — Agency OS
> Software Design Document · Fase 6 — Plataforma SaaS

---

## 1. Arquivos a Criar

```
web/app/
├── admin/
│   ├── layout.tsx                   # Layout super-admin (sem sidebar normal)
│   ├── page.tsx                     # Dashboard: workspaces, MRR, outputs/dia
│   ├── workspaces/
│   │   ├── page.tsx                 # Lista de todas as workspaces
│   │   └── [id]/page.tsx            # Detalhe de workspace + impersonation
│   └── analytics/
│       └── page.tsx                 # Usage events, retenção, funnel
├── marketplace/
│   ├── page.tsx                     # Catálogo público de agentes
│   └── [slug]/page.tsx              # Detalhe do agente + install/comprar
├── onboarding/
│   └── page.tsx                     # Wizard 5 passos (server redirect se done)
└── api/v1/
    ├── clients/route.ts             # GET lista clientes
    ├── jobs/route.ts                # GET+POST jobs
    ├── agents/
    │   └── run/route.ts             # POST acionar agente
    └── docs/route.ts                # GET OpenAPI spec JSON

web/components/
├── admin/
│   ├── WorkspaceTable.tsx           # Tabela de workspaces com status/plano
│   └── UsageChart.tsx               # Gráfico de usage events
├── marketplace/
│   ├── AgentCard.tsx                # Card do agente com rating/preço
│   └── InstallButton.tsx            # Botão instalar (free) ou comprar (paid)
└── onboarding/
    ├── OnboardingWizard.tsx         # Stepper com 5 passos
    └── OnboardingChecklist.tsx      # Widget no overview (até 100% concluído)

web/middleware.ts                    # Atualizar: verificar super_admin para /admin/*
                                     # Rate limiting para /api/v1/*
```

---

## 2. Bloco A — API Pública

### Autenticação
Toda rota `/api/v1/*` requer header `Authorization: Bearer {API_KEY}`.

```typescript
// middleware ou helper
async function validateApiKey(req: NextRequest) {
  const key = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!key) return null
  const keyHash = crypto.createHash('sha256').update(key).digest('hex')
  const { data } = await supabaseAdmin.from('api_keys').select('workspace_id').eq('key_hash', keyHash).single()
  return data?.workspace_id ?? null
}
```

### `GET /api/v1/clients`
```typescript
// Retorna clientes da workspace autenticada
// Query params: ?status=active&limit=50&offset=0
// Resposta: { data: Client[], total: number }
```

### `POST /api/v1/agents/run`
```typescript
// Body: { agent_id: string, prompt: string, client_id?: string }
// Chama a mesma lógica de /api/agents/run (reutiliza)
// Retorna: { output_id: string, content: string }
```

### `GET /api/v1/docs`
```typescript
// Retorna OpenAPI 3.0 spec como JSON
// Gerado estaticamente ou via ts-to-openapi
```

---

## 3. Bloco B — Marketplace

### Page `/marketplace`

```
┌──────────────────────────────────────────────────────────────┐
│ Marketplace de Agentes                     [Publicar agente] │
├────────────────────────────────────────────────────────────── │
│ [Todos] [Produção] [Inteligência] [Operações] [Growth]       │
├─────────────────────────────────────────────────────────────── │
│ ┌────────────┐  ┌────────────┐  ┌────────────┐               │
│ │ APEX       │  │ BRAND-AI   │  │ COPY-PRO   │               │
│ │ Copywriter │  │ Brand Voice│  │ Copy viral │               │
│ │ ⭐ 4.8     │  │ ⭐ 4.5     │  │ ⭐ 4.9     │               │
│ │ Grátis     │  │ R$ 49      │  │ R$ 97/mês  │               │
│ │ [Instalar] │  │ [Comprar]  │  │ [Assinar]  │               │
│ └────────────┘  └────────────┘  └────────────┘               │
└──────────────────────────────────────────────────────────────┘
```

### `POST /api/marketplace/install`
```typescript
// Body: { agent_id: string }
// 1. Verifica se já instalado (marketplace_installs)
// 2. Se pago: verifica pagamento Stripe
// 3. INSERT marketplace_installs
// 4. Retorna { success: true }
// Frontend recarrega lista de agentes disponíveis
```

---

## 4. Bloco C — Fine-tuning

### Trigger de fine-tuning (cron mensal):
```typescript
// GET /api/cron/trigger-fine-tuning
// 1. Lista clientes com > 100 outputs aprovados SEM fine_tune_job ativo
// 2. Para cada cliente:
//    a. Exporta approved outputs como JSONL
//    b. Faz upload para OpenAI Files API
//    c. POST /v1/fine_tuning/jobs { training_file, model: 'gpt-4o-mini' }
//    d. INSERT fine_tune_jobs
// 3. Cron separado verifica status dos jobs em andamento
```

---

## 5. Bloco D — Super Admin

### Middleware update:
```typescript
// middleware.ts — adicionar:
if (request.nextUrl.pathname.startsWith('/admin')) {
  const session = await getSession(request)
  if (session?.role !== 'super_admin') return NextResponse.redirect('/login')
}
```

### Page `/admin` — Métricas:

```
┌──────────┬──────────┬──────────┬──────────┐
│ Workspaces│  MRR     │ Outputs  │ Churn    │
│   127     │ R$24.7k  │ 8.432/d  │ 2.1%     │
└──────────┴──────────┴──────────┴──────────┘
[Tabela de workspaces: name, plan, status, outputs/30d, last_active]
```

---

## 6. Bloco E — Onboarding

### Page `/onboarding` — Wizard:

```
Passo 1/5: Nome da Agência
Passo 2/5: Faça upload do seu logo
Passo 3/5: Adicione seu primeiro cliente
Passo 4/5: Crie seu primeiro job
Passo 5/5: Convide um membro do time
```

- Cada passo submete e avança
- `onboarding_progress.steps_done` acumula passos concluídos
- Ao completar todos os passos: `completed_at = NOW()` + redirect para `/`
- Widget `OnboardingChecklist` aparece na overview até completion

---

## 7. Ordem de Implementação

1. Bloco A (API pública) — habilita integrações imediatamente
2. Bloco E (Onboarding) — melhora ativação de novos usuários
3. Bloco D (Super Admin) — necessário para operar o SaaS
4. Bloco B (Marketplace) — requer conteúdo de outros criadores
5. Bloco C (Fine-tuning) — requer dados históricos suficientes

---

## 8. Dependências

- Fase 4: `workspaces`, `workspace_members`
- Fase 5: `subscriptions` (Stripe)
- Fase 3: `output_versions`, `integration_configs`
