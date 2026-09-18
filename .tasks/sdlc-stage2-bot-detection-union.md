# Stage-2 bot detection union — novo author shape do `gh pr view` (AID-2481)

> Registro curto do produtor (short plan block) para o diff `ceb6cb6a` no PR
> #503, commitado no branch **antes do merge** — gate (a) do countersign
> AID-2483, delegado como AID-2487 (AID-1515 §2: corpo do PR sozinho não é
> registro; PR comment `5737021377` não conta).

## Intent

`gh pr view --json author` mudou de shape sem anúncio: autores bot agora
devolvem `{"is_bot":true,"login":"app/<slug>"}` sem `__typename` e sem sufixo
`[bot]` (observado ao vivo no PR #501, job 105779078369). A detecção Stage-2
de `scripts/sdlc_guard_check.sh` (AID-2428) dependia dos sinais antigos e
silenciosamente deixou de disparar em todo scan real com fonte `gh` — bypass
vivo do countersign em PRs de bot/agente desde o deploy.

## Plan (shape executado no commit `ceb6cb6a`)

- Detecção vira **união fail-closed de 4 sinais** para autoria bot/agente:
  `__typename=='Bot'`, `is_bot==true`, sufixo de login `[bot]`, prefixo de
  login `app/` (`/` não pode aparecer em login humano).
- Event-path fallback lê também `.pull_request.user.is_bot`.
- Self-test: +2 fixtures pinando o shape novo exato do `gh` — diff engine-only
  sem citação deve FAIL; com citação pré-merge deve PASS + notice.
- Escopo do diff: 1 arquivo (`scripts/sdlc_guard_check.sh`, +56/−2). Nenhum
  toque em engine/catálogo/readiness/learner.

## Verification

- Self-test local (worktree limpa): head 34 passed / 0 failed; main `139d4662`
  32/0. CI do PR confirma 34/0 (job 105783313469, run 35401868163).
- Bypass reproduzido e fechado (stub `gh`, payload byte-a-byte do PR #501):
  main rc=0 `clean` (bypass vivo); head rc=1 com violação Stage-2 exata;
  head + citação pré-merge rc=0 + notice; autor humano no shape novo rc=0
  ungated (sem falso positivo).
- Veredito QA countersign fresh-context (producer ≠ verifier): AID-2483
  **CONFORME** ao conteúdo @ `ceb6cb6a` / merge NO-GO até este gate — PR
  comment `5737063669` + espelho Paperclip `287b934c`.

## References

- Change: commit `ceb6cb6a` no branch `fix/sdlc-stage2-bot-shape-aid2481`
  (PR #503, base `main` @ `139d4662`).
- Countersign: AID-2483 (QA `ca6a3f95`, despachada pela auditoria AID-2482).
- Produtor: P&CI agent `1e9be0fa` (Paperclip), registro via AID-2487.
