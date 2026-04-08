# PRD — Agency OS Fase 10
> Product Requirements Document · Intelligence Layer: ORACLE como Consultor Competitivo

---

## 1. Contexto

Hoje o ORACLE conhece o DNA do cliente, mas não sabe nada sobre o mercado em que ele opera. A Fase 10 muda isso: o ORACLE passa a ter acesso a **dados reais de concorrentes** — anúncios ativos, posicionamento de mercado, presença local e conteúdo do site — e os usa para turbinar qualquer briefing, estratégia ou criativo.

O resultado esperado é que o usuário possa perguntar "o que meu concorrente está anunciando agora?" e receber uma análise prática baseada em dados coletados em tempo real via Apify.

### Decisões de tecnologia

| Bloco | Tecnologia | Alternativa descartada | Motivo |
|-------|-----------|----------------------|--------|
| Google Maps B2B leads | Apify Google Maps Scraper | SerpAPI | Apify já na stack; retorna dados estruturados de businesses |
| Meta Ads Library | Apify Meta Ads Scraper | Facebook Graph API | Graph API exige review de permissão; Apify é imediato |
| Website crawler | Apify Website Content Crawler | Puppeteer manual | Apify gerencia headless, retry, proxy |
| Snapshot storage | Tabela `intelligence_snapshots` (Supabase) | Redis cache | Persistência e consulta histórica; Redis seria overhead |
| Injeção ORACLE | Bloco no system prompt | Tool call | Menos latência; sistema prompts já funcionam bem no projeto |

---

## 2. Blocos

### Bloco A — Migration + Tabela intelligence_snapshots
**Prioridade:** ⚡ Crítica (bloqueia tudo)

```sql
CREATE TABLE intelligence_snapshots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid REFERENCES clients(id) ON DELETE CASCADE,
  workspace_id uuid,
  type        text NOT NULL, -- 'maps', 'ads', 'crawl'
  query       text,          -- query ou URL usada
  data        jsonb NOT NULL,
  summary     text,          -- resumo gerado pelo ORACLE
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX ON intelligence_snapshots(client_id, type, created_at DESC);
-- RLS: workspace members only
```

---

### Bloco B — Rotas de Inteligência
**Prioridade:** ⚡ Crítica

**`GET /api/intelligence/maps`**
- Query params: `query` (ex: "academia de ginástica"), `location` (ex: "São Paulo, SP"), `client_id`
- Chama Apify Google Maps Scraper → retorna até 20 resultados (nome, website, rating, reviews, address, phone)
- Salva snapshot `type: 'maps'` com o JSON completo
- Retorna `{ results, snapshotId }`

**`GET /api/intelligence/ads`**
- Query params: `page` (URL da página do Facebook/IG do concorrente), `days=30`, `client_id`
- Chama Apify Meta Ads Library Scraper → retorna anúncios ativos (creative, texto, CTA, data)
- Salva snapshot `type: 'ads'`
- Retorna `{ ads, snapshotId }`

**`POST /api/intelligence/crawl`**
- Body: `{ url, client_id, depth? }` — depth padrão 1 (só a URL fornecida)
- Chama Apify Website Content Crawler → extrai texto, H1/H2, CTAs, tecnologias usadas
- Salva snapshot `type: 'crawl'`
- ORACLE gera `summary` do conteúdo automaticamente (IntelligenceRouter)
- Retorna `{ content, summary, snapshotId }`

---

### Bloco C — Injeção no ORACLE
**Prioridade:** Alta

Quando o chat ORACLE tem `client_id`, antes de construir o `systemPrompt`:
1. Consulta `intelligence_snapshots` dos últimos 7 dias para aquele `client_id`
2. Se houver snapshots: monta bloco `INTELIGÊNCIA COMPETITIVA` com dados resumidos
3. Injeta no system prompt de qualquer agente (não só o atlas)
4. ATLAS recebe adicionalmente `competitor_visual_reference` se existir snapshot `type: 'crawl'`

Bloco formatado:
```
INTELIGÊNCIA COMPETITIVA (dados coletados em {data}):
- Concorrentes mapeados: {nomes}
- Anúncios ativos detectados: {N} anúncios nas últimas {days} semanas
- Posicionamento principal: {resumo}
- Referência visual: {URL ou descrição do estilo}
```

---

### Bloco D — UI: Painel de Inteligência
**Prioridade:** Média

- Nova aba "Inteligência" na página do cliente (`/clients/[id]`)
- `IntelligencePanel.tsx`: formulário para disparar os 3 scrapers + histórico de snapshots
- Cards de snapshot com preview dos dados + botão "Enviar ao ORACLE"
- Botão "Enviar ao ORACLE": abre chat ORACLE pré-populado com o snapshot

---

## 3. Critérios de Aceite

1. `GET /api/intelligence/maps` retorna lista de concorrentes locais
2. `GET /api/intelligence/ads` retorna anúncios ativos de um perfil
3. ORACLE injeta dados de concorrentes no contexto automaticamente
4. Painel de Inteligência visível na página do cliente
5. Histórico de snapshots persistido por client_id

---

## 4. Variáveis de ambiente necessárias

| Var | Valor | Onde |
|-----|-------|------|
| `APIFY_API_KEY` | Token Apify | Vercel + .env.local |

---

## 5. Atores Apify utilizados

| Ator | ID | Custo estimado |
|------|----|---------------|
| Google Maps Scraper | `nwua9Gu5YrADL7ZDj` | ~$0.50/1000 resultados |
| Meta Ads Library Scraper | `moJRLRc85AitArpNN` | ~$1/1000 anúncios |
| Website Content Crawler | `aYG0l9s7dbB7j3gbS` | ~$0.25/página |
