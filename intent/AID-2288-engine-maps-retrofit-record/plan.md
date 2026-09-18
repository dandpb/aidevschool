# Plan: registrar sdlc-quest + re-entrada de zai-duolingo-like nos mapas AGENTS.md

Change-id: `AID-2288-engine-maps-retrofit-record` · From: intent/AID-2288-engine-maps-retrofit-record/intent.md · Status: approved (fast path docs-only; spec colapsado no intent — small-fix fast path, docs/sdlc/README.md §Mapping onto Paperclip)

## Files that change

1. `AGENTS.md` — header (Updated/Source baseline → 2026-09-17 / 3c5629c);
   STRUCTURE: +2 engines; WHERE TO LOOK: +2 rows (comandos); NOTES: nota
   zai-duolingo-like reescrita com a história completa.
2. `engines/AGENTS.md` — STRUCTURE: +2 engines e parágrafo zai reescrito;
   WHERE TO LOOK: +2 rows.
3. `intent/AID-2288-engine-maps-retrofit-record/` (new) — este registro.

Fora do repo (entrega da mesma issue, evidência no receipt Paperclip):
linha #88 do índice `sdlc-audit-index` (doc anexado à AID-1610) registrando
a RATIFICAÇÃO do retrofit-accept.

## Order of work

1. Editar os dois mapas (fatos extraídos first-hand da árvore @ 3c5629c0:
   `package.json`/`README.md` de sdlc-quest, `QWEN.md`/`package.json` de
   zai-duolingo-like).
2. Commitar este registro de intent junto com os mapas no mesmo PR.
3. Validar (Proof) e abrir PR para `main` (merge é do FPE, single-writer).
4. Appendar a linha #88 no `sdlc-audit-index` e postar receipt na AID-2288.

## Risks

- Fato errado nos mapas (ex.: comando inexistente) → mitigado: todos os
  comandos citados conferidos nos `package.json` das engines @ HEAD.
- Escopo creep para docs de engine → evitado: nenhum arquivo engine-local
  tocado; hardens de CI ficam com AID-2286 (Platform & CI Engineer).
- Desync de views de readiness → n/a: `docs/product-readiness/` não consome
  AGENTS.md (verificado por grep; check do CI é determinístico vs decisões
  promovidas registradas).

## Proof

- `git ls-tree -r 9f2f487e --name-only | grep -c '^engines/zai-duolingo-like/'` → **209**
- `git ls-tree -r 9f2f487e --name-only | grep -c '^engines/sdlc-quest/'` → **220** (429 no total, como citado pelo veredito AID-2281 item 5)
- `pytest docs/product-readiness/tests -q` + `python3 -m pytest engines/test_engine_contracts.py -q` → verde (mesmo par de suítes do precedente docs-only 89cdce8e/PR #439)
- CI do PR verde no head (inclui `sdlc-guards`)

## Verification split

Produtor: Docs & Readiness Engineer (este diff). Verificador fresh-context:
QA Lead ou FPE no review do PR contra este plan; merge single-writer FPE
(anti-padrão "producer verifies own work" respeitado).
