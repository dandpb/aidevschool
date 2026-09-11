# Intent: fábrica de PR de re-grant de readiness pós-merge (Opção A, AID-1308 r1)

Author: Paperclip AID-1357 (dispatch CEO, decisão AID-1355 sobre o ask de AID-1308; owner
FPE fa8130d5) · Change-id: AID-1357-readiness-regrant-automation · Status: accepted (scope
assigned by CEO dispatch; avaliação AID-1308 r1; estimativa ~1–2 dias-eng)

> One source of truth: o corpo da issue AID-1357 + a avaliação AID-1308 r1 (comentário
> 40d327c9). Este arquivo cita; não reescreve. Aceite: workflow `push: main` + subcomando
> `cli.py regrant --propose` + despacho QA, com o loop SDLC completo (intent → spec →
> plan gate → build → QA countersign → merge single-writer CEO).

## Problem

Cada merge de conteúdo na main invalida os source fingerprints dos grants de
product-readiness (`tools/fingerprint.py:51-59` hasheia `sourcePaths` inteiras —
`inventory.yaml` l.24/l.52/l.54-56/l.90/l.124) e o job required `product readiness
(claims)` (`.github/workflows/ci.yml:386-421`) fica vermelho por DRIFT da matriz
renderizada (`cli.py check`) e/ou claims stale (`cli.py enforce`) até uma onda manual
completa: re-executar suítes que o CI já rodou no mesmo ref, re-renderizar, PR docs,
countersign QA, merge single-writer CEO, relays. Evidência do churn (AID-1308 r1):
ondas v36→v43 em ~4 dias (PRs #303/#314/#318/#328/#332/#333), ~15 issues de
relay/countersign em 24h, e uma janela de bloqueio de merge real em 2026-09-10
(15:11Z→re-anchor `b9bc920a`, AID-1295→AID-1305→PR #332).

O desperdício específico: o CI **já produz as evidências de producer no SHA do merge em
todo push** (artefatos `*-readiness-$SHA` por engine + passo `aggregate`,
`ci.yml:400-409`). A onda manual re-faz, via agentes, o que a máquina já rodou. O único
passo que precisa de parte independente é a observação + countersign (por desenho:
25 dos 27 cenários declaram evidência não-playwright (veredito AID-1359/F2; os
2 playwright-only pertencem a um use case que bloqueia pelos demais);
`evaluate.py:29-45` bloqueia
executor só-automático; `evidence.py:93-94` exige `assessorContext:
independent-readiness-review`).

## Proposed outcome

- Um workflow GitHub Actions, disparado após runs do CI em push para `main`, que
  **somente quando o gate de readiness falha no SHA do merge** (re-executado a partir dos
  artefatos do próprio run): baixa os artefatos `*-readiness-$SHA`, roda `aggregate`,
  corta um branch, roda o subcomando novo `cli.py regrant --propose`, e abre PR
  `docs(readiness): auto re-grant vN @ <sha>` com o snapshot de producer e o checklist
  do que falta observar — sem conceder nada e sem mergear.
- `cli.py regrant --propose --input <candidate>`: embrulho write-branch de
  `assess --input` + `render` — recusa escrever na `main`; com candidate só-automático
  (caso do bot), reporta o pendente de observação independente e **não escreve**; com
  observações já mescladas (caso QA na branch do PR), escreve assessment + matriz
  exatamente como `assess --input` + `render`.
- Despacho Paperclip: o PR bot entra pelo fast path canônico (`docs/sdlc/README.md`
  §PRs automatizados, política AID-1136 Registro #7) — issue-filha despacha QA para o
  checklist de observação + countersign; merge single-writer CEO cita o countersign.
- Dedupe (nunca 2º PR de re-grant aberto; label + consulta) e retry p/ flake
  (precedente AID-571).
- Ciclo: onda de ~15 issues → ~2 (countersign + merge); latência do re-anchor de horas
  → minutos; fim da classe "main DRIFT trava merge" no caso comum.

## Affected users and systems

- `.github/workflows/` (workflow novo; `ci.yml` intocado no escopo A) e
  `docs/product-readiness/tools/cli.py` (+ módulo de suporte se a spec pedir) — nenhuma
  engine, nenhum runtime de aprendiz, nenhum conteúdo de curriculum.
- `docs/product-readiness/tests/` (arquivo novo de testes; suíte existente intocada).
- `docs/product-readiness/REGRANT-RUNBOOK.md` (seção nova do fluxo automatizado).
- Papéis: QA Lead (observação + countersign), CEO (merge single-writer), FPE (guardião
  da fábrica). Superfície de usuário final: **nenhuma** (sem review UX necessária).

## Constraints

- **Nada auto-granta**: o PR nunca verifica a si mesmo; `assessorContext` continua
  `independent-readiness-review` e inalcançável pelo bot; DRIFT de render continua
  bloqueante *dentro* do PR de re-grant (o PR só mergeia com `check`+`enforce` verdes
  no head).
- **Bot não mergeia**: branch protection + single-writer CEO preservados; workflow usa
  `GITHUB_TOKEN` apenas para branch/PR (sem novos secrets; sem mudança de secrets de
  produção — aprovação CEO seria necessária para qualquer um).
- PR errado/vermelho → close com motivo (política §recusa; close mudo é proibido).
- Opção B (reestruturar checks required) fora de escopo; Opção C (estreitar
  sourcePaths) REJEITADA pela avaliação — não estreitar fingerprints aqui.
- Sem toque em `learner/`, `curriculum/`, engines. Sem edição de specs/tests
  existentes (teste novo em arquivo novo; hook `protect-tests.sh` permite).
- Gatilho: o despacho diz "enforce falhar"; o caso comum é falha de `check` (DRIFT).
  Decisão registada no plan gate: gatilho = `check` **ou** `enforce` falhando no SHA do
  merge, re-executados no próprio workflow (fallback enforce-estrito é one-line).

## Open questions

1. O setting do repo permite PR criado por `GITHUB_TOKEN`? (Verificação de primeiro
   run; fallback: dispatch manual pelo runbook atualizado.)
2. O despacho Paperclip do QA fica watchdog-cadenciado no carrier AID-1357 (sweep de
   PRs `readiness-regrant` abertos) — cadência suficiente? (Definido no plan.)
3. Id do assessment auto: `<YYYY-MM-DD>-<sha8>-auto-regrant` sem sufixo vN (vN fica no
   título do PR, calculado por contagem) — evita colisão com ids manuais existentes.
