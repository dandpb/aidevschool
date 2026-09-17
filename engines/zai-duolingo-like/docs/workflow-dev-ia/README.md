# Workflow de desenvolvimento com IA — guia permanente

Este documento cobre os 9 fundamentos do desenvolvimento assistido por IA e
termina num passo a passo operacional. Ele não é teórico: cada tópico aponta
para evidência real **deste repo** (o jogo Vertical Protocol) e o caso de uso
da seção final foi executado e validado de verdade em 2026-08-19.

Layout do kit:

```
docs/workflow-dev-ia/
├── README.md                  ← este guia
├── aprendizados.md            ← síntese dos 11 casos: o que cada um ensinou
├── index.html                 ← relatório interativo (publicado como artifact)
├── diagrams/                  ← fontes .mmd + SVG/PNG (arquitetura, pipeline, timeline)
├── templates/
│   ├── prd.md                 ← ideia → problema e objetivos
│   ├── spec.md                ← ideia → contrato executável
│   ├── plan.md                ← contrato → passos com gates de verificação
│   ├── agent-brief.md         ← delegação com fronteiras
│   └── loop.md                ← ciclo autônomo com parada
└── examples/
    ├── spec-meta-semanal.md   ← caso 0: feature nova (spec → build → gates)
    ├── w1-bugfix-invariante.md  ← provar bug com teste antes de corrigir
    ├── w2-tdd-extracao.md       ← regra duplicada → fonte única test-first
    ├── w3-refactor-seguro.md    ← verde antes, verde depois
    ├── w4-code-review.md        ← /review no diff acumulado (com untracked)
    ├── w5-e2e-portavel.md       ← habilitar + rodar E2E (29/29)
    ├── w6-delegacao-subagente.md← auditoria delegada com brief e validação
    ├── w7-loop-qualidade.md     ← medida → iteração → parada (any 4→0)
    ├── w8-health-check-deps.md  ← outdated + audit → decisão registrada
    ├── w9-decision-records.md   ← .agents/notes: o porquê permanente
    └── w10-verify-asset.md      ← gates viram `npm run verify`
```

Todos os exemplos foram **executados de verdade neste repo em 2026-08-19** —
cada documento traz o rastro real (comandos, saídas, falhas e correções).

---

## Os 9 fundamentos

### 1. Fundamentos de LLMs

O que importa na prática: um LLM não "executa" nada — ele continua texto.
**Instruções** (system prompt) definem o comportamento; **contexto** (tudo que
vai na janela) é a única memória que existe; **tokens** limitam essa janela e
custam dinheiro; **ferramentas** dão ao modelo a capacidade de agir (ler
arquivo, rodar teste, chamar API) — o modelo decide quando chamá-las.

**Evidência neste repo:** `src/app/api/chat/route.ts` é um backend LLM completo
em miniatura — a persona «Bip» vive num system prompt, o histórico é limitado a
`slice(-10)` mensagens (janela de contexto é recurso finito), `max_tokens: 1500`
reserva espaço para a resposta, e modelo/endpoint são configuráveis por env.
Os testes (`tests/api/chat.test.ts`) mostram como testar isso **sem rede**:
o `fetch` do provider é stubbed — o contrato importa mais que o modelo.

### 2. Harness

Harness é o programa que organiza **modelo + contexto + execução**: ele monta o
prompt de sistema, injeta arquivos, expõe ferramentas, gerencia permissões e
subprocessos. Claude Code, Codex, OpenCode e Qwen Code são harnesses — o modelo
é o motor, o harness é o carro. É o harness que decide o que entra no contexto,
quais ferramentas existem e quando uma ação precisa de aprovação.

**Evidência aqui:** esta sessão roda num harness (Qwen Code) com ferramentas de
arquivo/shell/busca, subagentes e memória persistente. Tudo que o agente "sabe"
sobre este repo veio de leitura ativa (package.json, worklog.md, testes) — não
de conhecimento prévio. Harness bom = contexto certo na hora certa.

### 3. Prompt Engineering

Instruções que reduzem ambiguidade e retrabalho. As três alavancas: **papel**
(quem o modelo é), **regras** (o que sempre/nunca fazer), **formato** (como
responder). A fórmula que o próprio Bip ensina no jogo: Contexto + Tarefa +
Formato.

**Evidência neste repo:** o `SYSTEM_PROMPT` do chat define papel ("Você é Bip"),
regras ("máx. ~150 palavras", "não invente fatos") e comportamento sob casos
limite ("se não souber, diga que não sabe"). O mesmo princípio vale para pedir
código a um agente: a spec da meta semanal (ver caso abaixo) lista requisitos
numerados e o arquivo-modelo a imitar — zero ambiguidade, zero retrabalho.

### 4. Context Engineering

Se prompt engineering é _como pedir_, context engineering é _com o que pedir_:
selecionar arquivos, regras e memórias relevantes — e excluir o ruído. Janela
de contexto cheia de código irrelevante degrada a resposta tanto quanto um
prompt ruim.

**Evidência neste repo (3 mecanismos reais):**
- `.agents/notes/` — decision records com lifecycle (`proposed` →
  `implemented`/`rejected`): o contexto sobrevive a viradas de sessão.
- `docs/design-it-twice/` — 4 designs concorrentes + veredito documentado:
  o "por quê" das decisões vira contexto consultável.
- `worklog.md` — log estruturado por task/agente: qualquer agente novo
  recupera o estado do projeto lendo um arquivo.
- `QWEN.md` (raiz) — instruções que o harness carrega em TODA sessão.

### 5. PRD e Specs

PRD transforma intuição em problema definido; spec transforma problema em
contrato executável. A regra de ouro: **cada critério de aceite da spec vira um
teste automatizado**. Se não dá para testar, a spec ainda está vaga.

**Evidência neste repo:** `templates/prd.md` e `templates/spec.md`, e o caso
real `examples/spec-meta-semanal.md` — escrita antes do código, com tabela de
requisitos (R1–R6) e critérios de aceite que viraram exatamente os 6 testes de
`tests/api/streak-goal.test.ts`.

### 6. Execução guiada (Plan Mode, Build Mode e validações)

Plan Mode: investigar sem modificar nada, fechar o plano, pedir aprovação.
Build Mode: executar o plano com gates — cada passo termina numa verificação
(teste, lint, typecheck). Falhou? Diagnostica antes de trocar de abordagem;
não faz retry no escuro.

**Evidência (executada hoje):** o caso da meta semanal seguiu
`spec → implementação mínima → testes → npm test (110/110) → lint (0 erros) →
tsc --noEmit (0 erros)`, nessa ordem, com cada saída registrada na spec.
`templates/plan.md` formaliza o formato: passo, arquivos, verificação.

### 7. Agentes e subagentes

Delegar tarefas sem perder o controle = brief com missão, fronteiras e
definição de pronto. Subagentes protegem o contexto do agente principal
(resultados voltam resumidos) e permitem paralelismo — mas cada subagente
precisa de escopo disjunto para não haver conflito de escrita.

**Evidência neste repo:**
- `worklog.md` — agentes com papéis distintos: `orchestrator` (planeja),
  `art-generation` (assets), `cron-review` (QA + avanço), cada um registrando
  o que fez e o que validou.
- `docs/design-it-twice/` — 4 subagentes **paralelos**, cada um com uma
  restrição radical diferente (mínima interface, máxima flexibilidade...),
  e um veredito humano que combinou o melhor de cada. Delegação com controle.
- `templates/agent-brief.md` — o formato de brief reutilizável.

### 8. MCP, ACP e Skills

Três formas de estender o harness:
- **MCP** (Model Context Protocol): conecta ferramentas e dados externos ao
  agente (banco, navegador, APIs) como tools padronizadas.
- **ACP** (Agent Client Protocol): padroniza a conversa entre o cliente
  (IDE/CLI) e o agente — troca de harness sem trocar integração.
- **Skills**: pacotes de comportamento reutilizável (instruções + scripts)
  que o agente invoca por nome.

**Evidência aqui:** esta sessão expõe skills reais invocáveis por nome —
`tdd`, `code-review`, `review --fix`, `new-app`, `diagnosing-bugs` etc. O
`QWEN.md` da raiz diz _quando_ usar cada uma, transformando skills em
convenção do repo em vez de conhecimento tribal.

### 9. Loop Engineering

Loop = ciclo de medir → agir → verificar → registrar, com **condição de parada
e teto de iterações**. Sem parada, é desperdício; sem verificação independente,
é autoengano (o loop "melhora" o que a métrica mede, não o que importa).

**Evidência neste repo:** o `worklog.md` mostra um loop real — o
`cron-review` rodou rodadas 3, 4 e 5, cada uma com QA (agent-browser + VLM),
correções e features novas, registrando verificação e pendências.
`templates/loop.md` formaliza: gatilho, meta, ciclo, parada, guardrails
(incluindo "proibido enfraquecer a verificação para passar").

---

## Casos de uso reais — executados e testados neste repo

**Caso 0 — feature nova:** meta semanal de XP configurável
(`POST /api/streak/goal`).

| Fase | O que aconteceu | Artefato |
|---|---|---|
| Spec | Requisitos R1–R6 escritos ANTES do código | `examples/spec-meta-semanal.md` |
| Build | Route de ~40 linhas imitando `streak/milestone` | `src/app/api/streak/goal/route.ts` |
| Testes | 6 testes cobrindo cada critério de aceite | `tests/api/streak-goal.test.ts` |
| Validação | `npm test` → **110/110** · `npm run lint` → **0 erros** · `tsc --noEmit` → **0 erros** | saída real na seção 6 da spec |

**Casos 1–10 — workflows do dia a dia**, executados no mesmo dia sobre o
mesmo repo (rastro completo em cada arquivo):

| # | Workflow | Resultado verificado |
|---|---|---|
| W1 | Bugfix por invariante | teste red provou clock de parede no pipeline → corrigido, green |
| W2 | TDD de extração | `lesson-unlock` nasceu test-first; 2 cópias eliminadas |
| W3 | Refactor seguro | helper de testes unificado; suíte intocada |
| W4 | Code review | 2 findings reais antes do commit (1 corrigido, 1 roteado p/ W5) |
| W5 | E2E | bug de portabilidade corrigido; **29/29 em 50.6s** |
| W6 | Delegação | auditoria de validação das rotas via subagente + verificação |
| W7 | Loop de qualidade | `any` em src: **4 → 0** com gates por iteração |
| W8 | Health check de deps | 17 outdated + 3 high na cadeia do Prisma → decisão registrada |
| W9 | Decision records | 2 notas em `.agents/notes/implemented/` |
| W10 | Ativo permanente | `npm run verify` criado e testado (exit 0) |

Suíte ao final do dia: **123/123 testes** (eram 110), lint 0, tsc 0, E2E 29/29.
O que isso prova: com spec + convenções + gates, o resultado é previsível —
cada caso entregou exatamente o que prometeu, e o que falhou (E2E na primeira
corrida) foi diagnosticado e corrigido pelo próprio fluxo.

---

## Passo a passo final — o workflow permanente

Use isto para qualquer feature, em qualquer projeto. Os 4 objetivos estão
marcados com 🎯: previsibilidade, multi-modelo, agentes especializados e
ativos permanentes.

### Passo 1 — Escreva a spec antes do código 🎯 previsibilidade

Copie `templates/spec.md` para `docs/workflow-dev-ia/examples/spec-<tema>.md`.
Preencha contexto, escopo (com "fora"), tabela de requisitos e critérios de
aceite. Regra: se um requisito não pode virar teste, reescreva até poder.

### Passo 2 — Aponte o modelo certo para o trabalho 🎯 multi-modelo

Dois níveis de "trabalhar com diferentes modelos":
- **No produto:** este repo é model-agnostic por env — `LLM_BASE_URL`,
  `LLM_MODEL`, `LLM_API_KEY`. Qualquer endpoint OpenAI-compatible funciona
  (z.ai/GLM, OpenAI, OpenRouter, Groq, Ollama local). Os testes stubbam o
  provider, então trocar de modelo não quebra contrato. Para experimentar:
  defina as 3 variáveis e rode `npm run dev`.
- **No harness:** modelos diferentes têm custos/forças diferentes (rápido para
  busca/refactor, forte para arquitetura). O brief do passo 4 é o que mantém a
  troca de modelo segura: contrato claro independe de quem executa.

### Passo 3 — Execute em modo guiado 🎯 previsibilidade

1. Red: escreva primeiro o teste que falha (pelo motivo certo).
2. Green: implementação mínima — imite um arquivo-modelo já existente.
3. Refactor: limpe sem mudar comportamento.
4. Gates após cada passo: `npm run verify` (roda `vitest run && eslint . &&
   tsc --noEmit` — ativo criado no exemplo W10).
5. Falhou? Leia o erro, diagnostique, ajuste. Nada de retry no escuro ou de
   afrouxar o teste para passar.

### Passo 4 — Delegue o que for independente 🎯 agentes especializados

Para trabalho paralelizável ou que poluiria seu contexto, lance um subagente
com `templates/agent-brief.md`: missão em 1 frase, arquivos que deve ler,
fronteiras do que pode tocar, definição de pronto com o comando que ele mesmo
roda. Exemplo real deste repo: o `design-it-twice` lançou 4 agentes com
restrições diferentes e depois combinou os resultados.

### Passo 5 — Registre o resultado na própria spec 🎯 ativos permanentes

A seção 6 da spec recebe: arquivos entregues, saída REAL dos comandos, o que
ficou pendente. Spec preenchida deixa de ser plano e vira registro histórico —
daqui a 6 meses ela responde "por que isso é assim?".

### Passo 6 — Transforme tudo em ativo do repo 🎯 ativos permanentes

- **Instruções permanentes:** convenções que valem para toda sessão vão no
  `QWEN.md` da raiz (o harness carrega sozinho; ver o deste repo).
- **Decisões:** mudanças estruturais viram nota em `.agents/notes/`
  (proposed → implemented/rejected — nunca apague o "por quê").
- **Comportamento repetido:** se você explicou o mesmo processo 2×, vire skill ou
  template novo em `docs/workflow-dev-ia/templates/`.

### Passo 7 — Automatize o que for cíclico (com parada)

O que se repete (QA semanal, cobertura, lint) vira loop: copie
`templates/loop.md`, defina meta mensurável, condição de parada e teto de
iterações. O guardrail inegociável: o loop nunca pode enfraquecer a própria
verificação para "vencer".

### Checklist rápido (cole na sua spec)

```
[ ] Requisitos numerados, cada um verificável
[ ] Critérios de aceite = testes nomeados
[ ] Arquivo-modelo de convenção apontado
[ ] Gates definidos (test/lint/typecheck)
[ ] Escopo do que NÃO fazer declarado
[ ] Resultado real registrado ao final
```
