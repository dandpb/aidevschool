# W8 — Health check de dependências

**Quando usar:** periodicamente (semanal/mensal) e antes de releases grandes.
Objetivo é RELATÓRIO E DECISÃO — upgrade em si é outra spec.

## Fluxo

1. `npm outdated` — o que ficou para trás e quais saltos são major.
2. `npm audit` — vulnerabilidades conhecidas e em qual cadeia vivem.
3. Classifique: minor seguro vs major arriscado vs vulnerabilidade real.
4. Registre o relatório + a decisão (fazer/não fazer agora e por quê).
5. Nada de upgrade "aproveitando" — major vira spec com testes.

## Execução real (2026-08-19)

- **Outdated:** 17 pacotes. Majors notáveis: `prisma` 6→7, `vitest` 3→4,
  `framer-motion` 12→13, `lucide-react` 0.525→1.33, `eslint` 9→10,
  `typescript` 5→7. Minors: next 16.1→16.3, react 19.2.x patch, tailwind 4.1→4.3.
- **Audit:** **3 vulnerabilidades high** na cadeia `deepmerge-ts` ←
  `@prisma/config` ← `prisma` 6.x.
- **Decisão registrada:** nenhum upgrade aplicado neste fluxo. A cadeia
  vulnerável é ferramenta de build/dev (não runtime do browser), mas corrigi-la
  exige mexer no Prisma 6 — mudança de schema/client com risco próprio, que
  merece spec e suíte verde antes/depois (o W1–W7 provaram que a suíte atual
  está saudável para servir de baseline quando isso for feito).

## Valor

O time sabe ONDE está exposto e o que é urgente de verdade — em vez de
descobrir a vulnerabilidade no meio de um release.
