# Spec: fábrica de PR de re-grant pós-merge (AID-1357, Opção A)

Change-id: AID-1357-readiness-regrant-automation · From: intent.md (mesmo diretório) ·
Status: amended r2 (veredito System Designer AID-1359: **GO CONDICIONADO** — B1
emendado via B1a, F1/F2 corrigidos, R1-R5 incorporados; superfície de usuário
intocada — sem review UX, por despacho CEO)

## 1. Comportamento observável

### 1.1 Subcomando `regrant --propose`

```
python3 docs/product-readiness/tools/cli.py regrant --propose --input <candidate.json>
```

Precondições e efeitos, em ordem:

1. Validação de domínio canônica (idêntica aos demais subcomandos: `load_domain` +
   `validate_domain`; sai 1 em `INVALID`).
2. **Write-branch guard**: o branch git corrente não pode ser `main`
   (`git branch --show-current`) nem **detached HEAD** (saída vazia — R2 do
   veredito). Em qualquer dos casos → mensagem `INVALID: regrant writes must land
   on a re-grant branch, not main` e exit 2 (uso/estado inválido; nada escrito).
3. Validação da request + proposta (reusa integralmente `load_assessment_request` +
   `propose_assessment`: gitSha == HEAD, runIds únicos, digests de artefatos,
   mapeamento use cases; sai 1 em defeito de relatório).
4. Classificação das decisões da proposta:
   - **sem decisões BLOCKED** → caminho de escrita (fase QA): `write_assessment` +
     `write_views` (exatamente o par `assess --input` + `render`), imprime os arquivos
     escritos, exit 0.
   - **toda decisão BLOCKED tem apenas razões producer-only** — `scenario <id> lacks
     independent evidence` / `missing promoted result for <id>` (mesmo conjunto de
     `enforcement.unsupported_candidate_reasons`) → **nenhuma escrita**: imprime
     `REGRANT PENDING: awaiting independent observation` + checklist por use case dos
     cenários pendentes, exit 3 (código distinto; o workflow o trata como sucesso do
     passo de proposta).
   - **qualquer decisão BLOCKED tem razões além das producer-only** (fingerprint stale
     no candidate, cenário reprovado, digest divergente, severe gap) → imprime as
     razões como `INVALID:`, exit 1, sem PR (política: PR errado não se abre; se já
     aberto por edge, close com motivo).

Invariantes: com candidate gerado só de artefatos de CI (executor `automated`),
**nenhum** use case alcança escrita — os **9** use cases do `inventory.yaml`
(correção F1 do veredito) têm, cada um, ≥1 cenário com assertion de evidência
**não-playwright** (**25 dos 27** cenários; correção F2 — os 2 playwright-only,
`literacy-corridor-grandfathered-return` e `literacy-corridor-resume-mid-module`,
pertencem a `literacy-standalone-corridor-mod01-03`, que bloqueia pelos demais 3).
Essa é uma propriedade **dos dados atuais, não do schema** — protegida por teste de
contrato (R1): `test_regrant.py` faz parse de inventory+scenarios e falha se algum
use case novo nascer 100% playwright sem observação. `reports.py:104-106` só emite
assertions playwright. O bot, portanto, nunca escreve
assessment/results/matriz via `regrant --propose`. Exits 2 e 3 são documentados na
linha de usage do CLI (R4) — contrato novo cli↔workflow.

### 1.2 Workflow `readiness-regrant.yml`

- **Gatilho**: `workflow_run` (workflow `CI`, `completed`), filtrado a
  `event == 'push' && head_branch == 'main' && conclusion == 'failure'`. Dentro do job,
  o gate real é re-executado no SHA do merge: baixa artefatos `*-readiness-$SHA`
  do run (`workflow_run.id`), `aggregate`, e **só propõe se `check` ou `enforce`
  falhar** (decision registrada no plan gate; enforce-estrito é um one-line). Se o
  aggregate em si falhar (artefatos ausentes → validate errors), aborta sem PR —
  é defeito de produto, não staleness.
- **Dedupe**: consulta PRs abertos com label `readiness-regrant` (`gh pr list`);
  existindo → log + skip (nunca 2º PR). Branch: `regrant/auto-<YYYYMMDD>-<sha8>`,
  recriado com `git checkout -B` (idempotente por SHA).
- **Fluxo**: checkout do `head_sha` → python 3.12 + `pip install -e .[dev]` → download
  artefatos (`merge-multiple`, `actions/download-artifact@v4` com `run-id` **e**
  `github-token: ${{ github.token }}` explícitos — R3; 2 tentativas) →
  `aggregate --reports artifacts/product-readiness --output …/product-readiness-report.json
  --assessment-id <YYYY-MM-DD>-<sha8>-auto-regrant` (o snapshot de producer cai em
  `evidence/producers/<id>/` na árvore do branch) → `git checkout -b` →
  `regrant --propose --input …` (exit 3 esperado do bot) → commit do snapshot →
  push → PR `docs(readiness): auto re-grant vN @ <sha8>` com label `readiness-regrant`,
  corpo trazendo: saída do gate vermelho, checklist de observação pendente (saída do
  propose), passos de countersign, citações de política (§PRs automatizados) e aviso
  de que o bot não mergeia.
- **B1 (emenda AID-1359): PR aberto via `GITHUB_TOKEN` não dispara eventos
  `pull_request`/`push`** (prevenção de recursão do GitHub) → o PR bot nasce **sem
  CI** e os checks required ficariam "Expected" para sempre, além de a label
  `readiness-regrant` travar a dedupe (PR zumbi). Resolução **B1a** (escolhida; não
  toca em `ci.yml`): o watchdog Paperclip do carrier (§1.3), ao detectar PR bot sem
  check runs, faz **close+reopen com a credencial de agente** já usada para
  push/merge — `pull_request[reopened]` está nos types default de `on:
  pull_request` (ci.yml l.14, sem filtro `types:`) → CI roda no head → checks
  required reportam. O reopen leva comentário explicativo (não é §recusa). Fallback
  B1b (1 linha `workflow_dispatch:` em `ci.yml`) exige OK CEO explícito — o
  despacho diz "ci.yml intocado"; registrado como alternativa, não como plano.
- **Retry p/ flake**: steps de download/aggregate com retry simples (2 tentativas,
  precedente AID-571); flake de run do CI não reprocessado aqui (o workflow_run do
  run re-executado dispara de novo naturalmente).
- **Permissões mínimas**: `contents: write`, `pull-requests: write`, `actions: read`;
  `concurrency: readiness-regrant-factory` (1 por vez).

### 1.3 Despacho Paperclip + countersign + lifecycle do PR bot (fora do GH Actions)

Watchdog cadenciado no carrier AID-1357 varre PRs abertos label `readiness-regrant`:

1. **PR sem issue-filha** → cria dispatch QA (checklist de observação do corpo do
   PR).
2. **PR sem check runs** (B1a) → close+reopen com a credencial de agente +
   comentário explicativo ("reopen para disparar CI: PR de GITHUB_TOKEN não emite
   eventos"); verifica checks reportando.
3. **PR zumbi** (label presente, sem checks/reportando após **45 min** sem
   atividade) → close **com motivo** (§recusa: "checks não reportaram; fábrica
   destravada para o próximo gatilho") para liberar a dedupe — close mudo é
   proibido.
4. QA observa na árvore do branch, arquiva bundles em
   `evidence/observations/<id>/`, re-roda `aggregate --observations` +
   `regrant --propose` na branch (exit 0 = escrita); commits da fase QA usam a
   credencial de agente → `pull_request[synchronize]` dispara CI normalmente.
5. Countersign QA; merge single-writer CEO **cita o countersign** na mensagem de
   merge (fast path canônico, precedentes #301/#302/#306). PR inválido → close com
   comentário de motivo (§recusa).

## 2. Estrutura

- `docs/product-readiness/tools/cli.py` — novo branch de argumentos `regrant
  --propose --input FILE`; guard e classificação em função testável
  (`tools/regrant.py` novo: `require_regrant_branch(repo_root)` recusa `main` e
  detached HEAD; `classify_proposal(proposal)` → enum `Written |
  PendingObservation(checklist) | Defect(reasons)`); usage atualizado (documenta
  exits 2 e 3 — R4).
- `.github/workflows/readiness-regrant.yml` — novo (nenhuma edição em `ci.yml`).
- `docs/product-readiness/tests/test_regrant.py` — novo (ver §3).
- `docs/product-readiness/REGRANT-RUNBOOK.md` — seção "Fluxo automatizado (Opção A)".

## 3. Testes (arquivo novo; suíte existente intocada)

1. **Guard main**: repositório git temporário → branch `main` → `regrant --propose`
   exit 2 com a mensagem; branch não-main não recusa por esse motivo (unit em
   `regrant.py`, sem subprocess quando possível).
2. **PendingObservation**: candidate só-automático (fixture literacy com executor
   `automated`) em branch não-main → exit 3, checklist impresso, `results.ndjson` e
   `assessments/` byte-idênticos.
3. **Defect**: candidate com fingerprint divergente → exit 1 com `INVALID`, sem
   writes.
4. **Written (fase QA)**: fixture independente completa (`literacy-pass-report.json`,
   executor `mixed`) re-ancorada ao HEAD em branch descartável → exit 0, assessment +
   `.md` + apêndice de `results.ndjson` + matriz renderizada; restaura a árvore ao
   final (deleção determinística dos arquivos criados + `git checkout --`; skip se
   árvore suja).
5. **Contrato R1**: parse canônico de `inventory.yaml` + `scenarios/*.yaml` → todo
   use case tem ≥1 cenário com ≥1 assertion `evidence != playwright` (protege a
   propriedade que impede o bot de escrever; use case novo 100% playwright quebra o
   teste em silêncio nunca mais).
6. **Suite regressão**: `python3 -m pytest docs/product-readiness/tests -q` inteira
   verde; `cli.py` usage/check/enforce inalterados nos caminhos existentes.

## 4. Não-metas e riscos

- Não reestrutura checks required (Opção B), não estreita sourcePaths (C rejeitada),
  não cria secrets, não mergeia PR, não dispensa observação/countersign.
- Risco residual: (a) PR de `GITHUB_TOKEN` nasce sem CI — resolvido por desenho via
  B1a (close+reopen pela credencial de agente) + regra do zumbi (§1.3); a *criação*
  do PR por `GITHUB_TOKEN` ainda depende do setting do repo permitir (primeiro run
  falha visível → fallback manual do runbook); (b) watchdog depende de heartbeat
  Paperclip (latência de despacho ≈ cadência; aceitável vs. horas atuais); (c)
  `workflow_run` não dispara para runs `push` de branches != main (filtro é
  explícito) — sem falso-positivo de PR interno; (d) a propriedade "todo use case
  tem ≥1 cenário não-playwright" é dos dados atuais — protegida pelo teste de
  contrato R1, não pelo schema.
