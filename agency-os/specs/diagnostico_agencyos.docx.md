**DIAGNÓSTICO DE PRODUTO**

**Agency OS**

*agencyos-cyan.vercel.app*

| 3 Bugs Críticos | 6 Problemas UX | 7 Inconsistências | 5 Pontos Positivos |
| :---: | :---: | :---: | :---: |

**Escopo da análise:** UX / Usabilidade  •  Rotas e Navegação  •  Visual e Layout  
**Data:** 05 de abril de 2026

# **Resumo Executivo**

O Agency OS é uma plataforma SaaS de gestão de agências com foco em produção de conteúdo via agentes de IA. A estrutura geral da aplicação está bem organizada — navegação lateral clara, design system dark bem implementado e fluxos principais funcionando. No entanto, a análise identificou problemas que afetam diretamente a experiência do usuário e a confiança no produto.

Os problemas mais críticos envolvem: markdown sendo exibido como texto bruto na Galeria, inconsistência de dados financeiros entre seções, e padrões de interação que fogem do esperado (como o cliente abrindo diretamente em modo de edição). Há também inconsistências visuais notáveis no sistema de cores dos botões primários.

# **1\. Bugs e Problemas Críticos**

Problemas que geram confusão direta ou dados incorretos para o usuário.

**🔴 BUG 1 — Markdown não renderizado na Galeria**

Página: /gallery

Na seção Galeria, o card com status "Aprovado" exibe literalmente o texto \#\# \*\*CARROSSEL 1: "COMO FAZER FOTOS PROFISSIONAIS COM IA"\*\* — os símbolos de markdown (\#\#, \*\*) aparecem como texto puro em vez de serem renderizados como título e negrito. Isso prejudica a leitura do output e passa uma impressão de sistema inacabado.

* Impacto: alto — afeta diretamente a apresentação dos entregáveis para o usuário

* Causa provável: o componente de card da galeria não passa o conteúdo por um parser de markdown

* Correção sugerida: aplicar react-markdown ou similar ao renderizar o conteúdo dos outputs

**🔴 BUG 2 — Inconsistência de dados financeiros entre páginas**

Páginas: /financial e /financial/advanced (MRR/ARR)

A página Financeiro exibe 1 cliente com status "Ativo" e "Em dia", enquanto a página MRR/ARR (Financeiro Avançado) mostra CONTRATOS ATIVOS: 0 e "Nenhum contrato cadastrado". Os dados estão dessincronizados entre as duas views, o que gera desconfiança nos números da plataforma.

* Impacto: alto — compromete a confiabilidade dos dados financeiros

* Causa provável: as duas páginas consultam fontes de dados diferentes ou a lógica de contagem de contratos é inconsistente

* Correção sugerida: unificar a query de contratos ativos em um único endpoint/hook reutilizável

**🔴 BUG 3 — Borda laranja/vermelha em topo de todas as páginas**

Página: todas

Uma borda colorida (gradiente do amarelo-laranja para escuro) aparece no topo de absolutamente todas as telas. Pode ser um elemento proposital de branding, mas parece mais um artefato de ambiente (como um indicador de staging/desenvolvimento que não deveria estar em produção). Não há contexto visual que justifique esse elemento.

* Impacto: médio — ruído visual sem função aparente

* Correção sugerida: verificar se é intencional; se for branding, documentar e refinar; se for debug, remover

# **2\. Problemas de UX e Usabilidade**

**🟠 UX 1 — Cliente abre direto no modo de edição**

Página: /clients/\[id\]

Ao clicar em um card de cliente na listagem, a página de detalhe abre com o formulário "EDITAR DADOS" já visível e preenchido. O padrão esperado pelo usuário é: visualizar as informações primeiro, e só então optar por editar. Abrir diretamente em modo edição cria risco de alterações acidentais e vai contra o comportamento convencional de CRUD.

* Impacto: médio-alto — padrão de interação quebrado

* Correção sugerida: separar view mode de edit mode; mostrar os dados em leitura por padrão com um botão "Editar" explícito

**🟠 UX 2 — Excesso de abas na página do cliente (11 tabs)**

Página: /clients/\[id\]

A página de detalhe do cliente tem 11 abas horizontais: Overview, DNA, Contratos, CMS, Agenda, Métricas, Memória IA, ORACLE, Criativos, VULCAN e VOX. Em telas de resolução menor, essas abas certamente sofrerão overflow ou ficará difícil de clicar. Além disso, a quantidade de conceitos expostos de uma vez é alta demais para onboarding de novos usuários.

* Impacto: médio — sobrecarga cognitiva e provável bug de layout em telas menores

* Correção sugerida: agrupar tabs relacionadas (ex: Financeiro/Contratos juntos, IA tools juntos) ou usar um menu lateral dentro da página

**🟠 UX 3 — Página de Job com densidade de informação excessiva**

Página: /jobs/\[id\]

O detalhe de um Job exibe simultaneamente: lista de 21 agentes na esquerda, área de chat central com instrução vaga ("Selecione um agente para começar") e o painel direito com briefing \+ formulário de edição. Três colunas de alta densidade de informação, sem hierarquia clara de onde começar. A instrução central não é clara o suficiente — o usuário não sabe instintivamente que deve clicar em um agente à esquerda.

* Impacto: médio-alto — fricção no uso da funcionalidade principal do produto

* Correção sugerida: adicionar um onboarding/tooltip de primeiro uso, melhorar o estado vazio central com uma CTA visual mais clara (ex: seta ou destaque na lista de agentes)

**🟠 UX 4 — Nomes de agentes truncados sem tooltip**

Página: /jobs/\[id\]

Na sidebar de agentes do Job, o nome "Memória Institucio..." está cortado sem nenhuma forma de ver o nome completo. O usuário não tem como saber qual agente é esse sem clicar. Não há tooltip, não há expand, não há informação acessível.

* Impacto: baixo-médio — dificulta identificação rápida de agentes

* Correção sugerida: adicionar tooltip on hover com o nome completo, ou aumentar a largura da sidebar

**🟠 UX 5 — Estados vazios sem orientação de próxima ação**

Páginas: Overview, Relatórios, CRM

O Overview mostra 4 KPIs mas metade inferior da tela é completamente negra/vazia. Não há cards de "Próximos passos", atalhos ou chamadas à ação para guiar o usuário recém-chegado. O mesmo vale para Relatórios ("Nenhum relatório gerado") — a instrução existe mas não há um botão/CTA para gerar o primeiro relatório diretamente.

* Impacto: médio — prejudica onboarding e adoção de novas funcionalidades

* Correção sugerida: adicionar empty states ricos com sugestões de ação (ex: "Adicione seu primeiro cliente" com botão inline)

**🟠 UX 6 — CRM com scroll horizontal oculto**

Página: /crm

O kanban do CRM tem 5 colunas (PROSPECTO, CONTATADO, PROPOSTA, NEGOCIAÇÃO, GANHO) que ultrapassam a largura da tela. O scroll horizontal existe mas não é visualmente óbvio — a coluna "GANHO" fica parcialmente cortada. O usuário pode nem perceber que há mais conteúdo à direita.

* Impacto: médio — funcionalidade parcialmente oculta

* Correção sugerida: adicionar um indicador visual de scroll (gradiente fade à direita) ou ajustar o layout do kanban para caber na viewport

# **3\. Inconsistências Visuais e de Design**

**🟡 VISUAL 1 — Botões primários com duas cores diferentes**

Páginas: Clientes, Jobs vs. Pipelines, Templates

Os botões de ação principal (CTA) não têm cor consistente. Em Clientes e Jobs, o botão primário é amarelo/laranja (\#F59E0B). Nas páginas de Pipelines e Templates, os mesmos tipos de botão ("Novo pipeline", "Novo template", "Usar template") são roxos. Isso quebra o sistema de design e dificulta que o usuário identifique CTAs de forma consistente.

* Impacto: médio — quebra visual do design system

* Correção sugerida: definir e aplicar uma única cor primária para todos os CTAs primários (preferentemente o amarelo/laranja que já é a cor de marca)

**🟡 VISUAL 2 — Nomenclatura híbrida (inglês \+ português) sem padrão**

Menu lateral — todas as páginas

O menu mistura termos em inglês e português sem critério claro: Overview, Jobs, Pipelines, Templates, Analytics, Marketplace convivem com Clientes, Galeria, Financeiro, Relatórios, Equipe. Não há um padrão definido — ou está tudo em inglês (como produto internacional) ou tudo em português (como produto nacional).

* Impacto: médio — inconsistência de voz da interface

* Correção sugerida: definir o idioma padrão da interface (PT-BR para produto nacional) e traduzir todos os itens; ou manter em inglês e traduzir os que estão em português

**🟡 VISUAL 3 — Title tags inconsistentes nas abas do browser**

Páginas: CRM, Marketplace, Relatórios, Workspace, Faturamento

Algumas páginas exibem o nome correto na aba do navegador (ex: "Overview", "Clientes", "Jobs"), mas outras mostram apenas "Agency OS" sem identificar a seção (CRM, Marketplace, Relatórios, Workspace e Faturamento). Isso dificulta navegação com múltiplas abas abertas.

* Impacto: baixo — mas afeta usabilidade para usuários power

* Correção sugerida: adicionar o nome da página no \<title\> de cada rota (ex: "CRM | Agency OS")

**🟡 VISUAL 4 — Preço inconsistente no Marketplace**

Página: /marketplace

A maioria dos agentes exibe o preço no formato "R$ 97,00/mês". Porém o agente "Brand Voice AI" exibe apenas "R$ 49,00" sem o sufixo "/mês". Pequena inconsistência mas que pode gerar dúvida se o preço é único ou recorrente.

* Impacto: baixo — mas afeta confiança no preço

* Correção sugerida: padronizar o formato de preço em todos os cards

**🟡 VISUAL 5 — MRR/ARR como subitem de Financeiro é confuso**

Menu lateral

"MRR/ARR" aparece indentado abaixo de "Financeiro" no menu lateral, sugerindo que é uma subseção. Porém, ao clicar, leva a uma página completamente diferente (/financial/advanced) com um título distinto ("Financeiro Avançado"). Não fica claro para o usuário se são duas seções do mesmo módulo ou seções distintas.

* Impacto: baixo-médio — confusão de hierarquia de informação

* Correção sugerida: usar um accordion/submenu explícito ou separar como item de nível igual com ícone distinto

**🟡 VISUAL 6 — Dois swatches de cor sobrepostos no Workspace**

Página: /settings/workspace

No campo "COR PRINCIPAL" das configurações do Workspace, aparecem dois retângulos de cor lado a lado (um mais escuro, um mais brilhante) sem qualquer rótulo explicando o que cada um representa. A UX esperada seria um seletor de cor único com preview.

* Impacto: baixo — interface confusa

* Correção sugerida: mostrar apenas um swatch representando a cor selecionada, com botão/clique para abrir o color picker

**🟡 VISUAL 7 — Campo Domínio no Workspace parece placeholder**

Página: /settings/workspace

O campo DOMÍNIO exibe "app.minhaagencia.com.br" que parece um valor de exemplo/placeholder e não a configuração real do usuário. Se for dado real, a label deve deixar isso mais claro. Se for placeholder, deve aparecer apenas como texto de hint cinza (não como valor preenchido).

* Impacto: baixo — pode confundir o usuário sobre o estado da configuração

# **4\. Pontos Positivos**

Para uma visão equilibrada, os seguintes aspectos foram bem executados:

| ✅ O que está funcionando bem |
| :---- |
| Design system dark theme coeso e bem implementado na maior parte das páginas |
| Navegação lateral clara, categorizada e com separação visual entre seções primárias e configurações |
| Analytics bem organizado — KPIs, gráficos de barras e listas de forma limpa e hierarquizada |
| Marketplace visualmente agradável com grid consistente, badges de categoria e preços claros |
| Kanban de Jobs funcional e limpo, com cores de status bem diferenciadas (alta/urgente/overdue) |
| Empty states com mensagens claras ("Nenhum contrato cadastrado", "Nenhum membro na equipe ainda") |
| Página de DNA da marca bem estruturada como wizard com etapas (Identidade Visual, Tipografia, Brand Voice, Referências) |
| Filtros e badges na Galeria (Todos, Visuais, Copy, Carrossel, etc.) facilitam a navegação do conteúdo |

# **5\. Priorização de Correções**

Recomendação de ordem de implementação com base em impacto vs. esforço:

| \# | Problema | Impacto | Esforço |
| :---- | :---- | :---- | :---- |
| 1 | Markdown não renderizado na Galeria | 🔴 Alto | 🟢 Baixo |
| 2 | Botões primários com cores diferentes | 🟠 Médio | 🟢 Baixo |
| 3 | Cliente abre em modo de edição | 🟠 Médio | 🟢 Baixo |
| 4 | Inconsistência dados financeiros | 🔴 Alto | 🟡 Médio |
| 5 | Scroll oculto no CRM | 🟠 Médio | 🟡 Médio |
| 6 | Empty states sem CTA | 🟡 Médio | 🟡 Médio |
| 7 | Title tags do browser | 🟡 Baixo | 🟢 Baixo |
| 8 | Nomenclatura PT/EN mista | 🟡 Médio | 🟠 Alto |
| 9 | 11 tabs no detalhe do cliente | 🟡 Médio | 🟠 Alto |
| 10 | Densidade do Job detail | 🟠 Médio | 🟠 Alto |

# **6\. Observações Técnicas**

Com base na inspeção visual e nas rotas identificadas:

* Stack: Next.js (confirmado pelo padrão de rotas em /clients/\[uuid\], deploy na Vercel)

* Roteamento: uso correto de UUIDs como identificadores de entidades — tecnicamente sólido

* Slug gerado automaticamente com sufixo aleatório (ex: f5publicidadeonline-mnl48rvb) — considere permitir edição manual do slug

* Deploy: Vercel em domínio de preview (agencyos-cyan.vercel.app) — sugerido configurar domínio próprio para transmitir mais profissionalismo

* Markdown: presença de conteúdo com sintaxe markdown que não está sendo renderizado — indica que os agentes de IA retornam texto formatado mas o front não processa

* Sem erros de navegação detectados — todas as rotas testadas responderam corretamente

* Ausência de loading states visíveis — considere skeleton loaders para melhorar a percepção de performance

*— Fim do relatório —*