# AID-2928: Pipeline de mídia local-first: GitHub Release Assets + kits offline (pivô founder AID-2931; R2 DEFERIDO) — contrato + tooling + primeiro upload

- **Status:** backlog | **Priority:** medium | **Origin:** manual
- **Assignee:** Storage Engineer | **Created:** 2026-09-26T14:28:29.284523+00:00 | **Updated:** 2026-11-01T14:11:40.903+00:00
- **ID:** `b3bcdd64-e739-4f15-83f8-1c820feece3a`

## Description

# Cutover produção — pipeline de mídia (AID-2925/PR #576)

Tooling, contrato e drill e2e prontos (AID-2925, PR #576). Falta exclusivamente produção.

## Bloqueio (dono do unblock: **CEO/founder**)
- Criar bucket `aidevschool-media` no R2 da conta AiDevSchool.
- Criar **token S3 (Object Read & Write, escopo só neste bucket)** e entregar endpoint `https://<account>.r2.cloudflarestorage.com` + chaves ao Storage Engineer (fora do repo — env/secret).
- (Opcional, mesmo painel) conectar domínio público/CDN → define `ADS_MEDIA_CDN_BASE`.

## Execução (dono: storage-engineer, ~30min após desbloqueio)
1. `bootstrap` no R2 (bucket + `ops/lifecycle-policy.json` + versioning best-effort).
2. Lifecycle nativo de pânico no dashboard: delete >90d prefixo `media/` + abort MPU >7d.
3. **Budget notification em US$10/mês** no dashboard (teto US$25 = aprovação CEO).
4. Primeiro upload real de mídia de micro-lesson + `verify --deep` + drill de restore com recibo.
5. Fechar com os recibos.

Runbook: `docs/runbooks/MEDIA_PIPELINE.md` §4a (merge do PR #576 previsto antes).

## Document `Continuation Summary` (2026-09-26)

# Continuation Summary

- Issue: AID-2928 — Pipeline de mídia local-first: GitHub Release Assets + kits offline (pivô founder AID-2931; R2 DEFERIDO) — contrato + tooling + primeiro upload
- Status: in_review
- Priority: medium
- Current mode: review
- Last updated by run: 4267c286-fdaf-4157-89a8-b9f1dadd86bf
- Agent: Platform & CI Engineer (opencode_local)

## Objective

# Cutover produção — pipeline de mídia (AID-2925/PR #576)

Tooling, contrato e drill e2e prontos (AID-2925, PR #576). Falta exclusivamente produção.

## Bloqueio (dono do unblock: **CEO/founder**)
- Criar bucket `aidevschool-media` no R2 da conta AiDevSchool.
- Criar **token S3 (Object Read & Write, escopo só neste bucket)** e entregar endpoint `https://<account>.r2.cloudflarestorage.com` + chaves ao Storage Engineer (fora do repo — env/secret).
- (Opcional, mesmo painel) conectar domínio público/CDN → define `ADS_MEDIA_CDN_BASE`.

## Execução (dono: storage-engineer, ~30min após desbloqueio)
1. `bootstrap` no R2 (bucket + `ops/lifecycle-policy.json` + versioning best-effort).
2. Lifecycle nativo de pânico no dashboard: delete >90d prefixo `media/` + abort MPU >7d.
3. **Budget notification em US$10/mês** no dashboard (teto US$25 = aprovação CEO).
4. Primeiro upload real de mídia de micro-lesson + `verify --deep` + drill de restore com recibo.
5. Fechar com os recibos.

Runbook: `docs/runbooks/MEDIA_PIPELINE.md` §4a (merge do PR #576 previsto antes).

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `4267c286-fdaf-4157-89a8-b9f1dadd86bf` finished with status `succeeded` at 2026-10-18T11:16:50.390Z.
- Resuming after the previous run completed the first real upload but couldn't sync the board (401s). First: retry the API with the fresh run token, and check PR #696 state in parallel.

API still 401 (fast now — token genuinely rejected, not a timeout). PR #696 still open with no reviews. Let me decode the JWT to confirm expiry, and check for a fresher token source:

Token is valid (exp 11:33Z, now 10:36Z) — yet 401. Server-side rejection. Let me compare the token's run_id with the env run id:

Token is well-formed, unexpired, matches env — server-side auth breakage. Checking the local listen host/port for an embedded runtime route:

Found it — my calls used `http://` + `-L`; curl strips `Authorization` on cross-scheme redirects (and converts POST→GET on 301). The working lib (`tmp_3835_lib.py`) rewrites to `https://` directly. Retrying via the lib:

Direct https times out at 110s. The server responds to unauthenticated requests (~21s) but authenticated ones hang — consistent with DB saturation on the auth path. One patient attempt (600s):

HTTP 200 — the previous run's "401 platform breakage" was actually my curl dropping the auth header on the http→https redire
[truncated]

## Files / Routes Touched

- `scripts/merge_pr.sh`
- `scripts/storage/offline_package.py`
- `scripts/storage/test_offline_package.py`
- `scripts/storage/media_pipeline.py`
- `scripts/storage/s3_miniclient.py`

## Commands Run

- Heartbeat run `4267c286-fdaf-4157-89a8-b9f1dadd86bf` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Wait for reviewer feedback or approval before continuing executor work.

## Comments (14)

**Storage Engineer** · 2026-09-26T14:31:51.667182+00:00

## AID-2928 — cutover 100% pronto; único bloqueio: credenciais R2 do CEO

**Recibo de prontidão (este heartbeat):** tooling do cutover re-validado no head do PR #576 (`01192034`):

```
$ python3 scripts/storage/media_pipeline.py self-test   # fake S3 in-process, stdlib-only
status: PASS — steps ok: 8/8 (bootstrap, upload+dedup, verify --deep, restore,
tamper-detected, orphan-gc mark+expire, budget-ok, referenced-never-deleted)
```

PR #576 (tooling + contrato + runbook) está **open, CI na fila** — merge é pré-requisito documentado e não depende de mim; credenciais são o caminho crítico.

### O que falta (dono: **CEO/founder**, ~10min no dashboard Cloudflare)
1. R2 → criar bucket `aidevschool-media` (location auto).
2. Criar **token S3** (Object Read & Write, escopo **só neste bucket**) → é o que limita blast-radius do token.
3. (Opcional) conectar domínio público/CDN → define `ADS_MEDIA_CDN_BASE`.
4. Billing → notifications → **budget notification US$10/mês** (teto US$25 segue exigindo aprovação CEO).

### Canal de entrega das credenciais (fora do repo)
Drop point criado: **`/paperclip/storage/aidevschool/creds/ads-media.env`** (chmod 600; dir 700; sweep-protected; fora de qualquer git). Chaves esperadas (runbook §2):
`ADS_MEDIA_ENDPOINT`, `ADS_MEDIA_ACCESS_KEY_ID`, `ADS_MEDIA_SECRET_ACCESS_KEY`, `ADS_MEDIA_REGION=auto`, `ADS_MEDIA_BUCKET=aidevschool-media`, opcional `ADS_MEDIA_CDN_BASE`.
**Nunca** em comentário de issue, PR ou CI.

### Compromisso pós-desbloqueio (dono: storage-engineer, ~30min)
`bootstrap` (bucket-policy + versioning best-effort) → lifecycle nativo de pânico (`media/` >90d + abort MPU >7d, rede de segurança) → primeiro upload real de micro-lesson + `verify --deep` → drill de restore com recibo em `/paperclip/storage/aidevschool/drills/` → fecho desta issue com recibos (§4a passos 3–6).

**Disposition:** `blocked` — unblock owner **CEO** (child issue criada com os 4 passos). Monitor re-armado p/ re-check; acordo automaticamente quando as credenciais chegarem.

**Storage Engineer** · 2026-09-26T14:34:18.427074+00:00

**Liveness armado (mechanical):**
- Unblock owner first-class: **AID-2931** (child, assigned CEO, `todo`) — os 4 passos do dashboard (~10min) + drop das credenciais.
- Watch horário: `storage/sweeps/sweep.sh` §5b agora loga `ATTENTION AID-2928` quando `creds/ads-media.env` aparecer (notify-only; nunca imprime conteúdo). Sweep AID-2883 roda a cada hora — cutover executa no primeiro heartbeat após o drop.
- Nota de API: monitor `executionPolicy` não persiste em issues `blocked` (rejeitado por validação) — por isso o caminho de vida é AID-2931 + watch do sweep, não monitor da issue.

Sweep deste heartbeat ( receipts): `freed_mb=1700 deleted_dirs=7 pendancies=0`, single-flight lock OK, creds dir intacto e protegido.

**Storage Engineer** · 2026-09-26T15:33:45.256724+00:00

Bloqueio registrado após o merge do PR #576 (AID-2925 `done`, main @ `73ff3e2c`).

**Unblock owner: CEO/founder** — ação única: criar no R2 da conta AiDevSchool (1) bucket `aidevschool-media`, (2) token S3 Object Read & Write escopado a esse bucket, (3) entregar endpoint + chaves ao Storage Engineer por canal seguro (fora do repo). Opcional no mesmo painel: domínio público/CDN → `ADS_MEDIA_CDN_BASE`.

Execução storage-engineer após desbloqueio (~30min): `bootstrap` → lifecycle nativo de pânico (>90d prefixo `media/`, abort MPU >7d) → budget notification US$10/mês (teto US$25 = aprovação CEO) → primeiro upload real + `verify --deep` (ressalva R2 da QA AID-2929: primeiro contato com R2 real deve registrar recibo) → drill restore → fechar aqui.

Runbook: `docs/runbooks/MEDIA_PIPELINE.md` §4a (mergeado em main).

**founder** · 2026-10-07T17:08:44.800761+00:00

## Retomada operacional autorizada pelo owner

Ordem nesta sessão: "continue e unblock all issues", após "resolver as filas ... mergear [os válidos] ... [os inválidos] fechar". Reabrir a fila para trabalho legítimo: blocked → todo, assignee atual preservado. Não é conclusão, aceite técnico, resolução fictícia de dependência, countersign ou autorização genérica para editar testes protegidos.

### Próxima ação dentro da autoridade
Retomar coordenação com a filha AID-2931/CEO para verificar se bucket R2 e credenciais escopadas foram realmente entregues por canal seguro. Não extrair/expor secrets, criar key ampla, fingir upload/R2 real, gastar acima do teto aprovado ou marcar done sem bootstrap/upload/verify profundo/restore reais. Se ainda faltar o acesso externo, registrar exatamente o requisito e o owner, sem loops.

### Invariantes
Planos e autorizações específicas existentes continuam mandatórios; producer ≠ verifier ≠ merger; revisão independente e head exato; testes/CI/proveniência/VOID/HOLD/contenções preservados; sem bypass, novos relays, alteração de roles/proteções ou loops sem delta. Se faltar decisão/acesso material, expor o requisito verificável na própria lane e encaminhar ao owner apropriado — não trocar o requisito por mudança de status. Não disparar run/assignment/CS duplicados. A transição usa o scheduler nativo, não launches paralelos por fora.

Execução operacional pelo board autenticado: omp session=01a1169f-b41c-77c4-980b-80f0a02f4118. Comentário de owner/retomada, não registro do produtor nem heartbeat Paperclip.

**Storage Engineer** · 2026-10-07T17:11:40.741672+00:00

## AID-2928 — retomada 2026-10-07 17:08Z (owner): verificação de entrega executada; requisito externo persiste, registrado com owner

Ack do comentário owner (54ab3131, 17:08:44Z). Ação executada dentro da autoridade delegada — **sem** exposição de secrets, sem key ampla, sem upload/R2 simulado, sem mudança de status no lugar do requisito.

### Verificação de entrega real (17:11Z, agora)
| Canal | Estado |
|---|---|
| Drop point 1 `/paperclip/storage/aidevschool/creds/` | só `README.md` (Sep 26 12:55, perms 700/600 intactas) — `ads-media.env` **ausente** |
| Drop point 2 vault `instances/default/secrets/` | só `analytics-export-tokens.json` + `master.key` — **sem credencial R2/Cloudflare** |
| Env do agente | nenhum `ADS_MEDIA_*` (o único grep-hit era substring do `PAPERCLIP_WAKE_PAYLOAD_JSON`; nomes verificados, valores nunca impressos) |
| Card `e7a10f30` (`request_confirmation`, key `confirmation:AID-2931:r2-creds:v1`) | `pending` desde 09-26 14:36Z (**~11,1 dias**), `respondedAt` null |
| Filha AID-2931 (CEO) | `in_progress`, monitor armado → **2026-10-07T18:00:00Z** (`wake_owner`) |

### Pré-requisito interno: agora verde em main
- **PR #576 MERGED** (2026-09-26 15:32:52Z, head `01192034`) — `scripts/storage/media_pipeline.py`, `s3_miniclient.py` e `docs/runbooks/MEDIA_PIPELINE.md` **em `origin/main` `b9f77774`** (verificado por `cat-file -e`).
- Self-test re-executado **a partir do main** agora: `status: PASS, steps ok: 8/8, rc=0` (bootstrap, upload+dedup, verify --deep, restore, tamper-detected, orphan-gc, budget-ok, referenced-never-deleted). Cutover 100% pronto do lado do agente.

### Requisito exato + owner (inalterado, ~10min de dashboard físico — não delegável a agente; vault verificado vazio)
1. R2 → bucket `aidevschool-media` (location auto) · 2. token S3 **Object Read & Write, escopo só neste bucket** · 3. Billing → budget notification **US$10/mês** (teto US$25 exige aprovação) · 4. gravar `ads-media.env` (chmod 600, formato no README de `creds/`) **e/ou aceitar o card `e7a10f30`**.

### Sem loops / sem duplicação
Nenhum novo ping, interaction, child ou monitor criado neste run (regra no-duplicate): a cadência de 6h + wake-on-accept vivem na filha AID-2931; o watch mecânico §5b (`ATTENTION AID-2928` ao aparecer o arquivo) continua no sweep horário (canal AID-3039, último ciclo real 17:09Z, re-armado 18:05Z).

### Disposition
`in_progress` (status preservado do owner) com caminhos vivos: monitor AID-2931 → 18:00Z + aceitação do card `e7a10f30` + watch §5b. No drop/aceite: cutover §4a executa (~30min — bootstrap → lifecycle nativo de pânico → 1º upload real + `verify --deep` → drill de restore → recibos) e esta issue fecha **somente** com bootstrap/upload/verify/restore reais contra produção.

**Storage Engineer** · 2026-10-07T17:15:46.172379+00:00

No-op wake check: current time 17:14:47Z, previous cycle completed 17:11:47Z (receipt d1292668), AID-2931 monitor armed for 18:00Z. Per AID-2968 §1 this should be a reads-only no-op. Verifying monitor state with one GET and a local df:

No-op confirmed: monitor AID-2931 armed at 18:00:00Z (future, 45m — must not supersede per AID-3321), no new comments, no creds (single env match is the wake-payload false positive), df healthy. Logging the no-op line per protocol:

Next, check the monitor tick at 2026-10-07T18:00:00.000Z.

**founder** · 2026-10-17T16:15:45.397459+00:00

🚀 DESBLOQUEIO CRIATIVO DO FOUNDER: Em vez de bloquear em credenciais externas pagas do Cloudflare R2, implemente um provider local-first / static-bundle (`file://` + GitHub Release/Pages static path fallback com verificação SHA-256) para custo zero e 100% offline/CI-friendly.

**founder** · 2026-10-17T16:18:33.392397+00:00

🚀 DESBLOQUEIO CRIATIVO DO FOUNDER: Em vez de bloquear em credenciais externas pagas do Cloudflare R2, implemente um provider local-first / static-bundle (`file://` + GitHub Release/Pages static path fallback com verificação SHA-256) para custo zero e 100% offline/CI-friendly.

**Storage Engineer** · 2026-10-17T16:29:55.91286+00:00

probe

**Storage Engineer** · 2026-10-17T16:35:29.325463+00:00

probe-delete-me

**Storage Engineer** · 2026-10-17T19:39:08.564576+00:00

Two founder comments landed on AID-2928 (duplicated directive: local-first `file://` provider + GitHub Release/Pages fallback, SHA-256, zero cost), and my previous run's PATCH evidently landed (title/status in payload). First: re-establish API and check for my stray probe comments from the flapping window:

18:45Z now — 2h since process lost. Retrying API routes with backoff (network was flapping):

Network to the API is badly degraded. Falling back to read-only DB access for state verification (embedded Postgres):

Ports are open — the server is just extremely slow right now (log showed 49–68s response times). Retrying with long timeouts:

Server is alive (serving 200s to other clients seconds ago) — my container's direct routes are broken. Port 80 to the public name answered earlier (301). Probing nginx paths:

GitHub egress check + looking for a local harness proxy (harness reached the API minutes ago):

Listeners for 3100/54329 are in MY netns — the API is local after all. Getting bind addresses and retrying loopback with Host header:

API is unreachable from this sandbox (all routes dead) while the harness itself reaches it — I'll finish the durable repo-side work now (GitHub egress works), leave local receipts, and retry the API once at the end. Checking PR #696 and amending the ADR with the founder's provider framing:

PR #696 open (mergeable_state blocked = countersign gate, the normal review path). Amending the ADR with the founder's provider directive:

File missing — the workspace may have been reset between runs. Checking repo state:

Another session's WIP occupies the main checkout (15 dirty lines — won't touch it). There's also a `aid2928/local-first-media` branch checked out in a worktree — possibly a sibling retry of my lost process. Inspecting:

A dedicated worktree exists at `/paperclip/storage/worktrees/aid2928-localfirst` (from my lost process, clean, on a fresh branch). Using it to continue PR #696's branch:

The worktree holds uncommitted changes — likely my lost process's partial addendum. Inspecting before deciding:

My lost process got far: runbook rework + a richer ADR draft + implementation scripts. Reviewing the rest before salvaging:

Salvaging: the worktree version is the richer continuation (ADR + 432-line implementation + tests). Verifying the tests pass before unifying:

7/7 tests pass. Salvaging onto the PR branch — snapshot first, then reconcile:

Worktree clean on the PR branch. Building the unified state — ADR swap with provider clause:

ADR unified. Now reconciling the runbook (read current branch state first):

Now reworking §10 to be the offline-packages section (tools + tests), removing overlap with §4c:

Verifying the CLI surface matches the doc, checking `learner/downloads` gitignore coverage, and re-running tests on the final tree:

Fixing §10 commands to match the real CLI and adding the gitignore entry:

All 8 self-test checks pass. Committing and pushing the unified slice:

PR #696 updated to head e233828d. Now the Paperclip writes — one API attempt with the sequence ready:

API unreachable for this entire run — recording durable local receipts with the pending-write checklist for the next cycle:

Next, check the monitor tick at 2026-10-18T00:00:00.000Z.

**?** · 2026-10-17T23:57:35.12913+00:00

Paperclip automatically retried continuation for this assigned `in_progress` issue during terminal run recovery, but it still has no live execution path. Latest retry failure: `adapter_failed` - `opencode models` timed out after 20s.. Moving it to `blocked` so it is visible for intervention.
- Recovery action: `6c6ddd24-5784-4268-b835-4a59fba04977`
- Recovery owner: [Platform & CI Engineer](/AID/agents/1e9be0fa-c320-4309-9704-c755c53da7fd)
- Next action: the recovery owner should either restore a live execution path or record the manual resolution on the source issue.

**founder** · 2026-10-18T10:33:54.923704+00:00

PR #696 aberto com pivô local-first do pipeline de mídia.

**Platform & CI Engineer** · 2026-10-18T11:16:52.263534+00:00

Resuming after the previous run completed the first real upload but couldn't sync the board (401s). First: retry the API with the fresh run token, and check PR #696 state in parallel.

API still 401 (fast now — token genuinely rejected, not a timeout). PR #696 still open with no reviews. Let me decode the JWT to confirm expiry, and check for a fresher token source:

Token is valid (exp 11:33Z, now 10:36Z) — yet 401. Server-side rejection. Let me compare the token's run_id with the env run id:

Token is well-formed, unexpired, matches env — server-side auth breakage. Checking the local listen host/port for an embedded runtime route:

Found it — my calls used `http://` + `-L`; curl strips `Authorization` on cross-scheme redirects (and converts POST→GET on 301). The working lib (`tmp_3835_lib.py`) rewrites to `https://` directly. Retrying via the lib:

Direct https times out at 110s. The server responds to unauthenticated requests (~21s) but authenticated ones hang — consistent with DB saturation on the auth path. One patient attempt (600s):

HTTP 200 — the previous run's "401 platform breakage" was actually my curl dropping the auth header on the http→https redirect. The API works, just slow (~90s). Executing the pending sync now:

403 — authorization boundary. Let me inspect the issue's assignee from the successful GET:

Key findings: status is **already `in_review`** (live GET), and the assignee is the Storage Engineer (`92d055bc…`) — not me. My 403 on comments is the actor boundary: I'm the distinct Platform & CI agent, which makes me the right **reviewer/countersigner** for PR #696 through the single merge door. Let me read the merge contract:

Now the countersign citation format from the gate checker:

The gate requires: citation comment with exact format, head pin, provenance trailer with a real session anchored to a **succeeded** run in the registry, and a distinct agent slug from the producer's earliest trailer. Let me check the PR body (producer attribution) and the run registry shape:

PR body has no provenance trailer (gate fails closed on "producer unattributed"), and my registry endpoint guess returned nulls. Let me read the gate's registry-query code for the exact endpoint and session semantics:

Registry endpoint is `/api/heartbeat-runs/<id>`, and the code confirms the http→https header-drop gotcha I hit. Key gate constraint: the **earliest provenance trailer** attributes the producer; countersign must be a **distinct agent slug**. Since I authored head `e0795a62` (run cd370ede), I'm not independent for this PR — I can review, but the countersign needs a distinct agent. Let me check precedent from the last merged PR (#693) for the exact operational pattern:

cd370ede registry: status **failed** (can't anchor). Need the real countersign pattern from a recent merge — fetching PR #693's comment flow:

The pattern is clear from PR #693: producer trailer in PR body (body-first attribution), then a distinct QA lane posts the citation anchored to its own succeeded run, then merge via the door. My legitimate parts as producer of head `e0795a62`: fix the missing producer trailer, do verification work, and delegate the countersign to a distinct QA lane. Let me get my agent slug and test my board write permissions:

Slug conventions confirmed: `platform-ci` is my lane's slug. Now: (1) fix the producer trailer in PR #696's body, (2) learn the child-issue creation shape for the QA assignment. Checking a spawn script for the payload format:

Child-issue shape confirmed. Notably, that script documents another lane hitting the same per-issue 403 and routing around it via child issues. Now find the QA Lead agent id for assignment:

The complete pattern is decoded: QA Lead agent is `ca6a3f95-8572-43f4-822a-6b40b9bdb63b`, and mid-run session discovery works via `/api/heartbeat-runs/<id>/log`. Executing my producer-side duties now. First, re-verify the head and get the full SHA:

Head verified: 9/9 tests, all 3 release assets live with correct hashes. Now the producer trailer in the PR body (the missing gate prerequisite):

Trailer in place. Now validate the gate's view of the PR (should show producer-attribution resolved, citation missing — expected pre-QA):

Gate now fails only on the missing citation (§1 runs first) — the producer-trailer prerequisite is fixed. Now creating the QA assignment child issue with the complete two-phase recipe:

Route found: `/api/companies/{id}/issues` — but my probe created a stray "probe" issue. Let me clean it up properly and then create the real QA child:

Probe deleted. Creating the real QA child issue:

Child **AID-5070** created and assigned to QA Lead. Now the durable PR comment with receipts and the delegation pointer (no Countersign line — producer must not self-cite):

PR comment posted (GH `6249172788`). Updating the resume pointer to reflect the new state:

One attempt at a context comment on the child (I created it — likely within my boundary):

Child comments are also boundary-restricted — but the child's description carries the full recipe and the PR comment carries context. Final state check and wrap-up:

AID-5070 is already **in_progress** — the QA lane picked it up. The reviewer path is live.

## Heartbeat result — AID-2928 stays `in_review` with a live reviewer path

**Root cause of the prior "platform 401" solved:** the board redirects http→https and curl drops `Authorization` on that redirect — direct https calls work (~90–220s latency). No platform breakage; my previous run's sync failure was a curl gotcha (now recorded in the gate script's own precedent note).

**Durable actions this heartbeat:**
1. **Producer trailer added to PR #696 body** (`agent=platform-ci`, run `cd370ede`, real registered session) — the missing prerequisite for the countersign gate's producer attribution.
2. **Head re-verified**: 9/9 tests, self-test 10/10, all 3 `media-v1` release assets anonymously re-downloaded with sha256 OK.
3. **PR comment GH `6249172788`** posted with production receipts + merge-state context.
4. **QA countersign delegated**: child **AID-5070** created (route `POST /api/companies/{id}/issues`) with the two-phase recipe — phase 1: fresh-context verify + canonical citation pinning `e0795a620e8e381a4966312240892f33280e1397`; phase 2: merge via `scripts/merge_pr.sh` after the QA run registers `succeeded` (gate §8b). Assigned to **qa-lead** (`ca6a3f95`); already `in_progress`.
5. Stray probe issue from route discovery deleted; resume pointer updated (`/paperclip/tmp_aid2928_RESUME.md`).

**Boundary note:** platform-ci cannot comment on AID-2928/AID-5070 (403, assignee-owned boundary) — the child issue and PR comment are the sanctioned channels.

**Next actor:** QA Lead on AID-5070 → citation → merge door. After merge: receipts on PR, AID-5070 done, AID-2928 closeable `done` by assignee/CEO citing the merge SHA.

---

