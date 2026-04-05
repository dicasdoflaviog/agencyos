# Agency OS — Design System v2.1

> **Dark & Light theme · Amber accent · Animações · Acessível & Amigável**
> Versão 2.1 · Abril 2026

---

## Visão Geral

O Agency OS Design System define os fundamentos visuais e de interação da plataforma. O objetivo é garantir consistência, acessibilidade e uma experiência amigável para agências de todos os tamanhos.

**Princípios:**
- **Consistência** — mesmos padrões em todas as telas
- **Clareza** — hierarquia visual clara, sem ruído desnecessário
- **Acessibilidade** — contraste mínimo AA (WCAG 2.1), foco visível
- **Feedback** — cada ação tem resposta visual imediata

---

## 1. Tokens de Design

> Importe o arquivo `agency-os-tokens.css` no topo do seu CSS global.
> **Nunca use valores hardcoded — use sempre os tokens.**

### Backgrounds

| Token | Valor | Uso |
|-------|-------|-----|
| `--color-bg-base` | `#0C0C0E` | Fundo raiz da aplicação |
| `--color-bg-surface` | `#131317` | Sidebar, cards, painéis principais |
| `--color-bg-elevated` | `#1C1C22` | Modais, dropdowns, inputs |
| `--color-bg-overlay` | `#26262F` | Tooltips, popovers |
| `--color-bg-hover` | `#2A2A35` | Hover de itens interativos |
| `--color-bg-active` | `#313140` | Item selecionado/ativo |

### Borders

| Token | Valor | Uso |
|-------|-------|-----|
| `--color-border-subtle` | `#1E1E28` | Divisores suaves |
| `--color-border-default` | `#2C2C3A` | Bordas de inputs e cards |
| `--color-border-strong` | `#3F3F52` | Hover de bordas |
| `--color-border-focus` | `#F59E0B` | Ring de foco (acessibilidade) |

### Texto

| Token | Valor | Uso |
|-------|-------|-----|
| `--color-text-primary` | `#F0F0F5` | Títulos, textos principais |
| `--color-text-secondary` | `#A0A0B8` | Labels, subtítulos |
| `--color-text-muted` | `#686880` | Placeholders, metadados |
| `--color-text-disabled` | `#3E3E52` | Elementos desativados |
| `--color-text-inverse` | `#0C0C0E` | Texto sobre fundo accent |

### Accent — Amber

```
50:   #FFFBEB   100: #FEF3C7   200: #FDE68A   300: #FCD34D   400: #FBBF24
★ 500: #F59E0B (primária)
600: #D97706   700: #B45309   800: #92400E   900: #78350F
```

| Token semântico | Valor |
|-----------------|-------|
| `--color-accent` | `#F59E0B` |
| `--color-accent-hover` | `#D97706` |
| `--color-accent-active` | `#B45309` |
| `--color-accent-subtle` | `rgba(245,158,11,0.12)` |
| `--color-accent-ring` | `rgba(245,158,11,0.40)` |

### Cores de Status

| Status | Cor principal | Texto | Subtle bg |
|--------|--------------|-------|-----------|
| Sucesso | `#10B981` | `#34D399` | `rgba(16,185,129,.12)` |
| Erro | `#EF4444` | `#FCA5A5` | `rgba(239,68,68,.12)` |
| Alerta | `#F59E0B` | `#FCD34D` | `rgba(245,158,11,.12)` |
| Info | `#3B82F6` | `#93C5FD` | `rgba(59,130,246,.12)` |

---

## 2. Tipografia

### Famílias de fonte

```css
--font-sans: 'Inter', 'Geist', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

> Importe do Google Fonts:
> `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800`

### Escala tipográfica

| Nome | Token | Tamanho | Uso |
|------|-------|---------|-----|
| Display | `--text-5xl` | 60px / 3.75rem | Títulos de landing, hero |
| H1 | `--text-4xl` | 48px / 3rem | Page titles |
| H2 | `--text-3xl` | 36px / 2.25rem | Section titles |
| H3 | `--text-2xl` | 30px / 1.875rem | Subsection titles |
| H4 | `--text-xl` | 24px / 1.5rem | Card headers |
| H5 | `--text-lg` | 20px / 1.25rem | Labels grandes |
| Body LG | `--text-md` | 18px / 1.125rem | Parágrafos |
| Body | `--text-base` | 16px / 1rem | Texto padrão da app |
| Body SM | `--text-sm` | 14px / .875rem | Labels, cells |
| Caption | `--text-xs` | 12px / .75rem | Metadados, hints |

### Pesos

| Token | Valor | Uso |
|-------|-------|-----|
| `--font-regular` | 400 | Corpo de texto |
| `--font-medium` | 500 | Labels de nav, botões |
| `--font-semibold` | 600 | Títulos de card, tab ativa |
| `--font-bold` | 700 | Títulos de seção, page title |
| `--font-extrabold` | 800 | Display, grandes números |

---

## 3. Espaçamento

Base: **4px**. Use sempre múltiplos.

| Token | Valor | px |
|-------|-------|-----|
| `--space-1` | 0.25rem | 4px |
| `--space-2` | 0.5rem | 8px |
| `--space-3` | 0.75rem | 12px |
| `--space-4` | 1rem | 16px |
| `--space-5` | 1.25rem | 20px |
| `--space-6` | 1.5rem | 24px |
| `--space-8` | 2rem | 32px |
| `--space-10` | 2.5rem | 40px |
| `--space-12` | 3rem | 48px |
| `--space-16` | 4rem | 64px |

### Border Radius

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius-sm` | 4px | Chips menores, badges |
| `--radius-md` | 8px | Inputs, botões, nav items |
| `--radius-lg` | 12px | Cards, kanban cards |
| `--radius-xl` | 16px | Modais, painéis |
| `--radius-2xl` | 24px | Elementos grandes |
| `--radius-full` | 9999px | Badges, avatares, pills |

---

## 4. Componentes

### Botões

#### Variantes

| Variante | Uso |
|---------|-----|
| `btn-primary` | Ação principal de cada tela (1 por tela) |
| `btn-secondary` | Ações secundárias, cancelar |
| `btn-ghost` | Ações terciárias, links em tabela |
| `btn-danger` | Ações destrutivas (excluir, revogar) |
| `btn-success` | Confirmações (aprovar, publicar) |

#### Tamanhos

| Classe | Altura | Uso |
|--------|--------|-----|
| `btn-sm` | 32px | Ações em linha, tabelas, chips |
| `btn-md` | 40px | **Padrão** — formulários e toolbars |
| `btn-lg` | 48px | CTAs de destaque, onboarding |

#### Regras

- **1 botão primário por tela** — representa a ação mais importante
- Todos os botões primários usam `--color-accent` — **sem exceções**
- Botões com ícone: ícone à esquerda do texto
- `btn-icon`: 40×40px, apenas ícone, sem texto

```html
<!-- ✅ Correto -->
<button class="btn btn-primary btn-md">+ Novo Job</button>
<button class="btn btn-secondary btn-md">Cancelar</button>
<button class="btn btn-ghost btn-sm">Ver todos</button>

<!-- ❌ Errado — botão primário roxo em algumas páginas -->
<button style="background: purple">Novo pipeline</button>
```

---

### Inputs & Forms

#### Estados

| Estado | Visual |
|--------|--------|
| Default | Borda `--border-default` |
| Hover | Borda `--border-strong` |
| Focus | Borda `--accent` + ring `--accent-ring` |
| Error | Borda `--error` + ring vermelho |
| Success | Borda `--success` + ring verde |
| Disabled | Opacidade 50%, cursor not-allowed |

#### Regras

- Sempre use `<label>` com o atributo `for` correspondente
- Campos obrigatórios têm `*` após o label
- Mensagens de erro ficam abaixo do campo, em `--color-error-text`
- Hints ficam abaixo do campo, em `--color-text-muted`
- Altura padrão: 40px (`--input-height-md`)

---

### Cards

| Variante | Uso |
|---------|-----|
| Card padrão | Informação estática, não clicável |
| Card interativo | Clicável — levanta 1px no hover |
| Card accent | Destaque com borda esquerda âmbar |
| Stat card | KPIs da dashboard — número grande + label |

---

### Badges

Sempre use as classes semânticas — nunca invente cores novas.

| Classe | Cor | Uso |
|--------|-----|-----|
| `badge-green` | Verde | Ativo, Aprovado, Concluído |
| `badge-amber` | Âmbar | Em andamento, Alta prioridade, Pendente |
| `badge-red` | Vermelho | Atrasado, Rejeitado, Erro |
| `badge-blue` | Azul | Em revisão, Info |
| `badge-gray` | Cinza | Rascunho, Pausado, Inativo |

Para badges com ponto colorido, adicione a classe `badge-dot`.

---

### Avatares

- Sempre use `border-radius: var(--radius-full)` para usuários
- Para agentes de IA, use `border-radius: var(--radius-md)` (quadrado arredondado)
- Fundo: use as variantes de cores disponíveis (`avatar-amber`, `avatar-blue`, `avatar-green`, `avatar-purple`)
- Avatar group: sobreposição com `margin-left: -8px` e borda de 2px na cor da superfície

---

### Tabs

- Máximo recomendado: **7 tabs** visíveis por vez
- Se houver mais de 7 itens, agrupe em submenus ou use overflow com scroll horizontal + fade
- Tab ativa: underline âmbar `--color-accent`, texto âmbar
- Tab inativa: texto `--color-text-secondary`
- Use `tab-count` para exibir contagem de itens

---

## 5. Padrões de Navegação

### Sidebar

```
Largura: 220px (expandida) / 64px (colapsada)
Fundo: --color-bg-surface
Borda: 1px solid --color-border-subtle
```

**Hierarquia:**
1. Logo/nome da app no topo
2. Itens principais do menu
3. Separador `CONFIGURAÇÕES`
4. Itens de configuração
5. Link "Sair" fixado no bottom

**Sub-itens (accordion):**
- Use um accordion com ícone de seta rotacionável
- Sub-itens indentatados em 12px adicionais
- Label do sub-item distinguível visualmente (cor mais clara ou ícone menor)

### Topbar

```
Altura: 56px
Fundo: --color-bg-surface
Borda bottom: 1px solid --color-border-subtle
```

Conteúdo: título da seção atual + badge de versão (se aplicável) + ações globais (notificações, perfil)

---

## 6. Idioma da Interface

**Regra:** usar **português brasileiro** como idioma padrão para todos os elementos de UI.

| ❌ Inglês atual | ✅ Português correto |
|----------------|---------------------|
| Overview | Visão Geral |
| Jobs | Jobs *(manter — termo técnico)* |
| Pipelines | Pipelines *(manter — termo técnico)* |
| Templates | Modelos |
| Analytics | Análises |
| Marketplace | Marketplace *(manter)* |
| Gallery | Galeria |

> Exceções: termos técnicos consolidados no mercado podem ser mantidos em inglês (Jobs, Pipeline, CRM, MRR, ARR).

---

## 7. Acessibilidade

- **Contraste mínimo:** 4.5:1 para texto normal, 3:1 para texto grande (WCAG AA)
- **Foco visível:** `outline: 2px solid var(--color-accent)` em todos os elementos interativos via `:focus-visible`
- **Textos alternativos:** todos os ícones têm `aria-label` ou `title`
- **Tamanho mínimo de alvo:** 44×44px para touch (mobile)
- **Skeleton loading:** use em vez de spinners — comunica estrutura antes do conteúdo

---

## 8. Title Tags das Páginas

Formato padrão: `[Nome da Seção] | Agency OS`

| Rota | `<title>` |
|------|-----------|
| `/` | `Visão Geral | Agency OS` |
| `/clients` | `Clientes | Agency OS` |
| `/jobs` | `Jobs | Agency OS` |
| `/gallery` | `Galeria | Agency OS` |
| `/analytics` | `Análises | Agency OS` |
| `/crm` | `CRM | Agency OS` |
| `/marketplace` | `Marketplace | Agency OS` |
| `/reports` | `Relatórios | Agency OS` |
| `/settings/billing` | `Faturamento | Agency OS` |

---

## 9. Regras de Ouro

1. **Um botão primário por tela** — sempre âmbar
2. **Nunca valores hardcoded** — use sempre os tokens CSS
3. **Sempre abrir entidades em view mode** — edição exige clique explícito em "Editar"
4. **Empty states com CTA** — nunca deixe uma tela vazia sem orientar o próximo passo
5. **Máximo 7 tabs** — agrupe se passar disso
6. **Markdown renderizado** — outputs de agentes IA sempre passam por parser de markdown
7. **Foco visível** — nunca remova o outline de foco
8. **Feedback imediato** — toda ação tem resposta visual (hover, loading, success, error)

---

## 10. Tema Light

O sistema suporta tema claro via atributo `data-theme="light"` na tag `<html>`. O tema dark é o padrão.

```html
<!-- Ativar tema light -->
<html data-theme="light">

<!-- Ativar tema dark (padrão) -->
<html data-theme="dark">
```

### Tokens Light — Backgrounds

| Token | Dark | Light |
|-------|------|-------|
| `--bg-base` | `#0C0C0E` | `#F4F4F7` |
| `--bg-surface` | `#131317` | `#FFFFFF` |
| `--bg-elevated` | `#1C1C22` | `#F8F8FB` |
| `--bg-overlay` | `#26262F` | `#EDEDF4` |
| `--bg-hover` | `#2A2A35` | `#EAEAF2` |
| `--bg-active` | `#313140` | `#E0E0EE` |

### Tokens Light — Texto

| Token | Dark | Light |
|-------|------|-------|
| `--text-primary` | `#F0F0F5` | `#0C0C14` |
| `--text-secondary` | `#A0A0B8` | `#4A4A6A` |
| `--text-muted` | `#686880` | `#7A7A96` |
| `--text-disabled` | `#3E3E52` | `#C0C0D4` |
| `--text-inverse` | `#0C0C0E` | `#FFFFFF` |

### Tokens Light — Bordas

| Token | Dark | Light |
|-------|------|-------|
| `--border-subtle` | `#1E1E28` | `#E8E8F0` |
| `--border-default` | `#2C2C3A` | `#D4D4E0` |
| `--border-strong` | `#3F3F52` | `#B8B8CC` |

> **Accent color é idêntico em ambos os temas** — `--accent: #F59E0B` não muda. Apenas backgrounds, bordas e textos se adaptam.

### Transição entre temas

A troca é animada automaticamente via CSS global:

```css
*, *::before, *::after {
  transition:
    background-color 300ms ease,
    border-color 300ms ease,
    color 100ms ease,
    box-shadow 300ms ease;
}
```

---

## 11. Animações & Micro-interações

### Tokens de Easing

| Token | Valor | Uso |
|-------|-------|-----|
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Botões, badges, elementos que surgem |
| `--ease-smooth` | `cubic-bezier(0.4, 0, 0.2, 1)` | Transições padrão (cores, sombras) |
| `--ease-decelerate` | `cubic-bezier(0, 0, 0.2, 1)` | Entradas na tela (modal, sidebar) |
| `--ease-sharp` | `cubic-bezier(0.4, 0, 1, 1)` | Saídas da tela (fechar, dispensar) |

### Tokens de Duração

| Token | Valor | Uso |
|-------|-------|-----|
| `--dur-fast` | `100ms` | Cor, opacidade |
| `--dur-base` | `200ms` | Hover padrão |
| `--dur-moderate` | `300ms` | Entradas, modais, tema |
| `--dur-slow` | `450ms` | Progress bar, animações complexas |

### Keyframes disponíveis

| Nome | Efeito | Uso típico |
|------|--------|------------|
| `fade-up` | opacity + translateY(12px → 0) | Cards, listas ao carregar |
| `fade-in` | opacity 0 → 1 | Overlays, tooltips |
| `scale-in` | opacity + scale(0.92 → 1) | Modais, dropdowns |
| `bounce-in` | scale 0.5 → 1.12 → 1 | Badges, notificações, sucesso |
| `slide-right` | opacity + translateX(20px → 0) | Toasts, painéis laterais |
| `shimmer` | gradient deslizante | Skeleton loading |
| `spin` | rotate 0 → 360deg | Loaders, spinners |
| `pulse-soft` | opacity 1 → 0.45 → 1 | Status online, indicadores |
| `ripple` | scale 0 → 4 + opacity 0 | Feedback de clique em botões |

### Micro-interações por componente

| Componente | Gatilho | Animação | Easing / Duração |
|-----------|---------|---------|-----------------|
| Botão primário | `:active` | `scale(0.96)` → spring back | ease-spring · 150ms |
| Card interativo | `:hover` | `translateY(-1px)` + shadow | ease-smooth · 200ms |
| Input | `:focus` | border-color + ring glow | ease-smooth · 150ms |
| Badge / Chip | mount | bounce-in | ease-spring · 300ms |
| Toast | appear | slide-right + fade-in | ease-decelerate · 300ms |
| Modal | open | scale-in (0.92 → 1) | ease-spring · 300ms |
| Progress bar | valor muda | width transition | ease-smooth · 500ms |
| Theme toggle | click | todos os tokens CSS | ease-smooth · 300ms |

### Exemplo de uso

```css
/* Entrada de cards em cascata */
.card {
  animation: fade-up 300ms var(--ease-decelerate) both;
}
.card:nth-child(1) { animation-delay: 0ms; }
.card:nth-child(2) { animation-delay: 60ms; }
.card:nth-child(3) { animation-delay: 120ms; }

/* Hover com micro-interação */
.card-interactive {
  transition: transform var(--dur-base) var(--ease-smooth),
              box-shadow var(--dur-base) var(--ease-smooth);
}
.card-interactive:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

/* Spring no clique de botão */
.btn:active {
  transform: scale(0.96);
  transition-duration: var(--dur-fast);
  transition-timing-function: var(--ease-spring);
}
```

### Regras para animações

- **Respeite `prefers-reduced-motion`** — envolva animações complexas com `@media (prefers-reduced-motion: no-preference)`
- **Duração máxima para micro-interações: 300ms** — além disso, a UI parece lenta
- **Use `animation-fill-mode: both`** em entradas para evitar flash antes/depois
- **Nunca anime `width` ou `height`** diretamente — use `transform: scale()` ou `max-height` com overflow hidden
- **Cascade delays**: máximo 6 itens em sequência, delay de 50–80ms entre cada

---

*Agency OS Design System v2.1 — Abril 2026*
