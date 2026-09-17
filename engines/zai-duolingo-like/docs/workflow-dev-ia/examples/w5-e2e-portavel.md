# W5 — E2E: habilitar e rodar a suíte (inclusive em máquina nova)

**Quando usar:** depois de mudanças que tocam fluxos de usuário; e sempre que o
projeto muda de máquina/CI — configuração de teste também é código.

## Fluxo

1. Leia `playwright.config.ts`: quem sobe o servidor? qual banco? o que é
   portável e o que está hardcoded?
2. Corrija portabilidade antes de rodar (caminho de banco, portas).
3. Pré-requisitos: build de produção (se o webServer usa `next start`) e
   browsers na versão EXATA do Playwright do projeto.
4. Rode a suíte. Se tudo falhar junto, reproduza UM teste com verbose —
   falha em massa tem causa raiz única.

## Execução real (2026-08-19)

- **Bug de portabilidade encontrado:** `E2E_DB_URL = "file:I:/Development/..."`
  — caminho Windows sobrevivendo de outra máquina. A suíte jamais rodaria aqui.
  Trocado por `path.resolve(__dirname, "db", "e2e.db")`.
- **Build:** `npm run build` (o webServer usa `next start`; warning sobre
  `output: standalone` registrado, não fatal).
- **Primeira corrida: 29/29 FALHARAM.** Diagnóstico por 1 teste: faltava o
  build do browser (`chromium_headless_shell-1234`); o cache tinha outras
  revisões. Causa única, como previsto.
- **Correção:** `npx playwright install chromium` (~95MB no cache do usuário).
- **Segunda corrida: 29/29 passaram em 50.6s** — smoke, navegação, fluxo de
  lição, shop/leaderboard/achievements e playground (LLM stubbed no browser).

## Valor

A suíte E2E voltou a ser um gate utilizável neste ambiente, e a correção de
portabilidade vale para a próxima máquina. A sequência "falhou tudo → um teste
→ causa raiz → re-run" é o coração do workflow.
