-- =============================================================================
-- MIGRATION FASE 9 — Marketplace Agent Detail Fields
-- Adiciona specialties, when_to_use, greeting_message aos agentes
-- =============================================================================

ALTER TABLE marketplace_agents
  ADD COLUMN IF NOT EXISTS specialties     JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS when_to_use     JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS greeting_message TEXT;

-- ─── Seed: ORACLE ─────────────────────────────────────────────────────────────
UPDATE marketplace_agents SET
  specialties     = '["Orquestração", "Estratégia", "Automação", "Briefing", "Multi-agente"]'::jsonb,
  when_to_use     = '["Criar uma estratégia completa do zero para um cliente novo", "Acionar múltiplos agentes em sequência automaticamente", "Obter visão integrada de produção e performance em um único brief", "Delegar e centralizar o planejamento de uma campanha complexa"]'::jsonb,
  greeting_message = 'Olá! Sou o ORACLE, seu Head Agent. Estou aqui para orquestrar toda a estratégia da sua agência. Me diga: qual cliente e objetivo você quer atacar hoje?'
WHERE slug = 'oracle-head';

-- ─── Seed: VERA Copy ──────────────────────────────────────────────────────────
UPDATE marketplace_agents SET
  specialties     = '["Copywriting", "Redes Sociais", "Anúncios", "Landing Pages", "Storytelling"]'::jsonb,
  when_to_use     = '["Criar textos persuasivos para campanhas de tráfego pago", "Gerar captions envolventes para Instagram, TikTok e LinkedIn", "Desenvolver o copy de uma landing page ou página de vendas", "Adaptar a voz da marca para diferentes formatos de conteúdo"]'::jsonb,
  greeting_message = 'Oi! Eu sou a VERA, especialista em copy que converte. Me passe o briefing do cliente, o produto e o público-alvo — e eu crio os textos que vendem.'
WHERE slug = 'vera-copy';

-- ─── Seed: ATLAS Design ───────────────────────────────────────────────────────
UPDATE marketplace_agents SET
  specialties     = '["Design Estratégico", "Brand Identity", "Briefing Visual", "UI/UX", "Roteiros Criativos"]'::jsonb,
  when_to_use     = '["Gerar briefs visuais detalhados antes de uma produção criativa", "Documentar o DNA visual de uma marca para referência do time", "Criar roteiros de design para redes sociais e anúncios", "Onboarding de novo cliente — mapear identidade visual completa"]'::jsonb,
  greeting_message = 'Olá! Sou o ATLAS, seu parceiro de design estratégico. Me fale sobre a marca ou projeto — vou criar um brief visual completo com paleta, tipografia e diretrizes de estilo.'
WHERE slug = 'atlas-design';

-- ─── Seed: Brand Voice AI ─────────────────────────────────────────────────────
UPDATE marketplace_agents SET
  specialties     = '["Tom de Voz", "Brand Voice", "Análise de Conteúdo", "Diretrizes de Marca", "NLP"]'::jsonb,
  when_to_use     = '["Extrair e codificar o tom de voz único de uma marca", "Padronizar a comunicação da marca em todos os canais digitais", "Criar guia de redação a partir de exemplos reais do cliente", "Treinar outros agentes com a identidade de comunicação do cliente"]'::jsonb,
  greeting_message = 'Olá! Sou o Brand Voice AI. Para começar, me envie exemplos de conteúdo que a marca já produziu — textos, posts, emails. Vou analisar o padrão e criar um guia de voz personalizado.'
WHERE slug = 'brand-voice-ai';

-- ─── Seed: Growth Hacker ──────────────────────────────────────────────────────
UPDATE marketplace_agents SET
  specialties     = '["Growth Hacking", "A/B Testing", "Analytics", "CRO", "Experimentação"]'::jsonb,
  when_to_use     = '["Analisar métricas e identificar gargalos de crescimento real", "Sugerir experimentos priorizados com maior potencial de ROI", "Montar roadmap de testes para aumentar conversão ou retenção", "Identificar quick wins baseados nos dados do cliente"]'::jsonb,
  greeting_message = 'E aí! Sou o Growth Hacker. Me dá as métricas do cliente — taxas de conversão, CAC, LTV, churn — e eu te entrego um plano de experimentos priorizado para crescer de verdade.'
WHERE slug = 'growth-hacker';

-- ─── Seed: Ops Manager ────────────────────────────────────────────────────────
UPDATE marketplace_agents SET
  specialties     = '["Automação", "Relatórios", "SLA Management", "Alertas", "KPIs Operacionais"]'::jsonb,
  when_to_use     = '["Automatizar a geração de relatórios semanais e mensais de operação", "Configurar alertas automáticos por violação de SLA", "Monitorar o status de entregas e jobs em andamento", "Ter visibilidade centralizada das operações sem trabalho manual"]'::jsonb,
  greeting_message = 'Olá! Sou o Ops Manager. Posso automatizar seus relatórios, configurar alertas de SLA e manter seu time informado sobre o que importa. Por onde você quer começar?'
WHERE slug = 'ops-manager';
