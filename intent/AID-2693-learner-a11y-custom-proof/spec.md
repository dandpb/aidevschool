# Spec: prova custom de a11y no learner app

Change-id: AID-2693-learner-a11y-custom-proof · From:
intent/AID-2693-learner-a11y-custom-proof/intent.md · Status: accepted

## Requisitos

R1 **Mudança real.** A página `docs/curso-simples/index.html` tem hoje
`--faint:#6d84a0` com razão de contraste 4.39:1 sobre `--surface:#0f1d33`
(3.96:1 em `--surface-2`, 3.46:1 em `--surface-3`) — violação WCAG 1.4.3 em
texto real (mini-stats, rótulos de seção, setas de fluxo, rodapé). A mudança
eleva o token para `#8399b4` (≥4.55:1 em todas as superfícies usadas),
acrescenta estilo `:focus-visible` explícito (teclado) e guarda
`prefers-reduced-motion` (a página usa `transition` e `scroll-behavior`).

R2 **Prova custom executável.** `scripts/a11y_check.py` (stdlib-only) valida:
estrutura (lang, h1 único, ordem de headings, alt em imgs, ids duplicados,
alvo do skip-link, texto discernível em links), pares de contraste declarados
(`--pair fg:bg` resolvidos dos tokens `:root` com a fórmula WCAG 2.x) e, em
modo `--full`, guards progressivos (focus-visible, reduced-motion).
Exit 0 = sem violações; exit 1 = violações; exit 2 = erro de entrada.
Único canal de saída: stdout (relatório texto ou `--json`).

R3 **Contrato congelado.** `checks.md` declara C1 (cheap: contraste por pares
de tokens), C2 (standard: suite completa `--full` executada pelo Verifier) e
C3 (cheap: sanidade de compilação do checker). Nenhum comando usa operadores
de pipe `|`/`||` (ver fricção #1 do programa sobre o parser de `checks.md`).

R4 **Loop completo na fábrica.** Runs honestas a partir de worktree novo na
base `c54e12ee`: (a) caso negativo — build sem o fix deve ser bloqueado no
gate pela prova custom (P2 exit≠0); (b) caso positivo — build com o fix deve
ser promovido com o mesmo SHA provado (P4) e head de PR (P5).

## Limites e riscos

- Análise estática de contraste cobre apenas pares declarados; cores
  computadas em runtime ficam para E2E de engine (declarado, não resolvido).
- O checker é novo; falsos positivos controlados por regras conservadoras
  (apenas heurísticas estruturais, nenhuma inferência de DOM dinâmico).
