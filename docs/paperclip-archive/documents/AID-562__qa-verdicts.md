<!-- issue: AID-562 | key: qa-verdicts | doc_id: 60799e2f-e0e0-4cfb-abc3-6b32dcd1648c | updated: 2026-09-01 22:21:10.826+00 -->

# QA AID-562 — Vereditos pré-merge fase 2: GO nos 4 PRs (#161, #227, #228, #184)

(AID-562)

# Receipt QA AID-562 — vereditos independentes pré-merge (gates fase 2)

**Veredito: GO nos 4 PRs (#161, #227, #228, #184).** Merge liberado do lado QA, na ordem #161 → #227 → #228 → #184. Verificação first-hand pelo QA Lead (producer ≠ verifier): repo `dandpb/aidevschool`, base `main@42975a98`, worktrees scratch descartáveis, zero pushes, zero commits em branches de PR, nenhum estado canônico de learner tocado. Evidências persistidas em `workspaces/ca6a3f95-…/aid562-evidence/`.

## Pré-condições confirmadas (4 PRs)
- Heads EXATOS da ordem: #161=`757a5374`, #227=`cd696779`, #228=`0d989178`, #184=`fd183af9`; todos open, merge-base = `42975a98` (= main; nada BEHIND no momento do veredito).
- CI por head (runs 33559610403/0659/3401/7209, todos `pull_request`): **36 jobs cada, 0 falhas** — inclui os 4 contexts requeridos pelo branch protection (`literacyDojo (TS + content)`, `codexdojo-os (TS)`, `Python (learner + curriculum shared)`, `product readiness (claims)`). ⚠️ Onda de atenção: a API de check-runs pagina em 30 e "esconde" jobs — usem `actions/runs/{id}/jobs --paginate`. `mergeable_state=blocked` é apenas review obrigatória (0 reviews) — é exatamente este gate.
- Simulação merge-tree da sequência completa (4 passos): **zero conflitos**; árvore final = união exata dos 16 arquivos dos 4 PRs, sem interações inesperadas.

## #161 — CI OpenClaw read-only: **GO**
- Passos do PR executados localmente no head: `python -m engines.openclaw --preview` rc=0 (avalia `cycle-complete` do status canônico, sem escrever) + `test -z "$(git status --porcelain -- learner/)"` rc=0; porcelain limpo na **árvore inteira**, não só learner/.
- Contra-prova (guard é eficaz, não vacuoso): `--phase spec … --mode simulate` no mesmo head muta `learner/pipeline_status.yaml` (M) → o assertion do PR daria rc=1 e falharia o job.
- `--preview` tem testes próprios (`test_cli_preview.py`: lê sem escrever; HALT→rc≠0); pytest openclaw **23/23** local; `ci.yml` parseia como YAML; nenhum nome de job/required context mudado.
- Tradeoff (divulgado e aceito): perde-se o smoke forçado do artifact de spec do piloto rate-limiter (existência + piso `min_spec_size=100`); o preview avalia o que o status canônico ditar (hoje: cycle-complete → PASS trivial). A lógica `evaluate()` segue coberta pela ilha de 23 testes com fixtures.

## #227 — bolt perf `pickRandomTrafficTarget`: **GO**
- **Equivalência comportamental executável**: harness diferencial instanciando a classe `Town` real de `main` e do head (12 zones/169 buildings com estágios mistos; 361 queries em grade; cenários de empate, só-residencial, town vazia, building com zona órfã; 5x repetição para determinismo). Saídas **byte-a-byte idênticas** (7907B cada, `diff` vazio) — first-closest preservado (`<` estrito = sort estável).
- miniTown no head: vitest **26/26**, `tsc --noEmit` limpo, biome limpo, vite build OK (locais) + CI `miniTown (TS)` com steps `lint/test/typecheck/build/pnpm smoke` **todos success** (run 33559620659). `.jules/bolt.md` é docs-only.

## #228 — palette a11y ARIA labels: **GO**
- codexDojo no head: vitest **88/88** (incl. `render.test.ts` atualizado para `aria-label="Abrir briefing de projeto: …"`), biome, tsc, build OK. Nota de ambiente (registrada): com `NODE_ENV=production` no shell, 2 tests do linuxLab falham porque `import.meta.env.DEV=false` esconde a ponte OS (`LOCAL_OS_URL`); com env limpo 88/88 — CI não seta NODE_ENV. NÃO é regressão do PR.
- codexdojo-os no head: vitest **333/333**, biome lint, `tsc -b` OK; CI com playwright pilot smoke + readiness smokes success.
- Escopo a11y mínimo confirmado: labels contextuais + `title` + `span aria-hidden` no texto visível; escaping via `escapeHtml` mantido; zero referências staled ao label antigo.
- Observação NÃO-bloqueante (advisory WCAG 2.5.3 Label-in-Name): "Avançar ciclo"/"Ver agentes" não são substring contígua dos novos aria-labels ("Avançar para o próximo ciclo"/"Ver todos os agentes") — impacto só em voice-control estrito; botões icon-only (Enviar/Fechar) melhoraram líquido.

## #184 — a11y P2/P3 batch: **GO**
- Hunk redundante RESOLVIDO: no head pós-update-branch, o diff líquido vs `main@42975a98` = 8 arquivos **somente hunks novos** (substituição aria-label→`sr-only`, não re-add). Histórico confere: base original `576d4a5` e main já tinham o aria-label em `OnboardingScreen.tsx`.
- `.sr-only` existe em `literacyDojo/src/styles.css:7` (padrão visually-hidden correto).
- MissionShell: efeito mount-only é são — iframe sem `key` persiste entre trocas de URL; cleanup remove listener+classe.
- Contraste recomputado independentemente (WCAG): route-badge `#657089→#4f5a75` sobre `#edf1f5`: **4.37→6.06:1**; verification-note sobre `--school-primary-soft #e5f2eb` (foundation.css:25): **4.31→5.97:1** — bate com o commit message; ambos agora ≥4.5:1.
- Engines no head: OS **333/333**+lint+tsc; literacyDojo `gen:content` OK (23 lições validadas) + **18/18** + lint + build; voxelDojo shared **2/2** + CI com os 17 jobs de jogo verdes.
- Limitação declarada: `mission-frame-focus` (foco de teclado no iframe) não tem teste automatizado — verificado por inspeção de código + CI smokes não cobrem foco de iframe; recomendo cobertura Playwright futura (não bloqueia).

## Limitações gerais
- Vereditos válidos para os heads citados; se algum head mudar ou main avançar, a FPE aplica update-branch + CI verde como já previsto na AID-561 (rebase-check entre merges).
- #166 permanece fora (close decidido na AID-561); nada aqui depende dele.
- Playwright smoke local não re-executado (browsers não instalados neste runner); cobertura de smoke vem dos steps de CI verdes por head + suítes unit/build locais.

**Disposition AID-562: done.** Fase 2 da AID-561 liberada na íntegra.

— QA Lead (ca6a3f95), AID-562
