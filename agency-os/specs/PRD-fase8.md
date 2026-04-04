# PRD — Agency OS Fase 8
> Product Requirements Document · Execução Multimodal (Imagem + Vídeo + Voz)

---

## 1. Contexto

A Fase 8 dá "mãos" aos agentes: eles deixam de entregar apenas texto e passam a entregar **arquivos finais prontos para uso** — imagens com style transfer, vídeos para Reels/TikTok e narrações profissionais. O objetivo é que a agência entregue ao cliente um pacote completo de criativos sem sair do Agency OS.

### Decisões de tecnologia (e por quê)

| Bloco | Tecnologia escolhida | Alternativa descartada | Motivo |
|-------|---------------------|----------------------|--------|
| Imagens (ATLAS) | **Nano Banana 2** (Gemini 3.1 Flash Image) | DALL-E 3 (já implementado) | Suporta até 14 imagens de referência → Style Transfer nativo; DALL-E 3 fica como fallback |
| Vídeo (VULCAN) | **Google Veo 2** via Vertex AI | RunwayML, Pika | Qualidade superior, integração Google nativa |
| Voz / Narração | **ElevenLabs API** | Google Lyria 3 | Lyria 3 sem API pública; ElevenLabs tem SDK maduro, latência baixa, vozes PT-BR |
| Música | **ElevenLabs Music** ou deferred | Lyria 3 | Quando Lyria abrir acesso público, migrar; por ora deferred |
| Referências visuais | **Apify Web Scraper** | Manual | Extrai paleta, fontes e estilo de URLs de referência para o ATLAS |

---

## 2. Blocos

### Bloco A — ATLAS Visual 2.0 (Nano Banana 2 + Style Transfer)
**Prioridade:** ⚡ Crítica

Upgrade do Creative Studio da Fase 7 para usar Gemini 3.1 Flash Image (Nano Banana 2):

**Funcionalidades novas:**
- **Style Transfer**: usuário sobe foto do cliente → ATLAS aplica o estilo visual em até 10 variações
- **Multi-referência**: até 14 imagens de entrada para guiar a geração (logo, produto, paleta, concorrente)
- **Edição de imagem existente**: enviar imagem + instrução → ATLAS edita e retorna nova versão
- **Google Search grounding**: ATLAS busca referências visuais na web automaticamente via Gemini

**Fluxo técnico:**
```
Upload imagens de referência (até 14)
  → POST /api/agents/atlas/generate-v2
  → inference.sh / Gemini API com multipart
  → Retorna imagem gerada
  → Salva em creative_assets (Supabase Storage)
```

**Rotas de API:**
- `POST /api/agents/atlas/generate-v2` — geração com Nano Banana 2 (suporta referências múltiplas)
- `POST /api/agents/atlas/style-transfer` — recebe imagem base + N imagens de estilo, retorna variações

---

### Bloco B — VULCAN Cinematic (Vídeos com Veo 2)
**Prioridade:** Alta

Novo agente especializado em conteúdo em vídeo. VULCAN transforma roteiros da VERA em vídeos de 8–15s para Reels, TikTok e Stories.

**Funcionalidades:**
- **Texto → Vídeo**: roteiro gerado pela VERA vira vídeo 9:16 ou 16:9
- **Imagem → Vídeo**: foto do produto vira vídeo animado
- **Reference Video**: upload de vídeo de referência para guiar estética e movimento
- **Formatos**: Reels (9:16, 15s), TikTok (9:16, 15s), YouTube Shorts (9:16, 60s), Banner animado (16:9, 10s)
- **Status assíncrono**: geração leva 2–5min → job com status `pending → processing → done → failed`

**Arquitetura assíncrona (obrigatória):**
```
POST /api/agents/vulcan/generate → cria registro video_jobs (status: pending)
  → dispara job no Veo 2 (Vertex AI)
  → retorna { job_id }

GET /api/agents/vulcan/status/[job_id] → polling de status
  → quando done: salva vídeo no Supabase Storage (bucket: video-assets)
  → notifica via Supabase Realtime broadcast

UI: polling a cada 10s com progress indicator
```

**Rotas de API:**
- `POST /api/agents/vulcan/generate` — inicia geração assíncrona, retorna `job_id`
- `GET /api/agents/vulcan/status/[job_id]` — consulta status e URL do vídeo quando pronto

---

### Bloco C — VOX (Voz + Narração com ElevenLabs)
**Prioridade:** Alta

Novo agente VOX especializado em narrações profissionais para os vídeos do VULCAN ou como conteúdo standalone.

**Funcionalidades:**
- **Roteiro → Narração**: texto gerado pela VERA vira áudio narrado em PT-BR
- **Banco de vozes**: 3 vozes pré-configuradas (masculina institucional, feminina jovem, neutra)
- **Sync com vídeo**: narração gerada para combinar com vídeo do VULCAN (mesma duração)
- **Múltiplos formatos**: MP3 para podcast/reel, WAV para produção profissional
- **Preview inline**: player de áudio embutido na interface antes do download

**Fluxo técnico:**
```
Texto (output da VERA ou input manual)
  → POST /api/agents/vox/generate
  → ElevenLabs TTS API (modelo: eleven_multilingual_v2)
  → Salva em Supabase Storage (bucket: audio-assets)
  → Retorna { audio_url, duration_seconds }
```

**Rotas de API:**
- `POST /api/agents/vox/generate` — texto → áudio MP3/WAV
- `GET /api/agents/vox/voices` — lista vozes disponíveis da workspace

---

### Bloco D — Apify + Design Builder Refinado
**Prioridade:** Média

Extração automática de referências visuais de URLs para o ATLAS, completando o conceito Design Builder.

**Funcionalidades:**
- **URL → Paleta**: usuário cola URL de concorrente → Apify extrai cores hex, fontes e estilo visual
- **Injeção automática**: paleta extraída vira parâmetro adicional no prompt do ATLAS
- **iframe Preview melhorado**: visualizar landing pages e e-mails HTML gerados com resolução real (mobile + desktop)
- **Histórico de referências**: URLs analisadas ficam salvas por cliente (`client_references`)

**Fluxo técnico:**
```
POST /api/integrations/apify/extract-style
  → { url: "https://concorrente.com" }
  → Apify Web Scraper Actor
  → Retorna { colors: [], fonts: [], screenshots: [] }
  → Salva em client_references
  → Disponível no ATLAS como contexto adicional
```

---

## 3. Banco de Dados

```sql
-- Fase 8 novas tabelas

-- Jobs de vídeo (assíncrono)
CREATE TABLE video_jobs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id     UUID REFERENCES clients(id) ON DELETE CASCADE,
  job_id        UUID REFERENCES jobs(id),
  workspace_id  UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  format        TEXT NOT NULL DEFAULT 'reels', -- 'reels' | 'tiktok' | 'shorts' | 'banner'
  prompt        TEXT NOT NULL,
  reference_url TEXT,         -- vídeo de referência (opcional)
  status        TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'processing' | 'done' | 'failed'
  video_url     TEXT,         -- preenchido quando done
  veo_job_id    TEXT,         -- ID do job no Veo/Vertex AI
  duration_s    INTEGER DEFAULT 15,
  error_msg     TEXT,
  created_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);
CREATE INDEX ON video_jobs (client_id, created_at DESC);
CREATE INDEX ON video_jobs (status, created_at);

-- Assets de áudio (VOX)
CREATE TABLE audio_assets (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id     UUID REFERENCES clients(id) ON DELETE CASCADE,
  job_id        UUID REFERENCES jobs(id),
  workspace_id  UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  text_content  TEXT NOT NULL,
  voice_id      TEXT NOT NULL DEFAULT 'rachel', -- ElevenLabs voice ID
  audio_url     TEXT NOT NULL,
  duration_s    INTEGER,
  format        TEXT DEFAULT 'mp3',
  created_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON audio_assets (client_id, created_at DESC);

-- Referências visuais extraídas pelo Apify
CREATE TABLE client_references (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id     UUID REFERENCES clients(id) ON DELETE CASCADE,
  workspace_id  UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  source_url    TEXT NOT NULL,
  colors        TEXT[] DEFAULT '{}',
  fonts         TEXT[] DEFAULT '{}',
  screenshot_url TEXT,
  raw_data      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON client_references (client_id, created_at DESC);
```

---

## 4. Variáveis de Ambiente Adicionais

```env
# ElevenLabs
ELEVENLABS_API_KEY=

# Apify
APIFY_API_TOKEN=

# Google Vertex AI (para Veo 2)
GOOGLE_CLOUD_PROJECT_ID=
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=  # ou GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY (JSON inline)
```

---

## 5. Dependências de Fases Anteriores

| Requisito | Fase |
|-----------|------|
| `creative_assets`, Supabase Storage `creative-assets/` | Fase 7 |
| `agent_conversations`, ORACLE streaming | Fase 7 |
| `clients`, `jobs`, `workspaces` | Fase 1–4 |
| Stripe plano (limitar gerações por tier) | Fase 5 |

---

## 6. Stack Adicional

| Pacote | Uso |
|--------|-----|
| `elevenlabs` | TTS API PT-BR, streaming de áudio |
| `@google-cloud/aiplatform` | Veo 2 via Vertex AI |
| `apify-client` | Web scraping de referências visuais |
| Supabase Storage `video-assets/` | Armazenar vídeos gerados |
| Supabase Storage `audio-assets/` | Armazenar narrações geradas |

---

## 7. UI — Novas Abas no Cliente

| Rota | Feature |
|------|---------|
| `/clients/[id]/creative` | Creative Studio (já existe, upgrade ATLAS v2) |
| `/clients/[id]/video` | VULCAN — geração e galeria de vídeos |
| `/clients/[id]/voice` | VOX — narrações e áudios |

---

## 8. Roadmap Futuro (Fase 9)

- **Lyria (Google)** — trilhas musicais quando API pública disponível
- **Geração em lote**: 50 variações de criativo a partir de catálogo de produtos (e-commerce)
- **Compositor**: combinar vídeo (VULCAN) + narração (VOX) + música (Lyria) em um único arquivo MP4 final
