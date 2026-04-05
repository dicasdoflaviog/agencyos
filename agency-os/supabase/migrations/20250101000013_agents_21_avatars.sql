-- Migration 013: 21 Agents + avatar_url
-- Adds avatar_url column and seeds the complete 21-agent roster

ALTER TABLE marketplace_agents
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ─── 15 novos agentes ─────────────────────────────────────────────────────────
INSERT INTO marketplace_agents (slug, name, description, category, price_type, price_brl, rating, install_count) VALUES
  ('vox-audio',        'VOX',              'Transforma roteiros em narrações profissionais via ElevenLabs — voz natural para Reels, Stories e podcasts', 'production',    'free',         NULL,   4.8, 870),
  ('vulcan-video',     'VULCAN',           'Converte roteiros em vídeos curtos de 8–15s para Reels, TikTok e Stories com geração de imagens IA',          'production',    'subscription', 297.00, 4.7, 540),
  ('volt-traffic',     'VOLT',             'Gerencia tráfego pago (Meta Ads, Google Ads) — cria estrutura de campanhas, segmentações e criativos',         'growth',        'subscription', 197.00, 4.6, 420),
  ('seo-sage',         'SEO Sage',         'Audita SEO on-page, sugere clusters de palavras-chave e otimiza conteúdo para ranquear no Google',             'intelligence',  'subscription', 97.00,  4.5, 380),
  ('email-engineer',   'Email Engineer',   'Cria sequências de email marketing completas — nurture, onboarding, reativação e campanhas sazonais',           'production',    'subscription', 97.00,  4.6, 460),
  ('social-scout',     'Social Scout',     'Monitora menções, tendências e concorrentes nas redes sociais e gera relatório de oportunidades',              'intelligence',  'free',         NULL,   4.4, 290),
  ('content-planner',  'Content Planner',  'Monta calendário editorial mensal completo — temas, formatos, datas e copy para aprovação do cliente',          'production',    'free',         NULL,   4.7, 710),
  ('influencer-intel', 'Influencer Intel', 'Pesquisa e qualifica influenciadores ideais por nicho, engajamento e fit com a marca do cliente',               'intelligence',  'one_time',     49.00,  4.3, 210),
  ('proposal-pro',     'Proposal Pro',     'Gera propostas comerciais personalizadas em PDF — escopo, pricing, cronograma e diferenciais da agência',       'operations',    'one_time',     79.00,  4.5, 330),
  ('brief-builder',    'Brief Builder',    'Transforma reuniões e anotações soltas em briefings estruturados prontos para acionamento dos agentes',         'operations',    'free',         NULL,   4.6, 590),
  ('crm-captain',      'CRM Captain',      'Gerencia pipeline de clientes, acompanha follow-ups e alerta sobre oportunidades de upsell e renovação',        'operations',    'subscription', 97.00,  4.4, 270),
  ('brand-guardian',   'Brand Guardian',   'Valida se conteúdos gerados respeitam o guia da marca — tom, cores, fontes e mensagens proibidas',              'intelligence',  'free',         NULL,   4.5, 350),
  ('data-detective',   'Data Detective',   'Analisa planilhas e dashboards e transforma números em insights acionáveis com recomendações claras',           'intelligence',  'subscription', 147.00, 4.7, 480),
  ('report-ranger',    'Report Ranger',    'Gera relatórios mensais de performance automáticos com gráficos, análise e próximos passos para o cliente',     'operations',    'subscription', 97.00,  4.8, 620),
  ('market-maven',     'Market Maven',     'Pesquisa mercado, benchmarks, tendências de setor e comportamento do consumidor para embasar estratégias',      'intelligence',  'one_time',     39.00,  4.4, 185)
ON CONFLICT (slug) DO NOTHING;

-- ─── Seed specialties para os novos agentes ───────────────────────────────────
UPDATE marketplace_agents SET
  specialties      = '["Narração", "ElevenLabs", "Voz IA", "Podcasts", "Locução"]'::jsonb,
  when_to_use      = '["Criar narração profissional para Reels e Stories", "Produzir podcast ou audiobrief para o cliente", "Adicionar voz ao vídeo gerado pelo VULCAN", "Criar anúncios em áudio para rádio e stories"]'::jsonb,
  greeting_message = 'Olá! Sou a VOX, especialista em voz. Me envie o roteiro e escolha o estilo de narração — entrego o áudio pronto em segundos.'
WHERE slug = 'vox-audio';

UPDATE marketplace_agents SET
  specialties      = '["Vídeo IA", "Reels", "TikTok", "Stories", "Motion"]'::jsonb,
  when_to_use      = '["Produzir vídeos curtos para Reels e TikTok sem equipe de produção", "Criar anúncios em vídeo a partir de roteiro da VERA", "Gerar variações de criativos em vídeo para testes A/B", "Transformar imagens estáticas em vídeos animados"]'::jsonb,
  greeting_message = 'E aí! Sou o VULCAN. Me dê o roteiro e o estilo visual — eu gero o vídeo pronto para postar.'
WHERE slug = 'vulcan-video';

UPDATE marketplace_agents SET
  specialties      = '["Meta Ads", "Google Ads", "Tráfego Pago", "ROAS", "Segmentação"]'::jsonb,
  when_to_use      = '["Criar estrutura completa de campanha no Meta ou Google", "Otimizar campanhas existentes com base em dados de performance", "Gerar criativos e copies para anúncios pagos", "Planejar budget e segmentação para lançamentos"]'::jsonb,
  greeting_message = 'Fala! Sou o VOLT, especialista em tráfego pago. Me conte o objetivo da campanha, orçamento e público — eu monto a estratégia.'
WHERE slug = 'volt-traffic';

UPDATE marketplace_agents SET
  specialties      = '["SEO On-page", "Keywords", "Link Building", "Core Web Vitals", "Schema"]'::jsonb,
  when_to_use      = '["Auditar o SEO técnico e on-page de um site", "Pesquisar e mapear clusters de palavras-chave estratégicas", "Otimizar artigos e landing pages para ranquear no Google", "Criar estratégia de conteúdo SEO para os próximos 6 meses"]'::jsonb,
  greeting_message = 'Olá! Sou o SEO Sage. Me informe a URL do site ou o tema do conteúdo — vou auditar e criar um plano de otimização completo.'
WHERE slug = 'seo-sage';

UPDATE marketplace_agents SET
  specialties      = '["Email Marketing", "Automação", "Nurture", "Reativação", "Segmentação"]'::jsonb,
  when_to_use      = '["Criar sequência de boas-vindas para novos leads", "Montar fluxo de nurture para funil de vendas", "Escrever campanha sazonal ou de lançamento", "Reativar base de contatos inativos com sequência de reengajamento"]'::jsonb,
  greeting_message = 'Oi! Sou o Email Engineer. Me diga o objetivo da sequência, o público e o produto — eu escrevo todos os emails do fluxo.'
WHERE slug = 'email-engineer';

UPDATE marketplace_agents SET
  specialties      = '["Monitoramento", "Tendências", "Análise de Concorrentes", "Social Listening", "Relatórios"]'::jsonb,
  when_to_use      = '["Monitorar o que estão falando sobre a marca nas redes", "Identificar tendências do setor antes dos concorrentes", "Analisar a estratégia de conteúdo dos concorrentes", "Encontrar oportunidades de engajamento em tempo real"]'::jsonb,
  greeting_message = 'Olá! Sou o Social Scout. Me informe a marca e os principais concorrentes — vou monitorar e trazer insights em tempo real.'
WHERE slug = 'social-scout';

UPDATE marketplace_agents SET
  specialties      = '["Calendário Editorial", "Planejamento", "Temas", "Formatos", "Cronograma"]'::jsonb,
  when_to_use      = '["Montar o calendário de conteúdo do mês completo", "Planejar conteúdo para lançamento ou data comemorativa", "Criar pauta editorial alinhada aos objetivos do cliente", "Distribuir formatos (post, reel, stories, email) de forma estratégica"]'::jsonb,
  greeting_message = 'Olá! Sou o Content Planner. Me fale o mês, os objetivos do cliente e os canais — eu monto o calendário editorial completo.'
WHERE slug = 'content-planner';

UPDATE marketplace_agents SET
  specialties      = '["Influencer Marketing", "Pesquisa", "Qualificação", "Micro-influenciadores", "ROI"]'::jsonb,
  when_to_use      = '["Encontrar influenciadores ideais para uma campanha específica", "Qualificar perfis por engajamento real e fit com a marca", "Comparar opções de influenciadores por custo-benefício", "Planejar uma estratégia de marketing com influenciadores"]'::jsonb,
  greeting_message = 'Oi! Sou o Influencer Intel. Me descreva a marca, o produto e o público que quer atingir — eu pesquiso e ranqueio os melhores influenciadores.'
WHERE slug = 'influencer-intel';

UPDATE marketplace_agents SET
  specialties      = '["Propostas Comerciais", "Precificação", "Escopo", "PDF", "Vendas"]'::jsonb,
  when_to_use      = '["Criar proposta comercial profissional para um novo cliente", "Montar escopo detalhado de projeto com precificação", "Gerar variações de proposta para diferentes orçamentos", "Padronizar o processo de vendas da agência"]'::jsonb,
  greeting_message = 'Olá! Sou o Proposal Pro. Me informe o cliente, o serviço e o orçamento estimado — eu gero uma proposta comercial completa e profissional.'
WHERE slug = 'proposal-pro';

UPDATE marketplace_agents SET
  specialties      = '["Briefing", "Estruturação", "Reuniões", "Documentação", "Onboarding"]'::jsonb,
  when_to_use      = '["Transformar anotações de reunião em briefing estruturado", "Criar briefing para um novo job de produção de conteúdo", "Documentar o escopo de uma campanha para o time criativo", "Onboarding de novo cliente — capturar todas as informações essenciais"]'::jsonb,
  greeting_message = 'Olá! Sou o Brief Builder. Me passe as informações brutas da reunião ou do cliente — eu organizo tudo em um briefing claro e pronto para usar.'
WHERE slug = 'brief-builder';

UPDATE marketplace_agents SET
  specialties      = '["CRM", "Pipeline", "Follow-up", "Upsell", "Retenção"]'::jsonb,
  when_to_use      = '["Gerenciar pipeline de prospects e clientes ativos", "Programar follow-ups automáticos com alertas inteligentes", "Identificar oportunidades de upsell e expansão de conta", "Acompanhar health score dos clientes para reduzir churn"]'::jsonb,
  greeting_message = 'Oi! Sou o CRM Captain. Me diga a situação atual do pipeline e dos clientes — vou organizar follow-ups e apontar as melhores oportunidades.'
WHERE slug = 'crm-captain';

UPDATE marketplace_agents SET
  specialties      = '["Brand Compliance", "Revisão", "Guidelines", "Tom de Voz", "Consistência"]'::jsonb,
  when_to_use      = '["Validar se um conteúdo segue o guia da marca antes de publicar", "Revisar batch de posts ou anúncios por aderência ao brand voice", "Criar checklist de conformidade de marca para o time", "Garantir consistência visual e textual em uma campanha"]'::jsonb,
  greeting_message = 'Olá! Sou o Brand Guardian. Me envie o conteúdo e o guia da marca — vou validar cada ponto e apontar o que precisa ajustar.'
WHERE slug = 'brand-guardian';

UPDATE marketplace_agents SET
  specialties      = '["Analytics", "BI", "Planilhas", "Dashboards", "Insights"]'::jsonb,
  when_to_use      = '["Analisar resultados de campanha e extrair insights acionáveis", "Transformar dados brutos de planilha em relatório executivo", "Identificar padrões e anomalias em métricas de performance", "Criar análise comparativa mensal/trimestral para o cliente"]'::jsonb,
  greeting_message = 'Oi! Sou o Data Detective. Me envie os dados — planilha, screenshot ou números — e eu transformo em insights claros com recomendações.'
WHERE slug = 'data-detective';

UPDATE marketplace_agents SET
  specialties      = '["Relatórios", "Performance", "Automação", "PDF", "Visualização"]'::jsonb,
  when_to_use      = '["Gerar relatório mensal de performance para o cliente", "Automatizar o envio de relatórios semanais para o time", "Criar relatório de encerramento de campanha com resultados", "Consolidar dados de múltiplos canais em um único documento"]'::jsonb,
  greeting_message = 'Olá! Sou o Report Ranger. Me informe o período e os dados do cliente — eu gero um relatório completo, visual e pronto para apresentar.'
WHERE slug = 'report-ranger';

UPDATE marketplace_agents SET
  specialties      = '["Pesquisa de Mercado", "Benchmarks", "Tendências", "Concorrentes", "Consumer Insights"]'::jsonb,
  when_to_use      = '["Pesquisar o mercado antes de entrar em um novo nicho", "Fazer benchmark de concorrentes para embasar estratégia", "Identificar tendências emergentes do setor do cliente", "Criar relatório de oportunidades de mercado para apresentação"]'::jsonb,
  greeting_message = 'Olá! Sou o Market Maven. Me informe o setor e os objetivos do cliente — vou pesquisar mercado, concorrentes e tendências para embasar a estratégia.'
WHERE slug = 'market-maven';
