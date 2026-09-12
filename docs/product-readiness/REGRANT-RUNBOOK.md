# Readiness re-grant runbook (anchor que sobrevive ao merge)

Registro operacional da classe de falha AID-1295 / AID-1265 (1º attempt):
**PR-head-verde ≠ merge-verde quando a main anda entre o re-anchor e o merge.**

## Por que acontece

- `product readiness (claims)` recalcula os fingerprints **da árvore corrente**
  (`tools/fingerprint.py`: sha256 por conteúdo de `sourcePaths` + canonical
  `policy.yaml`/`inventory.yaml`/`scenarios/*.yaml`). O gate é fail-closed de propósito.
- Um re-grant produzido contra a head X fica `stale` se o merge combinar a head do PR
  com uma main que recebeu mudanças em arquivos cobertos pelos fingerprints
  (ex.: PR #330 O3-C2 tocando `curriculum/ai-literacy/modules/03*`/`04*`,
  `engines/literacyDojo/src/`, `engines/codexdojo-os-prototype/src/data/missions.ts`
  entre o anchor v42 @ `9d5af73e` e o merge #328 @ `25c0232f`).

## Regra de merge (single-writer)

1. **Corte o branch do re-anchor na tip corrente da main** (`git checkout -b
   fpe/aid-XXXX-readiness-vN main`), nunca numa base antiga.
2. **Merge imediato**: nenhum outro PR pode aterrar na main entre o re-anchor e o
   merge deste. Se outra coisa aterrar, o push-run da main fica vermelho com `DRIFT`
   (falha correta do gate) e o re-anchor precisa ser regenerado.
3. **Antes de clicar em merge**, verifique o commit de merge previsto:
   `gh pr checks <N>` roda contra `refs/pull/<N>/merge` (árvore de merge real).
   Se a main andou depois dos checks, espere re-run e confira verde no merge ref.
4. O **push-run da main pós-merge é o verificador final** fail-closed; se ficar
   vermelho, registre bug e re-ancore (não relaxe o gate).

## Fluxo local de re-anchor (producer ≠ verificador)

```bash
# 1. Gates de producer na árvore corrente (mesmos argv dos cenários):
cd engines/literacyDojo && npm run test:e2e          # emite test-results/readiness/*.json
cd engines/codexdojo-os-prototype && npm run test:readiness  # pilot + trio + reports
# 2. Walks de observação (specs/config arquivados em evidence/observations/<id>/scripts)
# 3. Aggregate → assess → verificação:
python3 docs/product-readiness/tools/cli.py aggregate --reports <dirs...> \
  --observations docs/product-readiness/evidence/observations/<id> \
  --output <candidate>.json --assessment-id <id> --verified-at <ISO> --revalidate-by <DATE>
python3 docs/product-readiness/tools/cli.py assess --input <candidate>.json
python3 docs/product-readiness/tools/cli.py check      # exit 0 obrigatório no HEAD
python3 -m pytest docs/product-readiness/tests -q
```

- O aggregate com observações cobre **apenas** os use cases re-ancorados; cenários
  de outros use cases no mesmo diretório de reports viram decisões `blocked`
  (sem observação) e **derrubam** claims publicados — filtre os reports ao conjunto
  do re-anchor.
- CI nunca concede tier: o candidato automatizado só prova os fatos de producer;
  a concessão vive em `assessments/*.yaml` (contexto `independent-readiness-review`).

## Melhoria estrutural pendente (decisão CEO)

Branch protection "Require branches to be up-to-date before merging" forçaria
re-run dos checks quando a main anda, fechando a janela restante no PR em vez de
descobrir no push da main. Registrado como follow-up; o gate em si permanece
fail-closed.

## Fluxo automatizado (Opção A — AID-1357)

Workflow `readiness-regrant.yml` (`workflow_run`: CI `completed`, `push@main`,
`failure`) propõe o PR de re-grant contra o SHA mesclado. Ele **nunca** concede:
o candidate de CI é `executor: automated`, e o teste de contrato
`test_regrant.py::test_every_use_case_keeps_a_non_playwright_assertion` (R1)
garante que todo use case tem ≥1 cenário com assertion não-playwright — logo
`regrant --propose` sai **3** (pendente) e nada é escrito pelo bot.

### Lifecycle do PR bot (watchdog Paperclip do carrier AID-1357)

1. **PR sem issue-filha** → o watchdog cria dispatch QA com o checklist de
   observação do corpo do PR.
2. **B1a — PR sem check runs**: PR aberto com `GITHUB_TOKEN` não emite eventos
   `pull_request`/`push` (prevenção de recursão do GitHub), então o PR nasce sem
   CI e os checks required ficariam "Expected" para sempre. O watchdog faz
   **close+reopen com a credencial de agente** (a mesma do push/merge);
   `pull_request[reopened]` dispara `ci.yml` (types default, sem filtro) e os
   checks reportam. O reopen leva comentário explicativo — não é §recusa.
3. **Regra do zumbi**: PR com label `readiness-regrant` e sem checks
   reportando **45 min** após a última atividade → **close com motivo**
   ("checks não reportaram; fábrica destravada para o próximo gatilho") para
   liberar a dedupe. Close mudo é proibido.
4. **Fase QA na branch**: QA observa, arquiva bundles em
   `evidence/observations/<id>/`, re-roda `aggregate --observations` +
   `regrant --propose` (exit 0 = escrita do assessment). Commits da fase QA
   usam a credencial de agente → `pull_request[synchronize]` dispara CI normal.
5. **Fechamento**: countersign QA contra o plan; merge single-writer CEO
   **citando o countersign** na mensagem (fast path §PRs automatizados,
   precedentes #301/#302/#306). PR inválido/vermelho → close com motivo (§recusa).

### Regras da fábrica

- **Dedupe**: no máximo 1 PR aberto com label `readiness-regrant`
  (`gh pr list` no workflow; zumbi → close libera).
- **Abort sem PR**: aggregate que falha (artefatos ausentes → validate errors),
  `regrant --propose` exit 1 (defeito: fingerprint divergente, cenário
  reprovado, digest, severe gap), ou nada a commitar.
- **Gate verde → exit 0 silencioso** (check E enforce passam no SHA mesclado:
  nada a re-grant).
- **Exits do `regrant`**: 0 escrita; 1 inválido/defeito; 2 uso/guard (main ou
  detached HEAD); 3 pendente de observação (sem escrita). 2 e 3 documentados no
  usage do CLI (R4).
- **Retry**: download de artefatos e aggregate com 2 tentativas (flake,
  precedente AID-571). Run do CI re-executado dispara `workflow_run` de novo
  naturalmente.

### Fallback manual (primeiro run)

Se o setting do repo bloquear PR aberto por `GITHUB_TOKEN` (falha visível no
primeiro run), o fluxo manual continua o caminho de sempre: §"Fluxo local de
re-anchor" acima + PR aberto pela credencial de agente. Registrar o incidente e
abrir follow-up; **novo secret só com aprovação CEO** (B1b — `workflow_dispatch`
em `ci.yml` — exige OK CEO explícito).
