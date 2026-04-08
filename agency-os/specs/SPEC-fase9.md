# SPEC-fase9 — Agency OS
> Software Design Document · Fase 11 — CRM Pro + Voice Interface

---

## 1. Arquivos a Criar

```
web/
├── supabase/migration_crm_voice.sql
├── app/api/
│   ├── crm/
│   │   ├── score/route.ts
│   │   ├── calendar/
│   │   │   └── sync/route.ts
│   │   └── followup/
│   │       └── generate/route.ts
│   └── voice/
│       └── transcribe/route.ts
└── components/
    ├── crm/
    │   ├── LeadScoreBadge.tsx
    │   └── FollowupModal.tsx
    ├── settings/
    │   └── CalendarConnectButton.tsx
    └── oracle/
        └── VoiceInput.tsx
```

---

## 2. BLOCO 0 — Migration

```sql
-- supabase/migration_crm_voice.sql

-- Lead scores
CREATE TABLE IF NOT EXISTS crm_scores (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       uuid REFERENCES crm_leads(id) ON DELETE CASCADE,
  score         smallint NOT NULL CHECK (score BETWEEN 0 AND 10),
  justification text,
  scored_by     text DEFAULT 'harbor',
  created_at    timestamptz DEFAULT now(),
  UNIQUE(lead_id)  -- upsert por lead
);

-- Integrações de workspace (Google Calendar, Notion, etc.)
CREATE TABLE IF NOT EXISTS workspace_integrations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL,
  provider      text NOT NULL,
  access_token  text,
  refresh_token text,
  expires_at    timestamptz,
  metadata      jsonb DEFAULT '{}',
  created_at    timestamptz DEFAULT now(),
  UNIQUE(workspace_id, provider)
);

-- RLS
ALTER TABLE crm_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace crm_scores" ON crm_scores
  FOR ALL USING (
    lead_id IN (
      SELECT id FROM crm_leads WHERE workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

ALTER TABLE workspace_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace integrations" ON workspace_integrations
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  );
```

---

## 3. BLOCO 1 — /api/crm/score/route.ts

```typescript
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { routeChat } from '@/lib/openrouter/IntelligenceRouter'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { lead_id, client_id } = await req.json() as { lead_id: string; client_id?: string }
  if (!lead_id) return Response.json({ error: 'lead_id obrigatório' }, { status: 400 })

  // Buscar dados em paralelo
  const [leadRes, dnaRes] = await Promise.all([
    supabase.from('crm_leads').select('*').eq('id', lead_id).single(),
    client_id
      ? supabase.from('client_dna').select('brand_voice, target_audience, key_messages')
          .eq('client_id', client_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  if (leadRes.error || !leadRes.data) {
    return Response.json({ error: 'Lead não encontrado' }, { status: 404 })
  }

  const lead = leadRes.data
  const dna = dnaRes.data

  const prompt = `Você é o HARBOR, especialista em qualificação de leads.

Analise este lead e retorne APENAS um JSON válido: {"score": N, "justification": "texto curto"}
onde N é de 0 a 10 (0 = sem potencial, 10 = cliente perfeito).

LEAD:
- Nome: ${lead.name ?? 'N/D'}
- Empresa: ${lead.company ?? 'N/D'}
- Cargo: ${lead.position ?? 'N/D'}
- Email: ${lead.email ?? 'N/D'}
- Observações: ${lead.notes ?? 'nenhuma'}
- Status atual: ${lead.status ?? 'N/D'}

${dna ? `PERFIL DO CLIENTE IDEAL:
- Tom da marca: ${dna.brand_voice ?? ''}
- Público-alvo: ${dna.target_audience ?? ''}
- Mensagens-chave: ${dna.key_messages ?? ''}` : ''}

Retorne APENAS o JSON, sem explicação adicional.`

  let score = 5
  let justification = 'Análise automática'

  try {
    const result = await routeChat('harbor', [{ role: 'user', content: prompt }], { maxTokens: 200 })
    const parsed = JSON.parse(result.content.trim()) as { score?: number; justification?: string }
    score = Math.max(0, Math.min(10, Number(parsed.score ?? 5)))
    justification = parsed.justification ?? justification
  } catch {
    // Fallback: score médio
  }

  // Upsert score
  const { data: saved } = await supabase
    .from('crm_scores')
    .upsert({ lead_id, score, justification, scored_by: 'harbor' }, { onConflict: 'lead_id' })
    .select()
    .single()

  return Response.json({ score, justification, saved })
}
```

---

## 4. BLOCO 2 — /api/crm/calendar/sync/route.ts

```typescript
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { routeChat } from '@/lib/openrouter/IntelligenceRouter'

export const dynamic = 'force-dynamic'

// Helper: refresh Google access token
async function refreshGoogleToken(refreshToken: string): Promise<string | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) return null
  const data = await res.json() as { access_token?: string }
  return data.access_token ?? null
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { lead_id } = await req.json() as { lead_id: string }
  if (!lead_id) return Response.json({ error: 'lead_id obrigatório' }, { status: 400 })

  // Buscar lead + integração
  const { data: profile } = await supabase.from('profiles').select('workspace_id').eq('id', user.id).single()
  const workspaceId = profile?.workspace_id

  const [leadRes, integRes] = await Promise.all([
    supabase.from('crm_leads').select('*').eq('id', lead_id).single(),
    supabase.from('workspace_integrations')
      .select('refresh_token, access_token, expires_at')
      .eq('workspace_id', workspaceId)
      .eq('provider', 'google_calendar')
      .maybeSingle(),
  ])

  if (!leadRes.data) return Response.json({ error: 'Lead não encontrado' }, { status: 404 })
  if (!integRes.data?.refresh_token) {
    return Response.json({ error: 'Google Calendar não conectado. Configure em Settings > Integrações.' }, { status: 400 })
  }

  const lead = leadRes.data
  const integration = integRes.data

  // Refresh token se necessário
  let accessToken = integration.access_token
  const expiresAt = integration.expires_at ? new Date(integration.expires_at) : new Date(0)
  if (expiresAt <= new Date()) {
    accessToken = await refreshGoogleToken(integration.refresh_token)
    if (!accessToken) return Response.json({ error: 'Falha ao renovar token do Google' }, { status: 500 })
    await supabase.from('workspace_integrations')
      .update({ access_token: accessToken, expires_at: new Date(Date.now() + 3600_000).toISOString() })
      .eq('workspace_id', workspaceId).eq('provider', 'google_calendar')
  }

  // IRIS gera briefing
  let briefing = ''
  try {
    const briefResult = await routeChat('iris', [{
      role: 'user',
      content: `Gere um briefing pré-call conciso (5 bullets) para reunião com:
        Nome: ${lead.name}, Empresa: ${lead.company ?? 'N/D'}, Cargo: ${lead.position ?? 'N/D'}
        Observações: ${lead.notes ?? 'nenhuma'}
        Foque em: contexto, dores possíveis, perguntas-chave, objetivo da call.`,
    }], { maxTokens: 400 })
    briefing = briefResult.content
  } catch { /* briefing melhor-esforço */ }

  // Criar evento no Google Calendar
  const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000) // amanhã
  startTime.setHours(10, 0, 0, 0)
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000) // 1h

  const event = {
    summary: `Call com ${lead.name ?? 'Lead'} — Agency OS`,
    description: briefing || `Lead: ${lead.name}\nEmpresa: ${lead.company ?? 'N/D'}`,
    start: { dateTime: startTime.toISOString(), timeZone: 'America/Sao_Paulo' },
    end: { dateTime: endTime.toISOString(), timeZone: 'America/Sao_Paulo' },
  }

  const calRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  })

  if (!calRes.ok) {
    const err = await calRes.text()
    return Response.json({ error: `Google Calendar error: ${err}` }, { status: 500 })
  }

  const createdEvent = await calRes.json() as { id: string; htmlLink: string }
  return Response.json({ eventId: createdEvent.id, eventUrl: createdEvent.htmlLink, briefing })
}
```

---

## 5. BLOCO 3 — /api/crm/followup/generate/route.ts

```typescript
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { routeChat } from '@/lib/openrouter/IntelligenceRouter'

export const dynamic = 'force-dynamic'

const OBJECTION_CONTEXT: Record<string, string> = {
  'preco_alto':       'Objeção: preço alto. Crie um gancho que justifica o ROI e oferece garantia.',
  'sem_momento':      'Objeção: não é o momento. Crie urgência com dado de mercado ou janela limitada.',
  'aprovacao_interna':'Objeção: precisa aprovar internamente. Ajude a preparar a apresentação interna.',
  'ja_tem_fornecedor':'Objeção: já tem fornecedor. Diferencie com algo que o concorrente não faz.',
  'custom':           '',
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { lead_id, objection, custom_objection } = await req.json() as {
    lead_id: string
    objection: string
    custom_objection?: string
  }

  const [leadRes] = await Promise.all([
    supabase.from('crm_leads').select('name, company, notes').eq('id', lead_id).single(),
  ])

  const lead = leadRes.data
  const objectionText = objection === 'custom'
    ? `Objeção: ${custom_objection}`
    : (OBJECTION_CONTEXT[objection] ?? 'Objeção geral — reengaje com valor.')

  const result = await routeChat('oracle', [{
    role: 'user',
    content: `Crie uma mensagem de follow-up para:
      Lead: ${lead?.name ?? 'Lead'}, Empresa: ${lead?.company ?? 'N/D'}
      ${objectionText}
      Histórico de notas: ${lead?.notes ?? 'nenhum'}
      
      Requisitos: tom conversacional, máximo 3 parágrafos, inclua CTA claro.
      Sugira também o melhor canal: WhatsApp, Email ou DM.`,
  }], { maxTokens: 400 })

  // Detectar canal sugerido
  const content = result.content
  const channel = /whatsapp/i.test(content) ? 'whatsapp'
    : /email/i.test(content) ? 'email'
    : 'dm'

  return Response.json({ message: content, suggested_channel: channel })
}
```

---

## 6. BLOCO 4 — /api/voice/transcribe/route.ts

```typescript
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const audioFile = formData.get('audio') as File | null

  if (!audioFile) return Response.json({ error: 'Campo audio obrigatório' }, { status: 400 })
  if (audioFile.size > 25 * 1024 * 1024) {
    return Response.json({ error: 'Áudio muito grande (máx 25MB)' }, { status: 400 })
  }

  // Tentar via OpenRouter; se não suportado, direto OpenAI
  const whisperFormData = new FormData()
  whisperFormData.append('file', audioFile, audioFile.name || 'audio.webm')
  whisperFormData.append('model', 'whisper-1')
  whisperFormData.append('language', 'pt')
  whisperFormData.append('response_format', 'json')

  // OpenRouter não suporta Whisper → usar OpenAI direto com mesma key de fallback
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.OPENROUTER_API_KEY
  const baseURL = process.env.OPENAI_API_KEY
    ? 'https://api.openai.com/v1'
    : 'https://openrouter.ai/api/v1'

  const res = await fetch(`${baseURL}/audio/transcriptions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: whisperFormData,
  })

  if (!res.ok) {
    const err = await res.text()
    return Response.json({ error: `Whisper error: ${err}` }, { status: 500 })
  }

  const data = await res.json() as { text: string }
  return Response.json({ text: data.text })
}
```

---

## 7. BLOCO 5 — VoiceInput.tsx

```tsx
// components/oracle/VoiceInput.tsx
'use client'

import { useState, useRef } from 'react'
import { Mic, Square, Loader2, X } from 'lucide-react'

interface VoiceInputProps {
  onTranscript: (text: string) => void
}

type VoiceState = 'idle' | 'recording' | 'processing' | 'error'

export function VoiceInput({ onTranscript }: VoiceInputProps) {
  const [state, setState] = useState<VoiceState>('idle')
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function startRecording() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        void processAudio()
      }

      recorder.start(250) // chunks a cada 250ms
      mediaRecorderRef.current = recorder
      setState('recording')

      // Timeout automático 60s
      timeoutRef.current = setTimeout(stopRecording, 60_000)
    } catch {
      setState('error')
      setError('Microfone negado. Verifique as permissões do navegador.')
    }
  }

  function stopRecording() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    mediaRecorderRef.current?.stop()
    setState('processing')
  }

  async function processAudio() {
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
    const formData = new FormData()
    formData.append('audio', blob, 'recording.webm')

    try {
      const res = await fetch('/api/voice/transcribe', { method: 'POST', body: formData })
      const data = await res.json() as { text?: string; error?: string }

      if (!res.ok || data.error) throw new Error(data.error ?? 'Transcrição falhou')

      onTranscript(data.text ?? '')
      setState('idle')
    } catch (err) {
      setState('error')
      setError(err instanceof Error ? err.message : 'Erro na transcrição')
    }
  }

  if (state === 'error') {
    return (
      <div className="flex items-center gap-2">
        <p className="text-xs text-red-400">{error}</p>
        <button onClick={() => { setState('idle'); setError(null) }}
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={state === 'idle' ? startRecording : stopRecording}
      disabled={state === 'processing'}
      title={state === 'idle' ? 'Gravar voz' : state === 'recording' ? 'Parar gravação' : 'Processando...'}
      className={`flex items-center justify-center rounded-full w-9 h-9 transition-all ${
        state === 'recording'
          ? 'bg-red-500/20 text-red-400 animate-pulse border border-red-500/40'
          : state === 'processing'
          ? 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]'
          : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] border border-[var(--color-border-subtle)]'
      }`}
    >
      {state === 'processing'
        ? <Loader2 size={16} className="animate-spin" />
        : state === 'recording'
        ? <Square size={14} />
        : <Mic size={16} />
      }
    </button>
  )
}
```

### Integrar VoiceInput no Oracle chat

```tsx
// No componente do chat ORACLE (onde fica o input de mensagem):
import { VoiceInput } from '@/components/oracle/VoiceInput'

// Ao lado do botão de envio:
<VoiceInput onTranscript={(text) => {
  setMessage(text)     // popula o input
  void handleSubmit()  // auto-submit
}} />
```

---

## 8. BLOCO 6 — LeadScoreBadge.tsx

```tsx
// components/crm/LeadScoreBadge.tsx
'use client'

import { useState } from 'react'
import { Loader2, Zap } from 'lucide-react'

interface LeadScoreBadgeProps {
  leadId: string
  clientId?: string
  initialScore?: number | null
  initialJustification?: string | null
}

const SCORE_CONFIG = [
  { max: 3,  bg: 'bg-red-500/15',    border: 'border-red-500/30',    text: 'text-red-400' },
  { max: 6,  bg: 'bg-amber-500/15',  border: 'border-amber-500/30',  text: 'text-amber-400' },
  { max: 10, bg: 'bg-emerald-500/15',border: 'border-emerald-500/30',text: 'text-emerald-400' },
]

function getConfig(score: number) {
  return SCORE_CONFIG.find(c => score <= c.max) ?? SCORE_CONFIG[2]
}

export function LeadScoreBadge({ leadId, clientId, initialScore, initialJustification }: LeadScoreBadgeProps) {
  const [score, setScore] = useState<number | null>(initialScore ?? null)
  const [justification, setJustification] = useState<string | null>(initialJustification ?? null)
  const [isLoading, setIsLoading] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  async function score_lead() {
    setIsLoading(true)
    const res = await fetch('/api/crm/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: leadId, client_id: clientId }),
    })
    const data = await res.json() as { score?: number; justification?: string }
    if (data.score !== undefined) { setScore(data.score); setJustification(data.justification ?? null) }
    setIsLoading(false)
  }

  if (isLoading) return <Loader2 size={12} className="animate-spin text-[var(--color-text-muted)]" />

  if (score === null) {
    return (
      <button onClick={score_lead}
        className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] 
          hover:text-[var(--color-accent)] transition-colors">
        <Zap size={10} /> Pontuar
      </button>
    )
  }

  const cfg = getConfig(score)
  return (
    <div className="relative" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold
        border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
        {score}/10
      </span>
      {showTooltip && justification && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 
          rounded-lg bg-[var(--color-bg-overlay)] border border-[var(--color-border-subtle)]
          p-2 text-[10px] text-[var(--color-text-secondary)] shadow-xl z-50">
          {justification}
        </div>
      )}
    </div>
  )
}
```

---

## 9. Checklist pré-deploy

- [ ] `migration_crm_voice.sql` aplicado no Supabase
- [ ] `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` adicionados no Vercel
- [ ] Google OAuth configurado: redirect URI `https://agencyos-cyan.vercel.app/api/auth/callback/google`
- [ ] `OPENAI_API_KEY` adicionado no Vercel (para Whisper direto)
- [ ] Testar gravação de voz no Chrome (HTTPS obrigatório para MediaRecorder)
- [ ] `npm run build` sem erros
