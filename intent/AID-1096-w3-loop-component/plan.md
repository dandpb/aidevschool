# Plan: W3 — loop component como padrão + forced-colors wave 1

Change-id: AID-1096-w3-loop-component · Status: approved (ordem AID-1096)

## Ordem de trabalho

1. `docs/design/design-foundations.md` (novo; conteúdo §spec R1).
2. literacyDojo: `ChoiceView.tsx` (aria-invalid) + `styles.css` (bloco forced-colors)
   + `tests/app/loopContractW3.test.tsx` + `tests/e2e/a11y-w3-forced-colors.spec.ts`.
3. OS: `ResultScreen.tsx` (testids) + `styles/journey.css` (forced-colors)
   + `ResultScreen.test.tsx` (casos novos).
4. dojoToday: `src/main.ts` (testids) + `src/styles.css` (forced-colors)
   + `playwright/a11y-w3.spec.ts` (emulação forcedColors).
5. Verificação engine-local: literacy `lint+test+build+e2e(w3)`;
   OS `lint+test+build(+smoke pilot)`; dojoToday `lint/ci + playwright(w0/w1/w2/w3)`.
6. Readiness re-grant v39: `cli.py render` → stale esperado nos 6 use cases →
   `producer-report` por engine @ head → observações (walks + screenshots, incl.
   forced-colors) → `aggregate` → `assess` → `render` → `check`+`enforce`+pytest.
   Sentinel `LATEST_ASSESSMENT_ID` v38→v39 com trailer
   `SDLC-ALLOW-TEST-EDIT: AID-1096` (bump mecânico, disclosure no commit).
7. Commits (single-writer), push `aid-1096/w3-loop-component`, PR para `main`,
   checks verdes, RELAY countersign QA, merge permanece do CEO.

## Riscos

- Screenshots/observações dependem de harnesses locais (3 servidores dojoToday,
  vite literacy, preview OS) — mesmo caminho do v38 (AID-1093), reexecutável.
- CI pode revelar suites não rodadas localmente — mitigação: rodar as mesmas
  suites do workflow por engine antes do push.
- Mutation-guard dos testes W3 onde barato (remover regra CSS/regra aria quebra
  o teste) — conferido em pelo menos 1 caso por engine.

## Prova (pronto da onda)

PR merged + doc no repo + countersign QA CONFORME + receipt com deferrals
explícitos (alias 18 tokens; OS sem pares de feedback na alias). Disposição
`done` só com isso.
