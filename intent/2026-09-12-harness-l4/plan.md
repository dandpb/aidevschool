# Plan (retroativo): harness L4 — PR #345

> **RETROSPECTIVE RECORD** (AID-1515 / auditoria AID-1514-F1). Plano
> documentado após o merge; o "plano" real foi o corpo do PR do founder.

## O que mudou (diff real do merge `82e8ef8c`; 3 files, +435/−4)

- `.claude/skills/threejs-dojo/SKILL.md` (+4/−4): os 4 cites do Shape A
  passam a qualificar caminhos com o prefixo
  `engines/pixelDojo/pixel-quest/` (registry, types, packValidator,
  curriculumPack) — skill resolve a partir de qualquer cwd.
- `.pre-commit-config.yaml` (novo, 58 linhas): hooks **check-only**
  (validação yaml, merge-conflict markers, large files, byte-compile das
  ilhas Python compartilhadas); deliberadamente **sem auto-fix** —
  evidence/work-product/learner trees são histórico auditável e não podem
  ser reescritas por hook. Exclude-list cobre work-products, docs,
  `.loops/`, `.harness-eval/`, `APRENDIZADOS.md` etc.
- `uv.lock` (novo, 373 linhas, 15 pacotes): installs reprodutíveis.

## CI (re-verificado first-hand, GitHub API)

- Run **947** (event `pull_request`, head `ab009057`, iniciado
  2026-09-12T15:33:26Z): **36/36 jobs verdes**, incluindo
  `SDLC guardrails (diff) → success`. Merge às 15:39:37Z — **depois** do
  verde.
- Run de push pós-merge no `82e8ef8c`: 38 checks verdes/skipped.
- Zero reviews no PR; author = merger = `dandpb`.

## Verificação alegada pelo produtor (não re-executada neste retrofit)

`pytest` 864 passed / 2 skipped; `pre-commit run --all-files` all Passed;
harness-score 108/108. Veredito independente: countersign QA pós-fato
(AID-1515) — não retroativo ao merge, mas exigível agora.

## Follow-ups

- harness-eval Track A: 8 cites broken restantes em `AGENTS.md`, atrás do
  protected-file approval gate (paths relativos que resolvem sob
  `curriculum/02_key_value_store`) — deliberadamente fora do escopo deste
  PR; seguir como trabalho próprio quando o owner aprovar edição do
  arquivo protegido.
- Node engines mantêm tooling próprio (biome/vitest/playwright); este
  config cobre só os suites Python da raiz.
- `.harness-eval/` segue untracked (artefatos de análise).
- Se surgir defeito: trilha canônica = nova issue Paperclip + intent/
  (regra global `AID-<n>-<slug>`), não edição silenciosa deste registro.
