# SPEC — Agency OS | Fase 1
> SDD Etapa 2 · Plano tático de implementação · Abril 2026
> Baseado em: PRD-fase1.md

---

## ORDEM DE IMPLEMENTAÇÃO

```
BLOCO 0 — Foundation         (CSS, fonts, utils, types)
BLOCO 1 — Supabase Setup     (client, server, middleware)
BLOCO 2 — Auth               (login, proteção de rotas)
BLOCO 3 — Shell              (root layout, providers, sidebar, topbar)
BLOCO 4 — M2 Clients         (lista, form, detalhe)
BLOCO 5 — M3 Jobs            (kanban, form, detalhe)
BLOCO 6 — M4 Agents          (selector, chat, api route)
BLOCO 7 — M5 Gallery         (grid, aprovação)
BLOCO 8 — M6 Financial       (tabela, MRR)
```

---

## BLOCO 0 — FOUNDATION

### 0.1 — MODIFICAR `web/app/globals.css`
**Ação:** substituir completamente  
**O que fazer:** remover defaults do Next.js, injetar design system + Tailwind v4 theme

```css
@import "tailwindcss";

@theme inline {
  /* Design System — Agency OS */
  --color-bg:             #09090B;
  --color-surface:        #18181B;
  --color-surface-raised: #27272A;
  --color-text:           #FAFAFA;
  --color-muted:          #A1A1AA;
  --color-accent:         #F59E0B;
  --color-accent-hover:   #D97706;
  --color-accent-fg:      #0A0A0A;
  --color-success:        #22C55E;
  --color-warning:        #F97316;
  --color-error:          #EF4444;

  /* Font */
  --font-sans: var(--font-inter);
}

:root {
  --background: #09090B;
  --foreground: #FAFAFA;
  color-scheme: dark;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans), system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* shadcn/ui CSS vars — mapeados para design system */
:root {
  --card:             #18181B;
  --card-foreground:  #FAFAFA;
  --popover:          #27272A;
  --popover-foreground: #FAFAFA;
  --primary:          #F59E0B;
  --primary-foreground: #0A0A0A;
  --secondary:        #27272A;
  --secondary-foreground: #FAFAFA;
  --muted:            #27272A;
  --muted-foreground: #A1A1AA;
  --accent:           #27272A;
  --accent-foreground: #FAFAFA;
  --destructive:      #EF4444;
  --destructive-foreground: #FAFAFA;
  --border:           rgba(255,255,255,0.07);
  --input:            rgba(255,255,255,0.06);
  --ring:             #F59E0B;
  --radius:           0.375rem;
}
```

---

### 0.2 — MODIFICAR `web/app/layout.tsx`
**Ação:** modificar  
**O que fazer:** trocar fontes Geist por Inter variable, adicionar ThemeProvider e QueryProvider, dark mode padrão

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from 'next-themes'
import { QueryProvider } from '@/components/providers/QueryProvider'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Agency OS',
  description: 'Painel operacional da agência',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-[#09090B] text-[#FAFAFA] antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} forcedTheme="dark">
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

---

### 0.3 — CRIAR `web/lib/utils.ts`
**Ação:** criar  
**O que fazer:** utilitário `cn()` + formatters comuns

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}
```

---

### 0.4 — CRIAR `web/types/database.ts`
**Ação:** criar  
**O que fazer:** tipos TypeScript espelhando o schema Supabase da Fase 1

```ts
export type Profile = {
  id: string
  name: string
  role: 'admin' | 'collaborator'
  avatar_url: string | null
  created_at: string
}

export type Client = {
  id: string
  name: string
  slug: string
  niche: string | null
  logo_url: string | null
  status: 'active' | 'paused' | 'archived'
  contract_value: number | null
  contract_status: 'active' | 'pending' | 'overdue'
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ClientAsset = {
  id: string
  client_id: string
  type: 'logo' | 'styleguide' | 'brandvoice' | 'font' | 'product' | 'other'
  name: string
  file_url: string | null
  content: string | null
  created_at: string
}

export type Job = {
  id: string
  client_id: string
  title: string
  description: string | null
  status: 'backlog' | 'in_progress' | 'review' | 'done' | 'cancelled'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  assigned_to: string | null
  created_by: string | null
  due_date: string | null
  created_at: string
  updated_at: string
  client?: Pick<Client, 'id' | 'name' | 'logo_url'>
}

export type JobOutput = {
  id: string
  job_id: string
  client_id: string
  agent_id: string
  agent_name: string
  input_prompt: string
  output_content: string
  output_type: 'text' | 'copy' | 'strategy' | 'script' | 'image_prompt'
  status: 'pending' | 'approved' | 'rejected' | 'revision'
  feedback: string | null
  created_at: string
}
```

---

### 0.5 — CRIAR `web/components/providers/QueryProvider.tsx`
**Ação:** criar  
**O que fazer:** wrapper client-side para React Query

```tsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000 } },
  }))
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
```

---

## BLOCO 1 — SUPABASE SETUP

### 1.1 — CRIAR `web/lib/supabase/client.ts`
**Ação:** criar  
**O que fazer:** Supabase browser client (para Client Components)

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

---

### 1.2 — CRIAR `web/lib/supabase/server.ts`
**Ação:** criar  
**O que fazer:** Supabase server client (para Server Components e Route Handlers)

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

---

### 1.3 — CRIAR `web/middleware.ts`
**Ação:** criar (na raiz de `web/`)  
**O que fazer:** proteger todas as rotas `/(dashboard)`, redirecionar para `/login` se não autenticado

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  if (!user && path !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && path === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

---

### 1.4 — CRIAR `web/.env.local`
**Ação:** criar  
**O que fazer:** variáveis de ambiente (preenchidas manualmente pelo dev)

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

ANTHROPIC_API_KEY=
```

---

## BLOCO 2 — AUTH

### 2.1 — CRIAR `web/app/(auth)/login/page.tsx`
**Ação:** criar  
**O que fazer:** página de login com email + senha, Supabase Auth, dark mode brand

Estrutura visual:
- Fundo `#09090B` full screen
- Card centralizado 400px, borda `rgba(255,255,255,0.07)`
- Logo/título "AGENCY OS" em Inter 700, accent `#F59E0B`
- Campos: Email e Senha (shadcn Input)
- Botão "Entrar" (background `#F59E0B`, color `#0A0A0A`, font-weight 600)
- Feedback de erro inline

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou senha inválidos')
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090B]">
      <div className="w-full max-w-[400px] border border-white/[0.07] rounded-lg p-8 bg-[#18181B]">
        <h1 className="text-2xl font-bold text-[#FAFAFA] mb-1">Agency OS</h1>
        <p className="text-[#A1A1AA] text-sm mb-8">Acesso interno da agência</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full bg-[#F59E0B] text-[#0A0A0A] font-semibold hover:bg-[#D97706]">
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

---

### 2.2 — CRIAR `web/app/(auth)/layout.tsx`
**Ação:** criar  
**O que fazer:** layout mínimo para rotas de auth (sem sidebar/topbar)

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

---

## BLOCO 3 — SHELL (DASHBOARD LAYOUT)

### 3.1 — CRIAR `web/components/layout/Sidebar.tsx`
**Ação:** criar  
**O que fazer:** sidebar fixa 240px, navegação com os módulos da Fase 1, indicador de rota ativa

```
Logo "AGENCY OS" no topo (Bebas Neue, amarelo)
Nav items com ícone + label:
  • Overview  → /           (LayoutDashboard)
  • Clientes  → /clients    (Users)
  • Jobs      → /jobs       (Briefcase)
  • Galeria   → /gallery    (Images)
  • Financeiro → /financial (DollarSign)
Rodapé: avatar + nome do usuário + botão logout
```

- Estilo: `bg-[#18181B] border-r border-white/[0.07]`

---

### 3.2 — CRIAR `web/components/layout/TopBar.tsx`
**Ação:** criar  
**O que fazer:** barra superior com título da página atual + breadcrumb opcional

```
height: 56px, border-bottom border-white/7
Esquerda: título dinâmico via usePathname()
Direita: avatar do usuário (Fase 2: notificações)
```

---

### 3.3 — CRIAR `web/app/(dashboard)/layout.tsx`
**Ação:** criar  
**O que fazer:** layout de duas colunas: sidebar + main. Wraps todas as rotas do dashboard

```tsx
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen bg-[#09090B]">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <main className="flex-1 p-6 max-w-[1280px] mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
```

---

### 3.4 — CRIAR `web/app/(dashboard)/page.tsx`
**Ação:** criar  
**O que fazer:** overview/home — 4 stat cards (clientes ativos, jobs em andamento, outputs aprovados, MRR)

```
Layout: grid 4 colunas no desktop, 2 no mobile
Cards de stat: ícone + label + número grande + tendência
Estilo: bg-surface, border border-white/7, rounded
```

---

## BLOCO 4 — M2 CLIENTS

### 4.1 — CRIAR `web/app/(dashboard)/clients/page.tsx`
**Ação:** criar  
**O que fazer:** lista de clientes com cards + botão "Novo Cliente"

```
Header: "CLIENTES" (Bebas Neue 36px) + botão "Novo Cliente" (amarelo)
Grid: 3 colunas desktop / 1 mobile
Dados: buscar via Supabase server component
```

---

### 4.2 — CRIAR `web/components/clients/ClientCard.tsx`
**Ação:** criar  
**O que fazer:** card com logo, nome, nicho, status badge, valor contrato

```
Estrutura:
- Logo do cliente (ou initials fallback)
- Nome em Bebas Neue
- Nicho em text-gray text-sm
- Badge status: active=verde / paused=amarelo / archived=cinza
- Valor do contrato (formatCurrency)
- Link para /clients/[id]
```

---

### 4.3 — CRIAR `web/app/(dashboard)/clients/new/page.tsx`
**Ação:** criar  
**O que fazer:** formulário de criação de cliente

```
Campos (react-hook-form + zod):
  - name: string, required
  - slug: string, required (auto-gerado do nome, editável)
  - niche: string, optional
  - logo: file upload → Supabase Storage (bucket: client-logos)
  - contract_value: number, optional
  - contract_status: select (active/pending/overdue)
  - notes: textarea, optional

Submit: POST ao Supabase via server action
Sucesso: redirect para /clients/[id]
```

---

### 4.4 — CRIAR `web/app/(dashboard)/clients/[id]/page.tsx`
**Ação:** criar  
**O que fazer:** página de detalhe do cliente em 3 seções

```
Seção 1: Infos gerais + logo + editar inline
Seção 2: Assets (upload/listar logos, brand voice, styleguide)
  - Lista de client_assets do cliente
  - Botão "Adicionar asset" → upload para Supabase Storage
Seção 3: Jobs do cliente (lista simplificada + link)
```

---

### 4.5 — CRIAR `web/components/clients/ClientForm.tsx`
**Ação:** criar  
**O que fazer:** formulário reutilizável para criar e editar cliente (usado em new e [id])

---

## BLOCO 5 — M3 JOBS

### 5.1 — CRIAR `web/app/(dashboard)/jobs/page.tsx`
**Ação:** criar  
**O que fazer:** kanban board com 4 colunas

```
Colunas: Backlog | Em Andamento | Revisão | Concluído
Cada coluna: header com label + count + jobs como JobCard
Botão "Novo Job" no header da página
```

---

### 5.2 — CRIAR `web/components/jobs/JobCard.tsx`
**Ação:** criar  
**O que fazer:** card de job para o kanban

```
Estrutura:
- Título do job
- Logo/nome do cliente (pequeno)
- Badge prioridade: urgent=vermelho / high=laranja / normal=azul / low=cinza
- Prazo (formatDate) — vermelho se vencido
- Avatar do assignee (se houver)
- Link para /jobs/[id]
```

---

### 5.3 — CRIAR `web/components/jobs/JobKanban.tsx`
**Ação:** criar  
**O que fazer:** componente de kanban que recebe jobs e agrupa por status

---

### 5.4 — CRIAR `web/app/(dashboard)/jobs/new/page.tsx`
**Ação:** criar  
**O que fazer:** formulário de criação de job

```
Campos (react-hook-form + zod):
  - title: string, required
  - description: textarea, optional
  - client_id: select (lista de clientes ativos), required
  - priority: select (low/normal/high/urgent), default normal
  - due_date: date picker, optional
  - assigned_to: select (profiles), optional

Submit: INSERT no Supabase
Sucesso: redirect para /jobs/[id]
```

---

### 5.5 — CRIAR `web/app/(dashboard)/jobs/[id]/page.tsx`
**Ação:** criar  
**O que fazer:** detalhe do job + interface de agentes

```
Seção 1: Header do job (título, status, prioridade, cliente, prazo)
  - Dropdown para mudar status
Seção 2: Interface de agentes (ver Bloco 6)
Seção 3: Outputs do job (lista de job_outputs)
```

---

### 5.6 — CRIAR `web/components/jobs/JobForm.tsx`
**Ação:** criar  
**O que fazer:** formulário reutilizável para criar e editar job

---

## BLOCO 6 — M4 AGENTS

### 6.1 — CRIAR `web/lib/anthropic/client.ts`
**Ação:** criar  
**O que fazer:** Anthropic client singleton

```ts
import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})
```

---

### 6.2 — CRIAR `web/lib/anthropic/agents.ts`
**Ação:** criar  
**O que fazer:** registry dos 21 agentes + função para carregar system-prompts

```ts
import fs from 'fs'
import path from 'path'

export type AgentId = keyof typeof AGENTS

export const AGENTS = {
  oracle:  { name: 'ORACLE',  role: 'Head & Orquestrador',     layer: 'orchestration' },
  nexus:   { name: 'NEXUS',   role: 'Gerente de Cliente',       layer: 'orchestration' },
  genesis: { name: 'GENESIS', role: 'Creator de Agentes',       layer: 'meta' },
  lore:    { name: 'LORE',    role: 'Memória Institucional',    layer: 'meta' },
  vance:   { name: 'VANCE',   role: 'Estrategista',             layer: 'production' },
  vera:    { name: 'VERA',    role: 'Copywriter',                layer: 'production' },
  marco:   { name: 'MARCO',   role: 'Roteirista',               layer: 'production' },
  atlas:   { name: 'ATLAS',   role: 'UI Designer',              layer: 'production' },
  volt:    { name: 'VOLT',    role: 'Traffic Manager',          layer: 'production' },
  pulse:   { name: 'PULSE',   role: 'Engajador',                layer: 'production' },
  cipher:  { name: 'CIPHER',  role: 'Publicador',               layer: 'production' },
  flux:    { name: 'FLUX',    role: 'Automação',                layer: 'production' },
  iris:    { name: 'IRIS',    role: 'Pesquisador',              layer: 'intelligence' },
  vector:  { name: 'VECTOR',  role: 'Analytics',               layer: 'intelligence' },
  prism:   { name: 'PRISM',   role: 'Cultura & Audiência',     layer: 'intelligence' },
  bridge:  { name: 'BRIDGE',  role: 'Onboarding',              layer: 'operations' },
  aegis:   { name: 'AEGIS',   role: 'Aprovação',               layer: 'operations' },
  harbor:  { name: 'HARBOR',  role: 'CRM',                     layer: 'operations' },
  ledger:  { name: 'LEDGER',  role: 'Financeiro',              layer: 'operations' },
  surge:   { name: 'SURGE',   role: 'Growth Hacker',           layer: 'growth' },
  anchor:  { name: 'ANCHOR',  role: 'Customer Success',        layer: 'growth' },
} as const

// Mapeamento agente → pasta em agentes/
const AGENT_DIR_MAP: Partial<Record<AgentId, string>> = {
  oracle:  'head',
  vance:   'estrategista',
  vera:    'copywriter',
  atlas:   'designer',
  volt:    'traffic-manager',
  pulse:   'engajador',
  cipher:  'publicador',
  genesis: 'genesis',
  lore:    'lore',
  prism:   'prism',
}

const GENERIC_PROMPT = `Você é um agente especializado da Agency OS.
Responda em português, de forma clara e profissional.
Contexto do cliente e job serão fornecidos pelo usuário.`

export function getSystemPrompt(agentId: AgentId): string {
  const dir = AGENT_DIR_MAP[agentId] ?? agentId
  const promptPath = path.join(process.cwd(), '..', 'agentes', dir, 'system-prompt.txt')
  try {
    return fs.readFileSync(promptPath, 'utf-8')
  } catch {
    return GENERIC_PROMPT
  }
}

export function getAgentsByLayer() {
  return Object.entries(AGENTS).reduce(
    (acc, [id, agent]) => {
      const layer = agent.layer
      if (!acc[layer]) acc[layer] = []
      acc[layer].push({ id: id as AgentId, ...agent })
      return acc
    },
    {} as Record<string, Array<{ id: AgentId } & typeof AGENTS[AgentId]>>
  )
}
```

---

### 6.3 — CRIAR `web/app/api/agents/run/route.ts`
**Ação:** criar  
**O que fazer:** API Route que aciona o agente via Anthropic API e salva o output no Supabase

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic } from '@/lib/anthropic/client'
import { AGENTS, getSystemPrompt, type AgentId } from '@/lib/anthropic/agents'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { agentId, jobId, clientId, userMessage } = body as {
    agentId: AgentId
    jobId: string
    clientId: string
    userMessage: string
  }

  // Busca dados do cliente para injetar no contexto
  const { data: client } = await supabase
    .from('clients')
    .select('name, niche')
    .eq('id', clientId)
    .single()

  const { data: job } = await supabase
    .from('jobs')
    .select('title, description')
    .eq('id', jobId)
    .single()

  // Contexto injetado
  const contextBlock = client && job
    ? `\nCONTEXTO DO JOB:\nCliente: ${client.name} | Nicho: ${client.niche ?? 'não definido'}\nJob: ${job.title} — ${job.description ?? ''}\n\n`
    : ''

  const systemPrompt = getSystemPrompt(agentId)
  const agent = AGENTS[agentId]

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: contextBlock + userMessage }],
  })

  const outputContent = message.content
    .filter(block => block.type === 'text')
    .map(block => (block as { type: 'text'; text: string }).text)
    .join('\n')

  // Salva output no Supabase
  const { data: savedOutput, error } = await supabase
    .from('job_outputs')
    .insert({
      job_id: jobId,
      client_id: clientId,
      agent_id: agentId,
      agent_name: agent.name,
      input_prompt: userMessage,
      output_content: outputContent,
      output_type: 'text',
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ outputId: savedOutput.id, content: outputContent, agentName: agent.name })
}
```

---

### 6.4 — CRIAR `web/components/agents/AgentSelector.tsx`
**Ação:** criar  
**O que fazer:** sidebar/panel com lista dos 21 agentes agrupados por camada

```
Estrutura:
- Seções por layer: ORQUESTRAÇÃO / META / PRODUÇÃO / INTELIGÊNCIA / OPERAÇÕES / GROWTH
- Cada agente: ícone (círculo amarelo com inicial) + nome + role
- Seleção: onClick → seta selectedAgent para pai via prop callback
- Agente selecionado: borda amarela + background surface
```

---

### 6.5 — CRIAR `web/components/agents/AgentChat.tsx`
**Ação:** criar  
**O que fazer:** interface de chat com o agente selecionado

```
Layout:
- Header: nome + role do agente selecionado
- Campo textarea: "Brief ou mensagem para [AGENT_NAME]"
- Botão "Acionar" (amarelo) → POST /api/agents/run
- Loading state: spinner + "Processando..."
- Output: painel de leitura com markdown renderizado
- Ações no output: [Salvar] [Pedir revisão] [Descartar]
  - Salvar: atualiza status para 'approved' no Supabase
  - Revisão: atualiza status para 'revision' + abre textarea de feedback
  - Descartar: atualiza status para 'rejected'
```

---

### 6.6 — CRIAR `web/components/agents/OutputCard.tsx`
**Ação:** criar  
**O que fazer:** card compacto de output para listas (jobs/[id] e gallery)

```
Estrutura:
- Cabeçalho: badge do agente (amarelo) + data
- Resumo do input (1 linha, truncado)
- Preview do output (3 linhas, truncado)
- Badge status: pending / approved / rejected / revision
- Botão "Ver completo" → modal ou expand
```

---

## BLOCO 7 — M5 GALLERY

### 7.1 — CRIAR `web/app/(dashboard)/gallery/page.tsx`
**Ação:** criar  
**O que fazer:** grid de outputs aprovados + pendentes, filtro por cliente

```
Header: "GALERIA" + filtro de cliente (select)
Grid: 3 colunas desktop / 1 mobile
Dados: buscar job_outputs via Supabase server component
Filtro: por client_id (query param ?client=)
```

---

### 7.2 — CRIAR `web/components/gallery/GalleryGrid.tsx`
**Ação:** criar  
**O que fazer:** grid client-side com ação de aprovar/rejeitar outputs

```
Props: outputs: JobOutput[]
Renderiza: OutputCard para cada item
Aproval inline: botões diretamente no card
PATCH /api/outputs/[id] para atualizar status
```

---

### 7.3 — CRIAR `web/app/api/outputs/[id]/route.ts`
**Ação:** criar  
**O que fazer:** PATCH para atualizar status e feedback de um output

```ts
// PATCH body: { status: 'approved' | 'rejected' | 'revision', feedback?: string }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  // auth check → update job_outputs → return updated output
}
```

---

## BLOCO 8 — M6 FINANCIAL

### 8.1 — CRIAR `web/app/(dashboard)/financial/page.tsx`
**Ação:** criar  
**O que fazer:** tabela de clientes com dados financeiros + stat de MRR

```
Stat card topo: MRR total (soma de contract_value dos clientes ativos)
Tabela:
  Colunas: Cliente | Nicho | Valor Contrato | Status | Ações
  Status badges: active=verde / pending=amarelo / overdue=vermelho
  Ações: editar status do contrato inline
Dados: buscar clients com contrato via Supabase server
```

---

## BLOCO 9 — SHADCN SETUP

### 9.1 — EXECUTAR: inicializar shadcn/ui
**Ação:** executar no terminal (dentro de `web/`)

```bash
npx shadcn@latest init
# Configurações:
# - Style: Default
# - Base color: Neutral
# - CSS variables: Yes
```

### 9.2 — INSTALAR componentes necessários
```bash
npx shadcn@latest add button input label card badge select textarea dialog avatar separator
```

### 9.3 — As CSS vars do shadcn já estão no globals.css
**O que fazer:** A seção 0.1 já inclui as vars shadcn corretamente mapeadas para o design system.
Não é necessária ação adicional após o `npx shadcn init`.

---

## CHECKLIST DE VALIDAÇÃO

### Setup
- [ ] `npm run dev` inicia sem erros
- [ ] Fonte Inter carregada corretamente
- [ ] Design system vars disponíveis (`--color-accent`, `--color-surface`, etc.)
- [ ] shadcn/ui componentes instalados

### Auth
- [ ] `/login` renderiza corretamente
- [ ] Login com credenciais válidas redireciona para `/`
- [ ] Login com credenciais inválidas mostra erro
- [ ] Rota `/` sem sessão redireciona para `/login`
- [ ] Logout limpa sessão e redireciona para `/login`

### Clients
- [ ] `/clients` lista clientes do Supabase
- [ ] `/clients/new` cria cliente e redireciona
- [ ] Upload de logo funciona (Supabase Storage)
- [ ] `/clients/[id]` mostra dados + assets + jobs

### Jobs
- [ ] `/jobs` renderiza kanban com 4 colunas
- [ ] Jobs agrupados corretamente por status
- [ ] `/jobs/new` cria job e redireciona
- [ ] `/jobs/[id]` mostra detalhe + interface de agentes

### Agents
- [ ] AgentSelector mostra 21 agentes agrupados
- [ ] Selecionar agente ativa o AgentChat
- [ ] POST `/api/agents/run` retorna output do Claude
- [ ] Output salvo na tabela `job_outputs`
- [ ] Aprovar/rejeitar output atualiza status

### Gallery
- [ ] `/gallery` lista outputs com filtro de cliente
- [ ] Aprovar output via card funciona
- [ ] Filtro por cliente funciona via query param

### Financial
- [ ] `/financial` mostra MRR correto
- [ ] Tabela lista clientes com dados de contrato
- [ ] Status do contrato pode ser editado

### Geral
- [ ] Dark mode ativo em todas as páginas
- [ ] Mobile responsivo (min-width: 375px)
- [ ] Sem `any` no TypeScript
- [ ] Sem cores hardcoded (usar CSS vars)
- [ ] Sidebar marca rota ativa corretamente

---

## DEPENDÊNCIAS — o que já está instalado vs. o que falta

### Já instalado (`web/package.json`)
```
✅ next, react, react-dom
✅ @supabase/supabase-js, @supabase/ssr
✅ @anthropic-ai/sdk
✅ @tanstack/react-query
✅ react-hook-form, @hookform/resolvers, zod
✅ lucide-react
✅ next-themes
✅ tailwind-merge, clsx
✅ class-variance-authority
```

### Falta instalar
```bash
# shadcn (instalado via npx shadcn init — não entra no package.json diretamente)
npx shadcn@latest init
```

---

*SPEC gerada via SDD — Spec Phase · Agency OS Fase 1 · Abril 2026*
