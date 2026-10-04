# Observation scripts — v107-r1 (AID-3723)

## Ambiente

- Observador: QA Lead ca6a3f95 (contexto `independent-readiness-observer`), distinto do produtor
  (`readiness-regrant-factory` / AID-1357, trailer no corpo do PR #654).
- Árvore observada: PR head `c819d4a215bcfacdcc80cd37d1f0ac1ef5ce096e` (branch `regrant/auto-20261001-fcf84d3e`
  = main tip `fcf84d3e…` + 1 commit de snapshot de fábrica, 25 JSONs).
  **PR head ≠ merge ref como SHA**: merge ref `refs/pull/654/merge` = `191b53192061629c2b2f6b01b8c01a04634022d5`;
  ambos têm árvore idêntica `c6c546b8df54ea013632ff60b6d6c11c2d93ed25` (verificado 1º-mão 2026-10-02T01:52Z,
  `git rev-parse <sha>^{tree}`). A observação vale para a árvore que o gate avalia.
  Worktree isolado (checkout da fábrica estava em branch de outro agente, AID-3717 — intocado).
- Data: 2026-10-02T01:05–02:00Z. Node v24.18.0, npm 11.17.0, Python 3.

## Composição do bundle (fail-closed, checklist do PR #654 = 25 pendências)

- **9 observações NOVAS v107** (escopo AID-3723 — 3 grupos OS stale): os-literacy-hosted-mission,
  os-literacy-returning-device, os-verification-recovery, os-onboarding-track-choice, os-returning-recovery,
  os-returning-device, os-voxel-hosted-missions, os-renderer-accessibility-recovery, os-voxel-returning-device.
- **16 CARRYOVERS v107** (re-verificação de manutenção — fingerprint inalterado desde v105 e alvos
  byte-idênticos; NÃO são observações novas): os demais cenários do checklist (literacy×6, dojotoday×3,
  pixelquest×3, voxel×3, minitown×1). Distinção marcada em cada nota (`[NOVA OBSERVAÇÃO v107…]` /
  `[CARRYOVER v107…]`) e em `scripts/bundle-manifest.json`.
- Producer-evidence (recibos CI do produtor) é citada apenas como canal de fatos playwright —
  não fundamenta nenhuma asserção de observação.

## Comandos executados (reprodução)

```bash
# worktree isolado no PR head
git fetch origin regrant/auto-20261001-fcf84d3e
git worktree add --detach /tmp/opencode/aid3723-wt2 c819d4a215bcfacdcc80cd37d1f0ac1ef5ce096e

# geometria head vs merge-ref (SHA distintos, árvore idêntica)
git fetch origin refs/pull/654/merge
git rev-parse c819d4a2…^{tree} FETCH_HEAD^{tree}   # ambos c6c546b8…

# 1) reprodução do gate vermelho (na árvore do PR head)
python3 docs/product-readiness/tools/cli.py check                   # exit 0
python3 docs/product-readiness/tools/cli.py check --require-current # exit 1 — 3 STALE-WINDOW OS

# 2) causa e extensão do drift
git show 419d44bc -- engines/codexdojo-os-prototype/src/styles/overlays.css  # +4 linhas CSS-only
git diff --name-only 2b571a55..c819d4a2
# drift v105→v107: compara fingerprints promovidos (results.ndjson) vs snapshot — 9 os-* / 15 iguais

# 3) identidade de producer em 2 canais (fatos playwright; NÃO observação)
#    a. recibos CI push-run 36942785036 @fcf84d3e (artefatos *-readiness-fcf84d3e*) = snapshot 24/24
#    b. recompute cli.py producer-report na árvore do PR head = snapshot 24/24 (excl. runId/executedAt/gitSha)

# 4) observação first-hand: citações re-verificadas (logs/first-hand-checks.log 14/14;
#    logs/first-hand-checks-nonos.log 25/25) e geradas as notas v107 (aid3723_build_obs_r1.py)

# 5) gates de suporte: biome 162 ok; vitest 359 passed; docs 58; factory 166; substrate 221+1s

# 6) PROVA de usabilidade do bundle (sem writes no repo):
python3 docs/product-readiness/tools/cli.py aggregate \
  --reports /tmp/opencode/aid3723-regen \
  --observations docs/product-readiness/evidence/observations/2026-10-01-fcf84d3e-auto-regrant-v107 \
  --output /tmp/opencode/aid3723-candidate.json \
  --assessment-id 2026-10-01-fcf84d3e-auto-regrant-v107 \
  --verified-at 2026-10-02T02:00:00Z --revalidate-by 2026-11-01   # exit 0, 27 resultados
python3 docs/product-readiness/tools/cli.py assess --input /tmp/opencode/aid3723-candidate.json --dry-run
# exit 0 — 9/9 use cases pass, severe-gap blockers: none
```

## Limitações

- `npm run test:readiness` completo (bundle pilot: 19 runtimes via `corepack pnpm install`) não executável
  neste ambiente (falha ambiental corepack; log `os-test-readiness-c819d4a2.log`). Fatos playwright dos 9
  cenários OS cobertos pelo canal de recibos CI @fcf84d3e (producer, executor automated).
- Nenhum commit/push/merge pelo QA (esclarecimento PO1965099e + CEO15aa1999: push limitado dos artefatos
  no PR #654 cabe ao produtor/dono legítimo da branch).

## Sequência exata para o dono legítimo da branch (fase QA — precedentes 2fb688ac/v105, PR #607)

1. `git checkout regrant/auto-20261001-fcf84d3e` (head DEVE ser `c819d4a2…`; se a main andou,
   PARAR e reportar para re-ancoramento — runbook §single-writer).
2. Copiar este bundle para `docs/product-readiness/evidence/observations/2026-10-01-fcf84d3e-auto-regrant-v107/`
   (apenas `observations.json` na raiz + subdirs `logs/`, `scripts/` — o loader faz `glob("*.json")` na raiz).
3. Regenerar os producer reports NESTA head (`cli.py producer-report --engine … --output …`, 6 motores) em
   `docs/product-readiness/evidence/producers/2026-10-01-fcf84d3e-auto-regrant-v107/` — os reports do snapshot
   da fábrica carregam gitSha `fcf84d3e` e o aggregate exige gitSha == HEAD (`c819d4a2`). Identidade 24/24
   pré-verificada (logs/regen-identity.log).
4. Rodar aggregate + assess/regrant ANTES de commitar (gitSha do bundle == HEAD só enquanto o commit não existe):
   `aggregate --reports <dir-regen> --observations <dir-obs> --output … --assessment-id 2026-10-01-fcf84d3e-auto-regrant-v107 …`
   `regrant --propose --input <candidate>` → exit 0 escreve assessment + views (guard: não rodar em main/detached).
5. Commit único (bundle + reports regen + candidate + assessment + views + results.ndjson) e push limitado
   no MESMO PR #654 (synchronize dispara CI; gate `regrant observation completeness` verde no merge ref →
   label `regrant-observation-complete` + recibo). Se o repo exigir, atualizar o pin de teste
   `docs/product-readiness/tests/test_elevation_supersession.py` LATEST_ASSESSMENT_ID → v107 (precedente 2fb688ac).
6. Countersign QA (genuíno, fresh-context) e merge single-writer CEO citando o countersign.
