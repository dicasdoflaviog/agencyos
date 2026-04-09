// Template Registry — Agency OS Blueprint System
// Fonte única de verdade para todos os 7 templates.
// Cada cliente pode sobrescrever tokens via ClientTokens (cor, fonte).
// Adicionar um novo template = criar o componente + registrar aqui. Zero código extra.

import React from 'react'

import { T01ProdutoFlutuante, T01Props } from './T01ProdutoFlutuante'
import { T02ModalClean, T02Props } from './T02ModalClean'
import { T03TituloCardsFoto, T03Props } from './T03TituloCardsFoto'
import { T04ProblemaSolucao, T04Props } from './T04ProblemaSolucao'
import { EditorialTemplate } from './EditorialTemplate'
import { T06FundoSolido, T06Props } from './T06FundoSolido'
import { T07GridAgentes, T07Props } from './T07GridAgentes'

// ─── Template IDs ────────────────────────────────────────────────────────────

export type TemplateId =
  | 'produto-flutuante'   // T01 — lançamento de produto, feature showcase
  | 'modal-clean'         // T02 — onboarding, processo, form
  | 'foto-cards'          // T03 — catálogo, portfólio, multi-agentes
  | 'problema-solucao'    // T04 — dor/solução, prova social, stats
  | 'titulo-bold'         // T05 — posicionamento, branding, value prop
  | 'fundo-solido'        // T06 — lançamento de módulo, CTA, destaque
  | 'grid-agentes'        // T07 — showcase de agentes/time, AI stack

// ─── Tokens dinâmicos do cliente ─────────────────────────────────────────────

export interface ClientTokens {
  accentColor: string      // primary_color do DNA do cliente
  fontHeading: string      // font_heading do DNA (ex: 'Bebas Neue', 'Inter')
  bgBase?: string          // sobrescrever fundo (raro — maioria usa dark)
}

// ─── Template data por slide ──────────────────────────────────────────────────

export interface SlideTemplateData {
  // T01 / T03
  features?: string[]
  cards?: Array<{ emoji: string; name: string; description: string }>
  // T04
  problem?: string
  solution?: string
  stats?: Array<{ icon: string; value: string; label: string }>
  // T05 (titulo-bold)
  tags?: string[]
  accentPhrase?: string
  // T06
  icons?: Array<{ emoji: string; label: string }>
  // T07
  agents?: Array<{ emoji: string; name: string; role: string; statusColor?: string }>
  heroEmoji?: string
  // Compartilhados
  ctaText?: string
  brandName?: string
  brandUrl?: string
}

// ─── Regras de mapeamento de intenção ────────────────────────────────────────
// VERA usa estas regras para escolher o template_id por slide.
// Exportado para ser injetado no prompt da VERA.

export const INTENT_MAPPING_RULES = `
REGRAS DE SELEÇÃO DE TEMPLATE (aplique por slide):

1. Slide de CAPA / HOOK / POSICIONAMENTO → "titulo-bold" (T05)
   - Contém uma afirmação forte, provocação ou headline de impacto.
   - Ex: "Pare de criar manualmente." / "Você está perdendo clientes."

2. Slide de DOR / PROBLEMA / ANTES × DEPOIS → "problema-solucao" (T04)
   - Contém comparação, dor e solução, ou números de perda.
   - Se tiver 2+ estatísticas numéricas, preferir T04.

3. Slide de PRODUTO / LANÇAMENTO / FEATURE → "produto-flutuante" (T01)
   - Apresenta um produto, ferramenta, solução específica.
   - Contém lista de benefícios ou pills de feature.

4. Slide de CATÁLOGO / SERVIÇOS / MÚLTIPLOS AGENTES → "foto-cards" (T03)
   - Apresenta 2-3 itens, serviços, agentes em paralelo.
   - Use quando há uma lista de opções ou capacidades.

5. Slide de PROCESSO / ONBOARDING / PASSO A PASSO → "modal-clean" (T02)
   - Mostra etapas, formulários ou jornada do usuário.

6. Slide de CTA / DESTAQUE / MÓDULO NOVO → "fundo-solido" (T06)
   - Alta energia, chamada para ação direta.
   - Fundo sólido na cor de acento do cliente.

7. Slide de TIME / AGENTES IA / STACK TECH → "grid-agentes" (T07)
   - Mostra múltiplos agentes/ferramentas em grid.
   - Use em slides sobre equipe ou ecossistema de IA.

EXEMPLO (carrossel "Venda de Automações", 5 slides):
  Slide 1: "titulo-bold"       → Headline "Pare de Criar Manualmente"
  Slide 2: "problema-solucao"  → Balão dor: tempo perdido / balão solução: automação
  Slide 3: "produto-flutuante" → Agency OS com features flutuantes
  Slide 4: "grid-agentes"      → VERA, ATLAS, NEXUS, ORACLE trabalhando
  Slide 5: "fundo-solido"      → CTA âmbar "Link na bio ↗"
`

// ─── Registry de componentes ──────────────────────────────────────────────────

type AnyTemplateProps = {
  title: string
  subtitle: string
  backgroundImage?: string
  size?: number
  [key: string]: unknown
}

type TemplateEntry = {
  Component: React.ComponentType<AnyTemplateProps>
  label: string
  description: string
}

export const TEMPLATE_REGISTRY: Record<TemplateId, TemplateEntry> = {
  'produto-flutuante': {
    Component: T01ProdutoFlutuante as React.ComponentType<AnyTemplateProps>,
    label: 'T01 — Produto Flutuante',
    description: 'Lançamento de produto, feature showcase com card e pills',
  },
  'modal-clean': {
    Component: T02ModalClean as React.ComponentType<AnyTemplateProps>,
    label: 'T02 — Modal Clean',
    description: 'Onboarding, processo passo a passo, formulário',
  },
  'foto-cards': {
    Component: T03TituloCardsFoto as React.ComponentType<AnyTemplateProps>,
    label: 'T03 — Cards de Serviço',
    description: 'Catálogo de serviços, portfólio, grid de agentes',
  },
  'problema-solucao': {
    Component: T04ProblemaSolucao as React.ComponentType<AnyTemplateProps>,
    label: 'T04 — Problema → Solução',
    description: 'Dor vs solução, prova social, stats numéricos',
  },
  'titulo-bold': {
    Component: EditorialTemplate as React.ComponentType<AnyTemplateProps>,
    label: 'T05 — Título Bold',
    description: 'Posicionamento, branding, value prop, capa de carrossel',
  },
  'fundo-solido': {
    Component: T06FundoSolido as React.ComponentType<AnyTemplateProps>,
    label: 'T06 — Fundo Sólido',
    description: 'CTA de alta energia, lançamento de módulo, destaque',
  },
  'grid-agentes': {
    Component: T07GridAgentes as React.ComponentType<AnyTemplateProps>,
    label: 'T07 — Grid de Agentes',
    description: 'Showcase de agentes IA, stack tech, posts de time',
  },
}

// ─── Resolver ─────────────────────────────────────────────────────────────────

export function resolveTemplate(templateId: TemplateId): React.ComponentType<AnyTemplateProps> {
  return TEMPLATE_REGISTRY[templateId]?.Component ?? TEMPLATE_REGISTRY['titulo-bold'].Component
}

// ─── Props builder (client tokens → component props) ─────────────────────────
// Injeta os tokens do cliente (cor, fonte) no set de props do template.
// Os templates usam accentColor para substituir o âmbar padrão.

export function buildTemplateProps(
  slide: {
    title: string
    subtitle: string
    backgroundImage?: string
    template_data?: SlideTemplateData
  },
  clientTokens?: ClientTokens,
  size = 540
): AnyTemplateProps {
  const { template_data, ...rest } = slide
  return {
    ...rest,
    size,
    ...(template_data ?? {}),
    ...(clientTokens?.accentColor ? { accentColor: clientTokens.accentColor } : {}),
    ...(clientTokens?.fontHeading ? { fontHeading: clientTokens.fontHeading } : {}),
  }
}
