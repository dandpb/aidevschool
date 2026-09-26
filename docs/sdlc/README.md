# AI-Native SDLC — AiDevSchool adaptation

Source: [The AI-Native SDLC playbook](https://claude.com/blog/the-ai-native-sdlc-playbook)
(Anthropic, 2026-08-21). This document adapts it to this repo and to how work
arrives here (Paperclip issues driven by agents, with the human owner at the
gates). Implemented by AID-394.

## The loop in one paragraph

Code is no longer the bottleneck — plan, review, and governance are. So the
process is a loop of **committed artifacts**: every stage ends by writing a
file the next stage reads, and the owner's attention concentrates at the gates
between stages instead of inside them. Build is wrapped by self-verification
(the session proves its own work) and advisory review (`REVIEW.md`), with
deterministic guardrails as hooks (`.claude/settings.json`). Monitoring and
incidents write back into the loop as new `intent.md` files, so the loop feeds
itself.

```
        ┌──────────────────────────────────────────────────────────┐
        ↓                                                          │
  1 PLAN          2 DESIGN        3 BUILD        4 TEST       5 SHIP      6 MAINTAIN
  intent.md  →    spec.md    →    plan.md   →   diff+tests → review →   monitor
  (owner gate)    (owner gate)    (engineer)    (self-verify) (REVIEW.md)  (bands/alerts)
        ↑                                                          │
        └────────────── new intent.md from findings ───────────────┘
```

## Artifacts and where they live

| Stage | Artifact | Home |
| --- | --- | --- |
| Plan | `intent.md` | `intent/<change-id>/intent.md` |
| Design | `spec.md` | `intent/<change-id>/spec.md` |
| Build | `plan.md` + diff + tests | `intent/<change-id>/plan.md` + normal source tree |
| Test | command outputs / evidence | task record (Paperclip issue comment or PR) — use `docs/sdlc/templates/receipt.md` (AID-1516) |
| Ship | review verdict + commit | git history (audit trail) |
| Maintain | new `intent.md` / regression test | back to `intent/` + test suites |

`<change-id>` is `YYYY-MM-DD-<slug>`; when the work comes from a Paperclip
issue, use `AID-<n>-<slug>`. Templates: `docs/sdlc/templates/`.

## Mapping onto Paperclip (how agents run this daily)

- **Trigger:** a Paperclip issue assignment *is* the intent origin. If the
  issue body already answers problem/outcome/constraints, quote it in
  `intent/<change-id>/intent.md` (link, don't rewrite — one source of truth).
- **Gates:** owner acceptance of intent/spec maps to Paperclip
  `request_confirmation` interactions; the plan gate maps to plan-document
  approval before implementation subtasks are created.
- **Parallelism:** independent streams become child issues (one stream per
  issue), mirroring the playbook's worktree-isolated parallel sessions.
- **Producer ≠ verifier:** the implementing agent never marks its own work
  verified — a fresh-context verifier (subagent or reviewer issue) checks the
  diff against `plan.md` and files the verdict.
- **Small-fix fast path:** for bounded fixes the three artifacts collapse
  into a single short plan block in the task record, but self-verification
  and review are never skipped.
- **Receipt com prova de árvore limpa (mandatory, AID-1516):** every
  build/completion receipt cites first-hand that `git status --porcelain`
  is empty in the shared checkout `_default` **before the issue is flipped
  `done`**; anything that appears is committed (receipt/work-product) or
  deleted with justification cited in the receipt. Template:
  `docs/sdlc/templates/receipt.md`. Prevention of the recurrence class
  "recibos/work-products untracked no `_default`" (AID-1353-F1 →
  AID-1354/PR #338 → AID-1442/PR #343 → AID-1514/F2).

## PRs automatizados (Bolt/Palette/Sentinel) — fast path documentado + aceitação registrada

Fixes and improvements arrive as PRs from automated accounts — Bolt
(performance), Palette (a11y/visual), Sentinel (security), all via
`google-labs-jules[bot]` on the founder's GitHub login. These accounts have
no Paperclip presence and own no accountability trail here, so they cannot
register their own intent: **an open PR is not a delivery.** But merged bot
PRs become precedent, so the written producer link is still required (audit
AID-767/B finding F1; good precedent `intent/2026-09-03-xss-dojotoday-sentinel/`,
retrofitted by AID-771). Policy ratified by AID-1136 (despacho do board,
Registro #7):

### Fast path canônico (antes do merge)

1. **Registro do produtor** — o CEO, ou agente despachado pelo CEO, cria o
   fast-path record **antes do merge**: `intent/<change-id>/` com `intent.md`
   + `plan.md` mínimos (ou, para bounded fixes, um short plan block no task
   record), linkando o PR, o veredito independente e follow-ups (guards,
   re-grants). `<change-id>` segue a regra global (§Artifacts):
   `AID-<n>-<slug>` quando o despacho origina de issue Paperclip (a norma —
   toda aceitação registrada flui por aqui), `YYYY-MM-DD-<slug>` caso
   contrário (ex.: retrofits de PRs de bot sem issue de origem).
2. **CI verde no head** — incluindo o job `sdlc-guards`; PR vermelho não entra,
   sem exceção.
3. **Aceitação registrada** — merge somente com uma das duas formas:
   - founder merge no GitHub (aceite do dono humano no próprio PR), **ou**
   - veredito/countersign Paperclip independente (QA Lead ou fresh-context
     verifier contra o `plan.md`) + merge single-writer CEO citando o
     countersign na mensagem de merge (precedentes #301/#302/#306).

   **Producer ≠ verifier nunca é dispensado:** o registro documenta a cadeia,
   nunca substitui a verificação. Um bot (nem o CEO como produtor) nunca
   verifica o próprio diff.

**Ordenamento binding: veredito + registro ANTES do merge (AID-2219,
2026-09-16).** O item 3 lista formas de *aceitação*, não substitutos do
fast path: qualquer delas — **incluindo founder merge no GitHub** — exige,
antes do merge ser executado, (i) **veredito first-hand FPE/QA postado no
carrier** (triagem aberta não é veredito) e (ii) **registro do produtor
commitado** (item 1). Recorrência da classe AID-767/F1 que motivou a emenda:
PR #460 (Sentinel HIGH XSS dojoToday) merged pelo CEO 25s após a abertura da
triagem AID-2201, com CI verde no head — CI verde prova o guardrail do diff,
não a cadeia pedido → veredito → registro → merge. Mitigação seguiu §retrofit
(veredito AID-2201, retrospective record #463, guard #465; sem rework). O
check operacional dessa regra é o item 4 do §Merge protocol.

### Recusa também é registrada (close mudo é proibido)

PR fechado sem merge leva **comentário de fechamento obrigatório** antes do
close: motivo (veredito, duplicidade, obsolescência, risco), link para a
issue/verdict de origem e, quando aplicável, o destino do trabalho. Fatos
pré-política verificados first-hand (AID-1137 r1/F2): **nenhum dos closes
citados foi mudo.** #282/#283 receberam motivo do founder no instante do
close ("unauthorized bot PR", precedente #268/AID-837 — 22:06:15Z/22:06:16Z
vs close 22:06:15Z/22:06:17Z); #293/#294 receberam motivo ~46s **após** o
close (12:07:07Z/12:07:08Z vs 12:06:20Z/12:06:22Z); #299/#300 foram fechados
**com triagem PR-específica registrada** (AID-1042; AID-1045 veredito CLOSE,
close single-writer CEO). O gap real pré-política em #282–#294: ausência de
**triagem PR-específica pré-close** — o motivo existiu, mas a cadeia
pedido → veredito → close não estava registrada antes do close. Esses closes
são histórico imutável — não reabrir — mas todo close novo registra motivo
**antes** do close. Se o registro escorregar (como no PR #262): retrofit
prontamente como **retrospective record**, marcado como tal no topo de cada
arquivo, citando vereditos e merge SHAs, e deixe a falha alimentar a auditoria.

### Retro-lista canônica dos bot PRs merged (AID-1136, 2026-09-09; completada r2/AID-1137-F1)

| PR | Conta/tema | Merge (SHA, data) | Aceitação registrada |
| --- | --- | --- | --- |
| #216 | Sentinel — enforce HTTPS para BYOK endpoints (`askSocrates`) | `5de4e147` 2026-09-01 | founder merge GitHub; **sem trilha na época** — retrofit `intent/2026-09-01-https-byok-sentinel/` (r2) |
| #227 | Bolt — `pickRandomTrafficTarget` O(N) linear scan | `128b21f4` 2026-09-01 | founder merge GitHub; **sem trilha na época** — retrofit `intent/2026-09-01-traffic-target-bolt/` (r2) |
| #228 | Palette — ARIA labels contextuais (codexDojo render + OS rail) | `f1ec086a` 2026-09-01 | founder merge GitHub; **sem trilha na época** — retrofit `intent/2026-09-01-aria-labels-palette/` (r2) |
| #254 | Bolt — `pickRandomShopId` array allocation | `22c5fdd1` 2026-09-03 | founder merge GitHub; trilha parcial: `intent/AID-695-pickrandomshopid-regression-test/` (teste de regressão) + PR #257 — retrofit adicional não exigido (decisão r2) |
| #262 | Sentinel — XSS dojoToday `renderLocalSuggestion` | `fd7c52aa` 2026-09-04 | founder merge GitHub; retrofit AID-771 em `intent/2026-09-03-xss-dojotoday-sentinel/` + QA AID-766/764 |
| #301 | Bolt — perf pathfinding miniTown | `b8f9d5d4` 2026-09-09 | countersign AID-1087 r2 CONFORME; merge CEO single-writer |
| #302 | Palette — a11y link OS linuxLab (nova aba) | `2f66572c` 2026-09-08 | QA countersign AID-1081 CONFORME @ `763dbbed`; desfecho CEO |
| #305 | Palette — aria-labels agent list | `401c4d5d` 2026-09-09 | founder merge GitHub |
| #306 | Bolt — micro-opt `isCellOccupiedByVehicle` | `aa084ab9` 2026-09-09 | CI 36/36; merge CEO single-writer, precedente #301 |

## Founder-direct engineering PRs (política explícita — decisão CEO AID-1515, 2026-09-12)

**Escopo:** PRs de engenharia onde o produtor é o próprio founder humano
(conta `dandpb`) — classe distinta dos bot PRs (Bolt/Palette/Sentinel via
`google-labs-jules[bot]`) e dos diffs produzidos por agentes Paperclip.
Origem: auditoria SM AID-1514 achado **F1** — PRs #345/#346 merged sem
registro do produtor nem veredito independente.

**Decisão (gate):** o fast path canônico (§PRs automatizados) aplica-se a
essa classe com duas adaptações:

1. **Aceitação** — o founder merge no GitHub é aceite do dono humano e
   permanece forma válida de aceitação (prerrogativa do owner; não há
   countersign hierarquicamente "acima" do dono).
2. **Registro do produtor antes do self-merge** — exigido como em qualquer
   engineering diff: short plan block no task record (ex. `.tasks/<slug>.md`
   tlc-plan, como #346 fez) ou `intent/<change-id>/`. O registro pode viver
   no próprio branch do PR, desde que commitado **antes** do merge. O corpo
   do PR, sozinho, não é registro (não é rastreável como artifact chain).
3. **Producer ≠ verifier nunca dispensado** — o founder que merga o próprio
   diff é produtor verificando o próprio trabalho. Veredito independente:
   - diff que toca **autoridade de processo** (CI/gates/guardrails, política,
     paths protegidos, credenciais): countersign QA fresh-context
     **pré-merge**;
   - engineering bounded comum: countersign no ciclo de auditoria
     (pós-merge OK; o sweep SM/QA cata — foi o que aconteceu aqui).
4. **CI verde no head antes do merge** — incluindo `sdlc-guards`, sem
   exceção (vale para founder-direct como para todos).

A falha de #345/#346 foi o item 2 (e o 3 na forma pré-merge para #346, que
toca CI). O retrofit abaixo supre o registro; os vereditos pós-fato correm
na issue AID-1515 (QA countersign fresh-context, #346 prioritário).

### Retro-lista founder-direct engineering PRs merged sem registro (AID-1515)

| PR | Tema | Merge (SHA, data) | Aceitação registrada |
| --- | --- | --- | --- |
| #345 | harness L4 108/108 — uv.lock + pre-commit check-only + fix cites threejs-dojo | `82e8ef8c` 2026-09-12 | founder merge GitHub; CI 36/36 verde pré-merge incl. `SDLC guardrails (diff)`; retrofit `intent/2026-09-12-harness-l4/`; veredito QA pós-fato AID-1515 |
| #346 | DESIGN.md per-engine (spec Stitch) + CI job `design-md-lint` | `0a85deff` 2026-09-12 | founder merge GitHub; CI 37/37 verde pré-merge incl. guardrails + DESIGN.md lint; trilha parcial in-repo (`.tasks/design-md-frontend.md`); retrofit `intent/2026-09-12-design-md-ci-lint/`; veredito QA pós-fato AID-1515 |
| #349 | `Fix/win path` — docs-reconciliation (DOCUMENTATION/VISION/AGENTS) + wave de conteúdo (miro-tour, wiki, curso-simples, legal/piloto, evidence) + restore digest miniTown + untrack `.loops/` | `d92f2f90` 2026-09-12 | founder merge GitHub; CI zero-falhas no head `845922cc` incl. `SDLC guardrails (diff)` + `product readiness (claims)`; retrofit `intent/2026-09-12-win-path-docs-reconciliation/`; veredito QA pós-fato AID-1522 (conteúdo APROVADO COM RESSALVA — achado A remediado em AID-1528) |

## Merge protocol — hygiene de runs (anti-run-duplicado, AID-1618)

Incidente AID-1612 (2026-09-13): um run duplicado do mesmo agente retomou o
relay com contexto em memória antigo ("falta #364"), sem reler o thread, e
mergeou o PR #364 às 03:50:57Z — 32s após o recibo de hold no thread e contra
o ruling single-writer FPE vigente (postmortem AID-1608; registro
`intent/AID-1618-anti-duplicate-run-protocol/`). Quatro regras binding para
todo writer (hoje o single-writer FPE; sob R1, quem mergar):

1. **Re-read obrigatório pré-write (continuations incluídas).** Toda
   continuation/restart de sessão DEVE reler o thread-alvo do board antes de
   qualquer write/merge — `GET /api/issues/{id}` + `GET /api/issues/{id}/comments`
   cobrindo no mínimo do último recibo de hold/despacho em diante. Contexto em
   memória não é evidência: a sessão recém-retomada pode estar ultrapassada
   por despachos, rulings e holds postados após a sua captura. Merge sem
   re-read é violação de protocolo mesmo com CI verde.
2. **Gate de guardrails no head.** Pre-merge exige o check `SDLC guardrails
   (diff)` presente **e** success no head do PR — "0 failures" na lista de
   checks não basta: a ausência do check também é estado de falha, e lista
   truncada/paginação incompleta não conta como verificação
   (`gh api repos/dandpb/aidevschool/commits/<head-sha>/check-runs --paginate`).
   Ausência ou conclusão != success = não merge. (Correção de registro
   AID-1618: a alegação mid-incidente de guard ausente no head `4e408399` do
   #364 não reproduziu na re-verificação first-hand — os 3 commits do PR
   tinham o check presente+success; o gate permanece como verificação
   explícita por nome.)
3. **Kill de cadeia (runs duplicados).** Ao detectar run duplicado do mesmo
   agente na mesma issue-alvo: (i) identificar as runs —
   `GET /api/issues/{issueId}/live-runs` (+ `GET /api/issues/{id}/active-run`);
   (ii) matar a run obsoleta — `POST /api/heartbeat-runs/{runId}/cancel`
   (hoje board-only para agentes: escalar ao CEO imediatamente se 403);
   (iii) **confirmar a morte re-listando as runs** antes de encerrar a própria
   run ou postar recibo; (iv) se a run respawner, second-kill + escalação CEO
   (precedente AID-1612). Morte sem confirmação não é morte.
4. **Checklist pré-merge para PR de bot (AID-2219).** Antes de executar o
   merge de qualquer PR de bot (Sentinel/Bolt/Palette), responda em voz alta
   os dois checks binários — **"veredito postado? registro commitado?"**:
   - **veredito first-hand postado** no carrier (issue Paperclip do
     despacho) pelo FPE/QA — triagem aberta ou CI verde no head **não**
     contam (norma: §PRs automatizados, "Ordenamento binding"; caso âncora:
     #460/AID-2201, classe AID-767/F1);
   - **registro do produtor commitado** em `intent/<change-id>/` (ou short
     plan block no task record), no branch do PR ou em main, com timestamp
     anterior ao merge.
   Qualquer "não" = não merge, mesmo com founder-merge aceito no GitHub e CI
   verde. Vale para todo merge-writer (hoje CEO single-writer; founder-direct
   segue a adaptação da própria seção AID-1515).
5. **Countersign mecânico p/ paths de autoridade de processo + citação no
   merge commit (AID-2316 gate c → AID-2318, 2026-09-17).** Binding para TODO
   merge-writer (inclui founder-direct), após a 2ª ocorrência da classe
   AID-2219 (merge sem veredito pré-merge: #460/AID-2201 → #478/AID-2292):
   - **(1) Merge-writer set** — merges executados por CEO single-writer ou
     single-writer explicitamente delegado e registrado no carrier ANTES do
     merge. O produtor do diff NUNCA executa merge do próprio PR sem veredito
     independente postado (producer ≠ verifier ≠ merger; AID-2219 item 3,
     AID-1515 §3).
   - **(2) Citação de countersign no merge commit** — toda mensagem de merge
     (squash title/body) cita o veredito que autorizou, linha canônica
     `Countersign: <AID-ID> verdict <commentId-ou-SHA>`; ausência é achado de
     auditoria SM (grep-able em `git log`).
   - **Enforcement mecânico (Stage 1)** — o check `SDLC guardrails (diff)`
     exige no PR (body ou comentário) uma linha `Countersign: <AID-ID> verdict
     <ref> [head=<40-hex>]` (o sufixo opcional `head=` do bloco canônico do
     countersign-gate, AID-2768, é aceito desde AID-2815 — gramática idêntica
     à do `countersign_gate_check.py`: espaços ao redor do `=` e 40 hex
     case-insensitive; ref em fim-de-linha segue válido) com AID resolvível
     quando o diff toca paths de autoridade de
     processo (`scripts/sdlc_guard_check.sh`, `scripts/sdlc_aid_resolve.sh`,
     `docs/sdlc/**`, `.github/workflows/**`, `intent/README.md`) — sem
     citação válida o guard fica VERMELHO (fail-closed); com citação emite
     `::notice` auditável. Como o check é required context no head, a citação
     só pode ficar verde ANTES do merge — o gate verifica a **citação**, não
     o conteúdo do veredito: o veredito first-hand FPE/QA continua exigido
      (AID-1515 §3; CI verde ≠ gate completo).

   **Emenda Stage-2 (AID-2428, GO CEO AID-2426/D3, 2026-09-18).** Após o
   1º merge de bot pós-Stage-1 (#495/`ccd42d6f`, 11:40:31Z) descumprir a
   citação — merge-msg com 0 linhas `Countersign:`, 3ª ocorrência da classe
   sem-linha-canônica (#481→#491→#495) — o gate mecânico passou a exigir a
   citação canônica resolvível de **TODO PR de bot/agent (qualquer diff, sem
   isenção "engine-only"**; precedente #483/AID-2333: producer ≠ verifier
   nunca é dispensado), mantendo a regra Stage-1 por paths de autoridade
   para qualquer autor, e passou a verificar a **ordenação**: o veredito
   citado deve estar postado **antes do merge** — em PR já mergeado só
   contam citações em comentário com `createdAt < merged_at` (citação
   pós-merge é inválida; trailer de body em PR mergeado é fail-closed por
    não ter timestamp verificável). PRs de humano/founder sem paths de
    autoridade seguem fora do gate nesta etapa (comportamento documentado no
    self-test iv). Registro: `intent/AID-2428-countersign-gate-stage2/`.

   **Emenda merge-message canônica (AID-2655, decisão do dono/merge-writer,
   2026-09-26).** 4ª ocorrência da classe sem-linha-canônica (#481 → #491 →
   #495 → #514/`f680490f`: veredito citado apenas inline no título, sem a
   linha grep-ável do item 5(2)). O dono decide pela alternativa (a): a
   linha canônica **na mensagem de merge** permanece a superfície canônica
   binding de auditoria — a citação em comentário de PR pré-merge
   (enforcement Stage-1/Stage-2) é gate ANTES do merge e **não a substitui**
   (a alternativa (b) — comentário do PR como superfície canônica — foi
   considerada e rejeitada: não é grep-ável em `git log`, não sobrevive
   fora do GitHub e não deixa trilha no clone; #514 mostrou que as duas
   superfícies divergem exatamente quando a disciplina falha). As duas
   superfícies passam a ser exigidas em conjunto (defesa em profundidade:
   gate pré-merge no PR + trilha de auditoria pós-merge no commit). #514
   fica registrado como achado MÉDIA — mitigações íntegras (citações
   canônicas `Countersign: AID-2321 verdict …` + trailer `Provenance:` em
   2 comentários pré-merge < merged_at; CI verde 41✓/2skip no head
   `8a293d6e`; producer ≠ verifier ≠ merger) — sem ação retroativa.
   Checklist binding do merge-writer a partir do merge train #515–#522:
   1. ANTES de executar o merge, montar a mensagem contendo a linha
      canônica em linha própria (template: título `Merge PR #N:
      <type>(<scope>): AID-XXXX — <resumo> @ <headSHA>`, contexto/decisões
      inline, e `Countersign: <AID-ID> verdict <commentId-ou-SHA>` no
      corpo — nunca só inline/parêntese no título);
   2. confirmar que o veredito citado está postado first-hand no carrier
      ANTES do merge (ordenação Stage-2);
   3. APÓS o merge, auto-verificar a mensagem do PRÓPRIO merge commit:
      `git show -s --format=%B <merge-sha> | grep '^Countersign: '`
      (rc≠0 = ausência = self-report imediato no carrier, declarado pelo
      próprio merge-writer, não esperando a auditoria SM). Nunca
      `git log -N --grep … <merge-sha>` sem range pinado: caminha o
      histórico e casa ANCESTRAL com a linha (falso PASS estrutural
      pós-#507/`13f22ef4`, reprodutivo no próprio `f680490f` — achado QA
      AID-2658).
   Registro: `intent/AID-2655-merge-msg-canonical-line/`.
6. **Trailer de proveniência por agente em comentários de processo
   (AID-2493, 2026-09-18).** Binding para TODO agente que posta comentário de
   processo no GitHub (veredito, citação countersign, registro de produtor,
   relay de verificação). A credencial GitHub única `dandpb` não distingue
   produtor/verificador/lanes — a adjudicação do incidente do PR #503
   (AID-2490: veredito+citação da lane NÃO-designada AID-2486 às 22:43Z)
   exigiu forense de logs de heartbeat-runs. A partir daqui todo comentário de
   processo postado por agente carrega o trailer canônico, linha única:
   ```
   Provenance: agent=<slug> task=<AID-ID|GH-n> run=<runId> session=<sessionId>
   ```
   - `agent` = slug do papel no board (`qa-lead`, `platform-ci`, …);
     `task` = carrier Paperclip (ou `GH-<n>`); `run`/`session` = heartbeat-run
     e sessão que executaram — exatamente os campos que a forense AID-2490
     teve que reconstruir;
   - **Suporte mecânico (advisory)**: o check `SDLC guardrails (diff)` faz
     parse do trailer quando presente (emite `::notice` auditável com os
     campos) e emite `::notice` de ausência/malformação em comentário de
     processo sem trailer válido (detecção: linha `Countersign:` ou heading
     de veredito `#…Veredito/Verdict`). **Notice-only deliberado nesta
     fase**: é a mitigação imediata enquanto a solução completa (credenciais
     por agente, secret founder **AID-2423**) está pendente; a escalada para
     fail-closed é decisão registrada posterior, não desta mudança;
   - templates canônicos com o trailer: `docs/sdlc/templates/verdict.md`;
   - **Regra de conduta do relay (V3 da AID-2490, binding)**: existindo
     despacho de verificação, relay do produtor é **pointer-only** (aponta a
     issue designada, nunca endereça novo pedido de verificação ao
     verificador); sem despacho existente, o relay pode solicitar verificação
     **citando que é a primeira lane**. Registro:
     `intent/AID-2493-provenance-trailer/`.

## GATE pré-merge mecânico `countersign-gate` (AID-2768 — fim da classe F)

**Classe F** = merge sem veredito independente pré-merge: F1 (#529), F2 (#531),
F3 (#533 — merge pela run produtora 94s após o HELD do guard, citando
countersign VOID). O gate póstumo do AID-2318 valida a citação DEPOIS; convenções
advisory (comentários VOID/HELD) não contêm um produtor com plano stale. Decisão
CEO: AID-2763. Desde AID-2768 a classe F é **mecanicamente impossível**:

- o check **`countersign-gate`**
  (`.github/workflows/countersign-gate.yml` →
  `scripts/countersign_gate_check.py`) é um **required status check** em main
  (`enforce_admins` on): `gh pr merge` FALHA na API para qualquer ator —
  incluindo o produtor na credencial compartilhada — enquanto o check estiver
  vermelho ou ausente;
- o wrapper **`scripts/merge_pr.sh`** é a **única porta de merge**: revalida a
  cadeia live na hora do merge, exige o check verde no head, recusa `--admin`,
  e cita o countersign operativo na merge message. `gh pr merge` cruza é
  bloqueado em runtimes Claude pelo hook `guard-commands.sh` (regra 3).

### Contrato de aceite (fail-closed em toda ambiguidade)

Um merge só passa quando o **comentário de countersign operativo** (o último
comentário com linha `Countersign:`) satisfaz TUDO:

1. **Citação em comentário** (não no body — body não tem horário postável):
   `Countersign: <AID|GH>-<n> verdict <ref> [head=<40-hex>]`;
2. **Resolvável**: o AID/GH citado resolve via `scripts/sdlc_aid_resolve.sh`;
3. **Head pinado**: o SHA full 40-hex do head ATUAL do PR aparece no comentário
   — novo push/update-branch quebra o pin e exige countersign fresco;
4. **Atribuído**: o comentário carrega `Provenance: agent=<slug> task=<AID|GH>-<n>
   run=<runId> session=<sessionId>` (AID-2493);
5. **Agente distinto do produtor** (por AGENTE, não runId — AID-2763): o
   produtor é o PRIMEIRO trailer de provenance da conversa (body conta
   primeiro); sem trailer nenhum → "producer unattributed" → vermelho (formato
   F1/F2: produtor com plano stale simplesmente omite atribuição);
6. **Operativo = último**: um self-cite do produtor DEPOIS de um countersign
   válido (padrão F3) torna-se o operativo e falha;
7. **Não supersedido**: nenhum comentário posterior com marcador VOID ou HELD,
   e nenhum evento `reopened` posterior (close de contenção → reopen não viaja
   com countersign stale; caso #535).

### Bloco canônico de countersign (copiar/adaptar)

```
Countersign: AID-<n> verdict <commentId> head=<full-40-hex-head>
Provenance: agent=<slug-distinto-do-produtor> task=AID-<n> run=<runId> session=<sessionId>
```

### Modelo de ameaça (o que o gate assume honestamente)

- **Credencial GitHub compartilhada**: identidade de agente só existe via
  trailer `Provenance:` (AID-2493/AID-2423); por isso o gate exige trailer na
  atribuição E fail-closed quando ausente. O founder humano funde-se ao
  cofre de credenciais: PRs dele também precisam de countersign de agente
  distinto (prerrogativa do owner permanece via edição do branch protection —
  ação de admin settings fora do caminho de merge, registrada no audit log).
- **Workflow versions**: `pull_request` roda a cópia do PR (dogfooding do PR
  que introduz o gate); `issue_comment` (created) e `workflow_dispatch` rodam
  a cópia de main — a versão autoritativa. O próprio comentário de countersign
  dispara a reavaliação com a lógica de main e sobrescreve o check com o
  veredicto verdadeiro. O wrapper só roda de checkout main atualizado.
- **Escape hatch**: editar a branch protection é a única saída — fora do
  merge path, auditada, e reversível pelo CEO.

### Rollout (registro AID-2768)

1. PR introduzindo gate+wrapper+docs (dogfooding: fica vermelho até countersign
   de agente distinto — QA Lead);
2. merge via wrapper (merger ≠ produtor ≠ verificador);
3. ativação do required check `countersign-gate` na branch protection + backfill
   (workflow_dispatch) nos PRs abertos;
4. demonstração ao vivo registrada no PR citado em AID-2768: merge sem
   countersign válido FALHA mecanicamente; com countersign válido de agente
   distinto PASSA.

### Dedup de assignment de countersign (AID-2844 — máx. 1 issue aberta por (PR, head))

Registro do caso: corrida AID-2832/2833/2834 (2026-09-26 ~07:17Z) — o mesmo
re-pin #2 do PR #545 (head `72dd25b8…`) virou **3 issues quase simultâneas**
criadas por 3 agentes distintos (produtor 07:14:47Z, QA 07:17:28Z, SM
07:17:33Z). Três heartbeats paralelos rodaram a mesma verificação, 2
comentários redundantes caíram no PR e um deles 1s APÓS o merge virou a
citação operativa do re-run de auditoria — artefato vermelho permanente
(AID-2840, achado 1).

**Regra (binding):** no máximo **1 issue de countersign ABERTA** por
`(PR#, head-sha-40hex)`. Quem precisa de countersign (produtor em relay, QA
em delta-revalidação, SM re-taskando pós pin-break) NÃO cria issue à mão —
usa a porta `scripts/countersign_assign.sh`, que resolve o dedup:

1. **Chave canônica no título**: `[CS PR#<n>@<head-40hex>]` (ex.:
   `[CS PR#545@72dd25b86a41be599c5e43109590128b385208bf]`). O lookup é
   mecânico por substring exata; um fallback legado (marcador
   countersign/re-pin + `#<PR>` + head-7hex no título) cobre issues
   pré-chave — é o tier que teria pegado a corrida AID-2832/33/34;
2. **Existindo issue aberta para a chave → REUSE**: bump (comentário de
   dedup) na mais antiga, nunca issue nova. Escalada é na própria issue
   (ping ao assignee; sem resposta em 1 heartbeat → FPE → CEO);
3. **Parada (stalled)**: sem update há mais de `--stall-minutes` (default
   45), o bump carrega a escalada — duplicar NÃO é caminho de escalação;
4. **Só cria quando nenhuma issue aberta pina a chave** — e o título nasce
   com a chave embutida; falha de transporte/API **fail-closed** (exit 1):
   repetir ou escalar ao FPE, jamais criar manualmente.

```bash
# consultar (sem writes): DEDUP CREATE | DEDUP REUSE <issue> [STALLED]
scripts/countersign_assign.sh --check --pr 545 --head <40hex>
# atribuir (cria OU reusa+bump; fail-closed):
scripts/countersign_assign.sh --pr 545 --head <40hex> --assignee <agentId> \
  --title 'COUNTERSIGN QA — PR #545 …' --body-file t.md \
  --provenance 'Provenance: agent=<slug> task=AID-<n> run=<runId> session=<sessionId>'
# offline: bash scripts/countersign_assign.sh --self-test
```

Env: `PAPERCLIP_API_BASE` (default `http://localhost:3100`),
`PAPERCLIP_API_KEY`, `PAPERCLIP_COMPANY_ID`. **Guard de sha fantasma
(AID-2851):** a porta recusa `--head` que não seja o head REAL do PR
(resolvido via `git ls-remote origin refs/pull/<n>/head` ou `gh api`,
fail-closed distinguível em erro de transporte; break-glass
`COUNTERSIGN_ASSIGN_SKIP_HEAD_VERIFY=1` só para exceções owner-approved).
Issues de countersign concorrentes por head diferente são reportadas como
`WARN stale siblings` (higiene: fechar as de head superado). Limite conhecido
(dogfood AID-2844): o bump pode ser recusado pela API quando a issue-alvo
está fora do boundary de autorização do criador — o veredito REUSE continua
válido e o script fail-close SEM criar duplicata; o bump nesse caso segue por
relay no board/FPE. A aceitação da regra é observável na próxima corrida de
update-branch/re-pin: exatamente 1 issue de countersign por (PR, head)
(critério AID-2844).

## Guardrails (what is enforced, and how)

| Control | Type | Enforcement |
| --- | --- | --- |
| No edits to generated/derived paths (`.mavis/`, `.loops/`, `dist/`, `node_modules/`, `.codegraph/`, …) | hook + CI | `.claude/hooks/protect-paths.sh` (PreToolUse, Claude Code) · `scripts/sdlc_guard_check.sh` on the diff in CI job `sdlc-guards` (any runtime) |

| Tests can't be weakened mid-fix (new test files OK; editing existing ones needs owner override) | hook + CI | `.claude/hooks/protect-tests.sh` (PreToolUse, Claude Code) · same CI check |
| No committed credentials (`.env`, keys, tokens in paths or added lines) | hook + CI | `.claude/hooks/guard-commands.sh` (PreToolUse, Claude Code) · same CI check, **no override** |
| No force-push / history rewrite | hook | `.claude/hooks/guard-commands.sh` (PreToolUse) — guards a live git operation; cannot be re-checked post-hoc from a diff, so it stays a runtime + repo-owner concern |
| **Pre-merge countersign de agente distinto (AID-2768, fim da classe F)** | **required check + wrapper + hook** | **`countersign-gate` required status check (`scripts/countersign_gate_check.py`, workflow próprio) — GitHub recusa o merge para qualquer ator · `scripts/merge_pr.sh` única porta de merge (revalida live, exige check verde, recusa `--admin`) · `guard-commands.sh` regra 3 bloqueia `gh pr merge` cru em runtimes Claude** |
| **Dedup de assignment de countersign — máx. 1 issue aberta por (PR, head) (AID-2844)** | **tooling + processo (binding)** | **`scripts/countersign_assign.sh` porta de assignment (check/reuse+bump/create com chave canônica `[CS PR#<n>@<head-40hex>]` no título, fail-closed em erro de transporte) · contrato e caso-registro em §Dedup de assignment (AID-2844) · corrida AID-2832/33/34 = contraexemplo** |
| Verify-your-work reminder per touched surface | hook | `.claude/hooks/verify-nudge.sh` (PostToolUse, advisory) |
| Review passes + severities | advisory | `REVIEW.md` (repo root) |
| Provenance trailer per agent in process comments (AID-2493) | advisory (notice) | `scripts/sdlc_guard_check.sh` check 5 in PR context — parses `Provenance: agent=… task=… run=… session=…`, notices absence/malformation in process comments; never reddens (mitigation phase, see §Merge protocol item 6) |
| SDLC loop itself | advisory (skill) | `.claude/skills/ai-native-sdlc/SKILL.md` |

A skill makes violations rare; a hook makes them close to impossible. Policies
that must hold without exception get a hook behind the skill. Hook overrides
(`SDLC_ALLOW_TEST_EDIT=1`, `SDLC_ALLOW_DERIVED_EDIT=1`) exist for
owner-approved exceptions and are expected to be rare and justified in the
task record.

### Runtime-agnostic enforcement in CI (AID-537)

PreToolUse/PostToolUse hooks only execute in Claude Code sessions, but agents
in this company run on other runtimes — so from AID-394 until AID-537 the
guardrails above were inert for every runtime actually in use (audit AID-400,
Registro #4). Since AID-537, CI job `sdlc-guards`
(`scripts/sdlc_guard_check.sh`, wired in `.github/workflows/ci.yml`) replays
the **same canonical hook scripts** against the committed diff (vs the PR
base), so a violation fails the PR regardless of which runtime produced it:

- every added/modified path goes through `protect-paths.sh` and
  `protect-tests.sh` (an "existence mirror" reproduces the hooks'
  new-test-allowed / existing-test-blocked semantics; deletions count as test
  edits but as derived-path cleanup);
- the PR comparison base is the **current base branch tip**
  (`origin/<base.ref>`), not `pull_request.base.sha`: that payload field is
  frozen at PR creation, and once main advances a stale base turns the diff
  range cumulative — a test main added after the branch point then shows as
  ADDED (new-test-allowed) at head and only fails the main push after merge
  (AID-1272; the `--self-test` pins both classifications);
- every changed path and every added diff line goes through the credential
  rules of `guard-commands.sh`;
- a `--self-test` step runs synthetic violations through the real hooks on
  every CI execution, so the enforcement path itself is continuously proven.

The declarative override remains owner-gated, now with an auditable trailer:
a commit in the PR range carrying `SDLC-ALLOW-TEST-EDIT: AID-<n>` or
`SDLC-ALLOW-DERIVED-EDIT: AID-<n>` suppresses the corresponding CI check for
that range. Work conducted directly on GitHub may instead use `GH-<n>`
for an issue in this repository, for either trailer. The issue must record
the actual owner acceptance and the authorized scope; creating an issue
alone does not grant approval. The trailer is only the audit hook — the cited
AID or GitHub issue must record the actual owner acceptance, and the reviewer/QA verifies that before
merging. When the trailer-authorized diff also touches specs/`sourcePaths`
covered by published readiness claims, the same merge batch must carry an
observation-complete re-grant (AID-2202) — see
[`../product-readiness/REGRANT-RUNBOOK.md`](../product-readiness/REGRANT-RUNBOOK.md)
(rule from PR #462, closed-by-supersede; gate delivered by AID-2203).
This is the same trust model as the live env-var overrides (an
undisciplined session could export those too); the trailer just makes the
exception visible in git history. Credential findings have no override, and
the force-push rule remains runtime-intercepted because a diff cannot prove
how it was pushed.

### Content-wave fixture edits: per-wave trailer, no standing allowlist (AID-554)

Content waves legitimately edit existing test files — contract fixtures kept
in sync with the catalog (`curriculum/ai-literacy/tools/tests/test_content_contract.py`,
`test_facade_contract.py`), migration counts, and the chapter-continuity
smoke. The AID-554 policy for that class is the **per-wave owner-approved
trailer**, not a path allowlist in the guard:

- each authorized wave carries `SDLC-ALLOW-TEST-EDIT: AID-<n>` on the
  fixture-editing commit; the cited AID records the owner acceptance (wave
  plan / relay / triage), and the PR/receipt discloses which fixtures changed
  and why assertions were not weakened; independent QA verifies pre-merge.
  Proven in CI by PRs #235/#236/#237 (trailers AID-581/593/592) and the
  later O1/O3-C1 waves — all green on the `sdlc-guards` job.
- an **allowlist was considered and rejected**: a standing exception on
  exactly the contract tests that guard learning-gate integrity silences the
  tripwire for the highest-value paths; the coupling condition ("only when
  the same diff flips catalog/content") is decidable only per-diff in the CI
  wrapper, which would fork its semantics away from the canonical PreToolUse
  hooks; and the per-exception AID trail — the "no claims without evidence"
  audit hook — would be lost. The trailer's cost is one chore commit per
  wave, which doubles as the disclosure.
- the guard must still catch the unapproved case, and does: PR #250 head
  `75294395` failed (edited `tests/fakes.ts` without acceptance) and was
  restructured to comply in `e43e5232` (AID-685/AID-676).
- the pre-policy red on main — PR #222 head `4d02ed36` / merge `aa4d6c5b`
  (l21–l23, QA-audited legitimate in the AID-553 GO verdict, obs. 1) —
  predates the trailer practice and is an immutable historical check run,
  not open debt; every main push since is green.

## Governance / audit

- The chain of commits is the audit trail: who asked (intent), what was
  decided (spec), what was planned (plan), what was produced (diff+tests),
  what was found (review), who shipped (commit/PR).
- Findings from review never approve or block alone — a human/code owner
  decides at the gate.
- Anything touching `curriculum/` or `learner/` keeps the learning-gate
  golden rules (independent evidence before `mastered`; canonical YAML first,
  then regenerate derived views).

## Metrics (what we watch, per playbook)

- **Leading:** time from trigger to committed `intent.md`; share of changes
  passing verification on the first pass; time to first review verdict;
  share of review findings resolved without a human.
- **Lagging:** rework cycles per change (diff vs `plan.md` departures);
  requirements churn after build starts (`spec.md` commits after first
  `plan.md`); repeat incidents of the same class.

## Rollout order (already done by AID-394)

1. ✅ Skill: `.claude/skills/ai-native-sdlc/SKILL.md`
2. ✅ Hooks: `.claude/hooks/*.sh` + `.claude/settings.json`
3. ✅ Processes: this doc, `docs/sdlc/templates/`, `REVIEW.md`, `intent/`
4. ✅ Wiring: root `CLAUDE.md` + `AGENTS.md` reference the loop

Future stages (optional, when this repo grows CI/monitoring): continuous
evals on agent-config changes (eval suite gating `CLAUDE.md`/skills/hook
edits), deterministic control bands writing monitoring findings back as
`intent.md`, and scheduled security scans with findings routed through the
same review gate.
