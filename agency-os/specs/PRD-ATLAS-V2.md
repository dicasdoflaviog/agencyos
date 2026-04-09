# PRD — Agency OS | ATLAS Creative Studio v2
> SDD Research Output · Abril 2026
> Módulo: ATLAS v2 — DNA conectado + Editor + Templates + Referência visual

---

## 1. CONTEXTO

### O que já existe (não duplicar)
- `creative_assets` table (PRD-ATLAS / SPEC-ATLAS — Bloco 0)
- `client_assets` table com tipos: logo, styleguide, brandvoice, font, product (Fase 1)
- `/api/agents/atlas/generate` rota (SPEC-ATLAS — Bloco 2)
- Creative Studio UI em `/clients/[id]/creative` (SPEC-ATLAS — Bloco 3)
- Galeria em `/gallery` com filtro Visuais (SPEC-ATLAS — Bloco 4)
- `workspace_members` com roles: admin, collaborator, viewer (Fase 4 / SPEC-fase4)
- `workspaces` table com primary_color (Fase 4)
- DNA Wizard no cliente com brand voice, tipografia, paleta, referências (Fase 2)
- IntelligenceRouter.generateImage() (SPEC-ATLAS — Bloco 1)
- OpenRouter suporta imagem via Nano Banana 2 (google/gemini-2.5-flash-image)

### Problema
1. DNA do cliente existe no banco mas NÃO é injetado no prompt do ATLAS automaticamente
2. Não há editor visual de slides — geração é caixa preta
3. Não há templates de estilo definidos — o usuário parte do zero
4. Não há upload de imagem de referência para clonar estilo
5. Geração não é progressiva — o usuário não vê feedback
6. Histórico na galeria não mostra o prompt usado (não é copiável/reusável)

### Decisão arquitetural central
**Fluxo principal é automático.** DNA injeta sozinho. Prompt é opcional. Usuário clica
"Gerar" e recebe o carrossel pronto. O editor existe como válvula de escape para
ajustes finos — acessível apenas para admin e collaborator do workspace.
Viewer não edita, só visualiza e aprova.

---

## 2. DNA DO CLIENTE — ESTRUTURA DE DADOS

### O que existe em `client_assets` (Fase 1)
```sql
client_assets (
  client_id, type, name, file_url, content
)
-- types: 'logo', 'styleguide', 'brandvoice', 'font', 'product', 'other'
```

### O que o ATLAS precisa extrair automaticamente
```typescript
interface ClientDNAContext {
  client_name: string
  niche: string
  brand_voice: string        // do asset type='brandvoice'
  primary_color: string      // do workspace ou do DNA wizard
  secondary_colors: string[] // do DNA wizard
  font_heading: string       // do asset type='font' ou DNA wizard
  font_body: string
  logo_url: string           // do asset type='logo'
  tone: string               // formal, casual, técnico, inspiracional
  target_audience: string    // público-alvo definido no DNA
  key_message: string        // mensagem central da marca
}
```

### Nova tabela: `client_dna` (simplificada, lida pelo ATLAS)
```sql
CREATE TABLE IF NOT EXISTS client_dna (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id         UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  workspace_id      UUID NOT NULL,
  -- Identidade visual
  primary_color     TEXT DEFAULT '#000000',
  secondary_colors  TEXT[] DEFAULT '{}',
  font_heading      TEXT DEFAULT 'Inter',
  font_body         TEXT DEFAULT 'Inter',
  logo_url          TEXT,
  visual_style      TEXT DEFAULT 'minimalista',
    -- 'minimalista' | 'bold' | 'cinematografico' | 'colorido' | 'profile'
  -- Brand voice
  tone              TEXT DEFAULT 'profissional',
    -- 'profissional' | 'casual' | 'inspiracional' | 'tecnico' | 'humor'
  brand_voice_text  TEXT,     -- brand voice completo em texto
  target_audience   TEXT,     -- público-alvo
  key_message       TEXT,     -- mensagem central
  -- Referência visual
  reference_images  TEXT[] DEFAULT '{}', -- URLs de carrosséis/posts de referência
  UNIQUE(client_id)
);

ALTER TABLE client_dna ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_dna_auth" ON client_dna
  FOR ALL USING (auth.uid() IS NOT NULL);
```

---

## 3. TEMPLATES DE ESTILO

Dois templates principais, inspirados no que o mercado validou:

### Template 1: Minimalista/Cinematográfico
```
Estética: imagem de fundo full-bleed (gerada por IA) + texto sobreposto bold
Gancho: título grande, impactante, 2-4 palavras no slide 1
Subtítulo: frase curta abaixo do título
Badge: @ do cliente no canto superior esquerdo
Sombra: overlay escuro na parte inferior (para legibilidade)
Proporção: 1080x1350px (4:5) para feed Instagram
Estilo visual: cinematográfico, dramático, alto contraste
```

### Template 2: Profile/Twitter
```
Estética: fundo escuro/claro limpo + texto + thumbnail lateral
Gancho: frase de impacto no topo (estilo tweet)
Corpo: texto corrido informativo
Thumbnail: imagem 16:9 gerada por IA abaixo do texto
Badge: foto de perfil + nome + @ (estilo Twitter verificado)
Proporção: 1080x1350px
Estilo visual: clean, confiável, informativo
```

### Template 3: Bold/Gráfico (futuro)
```
Cores vibrantes da marca, tipografia grande, pouca imagem
```

---

## 4. ARQUITETURA DO FLUXO AUTOMÁTICO

```
Usuário abre Creative Studio do cliente
  ↓
Sistema busca client_dna automaticamente
  ↓
Exibe contexto do DNA (readonly): paleta, tom, estilo preferido
  ↓
Usuário escolhe:
  - Template (Minimalista / Profile)
  - Formato (feed / stories / banner / thumbnail)
  - Tema/prompt (o que o carrossel vai falar)
  - Número de slides (3–10)
  - [Opcional] imagem de referência de estilo
  ↓
Clica "Gerar com ATLAS"
  ↓
VERA gera copy dos slides (título + subtítulo por slide, estrutura narrativa)
  ↓
ATLAS gera imagem para cada slide com prompt contextual:
  - Deriva do conteúdo do slide (contextual, não genérico)
  - Aplica estilo do DNA (ton, paleta, estilo visual)
  - Aplica template selecionado
  ↓
Geração progressiva: cada slide aparece ao terminar
  ↓
Usuário vê preview do carrossel completo
  ↓
[Opcional] Abre Editor para ajustes (só admin/collaborator)
  ↓
Aprova → salva em creative_assets → aparece na galeria
```

---

## 5. PROMPT BUILDER — COMO O DNA ENTRA NO ATLAS

```typescript
function buildAtlasPrompt(
  slideContent: { title: string; subtitle: string },
  dna: ClientDNAContext,
  template: 'minimalista' | 'profile',
  referenceStyle?: string
): string {
  const styleMap = {
    minimalista: 'cinematic, dramatic lighting, high contrast, dark atmosphere, editorial photography',
    bold: 'bold graphic design, vibrant colors, geometric shapes, strong typography',
    cinematografico: 'film quality, cinematic composition, storytelling mood, atmospheric',
    colorido: 'colorful, energetic, modern, clean design',
    profile: 'clean background, minimal, professional, editorial, soft lighting'
  }

  const toneMap = {
    profissional: 'professional, sophisticated, trustworthy',
    casual: 'friendly, approachable, warm, human',
    inspiracional: 'motivational, aspirational, uplifting',
    tecnico: 'precise, technical, informative, structured',
    humor: 'playful, fun, energetic, creative'
  }

  return [
    // Conteúdo do slide (contextual — mais importante)
    `Create a ${template} style social media image for this content: "${slideContent.title}. ${slideContent.subtitle}"`,

    // Estilo visual da marca
    `Visual style: ${styleMap[dna.visual_style] ?? styleMap.minimalista}`,
    `Brand tone: ${toneMap[dna.tone] ?? toneMap.profissional}`,

    // Cores da marca
    dna.primary_color ? `Primary brand color: ${dna.primary_color}` : '',

    // Target audience context
    dna.target_audience ? `Target audience: ${dna.target_audience}` : '',

    // Estilo de referência se existir
    referenceStyle ? `Reference style: ${referenceStyle}` : '',

    // Diretrizes técnicas
    'Marketing creative, professional quality, Instagram format',
    'No text overlays, no watermarks',
    template === 'minimalista'
      ? 'Dark dramatic background with space for text overlay at bottom'
      : 'Clean background with space for text content and thumbnail image',
  ].filter(Boolean).join('. ')
}
```

---

## 6. VERA GERA O COPY DOS SLIDES

Antes de gerar imagens, VERA cria a estrutura narrativa:

```typescript
// Prompt para VERA gerar copy do carrossel
const veraPrompt = `
Você é VERA, copywriter especialista em carrosséis virais para Instagram.

CLIENTE: ${client.name} — ${client.niche}
DNA DA MARCA:
- Tom: ${dna.tone}
- Público: ${dna.target_audience}
- Mensagem central: ${dna.key_message}
- Brand voice: ${dna.brand_voice_text?.slice(0, 300)}

TEMA DO CARROSSEL: ${userPrompt}
NÚMERO DE SLIDES: ${slideCount}
TEMPLATE: ${template}

Gere o copy completo do carrossel. Retorne APENAS JSON válido:
{
  "hook": "gancho do slide 1 — frase que para o scroll (máx 6 palavras)",
  "slides": [
    {
      "number": 1,
      "title": "título impactante (máx 6 palavras)",
      "subtitle": "frase de apoio (máx 15 palavras)",
      "image_context": "descrição do que a imagem deve mostrar"
    }
  ],
  "cta": "chamada para ação do último slide",
  "caption": "legenda completa para o post com emojis e hashtags"
}

REGRAS:
- Slide 1: gancho polêmico ou contraintuitivo
- Slides 2-N-1: desenvolvimento com valor prático
- Último slide: CTA claro
- Cada título deve ser autossuficiente (pode ser lido sozinho)
- image_context descreve a cena ideal para aquele slide
`
```

---

## 7. EDITOR VISUAL — ESCOPO REAL

Não é um editor completo de design. É um painel de ajustes pós-geração.

### Quem pode editar
- `role: 'admin'` — acesso total
- `role: 'collaborator'` — acesso ao editor
- `role: 'viewer'` — só visualiza e aprova, sem editar

### O que o editor permite (por slide)
```typescript
interface SlideEditorState {
  // Texto
  title: string
  subtitle: string
  titleSize: number        // 60–140px
  titlePosition: 'top' | 'middle' | 'bottom'
  titleAlignment: 'left' | 'center' | 'right'
  highlightWords: string[] // palavras que ganham cor de destaque
  highlightColor: string   // cor do destaque

  // Imagem
  imageUrl: string         // gerada pelo ATLAS
  imagePositionX: number   // 0–100
  imagePositionY: number   // 0–100
  imageZoom: number        // 80–150%
  overlayStyle: 'none' | 'base' | 'top' | 'full'
  overlayOpacity: number   // 0–100

  // Tipografia
  fontHeading: string      // lista de fontes disponíveis
  fontBody: string

  // Global (aplica a todos os slides)
  badge: boolean           // exibir @handle no canto
  badgeStyle: 'solid' | 'glass' | 'minimal'
  corners: boolean         // exibir cantos com marca
}
```

### Actions do editor
- **Refinar slide com IA** — instrução textual → VERA reescreve só aquele slide
- **Regerar imagem** — novo prompt → ATLAS gera nova imagem para aquele slide
- **Aplicar ao próximo** — propaga configurações visuais para o slide seguinte
- **Copiar layout** — copia configuração visual para clipboard
- **Trocar imagem** — upload de imagem própria ou colar do clipboard

---

## 8. ROTAS DE API

```
POST /api/agents/atlas/generate-carousel    ← gera carrossel completo (VERA + ATLAS)
POST /api/agents/atlas/refine-slide         ← refina slide individual com IA
POST /api/agents/atlas/regenerate-image     ← regenera imagem de um slide
POST /api/agents/atlas/approve              ← já existe — aprovar asset
GET  /api/clients/[id]/dna                  ← buscar DNA do cliente
POST /api/clients/[id]/dna                  ← salvar/atualizar DNA
GET  /api/creative/templates                ← listar templates disponíveis
```

---

## 9. ATUALIZAÇÃO NA TABELA creative_assets

```sql
-- Adicionar colunas para suportar carrossel multi-slide e DNA
ALTER TABLE creative_assets
  ADD COLUMN IF NOT EXISTS template    TEXT DEFAULT 'minimalista',
  ADD COLUMN IF NOT EXISTS slide_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS slides_data JSONB DEFAULT '[]',
    -- Array de { number, title, subtitle, image_url, prompt }
  ADD COLUMN IF NOT EXISTS caption     TEXT,
  ADD COLUMN IF NOT EXISTS dna_snapshot JSONB DEFAULT '{}',
    -- Snapshot do DNA usado na geração (para rastreabilidade)
  ADD COLUMN IF NOT EXISTS reference_image_url TEXT;
```

---

## 10. GALERIA — MELHORIAS

- Mostrar prompt + template usado embaixo de cada criativo
- Botão "Reusar" — reabre Creative Studio com prompt pré-preenchido
- Botão "Gerar variação" — regenera com mesmo prompt, variação aleatória
- Filtro por template (Minimalista / Profile)
- Preview de carrossel: clique abre modal com todos os slides em sequência
- Download ZIP com todos os slides do carrossel

---

## 11. O QUE NÃO ENTRA NESTA FASE

```
❌ Editor drag-and-drop completo (tipo Canva) — complexidade desnecessária
❌ Publicação direta no Instagram — Fase 5
❌ Geração em batch (múltiplos carrosséis simultâneos) — Fase 8
❌ Image-to-image com múltiplas referências — Fase 8
❌ Fine-tuning de estilo por cliente — Fase 6
❌ Carrossel animado/vídeo — VULCAN, Fase 7
```

