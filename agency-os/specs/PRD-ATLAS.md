# PRD — Agency OS | ATLAS Image Generation
> SDD Research Output · Abril 2026
> Fase: ATLAS (entre Fase 0 Bug Fix e Fase Polish)

---

## 1. CONTEXTO

### Estado atual
- Creative Studio existe em `/clients/[id]/creative` com UI de seletor de formato/estilo/prompt
- Rota `/api/agents/atlas/generate` existe mas entra em loop infinito (credencial errada ou modelo depreciado)
- Rota `/api/agents/atlas/generate-v2` existe (Gemini direto)
- ORACLE chat existe em `/clients/[id]/oracle` e no job detail
- Galeria existe em `/gallery` com filtros por tipo
- `IntelligenceRouter.ts` é o gateway central de todos os LLMs via OpenRouter

### Problema
O ATLAS não gera imagens reais — retorna prompts de texto para o usuário usar em outro lugar.
O ORACLE não tem capacidade de acionar o ATLAS automaticamente.

### Decisão técnica central
OpenRouter SUPORTA geração de imagem (confirmado abril 2026) via `/api/v1/chat/completions`
com `output_modalities: ["image"]` e `image_config.aspect_ratio`.
Modelo escolhido: `google/gemini-2.5-flash-image` (Nano Banana 2) — melhor custo/benefício.
A mesma `OPENROUTER_API_KEY` já existente no Vercel será usada. Nenhuma chave nova.

---

## 2. OBJETIVO

Dois modos de geração de criativos:

**Modo Manual** — Creative Studio funcional de ponta a ponta:
Usuário abre aba Criativos do cliente → preenche parâmetros → clica Gerar → imagem aparece → salva na galeria.

**Modo Automático** — ORACLE orquestra ATLAS via tool_use:
Usuário conversa com ORACLE no chat → ORACLE decide gerar criativo → chama ATLAS → imagem aparece inline no chat → usuário aprova → salva na galeria.

---

## 3. ARQUIVOS RELEVANTES EXISTENTES

```
app/(dashboard)/clients/[id]/creative/page.tsx   ← UI do Creative Studio (adaptar)
app/api/agents/atlas/generate/route.ts           ← rota existente com bug (reescrever)
app/api/agents/atlas/generate-v2/route.ts        ← rota Gemini direto (deprecar/unificar)
app/api/agents/oracle/chat/route.ts              ← chat do ORACLE (adicionar tool_use)
components/gallery/GalleryGrid.tsx               ← galeria (adaptar para creative_assets)
lib/openrouter/IntelligenceRouter.ts             ← adicionar modelo ATLAS image
lib/openrouter/models.ts                         ← adicionar entrada ATLAS
```

---

## 4. SCHEMA DO BANCO

### Tabela nova: `creative_assets`
```sql
CREATE TABLE IF NOT EXISTS creative_assets (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id    UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  job_id       UUID REFERENCES jobs(id) ON DELETE SET NULL,
  workspace_id UUID,
  format       TEXT NOT NULL CHECK (format IN ('feed','stories','banner','thumbnail','portrait','carousel')),
  style        TEXT NOT NULL CHECK (style IN ('fotorrealista','ilustracao','minimalista','bold','cinematografico')),
  prompt       TEXT NOT NULL,
  image_url    TEXT NOT NULL,
  model        TEXT DEFAULT 'google/gemini-2.5-flash-image',
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  source       TEXT DEFAULT 'manual' CHECK (source IN ('manual','oracle')),
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON creative_assets (client_id, created_at DESC);
CREATE INDEX ON creative_assets (job_id);
CREATE INDEX ON creative_assets (status);

ALTER TABLE creative_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users full access" ON creative_assets
  FOR ALL USING (auth.uid() IS NOT NULL);
```

### Supabase Storage bucket
```
Bucket: creative-assets
Acesso: private (acesso via signed URLs)
Estrutura: creative-assets/{client_id}/{asset_id}.png
```

---

## 5. ASPECT RATIO MAP

```typescript
const FORMAT_ASPECT_RATIO: Record<string, string> = {
  feed:       '1:1',
  stories:    '9:16',
  banner:     '16:9',
  thumbnail:  '16:9',
  portrait:   '9:16',
  carousel:   '1:1',
}
```

---

## 6. ARQUITETURA DE CHAMADA — OpenRouter Image

```typescript
// Como chamar via IntelligenceRouter para imagem
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'google/gemini-2.5-flash-image',
    messages: [{ role: 'user', content: prompt }],
    modalities: ['image'],
    image_config: { aspect_ratio: '1:1' }, // dinâmico pelo formato
  })
})

// Response contém:
// data.choices[0].message.images[0] → base64 string da imagem PNG
```

---

## 7. MODO AUTOMÁTICO — ORACLE tool_use

O ORACLE receberá uma tool definition para acionar o ATLAS:

```typescript
const ATLAS_TOOL = {
  name: 'generate_creative',
  description: 'Gera um criativo visual (imagem) para o cliente usando o ATLAS. Use quando o usuário pedir um post, banner, stories ou qualquer criativo visual.',
  input_schema: {
    type: 'object',
    properties: {
      format: { type: 'string', enum: ['feed','stories','banner','thumbnail','portrait'] },
      style:  { type: 'string', enum: ['fotorrealista','ilustracao','minimalista','bold','cinematografico'] },
      prompt: { type: 'string', description: 'Prompt detalhado em inglês para geração da imagem' },
    },
    required: ['format', 'style', 'prompt']
  }
}
```

Quando o ORACLE retorna `tool_use`, o handler:
1. Chama `/api/agents/atlas/generate` com os parâmetros
2. Recebe a imagem em base64
3. Salva no Supabase Storage → URL pública
4. Insere em `creative_assets` com `source: 'oracle'`
5. Retorna para o chat a mensagem com a imagem inline + botões Aprovar/Regenerar

---

## 8. O QUE NÃO ENTRA NESTA FASE

```
❌ Múltiplas imagens de referência (image-to-image) — Fase 8
❌ Carrossel com N slides gerados automaticamente — iteração futura
❌ Fine-tuning por cliente — Fase 6
❌ Geração em batch — Fase 8
❌ VULCAN (vídeo) e VOX (narração) — Fases 7-8
```

