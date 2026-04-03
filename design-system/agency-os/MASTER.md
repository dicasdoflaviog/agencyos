# Design System Master File — Agency OS

> **LOGIC:** When building a specific page, first check `design-system/agency-os/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Agency OS — Internal Operations Dashboard
**Style:** Minimal Dark (Linear/Vercel-inspired)
**Stack:** Next.js 16 + Tailwind v4 + shadcn/ui
**Updated:** Abril 2026

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable | Uso |
|------|-----|--------------|-----|
| Background | `#09090B` | `--color-bg` | Fundo principal |
| Surface | `#18181B` | `--color-surface` | Cards, sidebar, painéis |
| Surface Raised | `#27272A` | `--color-surface-raised` | Dropdowns, tooltips, hover |
| Border | `rgba(255,255,255,0.07)` | `--color-border` | Bordas em geral |
| Border Strong | `rgba(255,255,255,0.12)` | `--color-border-strong` | Foco, separadores |
| Text Primary | `#FAFAFA` | `--color-text` | Texto principal |
| Text Muted | `#A1A1AA` | `--color-muted` | Labels, placeholders, secundário |
| Accent | `#F59E0B` | `--color-accent` | CTAs, badges ativos, ícones destaque |
| Accent Hover | `#D97706` | `--color-accent-hover` | Hover do accent |
| Accent Foreground | `#0A0A0A` | `--color-accent-fg` | Texto sobre botão accent |
| Success | `#22C55E` | `--color-success` | Status ativo, aprovado |
| Warning | `#F97316` | `--color-warning` | Atenção, pendente |
| Error | `#EF4444` | `--color-error` | Erro, rejeitado |

**Regras de cor:**
- NUNCA usar cores hardcoded — sempre CSS variables
- Fundos nunca são `#000000` puro (usa `#09090B`)
- Accent apenas em 1 elemento por seção (CTA, badge, ícone ativo)

### Typography

**Fonte única:** Inter (Google Fonts)

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');
```

| Escala | Size | Weight | Uso |
|--------|------|--------|-----|
| `text-xs` | 11px | 400 | Captions, helper |
| `text-sm` | 13px | 400/500 | Labels, badges |
| `text-base` | 15px | 400 | Body, parágrafos |
| `text-lg` | 17px | 500 | Destaques, lead |
| `text-xl` | 20px | 600 | Subtítulos |
| `text-2xl` | 24px | 600/700 | Títulos de seção |
| `text-3xl` | 30px | 700 | Títulos de página |

- `line-height: 1.5` para body, `1.2` para headings
- `letter-spacing: -0.01em` para headings acima de 20px

### Border Radius

| Token | Value | Uso |
|-------|-------|-----|
| `rounded` | `4px` | Inputs, buttons |
| `rounded-md` | `6px` | Cards, badges |
| `rounded-lg` | `8px` | Modals, painéis |
| `rounded-xl` | `12px` | Modals grandes |

### Spacing (8pt grid)

| Token | Value | Uso |
|-------|-------|-----|
| `space-1` | `4px` | Gap tight |
| `space-2` | `8px` | Gap inline, ícone+texto |
| `space-3` | `12px` | Padding pequeno |
| `space-4` | `16px` | Padding padrão |
| `space-6` | `24px` | Padding seção |
| `space-8` | `32px` | Gap entre seções |

### Shadows (dark mode)

| Level | Value | Uso |
|-------|-------|-----|
| `shadow-sm` | `0 1px 3px rgba(0,0,0,0.4)` | Cards |
| `shadow-md` | `0 4px 12px rgba(0,0,0,0.5)` | Dropdowns, tooltips |
| `shadow-lg` | `0 8px 24px rgba(0,0,0,0.6)` | Modals |

---

## Component Specs

### Botão Primário (Accent)

```css
.btn-primary {
  background: #F59E0B;          /* var(--color-accent) */
  color: #0A0A0A;               /* var(--color-accent-fg) */
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  transition: background 150ms ease;
  cursor: pointer;
}
.btn-primary:hover { background: #D97706; }
```

### Botão Ghost

```css
.btn-ghost {
  background: transparent;
  color: #FAFAFA;
  border: 1px solid rgba(255,255,255,0.12);
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  transition: background 150ms ease;
  cursor: pointer;
}
.btn-ghost:hover { background: rgba(255,255,255,0.05); }
```

### Cards

```css
.card {
  background: #18181B;          /* var(--color-surface) */
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 6px;
  padding: 20px;
  transition: border-color 150ms ease;
}
.card:hover { border-color: rgba(255,255,255,0.12); }
```

### Inputs

```css
.input {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 14px;
  color: #FAFAFA;
  transition: border-color 150ms ease;
}
.input:focus {
  border-color: #F59E0B;        /* var(--color-accent) */
  outline: none;
  box-shadow: 0 0 0 2px rgba(245,158,11,0.15);
}
.input::placeholder { color: #A1A1AA; }
```

### Badges

```css
.badge-active   { background: rgba(34,197,94,0.12);  color: #22C55E; }
.badge-pending  { background: rgba(245,158,11,0.12); color: #F59E0B; }
.badge-paused   { background: rgba(161,161,170,0.12); color: #A1A1AA; }
.badge-error    { background: rgba(239,68,68,0.12);  color: #EF4444; }
/* Todos: font-size 12px, font-weight 500, padding 2px 8px, border-radius 4px */
```

### Sidebar

```css
.sidebar {
  width: 220px;
  background: #18181B;
  border-right: 1px solid rgba(255,255,255,0.07);
  height: 100vh;
}
.nav-item {
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  color: #A1A1AA;
  transition: all 150ms ease;
}
.nav-item:hover { background: rgba(255,255,255,0.05); color: #FAFAFA; }
.nav-item.active { background: rgba(245,158,11,0.1); color: #F59E0B; }
```

---

## Style Guidelines

**Estilo:** Minimal Dark — inspirado em Linear, Vercel, Raycast
- Zero gradientes chamativos
- Zero sombras coloridas
- Zero emojis como ícones
- Hierarquia via tamanho, peso e opacidade — não por cor
- Transições: `150ms ease-out` para micro-interações
- Accent `#F59E0B` apenas em pontos de ação críticos

**Efeitos permitidos:**
- `backdrop-filter: blur(8px)` em overlays de modal
- Glow sutil no foco: `box-shadow: 0 0 0 2px rgba(245,158,11,0.2)`
- Hover de card: border-color mais visível

---

## Anti-Patterns (NUNCA usar)

- ❌ Gradientes coloridos em backgrounds
- ❌ Cores hardcoded no código (usar CSS vars)
- ❌ Emojis como ícones (usar Lucide)
- ❌ `any` no TypeScript
- ❌ Texto menor que 12px
- ❌ Contraste menor que 4.5:1 em texto
- ❌ Accent `#F59E0B` em mais de 1 elemento por seção
- ❌ `border-radius` maior que `12px`
- ❌ Sombras coloridas
- ❌ Animações acima de 300ms para UI

---

## Pre-Delivery Checklist

- [ ] Fundo sempre `#09090B`, nunca `#000000`
- [ ] Cards com `background: #18181B`
- [ ] Accent `#F59E0B` apenas em CTAs/badges ativos
- [ ] Ícones: Lucide (stroke, não filled)
- [ ] `cursor-pointer` em todos os elementos clicáveis
- [ ] Hover com `transition: 150ms`
- [ ] Focus state visível (amber ring)
- [ ] Contraste de texto ≥ 4.5:1
- [ ] Mobile responsivo: min-width 375px
- [ ] Sem scroll horizontal no mobile
- [ ] Sem `any` no TypeScript
