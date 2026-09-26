# Plan: prova custom de a11y no learner app

Change-id: AID-2693-learner-a11y-custom-proof · From:
intent/AID-2693-learner-a11y-custom-proof/spec.md

Status: approved

Aprovação: issue AID-2693 (FACTORY-STRESS, ordem do dono via programa
AID-2736 lote A) exige a mudança real + prova custom como entrega desta
issue; sem decisões pendentes de produto.

## Files that change

- `docs/curso-simples/index.html` — token `--faint` #6d84a0→#8399b4
  (WCAG 1.4.3 em todas as superfícies), `:focus-visible` explícito,
  `@media (prefers-reduced-motion: reduce)`.
- `scripts/a11y_check.py` (novo) — verificador estático stdlib-only.
- `intent/AID-2693-learner-a11y-custom-proof/{intent,spec,plan,checks}.md`
  (novo) — este contrato.

## Steps

1. Congelar contrato a partir do registro versionado na base `c54e12ee`.
2. Build (autor): aplicar patch da página + checker + contrato; commit.
3. Prove (verificador distinto): C1–C3 executam a prova custom de a11y.
4. Gate: fail-closed no caso negativo (página sem fix, exit≠0) e promote no
   caso positivo com SHA provado (P4/P5).

## Verification

- Runs A (negativo), B (fricção de artefatos) e C (positivo completo)
  registradas em `.scratch/factory/` com ledger verificável
  (`python3 -m factory ledger <event> --verify`).
- Receipt na issue AID-2693 com comandos, saídas-chave, fricções e propostas.
