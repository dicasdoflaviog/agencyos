# PRD — Agency OS Fase 11
> Product Requirements Document · CRM Pro + Voice Interface

---

## 1. Contexto

Duas evoluções independentes, agrupadas por tamanho (ambas são médias):

**CRM Pro**: o pipeline de vendas atual mostra cards mas não ajuda a qualificar ou priorizar. A Fase 11 transforma o CRM em um sistema proativo: o HARBOR pontua cada lead automaticamente, o Google Calendar sincroniza reuniões, e o ORACLE gera briefings e follow-ups automáticos.

**Voice Interface**: o ORACLE hoje é texto-only. Com entrada de voz, o usuário pode dar comandos enquanto dirige, enquanto está em uma reunião ou simplesmente prefere falar. O escopo v1 é deliberadamente simples: gravar → transcrever (Whisper) → enviar para o ORACLE como texto.

### Decisões de tecnologia

| Bloco | Tecnologia | Alternativa | Motivo |
|-------|-----------|-------------|--------|
| Lead Score | HARBOR via IntelligenceRouter | Regras manuais | Contextual — usa DNA do cliente + histórico de interações |
| Google Calendar | Google Calendar API v3 OAuth | Calendly webhooks | Calendar API permite criar/listar eventos; Calendly seria dependência extra |
| Briefing pré-call | IRIS via IntelligenceRouter | Template estático | IRIS gera briefing personalizado com dados do lead + snapshot Apify |
| Follow-up | ORACLE via `/api/crm/followup` | Templates de e-mail | ORACLE adapta o gancho por objeção registrada — mais conversacional |
| Transcrição | OpenAI Whisper API (`/v1/audio/transcriptions`) | Google Speech-to-Text | Whisper PT-BR superior, API simples, mesma key já no projeto via OpenRouter |
| Gravação | `MediaRecorder` API nativa | react-media-recorder | Nativo = 0 dependências extras |

---

## 2. Blocos

### Bloco A — CRM: Lead Score via HARBOR
**Prioridade:** Alta

**Fluxo:**
```
POST /api/crm/score { lead_id, client_id }
  → Busca dados do lead (crm_leads)
  → Busca DNA do cliente (client_dna)
  → Busca snapshots de inteligência (intelligence_snapshots)
  → HARBOR analisa tudo e retorna score 0–10 + justificativa
  → Salva em crm_scores (upsert por lead_id)
  → Retorna { score, justification, model }
```

**Nova tabela:**
```sql
CREATE TABLE crm_scores (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      uuid REFERENCES crm_leads(id) ON DELETE CASCADE,
  score        smallint NOT NULL CHECK (score BETWEEN 0 AND 10),
  justification text,
  scored_by    text DEFAULT 'harbor',
  created_at   timestamptz DEFAULT now()
);
```

**UI:** badge de score (0–10) no KanbanCard do CRM. Score ≥ 7 = verde, 4–6 = amarelo, ≤ 3 = vermelho.
Botão "Pontuar" no card expande HARBOR score + justificativa.

---

### Bloco B — CRM: Google Calendar Sync
**Prioridade:** Média

**Fluxo OAuth:**
1. Usuário clica "Conectar Google Calendar" em Settings/Workspace
2. Redirect → Google OAuth (scope: `calendar.events`)
3. Supabase salva `refresh_token` em `workspace_integrations`
4. `POST /api/crm/calendar/sync { lead_id }` cria evento no calendário do usuário com:
   - Título: "Call com {lead_name} — Agency OS"
   - Descrição: briefing gerado pela IRIS
   - Link: URL do lead no CRM
5. Retorna `{ eventId, eventUrl, briefing }`

**Tabela nova:**
```sql
CREATE TABLE workspace_integrations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  provider     text NOT NULL, -- 'google_calendar', 'notion', etc.
  access_token text,
  refresh_token text,
  expires_at   timestamptz,
  metadata     jsonb,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(workspace_id, provider)
);
```

---

### Bloco C — CRM: Follow-up Automático via ORACLE
**Prioridade:** Média

**Fluxo:**
```
POST /api/crm/followup/generate { lead_id, objection }
  → Busca histórico do lead
  → ORACLE gera mensagem de follow-up personalizada
    baseada em: objeção registrada + tom da marca + DNA do cliente
  → Retorna { message, suggested_channel: 'whatsapp'|'email'|'dm' }
```

- UI: botão "Gerar Follow-up" no card do lead + seletor de objeção comum
- Objeções pré-configuradas: "Preço alto", "Não é o momento", "Precisa aprovar internamente", "Já tem fornecedor", "Personalizado..."

---

### Bloco D — Voice Interface (Whisper → ORACLE)
**Prioridade:** Média

**Arquitetura:**
```
[Usuário clica microfone] 
  → MediaRecorder grava áudio (webm/ogg, até 60s)
  → Clique em "Enviar" → blob → FormData
  → POST /api/voice/transcribe { audio: File }
  → Whisper API → texto transcrito
  → Popula input do ORACLE + auto-submit
```

**Componente:** `components/oracle/VoiceInput.tsx`
- Botão flutuante (microfone) no canto inferior direito do chat ORACLE
- Estados: idle → recording (pulsing red) → processing → done
- Timeout automático em 60s
- Feedback de erro se microfone negado

**Rota:** `POST /api/voice/transcribe`
- Aceita `multipart/form-data` com campo `audio`
- Usa `OPENROUTER_API_KEY` com endpoint `https://openrouter.ai/api/v1/audio/transcriptions`
  (ou fallback direto OpenAI `https://api.openai.com/v1/audio/transcriptions`)
- Modelo: `whisper-1`
- Language hint: `pt`
- Retorna `{ text }`

---

## 3. Critérios de Aceite

1. Lead Score aparece em cada card do CRM kanban
2. HARBOR pontua um lead em < 3s
3. Botão "Conectar Google Calendar" em Settings funciona via OAuth
4. Follow-up gerado pelo ORACLE contém referência à objeção registrada
5. Botão de microfone aparece no chat ORACLE
6. Gravação → transcrição → envio funciona end-to-end em PT-BR

---

## 4. Variáveis de ambiente

| Var | Uso |
|-----|-----|
| `GOOGLE_CLIENT_ID` | OAuth Calendar |
| `GOOGLE_CLIENT_SECRET` | OAuth Calendar |
| `OPENROUTER_API_KEY` | Whisper via OpenRouter (já existe) |
