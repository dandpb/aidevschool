# Plan: JSON-LD estruturado (WebSite + Organization) nas 2 superfícies públicas O1

Change-id: AID-2696-jsonld-o1-surfaces · From: intent/AID-2696-jsonld-o1-surfaces/spec.md · Status: approved

Aprovação: GO FACTORY-STRESS desta POC — issue AID-2696 flipada para execução
após (1) PR #527 merged (2026-09-26T02:10:50Z) e (2) confirmação do dono em
AID-2676; missão e acceptance citados no intent.md. Escopo pequeno e
reversível (meta-only) conforme prioridade 2 do papel (quick wins via PR
pequena).

## Files that change

- `engines/literacyDojo/index.html` — +1 bloco `application/ld+json`
- `engines/codexdojo-os-prototype/index.html` — +1 bloco `application/ld+json`
- `intent/AID-2696-jsonld-o1-surfaces/{intent,spec,plan,checks}.md` (new)
- `intent/AID-2696-jsonld-o1-surfaces/validate_jsonld.py` (new) — validador
  determinístico das obrigações (executado pela estação prove)

## Order of work

1. Registro versionado (este diretório) com checks congelados ANTES do
   código (HTML §02 da fábrica).
2. `factory freeze` na base `7a8bc262` (worktree novo; origin/main
   verificado 06:38Z).
3. `factory build`: aplicar os 2 blocos JSON-LD (strings verbatim do meta
   existente) + copiar o registro para o worktree; 1 commit.
4. `factory prove` (contexto verificador distinto) roda C1/C2/C3.
5. `factory gate --pr-head` após push+PR; `factory review` (revisor ≠
   autor ≠ verificador); `factory ledger --verify`.

## Risks

- JSON inválido quebraria rich results, não a página (browser ignora o
  bloco) — mitigado pelo validador C1.
- Drift futuro entre JSON-LD e meta — mitigado por C2 (igualdade
  estrutural) que falha no CI/prove da fábrica.
- Duplicação de copy é intencional e amarrada por C2; alternativa
  considerada e NÃO escolhida: gerar JSON-LD via JS em runtime (pior para
  crawler, adiciona runtime).

## Proof

- `python3 intent/AID-2696-jsonld-o1-surfaces/validate_jsonld.py` → exit 0
  com `OK ld+json …` por superfície (C1+C2).
- `python3 intent/AID-2696-jsonld-o1-surfaces/validate_jsonld.py --strict
  --base 7a8bc262` → exit 0 incl. fence de escopo (C3, profile standard).
- Anti-regressão embutida no validador (canonical/og/twitter presentes).
