# W6 — Delegação com brief: subagente auditor

**Quando usar:** tarefa delimitada que não precisa do seu contexto completo
(auditorias, levantamentos, buscas profundas). O subagente protege o contexto
principal e trabalha em paralelo — mas só é seguro com brief e verificação.

## Fluxo

1. Preencha `templates/agent-brief.md`: missão em 1 frase, arquivos que o
   agente DEVE ler, fronteiras explícitas, definição de pronto com comando
   verificável, formato da resposta.
2. Lance com escopo read-only quando possível (sem risco de conflito de
   escrita com o trabalho em andamento).
3. Quando o relatório voltar, NÃO confie: verifique uma amostra das alegações
   lendo os arquivos citados.
4. Findings confirmados viram próximos passos registrados — delegação não é
   autorização para corrigir tudo de uma vez.

## Execução real (2026-08-19)

- **Brief usado (resumo):** missão: auditar as rotas `src/app/api/**` quanto à
  validação de input; contexto mínimo: QWEN.md + convenção do route
  `streak/milestone`; fronteiras: nenhum arquivo modificado, nenhum teste
  rodado; definição de pronto: tabela por rota + as 3 mais fracas com
  evidência citada.
- **O subagente entregou:** varredura das **18 rotas** encontradas (com
  correção do próprio brief: `streak/touch` não existe), tabela de risco por
  rota, e as 3 mais fracas:
  1. `/api/playground/save` — `reply` 100% fornecido pelo cliente é persistido
     como mensagem "assistant" sem verificação de origem; e o `update` do
     thread não leva `learnerId` no `where` (ownership só no `findFirst`
     anterior).
  2. `/api/activity` — `cursor` cru vira `new Date(cursor)` sem validação;
     valor não-parseável gera `Invalid Date` no filtro Prisma (→ 500).
  3. `/api/init` — `name` só com trim/truncate, sem allowlist (destoa da
     convenção; risco baixo).
  Mais: nenhuma rota persiste input sem coerção de tipo; writes via Prisma
  paramétrico (sem superfície de SQL injection); `/api/chat` é a única rota
  sem `getCurrentLearner`/gating.
- **Verificação pelo delegador (obrigatória):** li os dois arquivos citados —
  `src/app/api/playground/save/route.ts` e `src/app/api/activity/route.ts` —
  e as duas alegações principais se confirmam linha por linha.
- **Decisão:** findings registrados aqui como próximos passos, NÃO corrigidos
  neste fluxo — cada correção merece seu próprio ciclo spec → teste → gates.
- **Epílogo (mesmo dia):** os dois findings principais foram fechados logo
  depois pelo workflow `prove-the-bug` — cursor inválido em `/api/activity`
  (teste red provou o 500; fix → `400 invalid-cursor`) e escrita sem escopo em
  `/api/playground/save` (sem red comportamental possível: hardening com teste
  de caracterização). Suíte 125/125. O `reply` forjável segue aberto como
  decisão de arquitetura, não bug de validação.

## Valor

Auditoria completa do repo executada em paralelo com W1–W5, sem ocupar o
contexto principal; findings reais confirmados por verificação independente —
exatamente o controle que delegação sem brief não dá.
