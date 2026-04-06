# Agency OS

> **Sistema operacional para agências criativas — orquestrado por 22 agentes de IA.**

Agency OS é uma plataforma SaaS multi-tenant que centraliza toda a operação de uma agência de marketing digital: DNA de marca, produção de conteúdo, automação via IA, gestão de clientes, contratos, voz e criativos — tudo em um único painel.

**URL de produção:** https://agencyos-cyan.vercel.app

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 15 (App Router) + TypeScript |
| Estilização | Tailwind CSS + shadcn/ui |
| Banco de dados | Supabase (PostgreSQL) |
| Auth | Supabase Auth (JWT) |
| Storage | Supabase Storage |
| IA Principal | Anthropic Claude (Haiku 4.5 / Sonnet) |
| IA de Imagem | Google Gemini Flash Image |
| Web Scraping | Apify |
| Email | Resend |
| Pagamentos | Stripe |
| Deploy | Vercel |

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        Agency OS                            │
│                                                             │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────────┐  │
│  │  Dashboard  │   │  Client DNA  │   │  Oracle Chat    │  │
│  │  Analytics  │   │  Styleguide  │   │  22 AI Agents   │  │
│  │  Gallery    │   │  Knowledge   │   │  Orchestration  │  │
│  └─────────────┘   └──────────────┘   └─────────────────┘  │
│                                                             │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────────┐  │
│  │    ATLAS    │   │     VOX      │   │   Credit Meter  │  │
│  │  Criativos  │   │    Áudio     │   │  Starter/Pro/   │  │
│  │  Carousel   │   │  Clone Voice │   │  Agency plans   │  │
│  └─────────────┘   └──────────────┘   └─────────────────┘  │
│                                                             │
│              Supabase (Auth + DB + Storage)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Módulos

### Dashboard Global
- Visão geral de todos os clientes
- Gallery de criativos gerados
- Time de Agentes (22 agentes)
- Templates de conteúdo
- Financial / Reports

### DNA de Marca (`/clients/[id]/dna`)

| Aba | Função |
|-----|--------|
| DNA Estruturado | Campos de marca (tom, persona, valores, posicionamento) |
| Documento Gerado | Documento completo gerado por IA |
| Arquivos de Conhecimento | Upload PDF/TXT/HTML/CSS/JSON/MD — auto-sync |
| Styleguide | Render de identidade visual + extrator de design tokens |
| Produtos & Ofertas | Inventário de produtos para contexto de vendas |

### Oracle Chat

Orquestração inteligente de 22 agentes. Injeta DNA + Styleguide + Produtos no contexto. Suporta @mention, anexos, sessões persistentes.

### ATLAS — Creative Studio

Geração de imagens via Gemini. Formatos: Post, Story, Carousel (3-10 slides). Upload de referência visual, histórico com Iterar.

### VOX — Áudio com IA

Narração por texto. Clone de voz da marca. Histórico de áudios.

---

## Os 22 Agentes

**Orquestração:** ORACLE · NEXUS · GENESIS · LORE

**Produção:** VANCE · VERA · MARCO · ATLAS · VOLT · PULSE · CIPHER · FLUX

**Inteligência:** IRIS · VECTOR · PRISM

**Operações:** BRIDGE · AEGIS · HARBOR · LEDGER

**Crescimento:** SURGE · ANCHOR

**Mídia:** VOX

---

## Sistema de Créditos

| Plano | Créditos/mês |
|-------|-------------|
| Starter | 500 |
| Pro | 1.500 |
| Agency | 5.000 |

| Ação | Custo |
|------|-------|
| Oracle message | 10 cr |
| Geração de conteúdo | 15 cr |
| DNA curate | 20 cr |
| Knowledge sync | 10 cr |
| VOX narração | 30 cr |
| Apify scrape | 30 cr |

---

## Setup Local

```bash
cd agency-os/web
cp .env.example .env.local   # preencha as variáveis
npm install
npm run dev
```

### Variáveis necessárias

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
APIFY_API_TOKEN=
RESEND_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=
```

---

## Roadmap

**Concluído:** Multi-tenant auth · DNA de marca completo · Styleguide + tokens · Produtos & Ofertas · Oracle com 22 agentes · @mention routing · Anexos no chat · ATLAS carousel · Referência visual · VOX narração · Créditos por plano · Auto-sync arquivos texto

**Em breve:** Editor de DNA inline · Pipeline AEGIS · Publicação CIPHER · Analytics VECTOR · Assinatura digital · Webhooks · White-label · App mobile · Marketplace · API pública

---

## Licença

Propriedade de Flávio G. Todos os direitos reservados.
