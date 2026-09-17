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
5. **Lote que edita specs cobertas por claims** (commit no range do PR com trailer
   `SDLC-ALLOW-TEST-EDIT: AID-<n>` tocando specs/`sourcePaths` de cenários com
   claims publicadas): o lote só é declarado fechado com o
   **re-grant emparceirado completo** — §"Re-grant emparceirado no mesmo lote"
   abaixo. Snapshot de fábrica sozinho não conta como re-grant.

## Re-grant emparceirado no mesmo lote (AID-2202, 2026-09-16)

> Regra trazida do PR #462 (Opção 1 / AID-2204), **closed-by-supersede
> 2026-09-16 23:01Z** — decisão CEO (relay AID-2232/AID-2202): a regra docs
> remanescente da Opção 1 entra neste runbook neste lote (AID-2203 addendum
> r1.1).

**Classe de falha** (repeat-incident de 5 janelas, auditoria SDLC AID-2200
instância #70): um merge aprovado com override de edição de specs deixa a lane
main vermelha em `product readiness (claims)` até intervenção manual, porque:

- o lane de PR trata claims stale como non-blocking **by design** (o verificador
  é o push-run da main, fail-closed);
- a fábrica AID-1357 propõe apenas o snapshot de producer (`regrant --propose`
  exit 3 — pendente de observação independente; o bot nunca escreve).

Evidência do incidente (verificada 1º-mão em 2026-09-16):

- PR #446 (merge `cce67949af`, trailer `SDLC-ALLOW-TEST-EDIT: AID-2121`,
  aceite owner CEO) editou 5 specs playwright de pixel-quest
  (`encounter-evidence-dense`, `error-path`, `evidence-append-only`,
  `pixel-quest`, `returning`) → push-run da main falha com `STALE-WINDOW:
  pixelquest-evidence-encounter … artifact digest does not match` (run
  35145136858).
- Rounds da fábrica #458 (`50d31811ec`) e #459 (`fb4dbc77ed`) mesclaram
  snapshots sem observação independente → 9 features seguem `blocked` com
  `lacks independent evidence` / `missing promoted result` no mesmo run.
- Pushes da main vermelhos consecutivos no job `product readiness (claims)`:
  `4b87d5b29b`, `50d31811ec`, `fb4dbc77ed`.

**Regra (gate AID-2202):** um lote de merge single-writer que contenha PR cujo
diff toque specs/`sourcePaths` de cenários com claims publicadas **fecha apenas
quando o re-grant das scenarios afetadas estiver completo no mesmo lote**:

1. observação independente arquivada em
   `evidence/observations/<id>/` (executor ≠ producer do diff de specs);
2. `aggregate --observations` + `assess`/`regrant --propose` terminando
   **exit 0** (assessment escrito no contexto `independent-readiness-review`,
   com promoted results para os use cases re-ancorados);
3. push-run da main **verde** em `product readiness (claims)` — o lote não está
   "done" antes disso.

Ordem operacional: produza o re-grant emparceirado (manual §"Fluxo local de
re-anchor" ou fase QA na branch da fábrica) **antes** de declarar o lote
fechado; se a observação independente não puder ser produzida a tempo, o merge
do PR de specs **espera** — deixar a main vermelha até intervenção manual não é
opção. Precedentes de re-grant manual com observação independente: #455 (v83,
AID-2153), #457 (v84, AID-2174). Instância em curso na data: AID-2199 (v88).

Evolução da fábrica para propor re-grant já com observação completa: entregue
pelo **observation-complete gate (AID-2203)** — § abaixo. O emparceiramento
permanece responsabilidade do lote de merge (o gate dá o sinal máquina; a
decisão de merge continua single-writer CEO com countersign QA).

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

> Ruído de CI das branches `regrant/auto-*` (vermelho esperado de proposta +
> jobs inacessíveis pós-delete): triagem, root-cause e política de diagnóstico
> durável em [`REGRANT-FACTORY-NOISE-TRIAGE-2026-09-13.md`](REGRANT-FACTORY-NOISE-TRIAGE-2026-09-13.md)
> (AID-1738 §5.1). O cleanup de drill/proposta captura o resumo de jobs da run
> num comentário do PR **antes** de fechar/deletar a branch (decisão C+E).

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

### Observation-complete gate (AID-2203)

O gap sistêmico da AID-2202: um PR de proposta pending (exit 3) era **verde e
indistinguível** de um re-grant completo na superfície PR/CI (check da PR-lane
determinístico vs decisões gravadas — AID-1890; `enforce` filtra razões
producer-only), então o fast path mergeia "heal" sem curar a main. O gate fecha
o buraco com sinal máquina fail-closed:

- **Manifest de estado (R1)**: `regrant --propose --proposal-state PATH` (a
  fábrica usa `docs/product-readiness/evidence/producers/<id>/regrant-proposal.json`,
  commitado junto do snapshot) emite
  `{schemaVersion, status: pending-observation|written, assessmentId, gitSha,
  branch, generatedAt, useCases:[{id, pending:[…]}]}`. Exit 1/2 não escrevem
  manifest; sem a flag, comportamento retrocompatível.
- **Labels (R2)**: `regrant-pending-observation` (`d93f0b` — observation
  incomplete; NOT countersignable; merging heals nothing) aplicada ao nascer o
  PR exit 3; `regrant-observation-complete` (`0e8a16`) no exit 0. O corpo do PR
  nasce com a linha "fast path BLOQUEADO enquanto pending".
- **Check required nomeado (R3)**: workflow
  `readiness-regrant-complete.yml` → job **`regrant observation
  completeness`** = `cli.py check --require-current` no **merge-ref**
  (`refs/pull/N/merge`; eventos `pull_request [synchronize, reopened]` com
  head `regrant/auto-*` + drill `workflow_dispatch` input `pr`). Vermelho =
  re-grant incompleto na árvore que aterraria na main; verde = troca para
  `regrant-observation-complete` + recibo idempotente no PR (marcador
  `regrant-observation-receipt`). Para ficar **required**, o CEO adiciona
  `regrant observation completeness` aos required checks do repo (settings do
  GitHub — mudança de configuração, não de código).
- **Fluxo completo**: proposta (exit 3, label pending, manifest no snapshot) →
  watchdog close+reopen → check vermelho nomeado reporta → fase QA na branch
  (observação arquivada em `evidence/observations/<id>/` +
  `aggregate --observations` + `regrant --propose` exit 0) → `synchronize` →
  check verde + label complete + recibo → countersign QA → merge single-writer
  CEO citando o countersign.
- **Retrofit**: PR de proposta pré-AID-2203 (sem manifest) é gated pelo mesmo
  check; vermelho adiciona o label pending (o recibo só comenta quando verde —
  PR antigo pendente fica com o check vermelho nomeado, suficiente para o fast
  path não mergear por engano).
- **Nota `revalidateBy`**: o check também fica vermelho quando um grant gravado
  passa da data de revalidação — correto (fail-closed, mesma semântica da lane
  main); esse vermelho exige re-grant, não é falso positivo do gate.
- **Confiança**: o label-swap é feito pelo `GITHUB_TOKEN` do repo (mesma classe
  dos PRs da fábrica) — sinal **necessário, não suficiente**; countersign QA
  fresh-context pré-merge permanece obrigatório (diff que toca autoridade de
  processo). Cross-ref: AID-2202 / PR #462 (closed-by-supersede) / §"Re-grant
  emparceirado no mesmo lote" acima.

### Protocolo de cleanup de drill/proposta — captura durável de jobs (C+E, AID-1741)

Decisão C+E da triagem do ruído da fábrica
([`REGRANT-FACTORY-NOISE-TRIAGE-2026-09-13.md`](REGRANT-FACTORY-NOISE-TRIAGE-2026-09-13.md)
§4, PR #391 / AID-1738 §5.1; IMPL AID-1741): o **auto-delete permanece** — a
durabilidade do diagnóstico muda de lugar, da branch (efêmera: pós-delete
`actions/runs/{id}/jobs` devolve `[]` e check-runs evapora) para o **PR +
recibo do drill** (duráveis).

Quem fecha um PR de drill/proposta (executor do drill PRE/QA, ou o watchdog
no caso zumbi/§recusa) passa a seguir, **nesta ordem estrita**:

1. **Capturar os jobs das runs de CI do head do PR antes de qualquer write de
   cleanup**:
   `docs/product-readiness/tools/capture_drill_jobs.sh <PR>` — resolve as
   runs `pull_request` da branch do PR (`actions/workflows/ci.yml/runs`,
   head_sha casado), lê `actions/runs/{id}/jobs` de cada uma e comenta no PR
   **nome+conclusão de cada job não-verde** (+ índice de runs com
   id/URL/SHA/branch/timestamp; marcador idempotente `drill-jobs-receipt`).
   Runs não-verdes **sem jobs** (vermelho phantom de run-level — ex. run
   34764665344) são registradas como tal: esse vermelho não é reconstruível
   nem com a branch viva. Sem run de CI na branch (B1a), o próprio
   comentário registra o fato — evidência durável em vez de silêncio.
2. Só então **fechar o PR com motivo** (§recusa: drill não recebe
   countersign; zumbi: checks não reportaram) — close mudo continua
   proibido.
3. Por fim **deletar a branch** (`git push origin --delete regrant/auto-*`
   ou equivalente pela API).

A ordem 1→2→3 produz timeline ordenável no PR: comentário-jobs **antes** de
`closed` **antes** de `head_ref_deleted` (critério de aceite AID-1741).
Fechar/deletar antes de capturar perde o diagnóstico para sempre — a run
continua no lista como vermelho, mas com `jobs: []`.

**Convenção de consumo (E):** vermelho em `head_branch ~ ^regrant/auto-` =
**proposal-red** — o PR de proposta carrega só o producer snapshot
(`regrant --propose` exit 3; o bot nunca escreve) e `product readiness
(claims)` falha na branch por design até countersign. Não é regressão; o
verificador é a lane `main` (push-run fail-closed).

### Fallback manual (primeiro run)

Se o setting do repo bloquear PR aberto por `GITHUB_TOKEN` (falha visível no
primeiro run), o fluxo manual continua o caminho de sempre: §"Fluxo local de
re-anchor" acima + PR aberto pela credencial de agente. Registrar o incidente e
abrir follow-up; **novo secret só com aprovação CEO** (B1b — `workflow_dispatch`
em `ci.yml` — exige OK CEO explícito).
