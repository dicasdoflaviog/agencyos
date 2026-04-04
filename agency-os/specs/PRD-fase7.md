# PRD — Agency OS Fase 7
> Product Requirements Document · ORACLE Autônomo + Creative Studio (Design Builder)

---

## 1. Contexto

A Fase 7 transforma o Agency OS de uma plataforma de **gestão** em uma plataforma de **execução autônoma**. O ORACLE passa a operar como um agente de IA contínuo, capaz de orquestrar o VERA (copy) e o ATLAS (design/criativos) sem intervenção manual. Paralelamente, o ATLAS ganha capacidade de geração de imagens (criativos visuais).

### Inspiração: Design Builder (EasyBuilder)

Após análise do produto [EasyBuilder Design Builder](https://easybuilder.com.br/designbuilder/), identificamos os diferenciais que queremos trazer para dentro do Agency OS:

| Conceito EasyBuilder | Como aplicamos no Agency OS |
|---------------------|----------------------------|
| **Prompt Visual** — a IA "lê" qualquer imagem do cliente e cruza informações para entregar o que você pensou | `reference_url` na tabela `creative_assets` — o usuário sobe a imagem do cliente (logo, foto, brand guide) e o ATLAS usa como contexto visual |
| **Sem limites de crédito** — diferente de outras IAs que cobram por tentativa | Geração ilimitada por workspace, controlada pelo plano Stripe (não por token/crédito individual) |
| **Entende a "visão da mente"** — nasceu da experiência de liderar 8 designers | ORACLE interpreta briefings vagos e transforma em prompts precisos para o ATLAS |
| **Criativos para produtos, SaaS, thumbnails, retratos** | 5 tipos: `post_feed`, `stories`, `banner`, `thumbnail`, `portrait` — cada um com proporção correta |
| **Refinamento sem custo** — você refina até atingir a perfeição | Botão "Reusar prompt" + histórico de variações no `creative_assets` |
| **Integração com referências externas (Apify no roadmap)** | Fase 8 futura: Apify scraper para buscar tendências/referências de concorrentes e injetar no ATLAS |

### Por que NÃO usamos GrapesJS/canvas drag-and-drop
O EasyBuilder é sobre **geração por IA**, não sobre arrastar elementos. Nosso foco é o mesmo: o usuário **descreve**, a IA **executa**. O canvas interativo seria complexidade desnecessária. O que fazemos é:
- **Input:** prompt textual + imagem de referência opcional
- **Output:** imagem gerada no Supabase Storage → galeria vinculada ao cliente/job
- **Visualização:** iframe + Monaco para outputs HTML (landing pages geradas pelo ATLAS)

---

## 2. Blocos

### Bloco A — ORACLE Autônomo (Chat de Orquestração)
**Prioridade:** ⚡ Crítica

Interface de chat onde o usuário descreve o que precisa e o ORACLE:
- Entende o briefing em linguagem natural
- Delega automaticamente para VERA (copy) ou ATLAS (design) conforme necessidade
- Retorna outputs consolidados na mesma thread
- Persiste histórico de conversas por job (`agent_conversations`)
- UI: painel de chat lateral em `/clients/[id]/oracle`

**Rotas de API:**
- `POST /api/agents/oracle/chat` — recebe mensagem, retorna stream de resposta
- `GET /api/agents/oracle/history/[job_id]` — histórico de conversas

---

### Bloco B — ATLAS Creative Studio (Design Builder da Agência)
**Prioridade:** ⚡ Crítica

Geração de criativos visuais com IA, inspirado no conceito do EasyBuilder Design Builder — onde a IA "lê" referências visuais e entrega o criativo sem precisar de um designer:

**Funcionalidades:**
- **Prompt Visual**: upload de imagem de referência do cliente (logo, foto de produto, brand guide, site concorrente) — enviada como contexto para o GPT-4o Vision antes de gerar com DALL-E 3
- **5 formatos de criativo** com proporção automática correta:
  - `post_feed` (1:1) — posts para feed do Instagram/Facebook
  - `stories` (9:16) — Stories e Reels cover
  - `banner` (16:9) — banners para ads e YouTube
  - `thumbnail` (16:9) — thumbnails de vídeo
  - `portrait` (9:16) — retratos profissionais e autoridade
- **5 estilos visuais**: Fotorrealista, Ilustração, Minimalista, Bold/Gráfico, Cinematográfico
- **Prompts rápidos pré-prontos** para acelerar o usuário sem experiência em prompt engineering
- **Galeria por cliente** — todos os criativos gerados ficam vinculados ao cliente e ao job
- **Botão "Reusar"** — reimporta o prompt do criativo selecionado para gerar variações
- **Download direto** — imagem salva no Supabase Storage (`creative-assets/`)
- **Sem limite por crédito** — controlado pelo plano Stripe da workspace

**O que diferencia do simples DALL-E:**
O ATLAS não é um wrapper genérico. O prompt é sempre enriquecido com contexto da marca do cliente (AI Memory da Fase 4) e estilo da agência. O ORACLE pode acionar o ATLAS automaticamente dentro de uma conversa.

**Rotas de API:**
- `POST /api/agents/atlas/generate` — gera imagem com prompt + tipo + estilo + referência opcional
- `GET /api/agents/atlas/gallery/[client_id]` — galeria de criativos do cliente

**Roadmap Fase 8 (Apify):**
- Scraper de referências: usuário cola URL de concorrente → Apify extrai paleta de cores, tipografia e estilo → ATLAS usa como referência adicional
- Geração em lote: 50 variações de criativo a partir de produtos do cliente (e-commerce)

---

### Bloco C — Realtime Presence (Indicadores ao Vivo)
**Prioridade:** Alta

Indicadores de status em tempo real para UX premium:
- "Agente Trabalhando..." — quando ORACLE/VERA/ATLAS está processando
- "Cliente Online" — quando o cliente está no portal
- Supabase Realtime (presence channels) por workspace
- Toast discreto no topo da tela: `🤖 ATLAS gerando criativos...`

---

### Bloco D — Output Preview (iframe + Monaco)
**Prioridade:** Média

Visualização de outputs de código (landing pages, e-mails HTML):
- Aba "Preview" ao lado de "Código" em job outputs do tipo `html`
- iframe sandboxed para renderizar HTML gerado pelo ATLAS
- Monaco Editor (read-only) para visualizar/copiar o código
- Botão "Editar" abre modo write no Monaco

---

## 3. Banco de Dados

```sql
-- Fase 7 novas tabelas
CREATE TABLE agent_conversations (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id      UUID REFERENCES jobs(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id),
  agent       TEXT NOT NULL, -- 'oracle' | 'vera' | 'atlas'
  role        TEXT NOT NULL, -- 'user' | 'assistant'
  content     TEXT NOT NULL,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON agent_conversations (job_id, created_at);

CREATE TABLE creative_assets (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id   UUID REFERENCES clients(id) ON DELETE CASCADE,
  job_id      UUID REFERENCES jobs(id),
  workspace_id UUID REFERENCES workspaces(id),
  type        TEXT NOT NULL, -- 'post_feed' | 'stories' | 'banner' | 'thumbnail' | 'portrait'
  prompt      TEXT NOT NULL,
  reference_url TEXT,
  image_url   TEXT NOT NULL, -- Supabase Storage URL
  model       TEXT DEFAULT 'dall-e-3',
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON creative_assets (client_id, created_at DESC);
CREATE INDEX ON creative_assets (job_id);
```

---

## 4. Dependências de Fases Anteriores

| Requisito | Fase |
|-----------|------|
| `jobs`, `clients`, `workspaces` | Fase 1–4 |
| `memory` (AI Memory para contexto) | Fase 4 |
| `output_versions` | Fase 3 |
| Stripe (controle de plano) | Fase 5 |
| OpenAI já instalado | Fase 4 |

---

## 5. Stack Adicional

| Pacote | Uso |
|--------|-----|
| `openai` (já instalado) | DALL-E 3, streaming |
| `@monaco-editor/react` | Code preview com syntax highlight |
| `@supabase/realtime-js` | Presence channels |
| Supabase Storage `creative-assets/` | Armazenar imagens geradas |
