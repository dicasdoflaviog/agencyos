# Agency OS — Design System Index
> Versão 2.1 · Atualizado em Abril 2026

Este arquivo serve como **mapa de navegação** para todos os agentes do Agency OS entenderem e aplicarem o design system nos outputs que produzem.

---

## Arquivos do Design System

| Arquivo | Tipo | Finalidade |
|---|---|---|
| `agency-os-design-system.md` | Documentação | Referência completa de tokens, componentes, regras e padrões |
| `agency-os-tokens.css` | CSS | Variáveis CSS prontas para uso (cores, tipografia, espaçamento, etc.) |
| `agency-os-styleguide.html` | Visual interativo | Guia visual com todos os componentes renderizados |
| `agency-os-layout-templates.html` | Templates visuais | 7 layouts padrão para posts e materiais de comunicação |

---

## Hierarquia de Referência para Agentes

Ao criar qualquer output (relatório, proposta, post, apresentação, email), siga esta ordem:

1. **Tokens primeiro** → use `agency-os-tokens.css` como base de variáveis
2. **Consulte o design system** → `agency-os-design-system.md` para regras e componentes
3. **Adapte ao template** → escolha um dos 7 layouts em `agency-os-layout-templates.html`
4. **Valide visualmente** → use `agency-os-styleguide.html` como referência final

---

## Paleta Principal

| Token | Valor | Uso |
|---|---|---|
| `--color-bg-primary` | `#0A0A0F` | Fundo principal |
| `--color-bg-secondary` | `#111118` | Cards e superfícies |
| `--color-bg-elevated` | `#1A1A24` | Elementos elevados |
| `--color-accent` | `#F59E0B` | Amber — cor de destaque principal |
| `--color-text-primary` | `#F8F9FA` | Texto principal |
| `--color-text-secondary` | `#9CA3AF` | Texto secundário |
| `--color-border` | `#2D2D3D` | Bordas e divisores |
| `--color-success` | `#10B981` | Sucesso |
| `--color-error` | `#EF4444` | Erro |

---

## Tipografia

| Uso | Fonte | Peso |
|---|---|---|
| Títulos e UI | Inter | 400–900 |
| Código e dados | JetBrains Mono | 400–700 |

**Escalas de tamanho:** 11px · 12px · 14px · 16px · 18px · 20px · 24px · 32px · 40px · 48px

---

## Os 7 Templates de Layout

| # | Nome | Uso Ideal |
|---|---|---|
| T01 | Produto Flutuante | Apresentar um agente ou produto com destaque visual |
| T02 | Modal Clean | CTAs, formulários, onboarding, anúncios diretos |
| T03 | Título + Cards Foto | Conteúdo editorial, cases, equipe ou features |
| T04 | Problema → Solução + Stats | Posts de dor/solução com dados numéricos |
| T05 | Título Bold + Tag Cloud | Lançamentos, conceitos, temas amplos |
| T06 | Fundo Sólido + Preview | Destaque de ferramenta, integração ou recurso |
| T07 | Grid Escuro + Agentes | Apresentar múltiplos agentes, planos ou features |

---

## Componentes Disponíveis

- **Botões:** `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.btn-success`, `.btn-icon`
- **Cards:** `.card`, `.card-glass`, `.card-elevated`, `.card-feature`
- **Badges:** `.badge-amber`, `.badge-green`, `.badge-blue`, `.badge-red`, `.badge-purple`, `.badge-outline`
- **Inputs:** `.input`, `.textarea`, `.select` (todos com foco amber)
- **Alertas:** `.alert-success`, `.alert-warning`, `.alert-error`, `.alert-info`
- **Progress bars:** `.progress`, `.progress-bar` com largura em %
- **Tags/Chips:** `.tag`, `.chip` com variantes coloridas

---

## Regras Essenciais para Agentes

1. **Nunca use cores fora dos tokens** — toda cor deve vir de uma variável CSS
2. **Amber é o destaque** — use `--color-accent` apenas para elementos de ação ou destaque principal
3. **Dark mode é o padrão** — tema escuro como base, light como alternativa
4. **Consistência tipográfica** — Inter para UI, JetBrains Mono para dados/código
5. **Espaçamento em múltiplos de 4px** — 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64
6. **Bordas arredondadas:** 4px (pequeno) · 8px (médio) · 12px (grande) · 999px (pílula)
7. **Border padrão:** `1px solid var(--color-border)`
8. **Transições:** sempre use `transition: all 0.2s ease` para interações

---

## Animações Disponíveis

| Keyframe | Efeito | Uso |
|---|---|---|
| `fade-up` | Entrada suave de baixo para cima | Conteúdo principal |
| `scale-in` | Zoom de 0.95 → 1 com fade | Cards e modais |
| `bounce-in` | Overshoot elástico | CTAs e alertas |
| `shimmer` | Brilho deslizante | Loading states |
| `spin` | Rotação 360° contínua | Ícones de loading |
| `pulse-soft` | Pulsação suave de opacidade | Indicadores ativos |
| `ripple` | Onda expansiva ao clique | Botões interativos |

---

## Agentes Instalados

Os seguintes 13 agentes fazem parte do Agency OS e devem sempre produzir outputs alinhados a este design system:

1. **ORACLE** — Estratégia e inteligência de negócios
2. **VERA Copy** — Copywriting e criação de textos
3. **VOX** — Comunicação e voz da marca
4. **Content Planner** — Planejamento de conteúdo
5. **ATLAS Design** — Design e identidade visual
6. **Report Ranger** — Relatórios e análise de dados
7. **Brief Builder** — Criação de briefings
8. **VULCAN** — Automação e desenvolvimento técnico
9. **Data Detective** — Análise e investigação de dados
10. **Brand Voice AI** — Consistência de voz de marca
11. **VOLT** — Performance e otimização
12. **Proposal Pro** — Propostas comerciais
13. **Influencer Intel** — Inteligência de influenciadores

---

*Agency OS Design System v2.1 — Inter + JetBrains Mono · Amber Accent #F59E0B · Dark-first*
