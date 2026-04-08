# PRD — Agency OS Fase 9
> Product Requirements Document · Bug Fix Sprint + ATLAS Completo

---

## 1. Contexto

A Fase 9 tem dois objetivos complementares: **polir o produto** antes de qualquer demo ou onboarding real, e **completar o pipeline de geração de imagens** do ATLAS com aprovação nativa no chat do ORACLE. São 14 bugs visuais/UX + 3 itens de lógica + os blocos finais do ATLAS (tool_use + AtlasMessage).

O critério de aceite é simples: um usuário que nunca viu o produto consegue navegar sem confusão e gerar, aprovar e baixar um criativo dentro de 5 minutos.

### Decisões de tecnologia

| Item | Decisão | Motivo |
|------|---------|--------|
| ATLAS B5 tool_use | Detecção de intent por regex + `generateImage()` inline | Evita latência de function-calling full; simples e determinístico |
| ATLAS B6 AtlasMessage | Novo componente React em `components/oracle/` | Separação clara entre mensagem de texto e resposta visual |
| Bug fixes | Edições cirúrgicas, 1 arquivo por bug | Nenhum risco de regressão |
| approve/route.ts | PATCH `/api/agents/atlas/approve` | Desacopla lógica de aprovação do generate |

---

## 2. Blocos

### Bloco A — Bug Fixes Visuais (Grupo A, 7 itens)
**Prioridade:** ⚡ Crítica — bloqueiam apresentação do produto

| ID | Arquivo | Fix |
|----|---------|-----|
| diag-top-border | `app/globals.css` | Remover borda laranja acidental no `body` ou `main` |
| diag-primary-btn-color | `pipelines/**/page.tsx`, `templates/**/page.tsx` | `violet-*` → `[var(--color-accent)]` |
| diag-sidebar-lang | `components/layout/Sidebar.tsx` | "Overview"→"Visão Geral", "Jobs"→"Projetos", "Reports"→"Relatórios" |
| diag-title-tags | CRM, Marketplace, Relatórios, Workspace, Faturamento | `export const metadata = { title, description }` |
| diag-marketplace-price | Marketplace card component | Sufixo `/mês` em todos os preços |
| diag-domain-placeholder | `settings/workspace` form | Label descritivo no campo de domínio |
| diag-workspace-color | Workspace settings | 1 color picker unificado (remover swatch duplicado) |

---

### Bloco B — Bug Fixes UX (Grupo B, 4 itens)
**Prioridade:** Alta

- **diag-agent-tooltip**: Agentes no Job sidebar truncados — adicionar `title` nativo + tooltip Tailwind no hover
- **diag-markdown-gallery**: `output_content` da Galeria renderizando `**bold**` como texto — usar react-markdown
- **diag-crm-scroll**: Kanban CRM sem indicador de scroll horizontal — `overflow-x-auto` + gradient fade right
- **diag-empty-states**: Overview, CRM e Reports sem CTA quando vazios — adicionar mensagem + botão contextual

---

### Bloco C — Correções de Lógica (Grupo C, 3 itens)
**Prioridade:** Alta

- **diag-client-view-mode**: Página de cliente abre em modo edição por padrão — `useState('view')` com botão "Editar" explícito
- **diag-financial-sync**: `financial/page.tsx` e `financial/advanced/page.tsx` com queries diferentes para contratos ativos — unificar
- **dna-edit-mode**: `DNADocument.tsx` sem botão de edição — "Editar DNA" deve reabrir `DNAWizard` preenchido com dados existentes

---

### Bloco D — ATLAS Completo (BLOCOs 5+6 da SPEC-ATLAS)
**Prioridade:** Alta

**BLOCO 5 — ORACLE tool_use:**
- Quando `agent === 'atlas'` e a mensagem contém intent de geração real (regex `gerar imagem`, `crie o criativo`, etc.)
- Após o stream de texto terminar: extrair o prompt do `fullContent`, chamar `generateImage()`
- Emitir marcador `%%ATLAS_IMAGE%%{...}%%` no stream antes de fechar
- Salvar `creative_asset` com `status: 'pending'` + `source: 'oracle'`

**BLOCO 6 — AtlasMessage component:**
- `components/oracle/AtlasMessage.tsx` — detecta e renderiza o marcador `%%ATLAS_IMAGE%%`
- Exibe imagem inline no chat com badge "Aguardando aprovação"
- Botões: **Aprovar** (POST `/api/agents/atlas/approve`) · **Regenerar** · **Descartar**
- Ao aprovar: move card para galeria, badge muda para "✓ Aprovado"

---

### Bloco E — Melhorias DNA
**Prioridade:** Média

- **dna-upload-ui**: Interface de upload de arquivos (PDF, logo, HTML do styleguide) na aba DNA do cliente
- **approval-rls**: Validar políticas RLS do Supabase para `creative_assets` — apenas o criador ou workspace admin pode aprovar/rejeitar

---

## 3. Critérios de Aceite

1. Nenhum elemento violet/purple visível em produção
2. Sidebar 100% em português
3. ATLAS gera imagem dentro do chat ORACLE e mostra preview inline
4. Botão "Aprovar" move asset para a galeria
5. Edição de cliente não abre mais em modo edit por padrão
6. DNA existente pode ser editado (reabre wizard preenchido)

---

## 4. Dependências e Riscos

| Risco | Mitigação |
|-------|-----------|
| `approve/` dir não existe (bash quebrado) | User roda `mkdir` no terminal antes do BLOCO 5 |
| `migration_atlas.sql` não aplicado | Lembrar usuário de rodar no Supabase SQL Editor |
| ATLAS intent regex pode disparar por acidente | Regex conservadora: exige verbo + "imagem" explícito |
