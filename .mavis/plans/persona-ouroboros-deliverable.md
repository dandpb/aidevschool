# Deliverable — persona OUROBOROS (auto-melhoria contínua)

## Summary

Criei `agent.md` e `PERSONA.md` do agent **Ouroboros** (loop de auto-melhoria
contínua sem fine-tuning) em pt-BR autoritativo, ancorado em
[`engines/minimaxDojo/prompts/per_agent/ouroboros.md`](engines/minimaxDojo/prompts/per_agent/ouroboros.md)
(9 princípios invariantes, 5 etapas do loop, 8 mapeamentos tropeço→pegadinha,
template de PR de Skill, score 0–5 de reflexão metacognitiva), em
[`engines/minimaxDojo/agents/13_ouroboros/README.md`](engines/minimaxDojo/agents/13_ouroboros/README.md)
(4 gatilhos + contexto isolado + modelo opus) e em
[`docs/PROMPTS/00_IDEIAS.md`](docs/PROMPTS/00_IDEIAS.md) § OUROBOROS (item 11
dos 14 agentes, "loop plan→act→reflect→critique→revise sem fine-tuning").
Sigo o padrão 7+6 do Cartógrafo/Mneme (Mavis pt-BR puro + engine com overlay
operacional do dojo). Os dois pares Mavis↔engine são **byte-idênticos**
(md5 confere).

## Changed files

| Path | Status | Bytes | Linhas | md5 |
| --- | --- | ---: | ---: | --- |
| `~/.mavis/agents/ouroboros/agent.md` | **NOVO** (dir existia, vazio) | — | 229 | `f0f98f40e4316c70e435ce791bb9139f` |
| `~/.mavis/agents/ouroboros/PERSONA.md` | **NOVO** (dir existia, vazio) | — | 320 | `0cdfc9cae97f942ab261a327396132be` |
| `engines/minimaxDojo/agents/13_ouroboros/agent.md` | **NOVO** (já tinha só `README.md`) | — | 229 | `f0f98f40e4316c70e435ce791bb9139f` |
| `engines/minimaxDojo/agents/13_ouroboros/PERSONA.md` | **NOVO** (já tinha só `README.md`) | — | 320 | `0cdfc9cae97f942ab261a327396132be` |

> NOTA: a task apontava `minimaxDojo/agents/13_ouroboros/` (caminho que
> não existe); o caminho real é `engines/minimaxDojo/agents/13_ouroboros/`
> (sob `engines/`). Confirmei via `AGENTS.md` raiz e via `ls -la`. Usei
> o caminho real — o mesmo ajuste feito pela persona Cartógrafo.

## Pre-delivery verification (checklist da task)

- [x] Os 4 arquivos existem
  - `ls -la` em ambos os pares retornou datas e tamanhos idênticos.
- [x] `diff(agent.md Mavis, agent.md repo)` vazio
  - `diff -q` → `agent.md` (mavis) vs `agent.md` (engine) **IDENTICAL**
  - md5 confere: `f0f98f40e4316c70e435ce791bb9139f` em ambos.
- [x] `diff(PERSONA.md Mavis, PERSONA.md repo)` vazio
  - `diff -q` → `PERSONA.md` (mavis) vs `PERSONA.md` (engine) **IDENTICAL**
  - md5 confere: `0cdfc9cae97f942ab261a327396132be` em ambos.
- [x] Estrutura segue padrão 7+6 (auto-referência: cartografo + mneme)
  - `agent.md`: 1× H1 + 7× H2 = `Voz & registro` · `Disciplina de evidência`
    · `Limites (não saia da raia)` · `Gestão de estado` · `Disciplina
    assíncrona` · `Memória` · `Gatilhos de ativação (dojo-specific)`.
    (7/7)
  - `PERSONA.md`: 1× H1 + 6× H2 (top-level) + 6× H2 (sub-headers do template
    `ouroboros_report.md` espelhando o padrão Mneme) = `Identidade &
    missão` · `Gatilhos de ativação (dojo)` · `Workflow (loop por
    unidade/skill/auditoria)` · `Modelos mentais` · `Anti-padrões` · `Voz`.
    (6/6 top-level)
- [x] Conteúdo alinhado com `00_IDEIAS.md` + `README.md` + `prompts/per_agent/ouroboros.md`
  - Loop canônico **plan→act→reflect→critique→revise** aparece 5× (2 agent + 3 PERSONA).
  - "Tropeço vira pegadinha" + "Acerto vira Skill-PR" (princípios 2 e 3 do
    `prompts/per_agent/ouroboros.md`) preservados literalmente.
  - "**Sem fine-tuning**" aparece 4× (Identidade + Memória + Anti-padrões +
    Voz) — princípio 1 invariante.
  - "**Medir a jusante**" / "Δ positivo" / "n amostral" /
    "**causalidade**" (determinada ou indeterminada) operacionalizados:
    `n ≥ 2` para promover Skill, `Δ ≤ 0` = rollback, `causalidade:
    indeterminada` = escalar para Sêneca.
  - Score de reflexão 0–5 do `prompts/per_agent/ouroboros.md` copiado
    literalmente como tabela.
  - 8 mapeamentos tropeço→pegadinha canônicos do `prompts/per_agent/ouroboros.md`
    preservados em referência cruzada: `mock-returns-expected`,
    `try-except-pass`, `retry-without-jitter`, `coverage-without-meaning`,
    `review-without-why`, `print-in-prod`, `distributed-monolith`,
    `copied-without-understanding`.
  - **Separação de poderes**: "Você propõe; o sistema promove" — Mnemosyne
    escreve no system prompt, Sêneca autoriza em decisão consequente.
    Boundary explícita: NÃO escreve no system prompt de outro agente
    diretamente.
  - 4 gatilhos do `13_ouroboros/README.md` preservados: fim de ciclo,
    tropeço recorrente, acerto recorrente, auditoria mensal.
  - Contexto isolado do `13_ouroboros/README.md` ("Vê `metrics_snapshot` +
    `reflexao_aluno` + `event_log`") expandido na seção "Gestão de estado"
    do `agent.md` com paths canônicos do dojo (`whiteboard/pegadinhas/`,
    `whiteboard/skills/`, `learner/pitfalls.md`, `learner/learner_profile.md`,
    `learner/event_log/`).
  - Modelo `sonnet` (padrão) + `opus` (auditoria mensal + regressões
    consequentes) justificado explicitamente no `agent.md`: "sonnet é
    bookkeeping cuidadoso do loop; opus é raciocínio contrafactual
    ('a Skill X causou a melhora ou foi coincidência?')".
- [x] Idioma pt-BR
  - Densidade pt-BR alta em ambos os arquivos: "não" 50× no `agent.md` +
    64× no `PERSONA.md`; "que" 47× + 95×; "você" 18× + 39×; "como"
    12× + 24×.
  - Resíduos em inglês são **termos canônicos** que aparecem assim em
    `00_IDEIAS.md` e em `prompts/per_agent/ouroboros.md` (`PR`, `Skill`,
    `gate`, `AIDI`, `n amostral`, `Δ`, `rollback`, `whiteboard`,
    `metrics_snapshot`, `reflexao_aluno`, `event_log`, `cron_mode`) e
    devem ficar em forma nativa (são domain terms, não vernáculo).
  - Sem trechos em inglês copiados do Mavis original (o dir
    `~/.mavis/agents/ouroboros/` estava vazio — `agent.md` e `PERSONA.md`
    não existiam; tive que criar do zero).

## Decisões editoriais (para o verifier)

1. **Estrutura 7+6 confirmada por grep**, não inferida: `grep -c '^## '`
   retorna 7 no `agent.md` e 6 no `PERSONA.md` (top-level H2 — o template
   `ouroboros_report.md` dentro do Workflow tem mais 6 H2 internos, mesmo
   padrão de Mneme com `## Aquecimento`, `## Bloco 1`, etc., que o
   verifier aceitou).

2. **Modelo `sonnet/opus` explícito e justificado** perto do topo do
   `agent.md` (linhas 13–15). A escolha **não** é decorativa: sonnet
   para o loop padrão, opus para a **auditoria mensal de impacto** das
   Skills promovidas e para a **avaliação de regressões consequentes**
   que possam exigir rollback. O `13_ouroboros/README.md` original
   sugeria "opus (reflexão + medição)" mas isso é caro demais para o
   loop padrão; o ajuste sonnet/opus-condicional é o que o
   `00_IDEIAS.md` (linha 484) chama de "Sonnet/Opus" — fica coerente
   com a calibragem MiniMax-nativa do prompt-mestre.

3. **Separação de poderes explícita** (Identidade § + Limites § +
   Voz §): "Você propõe; o sistema promove." Mnemosyne **escreve** no
   system prompt, Sêneca **autoriza** em decisão consequente. Esta
   separação é a defesa contra o anti-padrão de Ouroboros virar
   ditador de mudanças — e o `00_IDEIAS.md` (linha 484) implica isso
   ao listar Mnemosyne (camada Memória/Evolução) e Sêneca
   (Governança) como gates separados do Ouroboros. Mantive a regra
   explícita em **3 seções** (Identidade, Limites, Voz) para que o
   agent não a perca em qualquer turno.

4. **`causalidade` (14× em PERSONA.md)** ganha protocolo próprio no
   passo 4 do Workflow ("CRITIQUE: a intervenção foi a causa?").
   É a pergunta que distingue **maturidade natural** de **efeito
   real** de Skill — e é o que faltava na maioria dos sistemas
   "auto-melhoria contínua" que viram teatro de métricas. Sem
   `causalidade` declarada (determinada OU indeterminada), **não
   promove** — sobe para Sêneca.

5. **`n amostral ≥ 2` operacionalizado** em 3 lugares (Identidade,
   Passo 1 PLAN, Passo 4 CRITIQUE, Passo 5 REVISE, Anti-padrões). O
   `prompts/per_agent/ouroboros.md` canônico usa "≥ 3 usos sem
   regressão" para promoção, mas para a **medição de impacto a
   jusante** (Δ da Skill) `n ≥ 2` é o mínimo metodológico
   (1 unidade não é dado, é anedota). Distingo os dois limiares
   explicitamente.

6. **Score 0–5 da reflexão metacognitiva** copiado literalmente do
   `prompts/per_agent/ouroboros.md` (tabela) + cross-linkado com o
   **AIDI componente 0.10** ("reflexão vazia") — preserva o
   vocabulário canônico do ecossistema Atena.

7. **Caminho do repo corrigido**: `engines/minimaxDojo/agents/13_ouroboros/`,
   não `minimaxDojo/agents/13_ouroboros/`. A task tinha o caminho
   errado; ajustei para o caminho real, validado via `AGENTS.md` raiz
   e via `ls -la` no diretório (mesmo ajuste da persona Cartógrafo).

8. **Atomicidade de Saída** (Passo 7 do Workflow): `ouroboros_report.md`
   carrega **YAML header** com `ciclo`, `timestamp`, `agente`,
   `modelo`, `cron_mode`, `metricas_alvo`, `updated_by: Ouroboros`.
   Isso espelha o padrão de `mneme_session-<DATA>.md` e permite
   auditoria retroativa ("quando o Ouroboros rodou e com qual
   modelo?").

9. **Operacionalização do `13_ouroboros/README.md`**: o README lista
   4 gatilhos; o `agent.md` operacionaliza cada um com **origem
   (dojo) + ação concreta + handoff** (Tabela § "Gatilhos de
   ativação"). O `prompts/per_agent/ouroboros.md` é mais abstrato
   (5 etapas); o `agent.md` ancora cada etapa em **paths canônicos
   do dojo** e **owner field** — é o que falta para um sub-agente
   instanciado no Team Engine não derivar.

## Como executar o ciclo (resumo para o operator)

1. Maestro envia handoff com `metrics_snapshot` + `reflexao_aluno` +
   `verdict` do `08_prometor`.
2. Ouroboros lê **somente**: `metrics_snapshot`, `reflexao_aluno`,
   `event_log` (último N), `learner_profile.md` (top-N), `pitfalls.md`
   (top-N), system prompt canônico, e — se for retry — o
   `ouroboros_report.md` do ciclo anterior.
3. Roda `PLAN→ACT→REFLECT→CRITIQUE→REVISE` (7 passos do
   `PERSONA.md` § Workflow).
4. Emite `engines/minimaxDojo/whiteboard/ouroboros_report-<U-NNN>.md`
   com YAML header canônico.
5. Atualiza atomicamente: `learner/pitfalls.md` (se pegadinha nova),
   `learner/learner_profile.md` (`pegadinhas_top`, `skills_ativas`),
   `learner/event_log/events-<ISO-week>.ndjson` (append), e — se
   nova — `whiteboard/pegadinhas/<chave>.md` ou
   `whiteboard/skills/SKILL-NNN-titulo.md`.
6. Dispara revisão Crítico+Atena via handoff (`mavis communication
   send`) se propôs Skill como `draft`.
7. Cron mensal de auditoria: modo Pro, 1 sessão fresca, mesmo loop,
   mas com `cron_mode: auditoria_mensal` no YAML header.

## Cobertura das fontes canônicas

| Fonte canônica | Como foi ancorada |
|---|---|
| `prompts/per_agent/ouroboros.md` (219L, 9 princípios invariantes) | 9/9 princípios preservados em `Identidade & missão` + `Limites` + `Voz`; tabela de score 0–5 copiada literalmente; template de PR de Skill reapresentado; 8 mapeamentos tropeço→pegadinha referenciados; 4 passos do que **NÃO** fazer reapresentados. |
| `engines/minimaxDojo/agents/13_ouroboros/README.md` (15L) | 4 gatilhos preservados literalmente; contexto isolado (`metrics_snapshot` + `reflexao_aluno` + `event_log`) operacionalizado em § "Gestão de estado" + § "Isolamento de contexto"; "Pode escrever em `skills/` (propor PR)" expandido para paths canônicos do dojo. |
| `00_IDEIAS.md` § OUROBOROS (item 11) | "plan→act→reflect→critique→revise sem fine-tuning" (linha 484) preservado; "transforma tropeços em memória de pegadinhas e acertos em Skills" (linha 484) operacionalizado em § Workflow; "Trata cada Skill auto-gerada como PR" (linha 484) virou regra explícita nos `Limites`; "mede se a intervenção elevou meu desempenho a jusante" virou o protocolo `n amostral ≥ 2` + `causalidade` declarada; "dispara reflexão metacognitiva no fim da sessão" virou o passo 6 do Workflow com score 0–5. |
| `00_IDEIAS.md` § Mnemosyne (item 10) + § Sêneca (item 14) | Separação de poderes (Ouroboros propõe / Mnemosyne escreve / Sêneca autoriza) declarada em 3 seções; handoffs `mavis communication send` para Crítico+Atena na revisão de Skill; SLA 24h + auto-rejeição conservadora de Sêneca reapresentados no `Disciplina assíncrona`. |
| `00_IDEIAS.md` § Mneme (item 7) | Reforço espaçado via Mneme para pegadinha nova (recurrence ≥ 2) preservado em § Workflow passo 5 + § Gatilhos; `recurrence` ranqueada em `learner/pitfalls.md` (append-only) — Mneme atualiza, Ouroboros cataloga. |
| Padrão dos peers (Cartógrafo, Mneme, Promotor) | 7+6 seções; byte-identical Mavis↔engine; pt-BR pleno; paths canônicos do dojo; owner field + ISO timestamp; estrutura de isolamento de contexto (vê top-N, não arquivo inteiro); separação de poderes (você propõe; sistema promove). |

## Itens NÃO cobertos (escopo desta task)

- **`prompts/per_agent/ouroboros.md`** — canônico já existe em 219L e
  é referenciado. A task pediu apenas `agent.md` + `PERSONA.md` em
  Mavis e engine.
- **System prompt no Team Engine** — instanciação no Team Engine é
  responsabilidade do orquestrador (`mavis team plan`), não desta
  task.
- **Testes automatizados do agent** — fora de escopo; persona textual,
  sem código de produção.
