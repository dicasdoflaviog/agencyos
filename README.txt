# EUGÊNCIA DICASDOFLAVIOG
## Guia rápido de operação

---

## ESTRUTURA DE PASTAS

```
dicasdoflaviog/
├── _brand/
│   └── brand-profile.txt          ← identidade da marca, TODOS os agentes lêem isso
├── agentes/
│   ├── head/
│   │   └── system-prompt.txt      ← Orquestrador + Revisor Qualidade
│   ├── estrategista/
│   │   └── system-prompt.txt      ← cola no Cowork como instrução global
│   ├── copywriter/
│   │   └── system-prompt.txt      ← idem
│   ├── designer/
│   │   └── system-prompt.txt      ← idem
│   ├── ui-designer/
│   │   └── system-prompt.txt      ← React + Tailwind components
│   ├── designer-social/
│   │   └── system-prompt.txt      ← Templates Canva A/B/C/D
│   ├── gestor-trafego/
│   │   └── system-prompt.txt      ← ROI & Performance
│   ├── publicador/
│   │   └── system-prompt.txt      ← Multicanal + SEO Social
│   └── engajador/
│       └── system-prompt.txt      ← Triagem + Qualificação
├── scripts/
│   ├── TEMPLATES_CANVA_ESPECIFICACOES.html      ← 4 templates A/B/C/D (preview + specs)
│   ├── GUIA_CRIACAO_TEMPLATES_CANVA.txt         ← Passo a passo criar no Canva
│   ├── CHECKLIST_CRIAR_CANVA.txt                ← Checklist com measurements exatos
│   ├── TEMPLATE_APRESENTACAO_CLIENTE.txt        ← Google Slides template (10 slides)
│   ├── INTEGRACAO_COMPLETA_DRIVE_FLUXO.txt      ← Drive + ManyChat + Make setup (CRÍTICO)
│   ├── VISAO_GERAL_SISTEMA_FUNCIONA.txt         ← Fluxo visual (como tudo conecta)
│   ├── ARQUITETURA_COMPLETA.txt                 ← Sistema completo documentado
│   ├── HIERARQUIA_AGENTES.txt                   ← Fluxo de autoridade
│   ├── GUIA_OPERACIONAL_BRIEFING.txt            ← Como coletar dados de clientes
│   ├── MANUAL_INTEGRACAO_SQUAD_V3.0.txt         ← 5-fase campaign flow
│   ├── PROTOCOLO_SINCRONIZACAO_DOCUMENTOS.txt   ← Quando atualizar o quê
│   └── CANVA_LINK.txt                           ← Link compartilhado templates
├── briefs/                        ← o Estrategista salva aqui os briefs gerados
├── outputs/
│   ├── copy/                      ← o Copywriter salva aqui os textos
│   ├── carrosseis/                ← o Designer salva aqui os PNGs + Canva links
│   ├── stories/                   ← o Designer salva aqui os stories PNGs
│   ├── landing-pages/             ← o UI Designer salva aqui os componentes React
│   └── alttext/                   ← o Designer salva aqui os alt texts
└── arquivo/                       ← posts publicados (mova aqui depois de publicar)
```

---

## COMO RODAR UM JOB COMPLETO (8 Agentes)

### FASE 1 — Briefing (você → HEAD → Estrategista)
1. Você define o objetivo: "Quero carrossel sobre [tema]"
2. HEAD revisa viabilidade e aprova ou retorna feedback
3. Estrategista cria brief estratégico. Salve em /briefs/brief-[tema].txt
4. HEAD revisa estrutura, aprova para próximo passo

### FASE 2 — Copy & Design (Copywriter + UI Designer)
1. Copywriter pega brief → escreve textos + captions
   - Salva em /outputs/copy/copy-[tema].txt
   - HEAD revisa (tom, linguagem, conversão)
2. Designer Social pega copy → usa TEMPLATES CANVA A/B/C/D
   - Abre Canva → seleciona template apropriado
   - Customiza imagem + texto
   - Exporta PNG, salva em /outputs/carrosseis/[tema]-slide-1.png, etc.
   - HEAD revisa (cores, tipografia, safe areas)

### FASE 3 — Publicação (Publicador)
1. Publicador pega PNGs + copy → prepara publicação
   - Caption final com hashtags estratégicas
   - Alt text descritivo para acessibilidade
   - Agenda horário (Meta Business Suite)
   - Salva estrutura em /outputs/carrosseis/[tema]-pacote-final/
2. HEAD revisa caption, ortografia, CTAs
3. Publicador sobe no Instagram

### FASE 4 — Engajamento (Engajador, paralelo)
1. Engajador responde comentários + qualifica leads (ManyChat/Make)
2. HEAD monitora tom de resposta
3. Feedback contínuo ao Estrategista para próximas campanhas

### FASE 5 — Mentoria (você)
Pegue os PNGs em /outputs/carrosseis/ e /outputs/stories/
Depois de publicar, mova tudo para /arquivo/

---

## DICAS DE USO NO COWORK

- Conceda acesso SOMENTE à pasta /dicasdoflaviog/ quando o Cowork pedir permissão.
- Mantenha o app Claude Desktop aberto enquanto o job roda.
- Se o Cowork travar no meio, reabra o projeto e diga: "Continue de onde parou."
- Use /schedule no Cowork para criar jobs recorrentes (ex: toda segunda, gerar 3 briefs da semana).

---

## PRIMEIRO JOB RECOMENDADO

Tema: "O erro mais caro que empreendedores cometem ao contratar marketing"
Pilar: ERROS DO MARKETING
Por quê: Conecta diretamente ao Manual Antiburrice. É o conteúdo de maior conversão para o produto âncora.

---

## TEMPLATES CANVA (NOVO!)

4 Templates prontos para usar:
├─ Template A (Gancho): Imagem full-bleed + text minimal → abertura carrossel
├─ Template B (Conteúdo): 50% imagem + 50% texto → humanização
├─ Template C (Educação): Fundo sólido + lista estruturada → listas numeradas
└─ Template D (CTA): Fundo + headline + botão destaque → fechamento/conversão

Cada template tem 4 variações:
├─ Light (fundo claro)
├─ Dark (fundo escuro)
├─ Com Logo
└─ Sem Logo

TOTAL: 16 frames prontos pra customizar

Link Canva: Veja CANVA_LINK.txt para URL compartilhada com squad

Como usar:
1. Abra link Canva
2. Selecione template apropriado (A/B/C/D)
3. Clique na imagem → "Replace" → upload sua foto
4. Edite texto (headline/body)
5. Download PNG
6. Salve em /outputs/carrosseis/

Passo a passo completo: Veja scripts/GUIA_CRIACAO_TEMPLATES_CANVA.txt

---

## PRODUTO ÂNCORA — STATUS

Manual Antiburrice do Marketing: QUASE PRONTO
CTA padrão de todos os posts: "Manual Antiburrice do Marketing — link na bio"
Quando lançar: atualizar brand-profile.txt com o link real e o preço final.

---

Última atualização: março 2026 | v3.0 (Com Templates Canva)
