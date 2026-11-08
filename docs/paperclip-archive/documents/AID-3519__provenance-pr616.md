<!-- issue: AID-3519 | key: provenance-pr616 | doc_id: fd358774-601e-47d0-b653-b25cc7a1c5fd | updated: 2026-09-30 21:13:36.265+00 -->

# Índice de proveniência — PR #616 (AID-3453 Fatia 1): local vs draft vs integrado vs publicado

(AID-3519)

# Índice de proveniência — entrega PR #616 (AID-3453, Fatia 1: entrada estática `/escola/`)

**Produtor do índice:** Verifier & Evidence Engineer (616b5f9b), heartbeat AID-3519.
**Snapshot:** 2026-09-30 ~21:25Z. Toda evidência abaixo foi coletada first-hand nesta sessão (APIs GitHub + URL live), exceto onde marcado como relato de terceiro com citação.
**Matriz crua auditável:** `aid3519-evidence/raw/` (respostas JSON/HTML originais: PR, reviews, commits, files, check-runs dos 2 SHAs, merge commit, HTML live vs fonte main).

## 1. Identificadores canônicos (verificáveis)

| Campo | Valor | Como conferir |
|---|---|---|
| PR | #616 "feat(literacy): AID-3453 — entrada estática /escola/ no literacyDojo (fatia 1…)" | `gh api repos/dandpb/aidevschool/pulls/616` |
| Branch produtor | `aid3453/escola-static-entry` | idem, `.head.ref` |
| Head aceito | `e95611da670e586dd9597edd3f50cf15d0163c81` | idem, `.head.sha` |
| Base | `main` @ `1975e2c7967cbd4a8af817271de89bf0f70bd617` | idem, `.base.sha` |
| Merge commit (pin) | `d9dbdd5c504ef76a42d3f7944392dccee3eb6351` (merge `--no-ff` 20:54:18Z via `scripts/merge_pr.sh`, porta única AID-2768) | idem, `.merge_commit_sha`; msg completa em `raw/a3519_mergecommit.json` |
| Âncora de rastreabilidade | branch `release/d9dbdd5` no pin (runbook §2) | `git ls-remote https://github.com/dandpb/aidevschool.git refs/heads/release/d9dbdd5` → `d9dbdd5c…` (confirmado) |
| Escopo aceito | **somente Fatia 1**: entrada estática `/escola/` + patch herdado (porte de school-entry @ `80c7addc`, PR #615) + fixes SW F1/F2/queryfix + docs serving; 17 arquivos | `raw/a3519_pr616_files.json` |

## 2. Matriz estado × artefato — local vs draft vs integrado vs publicado

| Artefato | LOCAL | DRAFT (PR head `e95611da`) | INTEGRADO (main `d9dbdd5`) | PUBLICADO (live) |
|---|---|---|---|---|
| Fonte `/escola/` (`index.html`, `escola.js` 478L, `escola.css` 1257L, `entry-contract.js/.d.ts`) | cadeia de 9 commits no worktree do produtor → branch remoto | ✔ no head (commits `7a40753f`…`e95611da`) | ✔ em main; `index.html` raw sha256 `b3fa6e31…` | ✗ **NÃO** |
| Build `dist/escola/` | ✔ promo worktree FPE `/tmp/opencode/promo3453/wt` @ pin, build OK, `dist/escola/index.html` sha256 `b3fa6e31…` (relato FPE a631ebec §2; **hash confere 1º-mão** com fonte em main) | n/a (build não versionado) | n/a | ✗ **NÃO** |
| `sw.js` (F1 chaves isoladas `4610e158`; queryfix pathname `fc1d79fb`; cache v5) | idem | ✔ (+52/−14) | ✔ | ✗ (deploy pendente implica SW v5 fora do ar) |
| Function `literacy-verify.mjs` + analytics/bridge | staging promo **byte-idêntico** ao pin (`diff -r`, paridade real AID-1831 — relato FPE a631ebec §2) | ✔ fonte em `learner/gate/netlify-functions` | ✔ | ✗ |
| Testes (`escola-honesty.test.ts` 10 casos + drift-guard `b34879b6` + `escola-entry.spec.ts` 153L) | worktree produtor | ✔ | ✔ (executados no CI, ver §3) | n/a |
| Evidência visual (4 PNGs `docs/evidence/aid3453-escola/`) | gerada do build real @ `7a40753f` (comentário GH 5916416818) | ✔ versionada no branch | ✔ em main | n/a |
| Gates CI/countersign | — | ✔ countersign-gate success no head (última corrida run `36775797254` @ 20:53:47Z) | ✔ CI do pin: 93 check-runs = 88 success + 5 skipped, **0 fail** | n/a |
| Aceite público QA (AID-3517) | matriz em preparação (dispatch 20:56Z) | — | — | ⏸ **PENDENTE** — execução 1× condicionada à URL publicada |

## 3. Proveniência de papéis — quem produziu, quem decidiu, o que vale

| Papel | Atos | Evidência | Status |
|---|---|---|---|
| **Produtor: LEE** (git author "AiDevSchool Founding Product Engineer") | 9 commits 17:32:40Z→18:32:00Z (feat, evidence, 2× fix SW, test drift-guard, 3× docs serving) | `raw/a3519_pr616_commits.json` | definitivo |
| **PRE** | review `5369816045` 17:37:40Z (serving/hosting, área CODEOWNERS) | GH reviews | **parcialmente RETRATADO** — ver lacuna L2 |
| **FSE** | approve `5369950823` 17:49Z @`040c02da` → changes_requested `5369986498` 17:52Z (achados founder F1/F2/F3/R2/R3) → changes_requested `5370207519` 18:13Z @`b34879b6` (residual único R1-body) → **APPROVED `5370566447` 18:48:35Z @`e95611da`** (delta verificado em worktree independente, mutation checks próprios) | `raw/a3519_pr616_reviews.json` | **só o approve final @`e95611da` vale** — os anteriores são superseded |
| **QA Lead** (agente ≠ produtor) | countersign GO comentário `5917698300` 18:56:37Z, head pinado `e95611da`, run `5ed271ee`, session `ca6a3f95` — escopo explícito: **somente Fatia 1** | comentário GH issue 616 | definitivo |
| **Founder (Dani)** | autorização de integração+publicação **somente do 616** em 20:44:56Z (board AID-3453, comentário `ad9f762a`) | board AID-3453 | definitivo |
| **FPE** | merge 20:53:40Z ready_for_review → 20:54:18Z merged (porta única; countersign verificado live); build+staging @ pin prontos | GH events + a631ebec | merge definitivo; deploy **bloqueado** |

## 4. Veredito por estado (com prova determinística)

- **LOCAL — ✔ encerrado como estágio.** Cadeia íntegra no branch remoto; build promo reproduz o artefato com hash idêntico à fonte em main (`b3fa6e31…`, conferido 1º-mão). Nota: worktree V&E próprio (`wt-2686`) está detached em `2d9928f2` (~90 PRs atrás) — inutilizável para verificação local de 616 sem re-sync (lacuna L6).
- **DRAFT — ✔ encerrado.** Draft de 17:33:27Z até `ready_for_review` 20:53:40Z (evento confirmado). A recusa anterior "still a draft" na porta foi legítima; re-run do countersign-gate `36775797254` success 20:53:47Z → merge 31s depois.
- **INTEGRADO — ✔ confirmado.** `origin/main == d9dbdd5c…` (ls-remote 1º-mão); check-runs do pin: **93 = 88 success + 5 skipped, 0 fail** (terminal; contagens menores em relatos anteriores eram snapshots em curso). `release/d9dbdd5` existe.
- **PUBLICADO — ✗ NÃO PUBLICADO (prova mecânica, 21:2xZ).** `GET https://aidevschool-literacydojo.netlify.app/escola/` → HTTP 200 **porém fallback do catch-all**: `<title>LiteracyDojo — IA com confiança no trabalho</title>`, **0** ocorrências de `entry-contract`. O artefato real tem `<title>AI DevSchool — uma escola, duas jornadas</title>` + 1 ref `entry-contract` (fonte main, raw). **HTTP 200 nunca é prova de publicação aqui** — critério founder `ad9f762a`: "marcador próprio + assets, não só HTTP 200 do fallback".

## 5. Lacunas / contradições concretas (acionáveis)

- **L1 — Deploy não executado (única lacuna de estado).** Bloqueio exato: `NETLIFY_AUTH_TOKEN` ausente no executor do FPE (a631ebec §4, 20:55Z). PRE acionado em modo somente-leitura para checar sessão legítima existente (608c1efd 21:06Z); último estado board 1d333020 21:08Z: "deploy ainda não executado". **Unblock owner: FPE** (apoio PRE; se nenhuma sessão existir → login oficial founder). Já tracked na AID-3453 — **sem duplicação de carrier**. Consequência: AID-3517 (QA pública) permanece pendente de URL.
- **L2 — Evidência retratada em circulação.** Sentença do review PRE 5369816045 "service worker network-first não intercepta `/escola/`" é **FALSA** e foi formalmente retratada (GH 5917147913 18:20:54Z; docs `c56ce706`). Sumários de entregas **não devem** citá-la; a porção válida do review PRE é a análise de serving (catch-all sem force, CSP, rollback).
- **L3 — Approve superseded.** FSE 5369950823 (17:49Z) foi retratado 3 min depois; cadeia válida termina em 5370566447 @`e95611da`. Citar o approve antigo como aprovação do PR é contradição de proveniência.
- **L4 — Divergência de contagens de checks em relatos.** a631ebec cita "45+2skip" no head e "44 em curso" no pin (snapshots); valores terminais 1º-mão: head `e95611da` **48 = 46S+2skip**, pin `d9dbdd5` **93 = 88S+5skip**, ambos 0 fail. Usar os terminais.
- **L5 — Escopo do aceite é estritamente Fatia 1.** Countersign QA e approve FSE negam explicitamente validade para a escola/currículo completos (AID-3453 guarda-chuva segue `in_progress`); **nenhum claim de eficácia pedagógica** — toda evidência aceita é mecânica (honesty 10/10, 261 unit, E2E offline/query, mutation checks). Fases seguintes exigem revisão própria.
- **L6 — Ambientes locais assimétricos.** Worktree V&E `wt-2686` detached @`2d9928f2` (stale); worktree promo FPE é efêmero em `/tmp`. Recomendação: qualquer verificação local futura parte do pin `d9dbdd5` (ou `release/d9dbdd5`), nunca de checkouts antigos.

## 6. Comandos de re-verificação (determinísticos, sem suite)

```
gh api repos/dandpb/aidevschool/pulls/616 --jq '{merged_at,merge_commit_sha,head:.head.sha}'
git ls-remote https://github.com/dandpb/aidevschool.git refs/heads/main refs/heads/release/d9dbdd5
gh api "repos/dandpb/aidevschool/commits/d9dbdd5c504ef76a42d3f7944392dccee3eb6351/check-runs?per_page=100" --jq '[.check_runs[].conclusion]|group_by(.)|map({(.[0]):length})'
# marcador próprio (NÃO aceitar 200 do fallback):
curl -sL https://aidevschool-literacydojo.netlify.app/escola/ | grep -c entry-contract   # 0 = não publicado
curl -sL https://aidevschool-literacydojo.netlify.app/escola/ | grep -o '<title>[^<]*'  # LiteracyDojo… = fallback; AI DevSchool… = publicado
```

## 7. Handoff

- **FPE/PRE**: fechar L1 (deploy) dentro da onda AID-3453; ao publicar, registrar deploy ID/URL/hashes conforme aceite `ad9f762a`.
- **QA (AID-3517)**: gatilho de execução 1× = comando do §6 retornando marcador próprio ≠ fallback.
- **Este índice** (doc key `provenance-pr616` na AID-3519): atualizar a coluna PUBLICADO pós-deploy com deploy ID/URL + timestamp da re-verificação.
