# 🎯 SDD - Spec-Driven Development

> Método estruturado para gerar código de qualidade com IA (Claude, GPT, Copilot)
> Evita os problemas comuns de "vibe coding" e maximiza a qualidade do output.

---

## 📋 O que é SDD?

**Spec-Driven Development** é um workflow em 3 etapas para trabalhar com IA em projetos de código:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  RESEARCH   │ ──▶ │    SPEC     │ ──▶ │    CODE     │
│  (Pesquisa) │     │ (Planejamento)    │ (Implementação)
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      ▼                   ▼                   ▼
   PRD.md              SPEC.md           Código Final
```

---

## ❌ Por que código gerado por IA "não presta"?

Quando você joga prompts aleatórios na IA ("vibe coding"), acontecem 5 problemas:

| Problema | Descrição |
|----------|-----------|
| **Over-engineering** | IA complica algo que poderia ser simples |
| **Reinventar a roda** | Cria do zero algo que já existe pronto |
| **Conhecimento desatualizado** | Não sabe sobre bibliotecas/APIs recentes |
| **Código repetido** | Cria componentes duplicados |
| **Tudo no mesmo lugar** | Junta responsabilidades diferentes no mesmo arquivo |

### O culpado: Context Window

A "janela de contexto" é tudo que a IA consegue "lembrar" durante a conversa.

Conforme você interage, ela vai enchendo com:
- Arquivos lidos
- Respostas anteriores
- Resultados de buscas
- Seus prompts

**Quanto mais cheia, pior o resultado.** Pesquisas mostram que a qualidade degrada significativamente após 40-50% de uso.

---

## ✅ A Solução: SDD em 3 Etapas

### ETAPA 1: RESEARCH (Pesquisa)

**Objetivo:** Reunir todas as informações necessárias ANTES de implementar.

**O que fazer:**
```
"Preciso implementar [FUNCIONALIDADE]. Faça uma pesquisa:

1. Identifique quais arquivos da base de código serão afetados
2. Encontre padrões de implementação similares já existentes
3. Busque documentações de tecnologias que vamos usar
4. Traga padrões de implementação externos (se necessário)

Gere um PRD.md com o resumo."
```

**Output:** Arquivo `PRD.md` contendo:
- Arquivos relevantes do projeto
- Trechos de documentações importantes
- Code snippets de referência
- Padrões encontrados

**Após gerar o PRD:** Limpe a conversa (`/clear` ou nova conversa)

---

### ETAPA 2: SPEC (Planejamento)

**Objetivo:** Criar um plano tático e detalhado de implementação.

**O que fazer:**
```
"Leia o PRD.md e gere uma SPEC.md com:

1. Lista EXATA de arquivos a criar
2. Lista EXATA de arquivos a modificar
3. O que fazer em CADA arquivo
4. Code snippets específicos quando necessário

Formato obrigatório:
- Path do arquivo
- Ação (criar/modificar)
- O que fazer
"
```

**Output:** Arquivo `SPEC.md` contendo:
- Tarefas numeradas
- Arquivos específicos
- Código de referência
- Ordem de implementação

**Após gerar a SPEC:** Limpe a conversa novamente

---

### ETAPA 3: CODE (Implementação)

**Objetivo:** Implementar seguindo a SPEC, com a janela de contexto limpa.

**O que fazer:**
```
"@SPEC.md

Implemente esta SPEC completamente.
Siga a ordem de implementação especificada.
Mostre cada alteração feita."
```

**Por que funciona:**
- Janela de contexto está LIMPA
- IA tem apenas o necessário (a SPEC)
- Máxima capacidade disponível para implementação

---

## 📊 Comparação: Com vs Sem SDD

| Aspecto | Sem SDD | Com SDD |
|---------|---------|---------|
| Context window | 80-100% cheia | 20-30% usada |
| Código duplicado | Frequente | Raro |
| Implementação | Várias tentativas | One-shot |
| Modularização | Tudo junto | Bem separado |
| Padrões | Inconsistentes | Seguem projeto |

---

## 🔄 Workflow Completo

```
┌──────────────────────────────────────────────────────────┐
│                      VOCÊ PEDE                           │
│              "Preciso implementar X"                     │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│                   ETAPA 1: RESEARCH                      │
│  • IA pesquisa arquivos existentes                       │
│  • IA busca padrões no código                            │
│  • IA consulta documentações                             │
│  • Output: PRD.md                                        │
└──────────────────────────────────────────────────────────┘
                          │
                    /clear (limpa contexto)
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│                    ETAPA 2: SPEC                         │
│  • IA lê o PRD.md                                        │
│  • IA planeja cada arquivo                               │
│  • IA define ordem de implementação                      │
│  • Output: SPEC.md                                       │
└──────────────────────────────────────────────────────────┘
                          │
                    /clear (limpa contexto)
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│                    ETAPA 3: CODE                         │
│  • IA lê apenas a SPEC.md                                │
│  • IA implementa tarefa por tarefa                       │
│  • Janela de contexto livre para código                  │
│  • Output: Código funcionando                            │
└──────────────────────────────────────────────────────────┘
```

---

## 📝 Templates de Prompts

### Prompt de Research
```
Preciso implementar [DESCREVA A FUNCIONALIDADE].

Faça uma pesquisa completa:

1. ARQUIVOS EXISTENTES
   - Quais arquivos do projeto serão afetados?
   - Existe algo similar já implementado?

2. PADRÕES DO PROJETO
   - Como funcionalidades similares foram feitas?
   - Quais componentes/hooks são reutilizados?

3. DEPENDÊNCIAS
   - Quais bibliotecas serão necessárias?
   - Já estão instaladas?

4. DOCUMENTAÇÃO
   - Busque docs relevantes das tecnologias usadas

Gere um PRD.md com tudo que encontrou.
```

### Prompt de Spec
```
@PRD.md

Com base neste PRD, gere uma SPEC.md detalhada.

Para CADA alteração, especifique:
- Caminho exato do arquivo
- Ação: criar ou modificar
- O que fazer (seja específico)
- Code snippets quando necessário

Inclua:
- Ordem de implementação (o que fazer primeiro)
- Dependências entre tarefas
- Checklist de validação no final
```

### Prompt de Implementação
```
@SPEC.md @CLAUDE.md

Implemente esta SPEC completamente.

Regras:
1. Siga a ordem de implementação especificada
2. Mostre cada arquivo criado/modificado
3. Não pule etapas
4. Valide com o checklist no final
```

---

## 🎯 Regra de Ouro

> **A qualidade do INPUT determina a qualidade do OUTPUT.**

Se você alimentar a IA com:
- ❌ Informação incorreta → Output ruim
- ❌ Informação incompleta → Output incompleto
- ❌ Informação demais → Context window cheia → Output degradado

O objetivo do SDD é:
> **Alimentar a IA com TODAS as informações necessárias, da forma mais RESUMIDA possível.**

---

## 💡 Dicas Avançadas

### 1. Use arquivos de contexto
Mantenha um `CLAUDE.md` ou `.cursorrules` na raiz do projeto com:
- Regras do projeto
- Padrões de código
- O que fazer e não fazer
- Stack tecnológica

### 2. Limpe o contexto frequentemente
Não deixe a conversa ficar longa. Após cada etapa:
- `/clear` no Claude Code
- Nova conversa no ChatGPT
- Novo chat no Claude.ai

### 3. Seja específico nos prompts
```
❌ "Arruma esse bug"
✅ "O botão de salvar em src/components/Form.tsx linha 45 não está chamando a API. Verifique o onClick e implemente a chamada para POST /api/users"
```

### 4. Valide antes de prosseguir
Após cada etapa, verifique se o output está correto antes de continuar.

### 5. Mantenha SPECs para referência
Guarde suas SPECs em uma pasta `specs/` ou `docs/`. Elas servem como documentação.

---

## 📁 Estrutura Sugerida

```
projeto/
├── CLAUDE.md           # Regras para a IA
├── .cursorrules        # Regras resumidas (se usar Cursor)
├── specs/              # SPECs geradas
│   ├── PRD-feature-x.md
│   ├── SPEC-feature-x.md
│   └── ...
├── src/
└── ...
```

---

## 🚀 Exemplo Prático

### Situação
"Preciso adicionar filtro de aniversariantes na lista de eleitores"

### Etapa 1 - Research
```
Pesquise sobre adicionar filtro de aniversariantes:
1. Onde está a página de eleitores?
2. Como os filtros atuais funcionam?
3. A tabela tem campo de data de nascimento?
4. Existe componente de DatePicker?
```

**Output:** PRD com arquivos encontrados, padrões de filtro existentes, etc.

### Etapa 2 - Spec
```
@PRD-aniversariantes.md
Gere uma SPEC detalhada para implementar o filtro.
```

**Output:** SPEC com:
- Modificar `src/pages/Eleitores.tsx` - adicionar estado do filtro
- Modificar `src/hooks/useEleitores.ts` - adicionar parâmetro na query
- Criar `src/components/FiltroAniversariantes.tsx` - UI do filtro

### Etapa 3 - Code
```
@SPEC-aniversariantes.md
Implemente esta SPEC.
```

**Output:** Código funcionando, filtro implementado.

---

## ✅ Checklist SDD

Antes de implementar qualquer coisa:

- [ ] Fiz a pesquisa (Research)?
- [ ] Gerei o PRD?
- [ ] Limpei o contexto?
- [ ] Gerei a SPEC?
- [ ] Limpei o contexto novamente?
- [ ] A SPEC tem arquivos específicos?
- [ ] A SPEC tem ordem de implementação?
- [ ] A SPEC tem checklist de validação?

---

## 📚 Créditos

Método baseado nos ensinamentos de **Dex Horthy** (Founder do Human Layer) sobre Context Engineering.

Links úteis:
- Prompt de Research: https://github.com/dexhorthy/...
- Prompt de Spec: https://github.com/dexhorthy/...
- Prompt de Implementação: https://github.com/dexhorthy/...

---

*Este documento pode ser usado para treinar qualquer chat de IA a seguir o método SDD.*
