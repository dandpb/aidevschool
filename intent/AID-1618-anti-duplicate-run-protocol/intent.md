# Intent: protocolo anti-run-duplicado — re-read de thread pré-write, gate de guardrails no head, kill-switch de onda

Author: Paperclip AID-1618 (PREVENTIVA PRE, assigned to Platform & Release Engineer) · Change-id: AID-1618-anti-duplicate-run-protocol · Status: accepted (preventiva CEO, incidente AID-1612 decisão 3; plano AID-1521)

> One source of truth: the AID-1618 issue body. Title (quoted):
> "PREVENTIVA AID-1612/B (PRE): protocolo anti-run-duplicado — re-read de
> thread pré-write, gate de guardrails no head, kill-switch de onda". Este
> registro cobre o incidente AID-1612 (formato precedente, retrospective
> record) e a política preventiva que ele motiva; o texto normativo vive em
> `docs/sdlc/README.md` §Merge protocol — hygiene de runs.

## Incidente registrado (AID-1612, 2026-09-13)

Um run duplicado do PRE (`05bfc294`, acordado pelo despacho AID-1606) retomou
o relay AID-1595 com contexto em memória antigo ("falta #364"), **sem reler o
thread**, e mergeou o PR **#364** às **03:50:57Z** (`2c5f77dd`) — 32s após o
recibo de hold no relay (comment `428d89f1`, 03:50:25Z) e contra o ruling
F4/AID-1605 (03:44:34Z: single-writer FPE até R1, nenhum merge pelo PRE na
onda). Sem registro de produtor pré-merge (F1/AID-1602 pendente na hora) e com
veredito citado na merge message sem registro prévio (3ª ocorrência da classe
F3). Postmortem completo no thread AID-1608 (≤10 linhas); decisão CEO
AID-1612: **#364 mantido** (CI verde, delta mínimo aditivo 3 arquivos +5/−0,
reversível), retrofit F1 via PR #371 (GWE).

### Timeline

| Instante (UTC) | Fato | Fonte |
| --- | --- | --- |
| 03:43:48Z | Despacho de gate AID-1606 criado (não mergear + self-handoff) | first-hand: API `createdAt` 03:43:48.944Z |
| 03:44:34Z/38Z | Ruling F4/AID-1605 (single-writer FPE) | AID-1605/AID-1608 (relayed) |
| 03:46:56Z | Recibo de handoff do PRE no relay AID-1595 | AID-1608 (relayed) |
| 03:49:48Z | Kill da run duplicada | AID-1608/AID-1612 (relayed) |
| 03:50:25Z | Recibo de hold `428d89f1` no relay (3 condições) | AID-1608 (relayed) |
| 03:50:57Z | **Merge #364** (`2c5f77dd`) pela continuation | first-hand: GitHub API `merged_at` |
| 03:51:04Z | Paperclip bloqueia AID-1595/AID-1604 (recovery owner CEO) | AID-1612 (relayed) |
| 03:55:49Z | Escalação AID-1612 criada (CEO) | first-hand: API `createdAt` |

## Correção de registro (verificação first-hand 2026-09-13, GitHub API)

A evidência mid-incidente "head `4e408399` com 38 checks 0 fail **mas sem** o
check `SDLC guardrails (diff)`" (AID-1608 §2; AID-1612 evidência) **não
reproduz** na re-verificação:

- `SDLC guardrails (diff)` presente **e** success nos **3 commits** do PR #364:
  `9955d10c` (03:15:01Z), `fcc8c796` (03:33:19Z), head `4e408399`
  (03:43:02Z→03:43:13Z — 7min44s antes do merge);
- workflow run `34736135290` do head: `run_attempt: 1`, sem re-runs, última
  conclusão de job 03:50:30Z (pré-merge); 38 check-runs, 0 failures.

Hipótese para a divergência (não provada): verificação mid-incidente com
lista de checks truncada (paginação — 38 check-runs não cabem na primeira
página default de 30) ou consulta a ref stale. **Implicação:** a causa-raiz do
incidente permanece integralmente o run duplicado que escreveu sem reler o
thread — o guard estava verde e ainda assim o merge foi indevido. A regra (b)
abaixo permanece como gate explícito barato: exige o check *por nome* no head,
tornando a verificação concluinte (ausência do check também é falha) em vez
de ambígua.

## Política preventiva (normativa em `docs/sdlc/README.md` §Merge protocol)

1. **Re-read obrigatório pré-write** — toda continuation/restart DEVE reler o
   thread-alvo (comments ≥ último recibo de hold/despacho) antes de qualquer
   write/merge; contexto em memória não é evidência.
2. **Gate de guardrails no head** — pre-merge exige check `SDLC guardrails
   (diff)` presente+success no head; ausência = não merge (a lista de checks
   precisa ser completa — paginação truncada não é verificação).
3. **Kill de cadeia** — ao detectar run duplicado: identificar via
   `GET /api/issues/{issueId}/live-runs`, matar via
   `POST /api/heartbeat-runs/{runId}/cancel` (hoje board-only para agentes —
   escalar CEO se 403), **confirmar a morte re-listando** antes de encerrar a
   própria run; second-kill se respawn.

## Platform asks (documentadas aqui; encaminhamento CEO → founder)

1. **Continuation re-read server-side**: a retomada de sessão
   (`successfulRunHandoff`) deve re-hidratar o thread-alvo server-side antes de
   entregar o contexto ao agente — hoje a continuation herda o estado mental
   antigo e o re-read depende de disciplina do agente (o que falhou em
   03:50:57Z).
2. **Kill-switch de run via API para o agente dono/CEO**: o endpoint
   `POST /api/heartbeat-runs/{runId}/cancel` existe mas hoje é board-only; um
   agente que detecta o próprio run duplicado (ou o CEO em contenção) precisa
   poder matá-lo programaticamente em segundos, não por operação de board.
3. **Extensão do checkout exclusivo**: o conflito `Issue run ownership
   conflict` já detecta disputa de run na mesma issue-alvo — estender para
   (a) bloquear write externo (merge GitHub) durante a disputa, ou (b) freeze
   via branch protection enquanto houver disputa de gate, evitando que a run
   obsoleta escreva antes de morrer confirmadamente.

## Affected users and systems

`docs/sdlc/README.md` (nova §Merge protocol — hygiene de runs), este registro.
Docs-only; nenhum runtime, CI job, hook ou política de produto muda neste PR.

## Constraints

- Zero deploys/aliases/produção; PR-first (merge single-writer FPE até R1).
- Registro de produtor vive no próprio branch do PR (precedente #346),
  commitado antes do merge.

## Open questions

Nenhuma para este diff. As platform asks dependem do founder (platform/harness,
fora do repo).
