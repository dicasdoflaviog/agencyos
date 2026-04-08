# CLAUDE.md — Agency OS Master Folder
> Regras obrigatórias para qualquer IA trabalhando neste projeto.

---

## 👤 PERFIL DO DONO DO PROJETO — Leia antes de tudo

**Quem é:** Empreendedor digital, especialista em UX/UI, Design, Branding e Marketing. Apaixonado por IA e vibecoding. Cria seus próprios projetos mesmo sem formação técnica em desenvolvimento.

**O que sabe bem:** UX/UI, design visual, branding, marketing, copywriting, ferramentas de IA, estratégia de negócio.

**O que não é sua especialidade:** Arquitetura de software, linguagens de programação (lógica avançada), infraestrutura, banco de dados, custos de API/cloud.

**Filosofia do projeto:**
- Ser **facilitador e integrador** — acoplar ferramentas prontas, não reinventar a roda
- Priorizar **Time-to-Market baixo** — entregar valor rápido ao cliente High Ticket
- Manter **custo operacional previsível** — custos de API e tokens são uma preocupação real
- Evitar **código pesado ou desnecessariamente complexo** — se algo nativo do browser ou um serviço existente resolve, prefira

**Como a IA deve se comunicar:**
- Sempre explicar termos técnicos quando usá-los (ex: TTM, RLS, SSR, SDK)
- Antes de implementar algo caro ou complexo, alertar sobre custo e alternativas
- Recomendar ativamente quando existe uma ferramenta de mercado melhor que construir do zero
- Dar contexto de "por que essa escolha" não só "o que fazer"
- Perguntar quando houver ambiguidade em vez de assumir

---

## 📖 GLOSSÁRIO — Termos usados neste projeto

### Arquitetura & Código

| Termo | Significado simples |
|-------|-------------------|
| **TTM** (Time-to-Market) | Tempo até uma feature estar funcionando para o cliente final |
| **SDK** | Kit pronto de uma API (ex: `@anthropic-ai/sdk` = pacote oficial da Anthropic) |
| **API** | "Porta de entrada" de um serviço externo. Você manda um pedido, ele responde |
| **REST API** | Tipo mais comum de API — comunicação via HTTP (GET, POST, PUT, DELETE) |
| **Webhook** | URL que um serviço externo chama quando algo acontece (ex: Vapi avisa quando a ligação termina) |
| **Route / Rota** | Endereço no backend que processa uma ação (ex: `/api/agents/oracle/chat`) |
| **Middleware** | Código que roda antes de toda requisição (ex: verificar se o usuário está logado) |
| **SSR** (Server-Side Rendering) | Página gerada no servidor antes de chegar ao browser (mais SEO, mais rápido) |
| **CSR** (Client-Side Rendering) | Página gerada no browser do usuário (mais interativo, menos SEO) |
| **`'use client'`** | Instrução Next.js — esse componente roda no browser (tem acesso a clique, estado, etc.) |
| **`async/await`** | Forma de esperar uma resposta (da API, do banco) sem travar tudo |
| **TypeScript** | JavaScript com "verificação de tipos" — evita bugs antes de rodar o código |
| **`any`** | Tipo proibido no projeto — significa "não sei o tipo", gera bugs silenciosos |
| **RLS** (Row Level Security) | Segurança do Supabase — cada usuário só vê os dados do seu workspace |
| **Migration** | Arquivo SQL que altera o banco de dados (adiciona tabela, coluna, etc.) de forma controlada |
| **FK** (Foreign Key) | Ligação entre tabelas (ex: `job.client_id` aponta para a tabela `clients`) |
| **Index** | "Índice" no banco — acelera buscas em colunas muito consultadas |
| **Trigger** | Função automática do banco que roda quando algo muda (ex: atualizar `updated_at`) |

### Infraestrutura & Deploy

| Termo | Significado simples |
|-------|-------------------|
| **Vercel** | Serviço onde o site fica hospedado. Faz deploy automático a cada `git push` |
| **Deploy** | Publicar a versão nova do código em produção (site ao vivo) |
| **Build** | Processo de compilar o código antes de publicar. Se falhar, o deploy não vai ao ar |
| **Env vars** (variáveis de ambiente) | Senhas e chaves de API guardadas fora do código (`.env.local`, painel Vercel) |
| **Edge Function** | Função que roda próxima ao usuário (mais rápida, mas com limitações) |
| **Serverless** | Código que roda "na nuvem" só quando chamado — não tem servidor ligado 24/7 |
| **CDN** | Rede global de servidores que entrega arquivos (imagens, CSS) mais rápido |
| **Supabase Storage** | S3/Drive do Supabase — guarda arquivos (imagens, áudio, PDFs) |
| **Bucket** | "Pasta" dentro do Supabase Storage |

### Custos & Performance

| Termo | Significado simples |
|-------|-------------------|
| **Token** | Unidade de cobrança de LLMs. ~1 token = ¾ de uma palavra. Mais contexto = mais tokens = mais caro |
| **Context window** | Limite de tokens que a IA consegue "ver" de uma vez. Claude Sonnet: ~200k tokens |
| **Prompt** | Instrução/pergunta enviada para a IA |
| **System prompt** | Instrução permanente que define como a IA se comporta (personalidade, regras) |
| **Streaming** | Resposta da IA chegando palavra por palavra (como no ChatGPT) em vez de esperar tudo |
| **Rate limit** | Limite de chamadas por minuto/hora de uma API. Se ultrapassar, retorna erro 429 |
| **Latência** | Tempo de resposta. Alta latência = lento. Baixa latência = rápido |
| **Cache** | Guardar resultado temporariamente para não chamar a API de novo (economiza custo) |
| **Revalidate** | Tempo até o cache expirar e buscar dados frescos |

### Padrões & Qualidade

| Termo | Significado simples |
|-------|-------------------|
| **Refactor** | Reorganizar o código sem mudar o que ele faz — manter limpo |
| **Bug** | Erro no código que causa comportamento inesperado |
| **Type error** | Erro TypeScript — tipo errado passado para uma função |
| **500** | Código HTTP de erro no servidor (algo quebrou no backend) |
| **401** | Usuário não autenticado (não está logado) |
| **403** | Usuário autenticado mas sem permissão |
| **404** | Recurso não encontrado |
| **Payload** | Dados enviados numa requisição. `PAYLOAD_TOO_LARGE` = dados demais no request |
| **Multipart/form-data** | Formato de envio de arquivos (usado para upload de áudio, imagem) |
| **Base64** | Forma de converter arquivo binário em texto — aumenta ~33% o tamanho |
| **CORS** | Política de segurança do browser — bloqueia chamadas de um domínio para outro |

### IA & Integrações

| Termo | Significado simples |
|-------|-------------------|
| **LLM** | Large Language Model — o "cérebro" de IAs como Claude e GPT |
| **RAG** | Retrieval-Augmented Generation — IA que busca documentos antes de responder |
| **Embedding** | Representação numérica de texto para busca semântica (vetor 768 dimensões) |
| **TTS** | Text-to-Speech — texto → voz (ex: ElevenLabs, VOX) |
| **STT** | Speech-to-Text — voz → texto (ex: Whisper da OpenAI) |
| **SSE** | Server-Sent Events — streaming de dados do servidor para o browser (como o chat do Oracle) |
| **n8n** | Ferramenta de automação no-code (tipo Make/Zapier mas self-hosted) |
| **Webhook n8n** | URL do n8n que recebe dados do sistema para disparar um fluxo |
| **Vapi** | Plataforma de SDR por voz — IA que faz ligações telefônicas |
| **HeyGen** | Plataforma de avatares digitais — gera vídeo de uma pessoa falando via IA |
| **Apify** | Plataforma de web scraping — coleta dados de redes sociais, sites, etc. |
| **ElevenLabs** | API de clonagem e geração de voz com IA (VOX usa isso) |
| **Instant Voice Cloning** | Feature do ElevenLabs que cria uma voz a partir de ~1min de áudio (requer plano pago) |

---

## 💰 DIRETRIZES DE CUSTO

Antes de implementar qualquer feature, avaliar:

### Perguntas obrigatórias
1. **Chama IA a cada request?** — Se sim, calcular custo por uso. Claude Sonnet: ~$3/1M tokens input
2. **Guarda arquivos?** — Supabase Storage: $0.021/GB/mês. Limpar arquivos temporários após uso
3. **Tem cache possível?** — Se a resposta muda raramente, cachear. Ex: lista de vozes ElevenLabs (1h)
4. **Escala linear com usuários?** — Se custo dobra com cada usuário, alertar antes de implementar
5. **Tem alternativa nativa do browser?** — Web Audio API, MediaRecorder, Canvas são gratuitos

### Padrões de economia já implementados
- **Classifier de intenção** usa `claude-haiku` (mais barato) em vez de Sonnet
- **Arquivos de anexo** vão para Supabase Storage (não base64 no banco)
- **Histórico do Oracle** limita às últimas 10 mensagens para não explodir o context window
- **Preview de vozes** tem `revalidate: 3600` (não chama ElevenLabs a cada page load)
- **Arquivos do Oracle** são deletados do Storage após processamento (ephemeral)

### Alertas de custo alto
- ❌ Não enviar o histórico completo de chat para IA a cada mensagem
- ❌ Não fazer polling (checar a cada segundo) — usar webhooks ou SSE
- ❌ Não guardar áudio/vídeo em base64 no banco de dados
- ❌ Não chamar API externa em cada render de componente — usar useEffect + cache

---

## 🎯 FRAMEWORK DE DECISÃO TÉCNICA

Quando o dono propuser uma nova feature, avaliar nesta ordem:

```
1. Existe um serviço/API de mercado que já faz isso bem?
   → SIM: Integrar (ex: HeyGen para avatar, Vapi para ligações)
   → NÃO: Construir do zero

2. O custo de uso é previsível?
   → SIM: Seguir
   → NÃO: Propor alternativa ou alertar com estimativa

3. TTM (Time-to-Market) é compatível com a prioridade?
   → Baixo (1-3 dias): Verde
   → Médio (1 semana): Amarelo — confirmar prioridade
   → Alto (2+ semanas): Vermelho — questionar se é o momento certo

4. Complexidade de manutenção?
   → Simples (1 arquivo): Fazer
   → Média (3-5 arquivos): Fazer com documentação
   → Alta (novo sistema): Planejar antes, confirmar com o dono
```



## 📁 ESTRUTURA DA PASTA MESTRE

```
agency-os/              ← PASTA MESTRE (não mova arquivos fora daqui)
├── CLAUDE.md           ← este arquivo
├── specs/
│   ├── PRD-fase1.md    ← Research (SDD Etapa 1) ✅
│   └── SPEC-fase1.md   ← Spec (SDD Etapa 2)
├── web/                ← Next.js 14 App Router
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── types/
│   └── package.json
└── agentes/            ← System prompts dos 21 agentes
    ├── head/           → ORACLE
    ├── estrategista/   → VANCE
    ├── copywriter/     → VERA
    ├── designer/       → ATLAS
    ├── ui-designer/    → ATLAS (UI)
    ├── traffic-manager/→ VOLT
    ├── engajador/      → PULSE
    ├── publicador/     → CIPHER
    ├── genesis/        → GENESIS
    ├── lore/           → LORE
    ├── prism/          → PRISM
    ├── nexus/          → NEXUS
    ├── marco/          → MARCO
    ├── flux/           → FLUX
    ├── iris/           → IRIS
    ├── vector/         → VECTOR
    ├── bridge/         → BRIDGE
    ├── aegis/          → AEGIS
    ├── harbor/         → HARBOR
    ├── ledger/         → LEDGER
    ├── surge/          → SURGE
    └── anchor/         → ANCHOR
```

---

## 🛠️ STACK (web/)

```
Next.js 14 (App Router) + TypeScript
Tailwind CSS + shadcn/ui
Supabase (Postgres + RLS + Storage + Auth)
Anthropic API — claude-sonnet-4-6
Vercel (deploy)
```

---

## 🎨 DESIGN SYSTEM (obrigatório em todos os componentes)

> Source of truth: `design-system/agency-os/MASTER.md`

```css
/* Cores */
--color-bg:             #09090B   /* fundo principal */
--color-surface:        #18181B   /* cards, sidebar */
--color-surface-raised: #27272A   /* dropdowns, tooltips */
--color-border:         rgba(255,255,255,0.07)
--color-border-strong:  rgba(255,255,255,0.12)
--color-text:           #FAFAFA
--color-muted:          #A1A1AA
--color-accent:         #F59E0B   /* amber — CTAs, badges ativos */
--color-accent-hover:   #D97706
--color-accent-fg:      #0A0A0A   /* texto sobre botão accent */
--color-success:        #22C55E
--color-warning:        #F97316
--color-error:          #EF4444
```

- **Font:** Inter (Google Fonts) — única fonte, pesos 400/500/600/700
- **Dark mode:** padrão — fundo `#09090B` (nunca `#000000` puro)
- **Container:** max-width `1280px` (layout), conteúdo principal `max-w-5xl`
- **Accent `#F59E0B`:** apenas em 1 elemento por seção (CTA, badge ativo, ícone destaque)
- **Border radius:** 4px botões/inputs · 6px cards · 8px modals
- **Transições:** `150ms ease-out` para hover/focus
- **Ícones:** Lucide (stroke, consistente) — sem emojis

---

## 🤖 OS 21 AGENTES

```
META:          GENESIS · LORE
ORQUESTRAÇÃO:  ORACLE · NEXUS
PRODUÇÃO:      VANCE · VERA · MARCO · ATLAS · VOLT · PULSE · CIPHER · FLUX
INTELIGÊNCIA:  IRIS · VECTOR · PRISM
OPERAÇÕES:     BRIDGE · AEGIS · HARBOR · LEDGER
GROWTH:        SURGE · ANCHOR
```

**API:** Anthropic `claude-sonnet-4-6` para todos.  
**System prompts:** carregados de `agentes/[nome]/system-prompt.txt`  
**Contexto injetado por chamada:** system-prompt + brand voice do cliente + brief do job

---

## 🔧 WORKFLOW DE DESENVOLVIMENTO

> Baseado nos sistemas **Superpowers** + **Get Shit Done** instalados em `../superpowers/` e `../get-shit-done/`

### Princípios Fundamentais

- **TDD** — Escreva o teste que falha ANTES do código que o faz passar
- **YAGNI** — "You Aren't Gonna Need It" — não implemente o que não foi pedido agora
- **DRY** — Não duplique código; extraia em funções/componentes reutilizáveis
- **Root Cause First** — NUNCA corrija um bug sem encontrar a causa raiz primeiro
- **Spec → Plan → Code** — Nunca pular etapas. Sem spec aprovado, sem código

### Antes de Implementar Qualquer Feature

```
1. Existe spec aprovado? → NÃO: criar PRD/SPEC antes
2. Mapeei os arquivos afetados? → listar TODOS os arquivos: criados, modificados, testados
3. Existe plano de tarefas bite-sized? → cada tarefa = 2-5 min, TDD, com código real (sem "TBD")
4. Verifiquei duplicação? → buscar componente/função existente antes de criar novo
```

### Estrutura de Plano (obrigatória para tasks > 3 arquivos)

Salvar em: `docs/plans/YYYY-MM-DD-<feature>.md`

```markdown
# [Feature] — Plano de Implementação
**Goal:** [uma frase]
**Arquitetura:** [2-3 frases]
**Stack:** [tecnologias envolvidas]

### Task N: [Nome]
**Arquivos:**
- Criar: `exact/path/file.ts`
- Modificar: `exact/path/existing.ts`

- [ ] Escrever teste que falha
- [ ] Rodar teste (confirmar FAIL)
- [ ] Implementar código mínimo
- [ ] Rodar teste (confirmar PASS)
- [ ] Commit: `git commit -m "feat: ..."`
```

### Debugging Sistemático

```
NUNCA propor fix sem completar:
1. Reproduzir o bug de forma consistente
2. Identificar ONDE exatamente o comportamento diverge
3. Descobrir POR QUE acontece (causa raiz)
4. Só então → propor correção cirúrgica
```

### Subagent-Driven Development

Para tasks independentes com plano aprovado:
- Cada task → subagente fresco com contexto isolado
- Revisão em 2 estágios: (1) conformidade com spec → (2) qualidade de código
- Nunca herdar contexto do agente principal no subagente

### Context Management (anti-rot)

- Quando context window > 60% → fazer checkpoint (resumo + próximos passos)
- Salvar decisões importantes em `CLAUDE.md` ou spec, não apenas na conversa
- Referências de arquivos via path exato, não descrição vaga

---

## 🚫 REGRAS DE OURO

1. **Nunca** criar arquivos fora de `agency-os/`
2. **Nunca** usar `any` no TypeScript
3. **Nunca** hardcodar cores — usar as CSS vars do design system
4. **Nunca** criar componentes fora de `web/components/`
5. **Sempre** usar shadcn/ui para primitivos (Button, Input, Card, etc.)
6. **Sempre** dark mode first — testar no fundo `#09090B`
7. **Sempre** mobile-first (min-width: 375px base)
8. **Sempre** seguir SDD: PRD → SPEC → CODE (nesta ordem)
9. **Sempre** consultar `design-system/agency-os/MASTER.md` antes de criar componentes

---

## 📦 DEPENDÊNCIAS PRINCIPAIS (web/)

```json
{
  "next": "^14",
  "@supabase/supabase-js": "latest",
  "@supabase/ssr": "latest",
  "@anthropic-ai/sdk": "latest",
  "shadcn/ui": "via npx shadcn",
  "lucide-react": "latest",
  "react-hook-form": "latest",
  "zod": "latest",
  "@tanstack/react-query": "latest",
  "next-themes": "latest",
  "tailwind-merge": "latest",
  "clsx": "latest"
}
```

---

## 🗄️ BANCO DE DADOS — Fase 1 (Supabase)

Tabelas: `profiles` · `clients` · `client_assets` · `jobs` · `job_outputs`  
RLS: admin full access · collaborator vê apenas clientes atribuídos  
Sem acesso público na Fase 1 (portal cliente = Fase 2)

---

## 🗺️ FASES DO PROJETO

- **Fase 1 (atual):** Auth + Clients + Jobs + Agents + Gallery + Financial básico
- **Fase 2:** Portal cliente + CRM leads + WhatsApp Business + Google Sheets sync
- **Fase 3:** Instagram API + Meta Ads API + Figma API + Blog CMS
- **Futuro:** Multi-tenant / SaaS

---

*Última atualização: Abril 2026*
