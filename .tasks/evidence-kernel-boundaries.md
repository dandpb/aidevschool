# Kernel de teaching-evidence nomeado; mapa fecha as lacunas de linguagem

> Build this with **tlc-implement**.
> Every criterion below becomes a check with a proof, referenced by its number. Nothing under
> `Unresolved` gets settled while building.

## Intent

`engines/shared/teaching-evidence` é o contrato público de evidência dos jogos —
`learner/gate/AGENTS.md` chama seu README de "the public evidence contract" — mas é um
**shared kernel sem nome**: não existe linha no `CONTEXT-MAP.md` (grep `shared` → só prose),
e o pacote embala três vocabulários que não se pertencem: evidência (`evidenceEnvelope.ts`,
`evidenceTransport.ts`, `emit.ts`), protocolo host-checkpoint (`hostProtocol.ts`,
`hostMessageDecoder.ts` — consumers OS + literacyDojo) e funnel analytics
(`funnelTelemetry.ts` — dojoToday/collector), mais `pilotSupport.ts`.

O drift já é visível: o union `ReviewReason` é declarado 3× — `evidenceEnvelope.ts` inclui
`"deepening"`; `engines/codexDojo/src/domain.ts:121` e
`engines/codexdojo-os-prototype/src/domain.ts:120` omitam o valor (divergência real, não
hipotética). O emissor "engine-neutral" `emit.ts` hardcodifica `scenario_id` (forma voxel) —
por isso o pixel o contorna com envelope hand-rolled (`game/evidence/emitter.ts:
buildEncounterEvidence`). E a validação é unilateral: o pixel valida cada record pré-emit
(`validateEvidenceRecord`); o caminho de emissão do voxel **não chama validação nenhuma**
(grep `validateEvidenceEnvelope` em voxelDojo → 0).

Em paralelo, o mapa tem duas lacunas de linguagem: o MVP tutor
(`engines/aiDevschoolMvp/`) roda um sistema próprio de mastery — estados
`LOCKED→…→MASTERED⇄REVIEW_DUE`, gates G1–G4, scheduler gap-ladder — sobre o **mesmo
domínio-objeto** da AI Literacy, e nenhuma linha do mapa nem da tabela de colisões registra
isso; quem lê "mastered" não sabe qual das duas verdades está lendo.

Quem paga: todo agent (ou humano) que toca evidência de jogo ou progresso de alfabetização
herda drift invisível ao mapa; o verificador consome envelopes que o produtor voxel nunca
validou.

A mudança: o kernel entra no mapa como Published Language e perde os vocabulários que não
são dele; emissor fica neutro em shape e o voxel valida; `ReviewReason` passa a ter uma
declaração; o MVP ganha linha no mapa + três colisões nomeadas.

8 critérios em 4 slices · 1 one-way door · 1 aberta

## Criteria

### Slice 1 — Kernel e MVP no mapa

1. Given `CONTEXT-MAP.md` pós-mudança, when se procura `engines/shared/teaching-evidence`,
   then existe linha na tabela de contexts (kind: Published Language / shared kernel;
   owns: envelope, transport, emissão de evidence) com as relações para os consumers
   (pixel, voxel, dojoToday, OS, literacyDojo).
2. Given `CONTEXT-MAP.md` pós-mudança, when se procura o MVP tutor, then existe linha
   (kind: Supporting; entry `engines/aiDevschoolMvp/aidevschool/SKILL.md`) e a tabela
   **Language collisions** tem 3 linhas novas: `mastered` (MVP: verdict do próprio ledger ≠
   Mastered do Journey), `gate` (G1–G4 ≠ Learning/Empirical Gate), `review` (gap-ladder do
   MVP ≠ FSRS do Journey ≠ stages [1,7,21] do literacyDojo).

### Slice 2 — Emissor neutro, validação bilateral

3. Given o caminho de emissão do voxel (`voxelDojo/shared/createEmitForGame.ts` →
   `emit.ts`), when um record com identity-key vazio (nem `encounter_id` nem `scenario_id`)
   chega ao emit em teste, then a emissão recusa com erro nomeando o campo — hoje o voxel
   emite sem validar nenhuma vez.
4. Given o caminho do pixel, when `buildEncounterEvidence` produz um record com
   `encounter_id`, then o record passa por `validateEvidenceEnvelope` e o transporte pelo
   `dualEmit` compartilhado — `emit.ts` não hardcodifica `scenario_id` (o shape da
   identity-key já é `encounter_id|scenario_id` no validador).

### Slice 3 — ReviewReason single-source

5. When `grep -rn "'deepening'" engines/codexDojo/src engines/codexdojo-os-prototype/src
   engines/shared`, then apenas a declaração canônica em `evidenceEnvelope.ts` aparece como
   **definição** do union; `codexDojo/src/domain.ts` e `codexdojo-os-prototype/src/domain.ts`
   importam (ou regeneram de) uma única fonte — `deepening` deixa de faltar nos dois
   dashboards.

### Slice 4 — Split host/funnel

6. When se lista os exports de `engines/shared/teaching-evidence/package.json`, then apenas
   módulos de evidência (envelope/transport/emit); `hostProtocol.ts` + `hostMessageDecoder.ts`
   moram em home própria (contrato host-checkpoint) e `funnelTelemetry.ts` na home de
   analytics — com `pilotSupport.ts` reassentado junto do público que o consome.
7. When os builds/tests dos consumers rodam pós-move (literacyDojo `npm run build && npm
   run test`, dojoToday, OS prototype `npm run build`, pixel `pnpm run build`, voxel CI),
   then verdes — nenhum import quebrado.
8. When o smoke do pixel roda (`engines/pixelDojo/pnpm run smoke`), then as ausências
   seguem garantidas (sem `window.__pixelQuestLearningState`, sem `localStorage
   learning_state/units_log/mastered`) e os records continuam passando validação — o split
   não enfraquece o contrato que já funciona.

## Out of scope

- Migrar o MVP para o gate canônico (convergência de curricula/schedulers) — a Unresolved 1
  decide o destino; este task só documenta a fronteira.
- Linha do mapa para `codexdojo-os-prototype` (issue M9, não-critical) — mesma tabela, outro
  round.
- Fazer o voxel ganhar smoke de ausência de mastery-write (M10, metade não-critical) — o
  critério 3 cobre a validação de emissão; o smoke de ausência é defesa separada.
- Renomear o identificador congelado `voxeldoj-kv-warehouse` — congelado por contrato.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| documento `CONTEXT-MAP.md` | estrutura das tabelas contexts/collisions; o que o leitor faz a seguir (não colapsar os termos) | 1, 2 |
| pacote `@aidevschool/evidence` (exports) | superfície exportada = apenas evidência | 6 |
| emissor `emitEvidence` | recusa de record inválido nomeando o campo | 3, 4 |
| builds dos 5 consumers | verde pós-move | 7 |

## Swept

- validation: 3, 4 (envelope validado nos dois engines antes do dualEmit)
- failure modes: 3 (record inválido → erro nomeando o campo, não emissão silenciosa)
- idempotency and retry: n/a - emissão é append-only por design do transporte (window global + console)
- authorization: existing - games nunca escrevem learner state; smoke do pixel prova ausências (critério 8)
- concurrency and ordering: n/a - sem estado compartilhado novo
- data lifecycle: existing - slices/views regeneram via `python3 -m learner.substrate`
- external-dependency failure: 7 (builds dos consumers falham visível se o link pnpm quebrar - sem silent pass)
- state transitions: n/a - nenhum lifecycle muda
- observability: 5 (a declaração única é o sensor; grep cercável)

## Impact

| Front | What changes |
|---|---|
| domain | new term: Teaching-Evidence Published Language (`engines/shared/teaching-evidence`) - kernel nomeado no mapa, owns envelope/transport/emissão |
| domain | new term: colisões `mastered`/`gate`/`review` (MVP × Journey × literacyDojo) - passam a existir na tabela de colisões |
| domain | existing term: `ReviewReason` meant "union declarado onde cada engine precisa", now means "uma declaração canônica importada" - quem faz branch: codexDojo domain.ts:121, OS domain.ts:120, slices gerados |
| stored data | nothing to migrate - contratos de código e documentos |

## Decided

| Decision | Shape | Alternative rejected |
|---|---|---|
| Home do split host/funnel | Homes separadas dentro de `engines/shared/` (ex.: `engines/shared/host-protocol/`, `engines/shared/analytics/`), consumers atualizados por import | Manter tudo no pacote teaching-evidence - preserva a mistura de três vocabulários que o H5 denuncia |
| Neutralidade do emissor | Emissor aceita identity-key `encounter_id|scenario_id` (a união que o validador já conhece); pixel deixa de contornar | Emissor voxel-only + adapter pixel - cristalizaria o shape voxel no módulo "neutro" |
| Destino do MVP neste round | Documentar (linha no mapa + colisões) | Migrar para o gate canônico - programa de convergência que ninguém decidiu; fica na Unresolved 1 |

## Sources

- Análise de domínio desta sessão (chat 2026-09-13, sem endereço) — H5 + H4: as três
  declarações de `ReviewReason`, o `scenario_id` hardcoded, a validação ausente no voxel,
  o sistema paralelo do MVP (símbolos no Intent)
- `CONTEXT-MAP.md` — tabela de contexts e de colisões (a ser emendada; hoje sem shared/MVP)
- `engines/shared/teaching-evidence/{evidenceEnvelope,evidenceTransport,emit,hostProtocol,funnelTelemetry}.ts`
  e `learner/gate/AGENTS.md` ("the public evidence contract")
- `engines/pixelDojo/playwright/pixel-quest.spec.ts:318-328` — as ausências que o critério 8 preserva
- `engines/aiDevschoolMvp/aidevschool/{curriculum.json, gate_registry.json, scripts/schedule.py}` —
  o sistema paralelo que a linha 2 documenta

## Unresolved

| # | Kind | Question | Until answered |
|---|---|---|---|
| 1 | open | MVP: documentar a fronteira (default deste task) ou abrir programa de convergência com a AI Literacy/gate canônico? | Default: documentar (Decided linha 3). Se convergir, os critérios 1-2 deste task continuam válidos como registro do estado atual, mas o destino final muda |
| 2 | open | `pilotSupport.ts` reassenta em qual home (analytics vs host-protocol vs própria)? | Default: junto do host-protocol (consumer literacyDojo o re-exporta via `src/supportContact.ts`); decidível durante o build, reversível |
