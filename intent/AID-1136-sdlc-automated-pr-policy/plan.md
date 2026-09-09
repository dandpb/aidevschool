# Plan — AID-1136: política SDLC para PRs automatizados

Change-id: AID-1136-sdlc-automated-pr-policy · From: intent/AID-1136-sdlc-automated-pr-policy/intent.md ·
Status: approved (owner gate: issue AID-1136 traz as decisões como critérios de aceite)

## Files that change

1. `intent/AID-1136-sdlc-automated-pr-policy/intent.md` (new)
2. `intent/AID-1136-sdlc-automated-pr-policy/plan.md` (new)
3. `docs/sdlc/README.md` — substituir a subseção "External-origin PRs (bots:
   Sentinel, Jules)" pela seção canônica "## PRs automatizados (Bolt/Palette/
   Sentinel)", preservando o histórico AID-767/771 e o precedente
   `intent/2026-09-03-xss-dojotoday-sentinel/`.

## Order of work

1. Escrever intent.md + plan.md (fast path, docs-only).
2. Reescrever a seção em `docs/sdlc/README.md` cobrindo: fast path canônico,
   aceitação registrada (founder GitHub OU veredito Paperclip), recusa
   registrada (comentário de fechamento obrigatório), retro-lista dos 5 PRs.
3. Rodar `bash scripts/sdlc_guard_check.sh` contra a base (diff docs-only →
   verde esperado).
4. PR `aid-1136/sdlc-automated-pr-policy` → main; CI verde no head.
5. Verificação independente (QA Lead, child issue) → CONFORME.
6. Merge single-writer CEO citando o countersign (precedente #301/#302/#306);
   receipt na AID-1136 com a retro-lista; atualizar quickstart AID-400.

## Risks

- Duplicar/redundar com a seção existente — mitigado absorvendo-a (mesma
  narrativa AID-767/771 vira histórico da seção nova), não mantendo duas.
- Política vira letra morta (mesmo risco do achado M2) — mitigado pela
  retro-lista visível no README e pelo quickstart apontando à seção.
- Alternativa considerada e NÃO escolhida: manter como subseção curta e
  detalhar só na issue Paperclip (rejeitada: canônico precisa estar no repo).

## Proof

- `git diff origin/main --stat` → apenas `docs/sdlc/README.md` + 2 arquivos
  novos em `intent/AID-1136-sdlc-automated-pr-policy/`.
- `bash scripts/sdlc_guard_check.sh` → exit 0 (nenhum path protegido tocado).
- CI do PR (incluindo job `sdlc-guards`) verde no head SHA.
- QA Lead emite veredito CONFORME contra este plan na child issue.

## Verification split

- Verificador: QA Lead (ca6a3f95), fresh-context, child issue dedicada com
  o diff do PR contra este plan; verdict antecede o merge.
- Merge: CEO single-writer com countersign registrado OU founder no GitHub.
