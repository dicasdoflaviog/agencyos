# COMANDO DE EXECUÇÃO — Agency OS
> Ordem exata de implementação · Sem pular fases · Abril 2026
> Enviar para o agente (Copilot/Claude Code) na ordem abaixo

---

## REGRAS PARA O AGENTE

Antes de qualquer implementação, sempre:
1. `grep -rn "NOME_DA_FUNCAO\|NOME_DO_COMPONENTE" --include="*.tsx" --include="*.ts" . | grep -v node_modules`
2. Nunca criar rota que já existe — verificar `app/api/` antes
3. Nunca criar componente que já existe — verificar `components/` antes
4. Sempre usar `IntelligenceRouter.ts` para chamar LLMs — nunca instanciar OpenAI/Anthropic direto
5. Sempre usar `var(--color-accent)` para cor primária — nunca violet/purple
6. Após cada bloco: `git add -A && git commit -m "tipo(escopo): descrição"`
7. Após cada fase completa: `npm run build` antes de fazer push

---

## FASE 0 + FASE 9 (juntas — são a mesma coisa)
> Arquivo de referência: SPEC-fase7.md

```
ENVIAR PARA O AGENTE:

"Leia o SPEC-fase7.md. Implemente na ordem exata dos blocos:

BLOCO 0 — Visuais rápidos (A, B, C, D, E):
- Remover borda laranja no topo (globals.css)
- violet-* → var(--color-accent) em pipelines e templates
- Sidebar PT-BR (Overview→Visão Geral, Jobs→Projetos, Reports→Relatórios)
- Title tags nas 5 páginas sem metadata
- /mês nos preços do Marketplace
- Color picker unificado no Workspace

BLOCO 1 — UX médio:
- react-markdown na Galeria (output_content)
- Scroll horizontal + gradient fade no CRM kanban
- Empty states com CTA em Overview, CRM e Reports

BLOCO 2 — Lógica:
- Cliente abre em view mode (não edit)
- Financial sync unificado
- DNA edit mode (reabrir wizard)

BLOCO 3 — ATLAS no ORACLE (tool_use + AtlasMessage):
- Criar app/api/agents/atlas/approve/route.ts
- Adicionar tool_use no oracle/chat/route.ts
- Criar components/oracle/AtlasMessage.tsx
- Parser do marcador %%ATLAS_IMAGE%% nas mensagens

Após cada bloco: git commit. Após tudo: npm run build."
```

---

## FASE ATLAS (modo manual primeiro, depois automático)
> Arquivo de referência: SPEC-ATLAS.md

```
ENVIAR PARA O AGENTE:

"Leia o SPEC-ATLAS.md. Implemente na ordem:

BLOCO 0 — SQL + Storage:
- Rodar migration_atlas.sql no Supabase SQL Editor
- Criar bucket creative-assets (private, 10MB)

BLOCO 1 — IntelligenceRouter:
- Adicionar ATLAS_IMAGE: 'google/gemini-2.5-flash-image' em models.ts
- Adicionar método generateImage() em IntelligenceRouter.ts

BLOCO 2 — Rota /api/agents/atlas/generate:
- REESCREVER completamente (não editar — substituir)
- Criar /api/agents/atlas/approve/route.ts (se não existir do passo anterior)

BLOCO 3 — Creative Studio UI (modo manual):
- Adaptar /clients/[id]/creative/page.tsx para chamar rota real
- Preview da imagem com skeleton animado + botões Aprovar/Regenerar/Descartar

BLOCO 4 — Galeria:
- GalleryGrid.tsx: adicionar query de creative_assets junto com job_outputs
- Card de imagem com download

Testar: gerar uma imagem manualmente antes de avançar para BLOCO 5.

BLOCO 5+6 — Modo automático (só após testar manual):
- tool_use no ORACLE (já feito na Fase 9 — verificar se está completo)
- AtlasMessage inline no chat

Após tudo: npm run build + git push."
```

---

## FASE PROPOSTAS
> Arquivo de referência: SPEC-propostas.md

```
ENVIAR PARA O AGENTE:

"Leia o SPEC-propostas.md. Implemente na ordem:

BLOCO 0 — SQL + Storage:
- Rodar SQL da seção 0.1 no Supabase
- Criar bucket proposals (private, 20MB, application/pdf)

BLOCO 1 — POST /api/proposals/generate:
- Criar arquivo completo conforme SPEC (não modificar rotas existentes)

BLOCO 2 — POST /api/proposals/[id]/pdf:
- Verificar se @react-pdf/renderer está instalado: npm install @react-pdf/renderer
- Criar rota conforme SPEC

BLOCO 3 — Share + rota pública:
- /api/proposals/[id]/share/route.ts
- app/p/[token]/page.tsx (rota pública sem auth)

BLOCO 4 — ProposalPublicView component

BLOCO 5 — PDF components:
- CommercialPDF.tsx
- ResultsPDF.tsx

BLOCO 6 — Modal de geração no CRM:
- GenerateProposalModal.tsx
- Adicionar botão 'Gerar Proposta' no KanbanCard do CRM

BLOCO 7 — Botão Relatório na página do cliente:
- GenerateResultsModal.tsx
- Botão na aba Overview do cliente

BLOCO 8 — PATCH status + sync CRM:
- /api/proposals/[id]/route.ts (GET + PATCH)

Após tudo: npm run build + git push."
```

---

## FASE 10 — INTELLIGENCE LAYER (Apify)
> Arquivo de referência: SPEC-fase8.md
> Pré-requisito: APIFY_API_KEY adicionada no Vercel

```
ENVIAR PARA O AGENTE:

"Leia o SPEC-fase8.md. Implemente na ordem:

BLOCO 0 — Migration:
- Rodar migration_intelligence.sql no Supabase

BLOCO 1 — lib/intelligence/apify.ts:
- Cliente Apify centralizado

BLOCO 2 — Rotas de inteligência:
- /api/intelligence/maps/route.ts
- /api/intelligence/ads/route.ts
- /api/intelligence/crawl/route.ts

BLOCO 3 — lib/intelligence/oracle-inject.ts:
- Helper de injeção no system prompt
- MODIFICAR oracle/chat/route.ts para injetar contexto competitivo

BLOCO 4 — UI IntelligencePanel:
- components/intelligence/IntelligencePanel.tsx
- components/intelligence/SnapshotCard.tsx
- Adicionar aba 'Inteligência' na página do cliente

Após tudo: npm run build + git push."
```

---

## FASE 11 — CRM PRO + VOICE
> Arquivo de referência: SPEC-fase9.md
> Pré-requisitos: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET no Vercel

```
ENVIAR PARA O AGENTE:

"Leia o SPEC-fase9.md. Implemente na ordem:

BLOCO 0 — Migration:
- migration_crm_voice.sql no Supabase (crm_scores + workspace_integrations)

BLOCO A — Lead Score (HARBOR):
- /api/crm/score/route.ts
- components/crm/LeadScoreBadge.tsx
- Adicionar badge no KanbanCard do CRM

BLOCO B — Google Calendar OAuth:
- /api/crm/calendar/sync/route.ts
- components/settings/CalendarConnectButton.tsx
- Adicionar em Settings/Workspace

BLOCO C — Follow-up automático:
- /api/crm/followup/generate/route.ts
- components/crm/FollowupModal.tsx
- Botão 'Gerar Follow-up' no card do lead

BLOCO D — Voice Input (Whisper):
- /api/voice/transcribe/route.ts
- components/oracle/VoiceInput.tsx
- Adicionar botão microfone no chat ORACLE

Após tudo: npm run build + git push."
```

---

## FASE 12 — AGENT AUTONOMY + INTEGRAÇÕES
> Arquivo de referência: SPEC-fase10.md
> Pré-requisitos: NOTION_CLIENT_ID, NOTION_CLIENT_SECRET, RESEND_API_KEY no Vercel

```
ENVIAR PARA O AGENTE:

"Leia o SPEC-fase10.md. Implemente na ordem:

BLOCO 0 — Migration:
- migration_autonomy.sql (agent_schedules + agent_runs + report_history)

BLOCO A — Agent Autonomy:
- /api/autonomy/schedule/route.ts
- /api/autonomy/trigger/route.ts
- /api/autonomy/runs/route.ts
- /api/cron/autonomy/route.ts + adicionar em vercel.json
- components/autopilot/AutopilotDashboard.tsx
- Nova aba 'Automações' na página do cliente

BLOCO B — Notion Sync:
- /api/integrations/notion/sync/route.ts
- /api/integrations/notion/callback/route.ts
- Botão Notion em Settings/Integrações

BLOCO C — Reports Cron:
- /api/cron/reports/route.ts
- Adicionar schedule em vercel.json
- Toggle 'Relatório automático semanal' em Settings

BLOCO D — VULCAN v2 (Queue UI):
- Atualizar /api/agents/vulcan/generate se existir
- components/autopilot/VulcanQueue.tsx

Após tudo: npm run build + git push."
```

---

## CHAT FLUTUANTE (pode ser implementado a qualquer momento após Fase 9)
> Sem SPEC separado — implementar direto

```
ENVIAR PARA O AGENTE:

"Crie um chat flutuante com ORACLE disponível em todas as páginas do dashboard.

Arquivos a criar:
1. components/oracle/FloatingChat.tsx
   - Botão fixo: position fixed, bottom-6 right-6, z-50
   - Ícone: MessageCircle (lucide)
   - Ao clicar: abre Sheet lateral de 420px à direita
   - Mini-chat com input + histórico de mensagens
   - Chama POST /api/agents/oracle/chat (rota já existe)
   - Detecta clientId da URL atual via usePathname()
   - Injeta clientId no body da requisição

2. Adicionar <FloatingChat /> no final do layout do dashboard:
   app/(dashboard)/layout.tsx — adicionar antes do </body>

Regras:
- NÃO criar nova rota de API — usar /api/agents/oracle/chat existente
- NÃO usar position fixed em elementos internos do Sheet
- Histórico só dura a sessão (useState, sem persistência)

git commit após implementar."
```

---

## VARIÁVEIS DE AMBIENTE — CHECKLIST

Verificar no Vercel antes de cada fase:

| Fase | Variável | Obrigatória |
|------|----------|-------------|
| ATLAS | OPENROUTER_API_KEY | Já deve existir |
| Propostas | nenhuma nova | — |
| Fase 10 | APIFY_API_KEY | Sim |
| Fase 11 | GOOGLE_CLIENT_ID | Sim |
| Fase 11 | GOOGLE_CLIENT_SECRET | Sim |
| Fase 12 | NOTION_CLIENT_ID | Sim |
| Fase 12 | NOTION_CLIENT_SECRET | Sim |
| Fase 12 | RESEND_API_KEY | Verificar se já existe |

---

## CRITÉRIO DE PRONTO (antes de considerar o sistema completo)

- [ ] Fase 0+9: zero bugs visuais, sidebar em PT, ATLAS inline no chat
- [ ] ATLAS: imagem gerada e salva na galeria em < 20s
- [ ] Propostas: proposta gerada, PDF baixado, link compartilhável funcionando
- [ ] Fase 10: ORACLE responde com dados de concorrentes injetados
- [ ] Fase 11: lead pontuado + voz transcrita no chat
- [ ] Fase 12: schedule criado, agente roda automaticamente no horário
- [ ] Chat flutuante: ORACLE acessível de qualquer página

