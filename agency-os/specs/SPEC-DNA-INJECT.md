# SPEC — Agency OS | DNA Context Injection
> SDD Etapa 2 · Abril 2026
> Problema: os agentes (ATLAS, VERA, ORACLE) não leem o DNA completo do cliente.
> Solução: criar um serviço único que extrai todo o DNA existente e o injeta
>          no system prompt de qualquer agente que precise dele.

---

## 1. ONDE O DNA JÁ EXISTE NO SISTEMA

Pelas screenshots e specs, o DNA do cliente dicasdoflaviog já está salvo em:

### Tabela `client_assets` (Fase 1 — já existe)
```sql
-- type pode ser: 'logo' | 'styleguide' | 'brandvoice' | 'font' | 'product' | 'other'
-- content: TEXT — o conteúdo textual do asset (brand voice, styleguide em texto, etc.)
SELECT content FROM client_assets WHERE client_id = ? AND type = 'brandvoice';
SELECT content FROM client_assets WHERE client_id = ? AND type = 'styleguide';
```

### Tabela `clients` (Fase 1 — já existe)
```sql
-- Campos básicos: name, niche, notes
SELECT name, niche, notes FROM clients WHERE id = ?;
```

### Tabela `client_dna` (DNA Wizard — se implementado nas Fases 2/3)
```sql
-- Campos do wizard: tone, primary_color, visual_style, etc.
-- PODE ou NÃO existir dependendo do estado atual do projeto
SELECT * FROM client_dna WHERE client_id = ?;
```

### DNA Estruturado (screenshots — pilares)
As telas mostram 4 pilares preenchidos:
- **Biografia do Autor / Empresa** — história, missão, visão, marcos
- **Voz do Autor / Marca** — ANTIGURU, personalidade, tom, ritmo, frases certas
- **Credenciais & Provas** — posicionamento único, filosofia, competências
- **Palavras & Frases Proibidas** — o que a marca NUNCA diz

Esses pilares provavelmente estão salvos em `client_assets` com
`type = 'brandvoice'` (em texto markdown) ou em uma tabela `dna_pillars`
que pode ter sido criada nas fases mais recentes.

---

## 2. O QUE PRECISA SER CRIADO

### 2.1 — Serviço de extração de DNA

**CRIAR `lib/atlas/dna.ts`** (substitui o arquivo da SPEC-ATLAS-V2 se já existir)

```typescript
// lib/atlas/dna.ts
// Extrai TODO o DNA disponível do cliente de todas as fontes existentes.
// Retorna um contexto consolidado pronto para injetar em qualquer agente.

import { SupabaseClient } from '@supabase/supabase-js'

export interface ClientDNAContext {
  // Identidade básica
  client_name: string
  niche: string

  // Brand voice completo (o texto mais importante — vem de client_assets)
  brand_voice_text: string       // conteúdo do asset type='brandvoice'
  styleguide_text: string        // conteúdo do asset type='styleguide'

  // Identidade visual (vem de client_dna se existir, ou defaults)
  primary_color: string
  secondary_colors: string[]
  font_heading: string
  visual_style: string           // 'minimalista' | 'bold' | 'cinematografico' etc
  tone: string                   // 'profissional' | 'casual' | 'inspiracional' etc

  // Contexto de negócio
  target_audience: string
  key_message: string
  logo_url: string
}

export async function getClientDNA(
  clientId: string,
  supabase: SupabaseClient
): Promise<ClientDNAContext> {
  // 1. Busca paralela em todas as fontes
  const [clientRes, assetsRes, dnaRes] = await Promise.all([
    supabase
      .from('clients')
      .select('name, niche, notes')
      .eq('id', clientId)
      .single(),

    supabase
      .from('client_assets')
      .select('type, content, file_url, name')
      .eq('client_id', clientId)
      .in('type', ['brandvoice', 'styleguide', 'logo', 'font']),

    // client_dna pode não existir ainda — usar maybeSingle para não lançar erro
    supabase
      .from('client_dna')
      .select('*')
      .eq('client_id', clientId)
      .maybeSingle(),
  ])

  const client = clientRes.data
  const assets = assetsRes.data ?? []
  const dna = dnaRes.data  // null se tabela não existir ou não tiver registro

  // 2. Extrair assets por tipo
  const brandVoiceAssets = assets.filter(a => a.type === 'brandvoice')
  const styleguideAssets = assets.filter(a => a.type === 'styleguide')
  const logoAsset = assets.find(a => a.type === 'logo')
  const fontAsset = assets.find(a => a.type === 'font')

  // Concatenar todos os assets de brand voice (pode haver múltiplos pilares)
  // Exemplo: Biografia, Voz da Marca, Credenciais, Palavras Proibidas
  // são todos client_assets type='brandvoice' com names diferentes
  const brand_voice_text = brandVoiceAssets
    .map(a => a.content ? `### ${a.name}\n${a.content}` : '')
    .filter(Boolean)
    .join('\n\n')

  const styleguide_text = styleguideAssets
    .map(a => a.content ? `### ${a.name}\n${a.content}` : '')
    .filter(Boolean)
    .join('\n\n')

  return {
    client_name:      client?.name ?? '',
    niche:            client?.niche ?? '',
    brand_voice_text,
    styleguide_text,
    primary_color:    dna?.primary_color ?? '#F59E0B',
    secondary_colors: dna?.secondary_colors ?? [],
    font_heading:     dna?.font_heading ?? fontAsset?.content ?? 'Inter',
    visual_style:     dna?.visual_style ?? 'minimalista',
    tone:             dna?.tone ?? 'profissional',
    target_audience:  dna?.target_audience ?? '',
    key_message:      dna?.key_message ?? '',
    logo_url:         dna?.logo_url ?? logoAsset?.file_url ?? '',
  }
}

// Formata o DNA como bloco de contexto para injetar em qualquer system prompt
export function formatDNAContext(dna: ClientDNAContext): string {
  const sections: string[] = [
    `=== DNA DO CLIENTE: ${dna.client_name} ===`,
    `Nicho: ${dna.niche}`,
  ]

  if (dna.target_audience) {
    sections.push(`Público-alvo: ${dna.target_audience}`)
  }

  if (dna.key_message) {
    sections.push(`Mensagem central: ${dna.key_message}`)
  }

  if (dna.primary_color) {
    sections.push(`Cor primária: ${dna.primary_color}`)
  }

  if (dna.visual_style) {
    sections.push(`Estilo visual: ${dna.visual_style}`)
  }

  if (dna.tone) {
    sections.push(`Tom de voz: ${dna.tone}`)
  }

  if (dna.brand_voice_text) {
    sections.push(`\n--- BRAND VOICE ---\n${dna.brand_voice_text}`)
  }

  if (dna.styleguide_text) {
    sections.push(`\n--- STYLEGUIDE ---\n${dna.styleguide_text}`)
  }

  sections.push('=== FIM DO DNA ===')

  return sections.join('\n')
}
```

---

## 3. INJETAR DNA NA VERA (copy do carrossel)

### 3.1 — MODIFICAR `lib/atlas/vera-copy.ts`

**O que mudar:** o prompt da VERA hoje usa campos soltos. Precisa usar
`formatDNAContext()` para injetar o DNA completo — incluindo os pilares
de brand voice (Biografia, Voz da Marca, Credenciais, Proibidas).

```typescript
// lib/atlas/vera-copy.ts
// MODIFICAR a função generateCarouselCopy:

import { ClientDNAContext, formatDNAContext } from './dna'

export async function generateCarouselCopy(
  userPrompt: string,
  slideCount: number,
  template: string,
  dna: ClientDNAContext
): Promise<CarouselCopy> {

  // DNA completo injetado — inclui brand voice, styleguide, palavras proibidas
  const dnaContext = formatDNAContext(dna)

  const prompt = `Você é VERA, copywriter especialista em carrosséis virais para Instagram.

${dnaContext}

TEMPLATE: ${template === 'minimalista'
  ? 'Minimalista — títulos curtos e impactantes (máx 6 palavras). Tom dramático. Ganchos contraintuitivos.'
  : 'Profile/Twitter — texto informativo estilo thread. Compartilhável. Dados e insights.'}

TEMA DO CARROSSEL: "${userPrompt}"
NÚMERO DE SLIDES: ${slideCount}

ATENÇÃO: Leia o DNA acima com cuidado antes de escrever qualquer palavra.
Respeite TODAS as palavras proibidas, o tom, o ritmo e as estruturas preferidas da marca.
Se houver exemplos de frases certas no DNA, siga o mesmo estilo.

Retorne APENAS JSON válido sem markdown:
{
  "hook": "gancho irresistível para o slide 1 — respeita o tom da marca",
  "slides": [
    {
      "number": 1,
      "title": "título respeitando o DNA da marca",
      "subtitle": "frase de apoio no tom certo",
      "image_context": "descreva a cena ideal para a imagem em inglês"
    }
  ],
  "cta": "chamada para ação no tom da marca",
  "caption": "legenda completa no tom e vocabulário da marca"
}`

  // ... resto da função igual à SPEC-ATLAS-V2
}
```

---

## 4. INJETAR DNA NO ATLAS (prompt da imagem)

### 4.1 — MODIFICAR `lib/atlas/prompt-builder.ts`

**O que mudar:** o prompt de imagem hoje usa campos básicos.
Precisa incluir o styleguide visual quando disponível.

```typescript
// lib/atlas/prompt-builder.ts
// MODIFICAR buildImagePrompt para usar styleguide_text quando disponível:

export function buildImagePrompt(
  slide: SlideContent,
  dna: ClientDNAContext,
  template: string,
  customStyle?: string
): string {
  const parts = [
    // Contexto da cena — o mais importante (deriva do slide, não do DNA)
    slide.image_context || `Professional marketing visual for: ${slide.title}`,

    // Estilo visual da marca
    VISUAL_STYLE_MAP[dna.visual_style] ?? VISUAL_STYLE_MAP.minimalista,
    TONE_VISUAL_MAP[dna.tone] ?? TONE_VISUAL_MAP.profissional,

    // Cores da marca
    dna.primary_color ? `Primary brand color accent: ${dna.primary_color}` : '',

    // Nicho para contexto fotográfico
    dna.niche ? `Business context: ${dna.niche}` : '',

    // Público-alvo para direcionamento visual
    dna.target_audience ? `Target audience visual style: ${dna.target_audience}` : '',

    // Direcionamento de template
    template === 'minimalista'
      ? 'Dark dramatic background, cinematic lighting, space at bottom third for text overlay'
      : 'Clean professional background, editorial style, subject left-aligned',

    // Estilo de referência personalizado
    customStyle || '',

    'No text overlays, no watermarks, Instagram marketing creative, professional quality',
  ]

  return parts.filter(Boolean).join('. ')
}
```

---

## 5. INJETAR DNA NO ORACLE (chat de orquestração)

### 5.1 — VERIFICAR e MODIFICAR `app/api/oracle/chat/route.ts`

O ORACLE precisa receber o DNA completo como parte do system prompt
para que suas respostas já saiam no tom certo da marca.

```typescript
// app/api/oracle/chat/route.ts
// Adicionar antes de montar o system prompt:

import { getClientDNA, formatDNAContext } from '@/lib/atlas/dna'

// Dentro do POST handler, após pegar clientId do body:
const dna = clientId
  ? await getClientDNA(clientId, supabase)
  : null

const dnaBlock = dna ? formatDNAContext(dna) : ''

// Adicionar dnaBlock ao system prompt do ORACLE:
const systemPrompt = `
Você é o ORACLE, orquestrador central da Agency OS.
${dnaBlock ? `\nContexto do cliente atual:\n${dnaBlock}` : ''}

[... resto do system prompt existente do ORACLE ...]
`
```

---

## 6. ROTA GET /api/clients/[id]/dna

### 6.1 — CRIAR `app/api/clients/[id]/dna/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getClientDNA } from '@/lib/atlas/dna'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const dna = await getClientDNA(params.id, supabase)
    return NextResponse.json(dna)
  } catch (error) {
    // Se client_dna não existir, retorna DNA parcial sem erro
    return NextResponse.json({ error: 'DNA não encontrado' }, { status: 404 })
  }
}
```

---

## 7. VERIFICAÇÃO DE COMO OS PILARES ESTÃO SALVOS

Antes de implementar, o Claude Code precisa verificar exatamente
como os pilares do DNA estão salvos no banco:

```bash
# Rodar no terminal (com a CLI do Supabase ou direto no SQL Editor):

-- Verificar como os assets do cliente dicasdoflaviog estão salvos
SELECT type, name, LEFT(content, 100) as content_preview
FROM client_assets
WHERE client_id = (SELECT id FROM clients WHERE slug = 'dicasdoflaviog')
ORDER BY type, name;

-- Verificar se existe tabela client_dna
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'client_dna';

-- Verificar se existe tabela dna_pillars ou similar
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name ILIKE '%dna%';
```

O resultado determina se:
1. Os pilares (Biografia, Voz, Credenciais, Proibidas) estão em
   `client_assets` com `type = 'brandvoice'` e `name` diferente por pilar
2. Ou estão em uma tabela separada `dna_pillars`
3. Ou estão consolidados em um único asset com todo o conteúdo junto

A função `getClientDNA()` já lida com o caso 1 (múltiplos assets brandvoice)
concatenando todos. Se for caso 2 ou 3, ajustar a query.

---

## 8. ORDEM DE IMPLEMENTAÇÃO

```
PASSO 1 — Verificar banco (SQL acima)
PASSO 2 — Criar/sobrescrever lib/atlas/dna.ts
PASSO 3 — Modificar lib/atlas/vera-copy.ts (inject formatDNAContext)
PASSO 4 — Modificar lib/atlas/prompt-builder.ts (adicionar niche + audience)
PASSO 5 — Modificar app/api/oracle/chat/route.ts (injetar DNA no system prompt)
PASSO 6 — Criar app/api/clients/[id]/dna/route.ts
PASSO 7 — npm run build + git push
```

---

## 9. CHECKLIST DE VALIDAÇÃO

- [ ] `getClientDNA()` retorna `brand_voice_text` não vazio para dicasdoflaviog
- [ ] `brand_voice_text` inclui os 4 pilares: Biografia, Voz, Credenciais, Proibidas
- [ ] `formatDNAContext()` monta string com todas as seções
- [ ] VERA recebe o DNA completo no prompt — não só nome + nicho
- [ ] Gerar um carrossel e verificar: a copy NÃO usa palavras proibidas do DNA
- [ ] A copy segue o tom "ANTIGURU, DIRETO, REAL" documentado no pilar Voz
- [ ] ORACLE responde no tom da marca ao iniciar conversa no contexto do cliente
- [ ] Prompt de imagem do ATLAS inclui cor primária e visual_style do DNA

---

## COMANDO PARA O CLAUDE CODE

```
Leia SPEC-DNA-INJECT.md e implemente na ordem dos 8 passos.

PRIMEIRO rode a verificação SQL do Passo 1 para entender como os pilares
do DNA estão salvos para o cliente dicasdoflaviog.
Ajuste as queries em getClientDNA() conforme o resultado.

IMPORTANTE:
- lib/atlas/dna.ts usa .maybeSingle() em client_dna — não lança erro se tabela
  não existir ou não tiver registro
- formatDNAContext() deve incluir TODO o conteúdo de brand voice,
  não só os campos básicos
- O objetivo: a VERA gerar copy que soa como dicasdoflaviog escreve,
  não como IA genérica
- Após implementar: gere um carrossel de teste e compare o output com
  os exemplos de frases certas documentados no pilar "Voz do Autor"

git commit -m "feat(dna): inject full client DNA context into VERA, ATLAS and ORACLE"
git push
```
