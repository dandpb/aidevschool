# Spec: fábrica de re-grant emite proposta observation-complete (AID-2203)

Change-id: AID-2203-regrant-observation-complete · From: intent/AID-2203-regrant-observation-complete/intent.md · Status: draft

## Requirements

1. **R1 — manifest de estado da proposta (CLI).** `cli.py regrant --propose --input REPORT`
   aceita flag opcional `--proposal-state PATH`. Quando presente:
   - exit 3 (`PendingObservation`): escreve JSON
     `{schemaVersion:1, status:"pending-observation", assessmentId, gitSha, branch,
     generatedAt, useCases:[{id, pending:[<reason>...]}...]}` antes de imprimir o checklist;
     nada mais é escrito (comportamento exit 3 inalterado).
   - exit 0 (`Written`): escreve o mesmo shape com `status:"written"` e `useCases: []`
     (documenta por que não há fase de observação), antes do par write_assessment+write_views.
   - exit 1 (`Defect`) e exit 2 (guard): **não** escreve manifest (abort sem PR / erro de uso).
   - Sem a flag: comportamento byte-idêntico ao atual (retrocompatível; testes existentes
     intocados).
2. **R2 — fábrica labela a proposta.** `readiness-regrant.yml` passa
   `--proposal-state docs/product-readiness/evidence/producers/$ASSESSMENT_ID/regrant-proposal.json`,
   commita o manifest junto do snapshot, cria labels `regrant-pending-observation`
   (`d93f0b`, "observation incomplete; NOT countersignable; merging heals nothing (AID-2202)")
   e `regrant-observation-complete` (`0e8a16`, "re-grant carried out with independent
   observation; countersignable fast path") e aplica a que couber no PR (exit 3 → pending;
   exit 0 → complete). O corpo do PR ganha linha explícita: fast path BLOQUEADO enquanto o
   label `regrant-pending-observation` estiver presente (merge não cura a main — AID-2202).
3. **R3 — check de completude (novo workflow `readiness-regrant-complete.yml`).**
   - Trigger: `pull_request [synchronize, reopened]` com `head_ref` prefixado `regrant/auto-`
     (eventos só existem quando o push vem de credencial de agente — watchdog close+reopen e
     commits da fase QA; o push de GITHUB_TOKEN da fábrica não emite evento, B1) +
     `workflow_dispatch` de drill (input `pr`).
   - Job nomeado `regrant observation completeness`: checkout merge-ref do PR → instala o
     pacote → `python3 docs/product-readiness/tools/cli.py check --require-current`:
     - **vermelho** = claims ainda stale/DRIFT na árvore do PR = re-grant incompleto
       (fail-closed; mesmo consumidor da lane main);
     - **verde** = re-grant completo na árvore → troca labels (remove pending, adiciona
       complete) e comenta recibo idempotente (marcador `regrant-observation-receipt`;
       branch, merge-ref SHA, resultado do gate).
   - Retrofit: PR de proposta sem manifest (pré-AID-2203) também é gated pelo mesmo check;
     o job adiciona o label pending quando o gate está vermelho e o manifest não declara
     `status:"written"`.
   - Perms: `contents: read`, `pull-requests: write`; sem secrets; `concurrency` por PR.
4. **R4 — teste de contrato novo (arquivo novo).**
   `docs/product-readiness/tests/test_regrant_proposal_state.py`: (a) exit 3 escreve
   manifest `pending-observation` com checklist por use case e NÃO escreve
   assessment/results; (b) exit 0 escreve manifest `written` (restauro determinístico como
   `test_regrant.py`, skip se árvore suja); (c) sem flag → nenhum arquivo extra criado;
   (d) exit 1/2 não escrevem manifest.
5. **R5 — runbook (§Fluxo automatizado).** Documenta: contract dos labels, o check
   `regrant observation completeness`, o fluxo completo proposal → (watchdog reopen →)
   check vermelho nomeado → fase QA (observação + `aggregate --observations` +
   `regrant --propose` exit 0) → synchronize → check verde + label complete + recibo →
   countersign QA → merge single-writer CEO. Cross-ref da regra de mesmo lote (AID-2202;
   PR #462/AID-2204). Edição mínima, seção distinta da editada pelo PR #462 (coordenação
   registrada nas threads AID-2202/AID-2203).

## Design

- O estado "observation-complete" é **derivado da árvore**, não afirmado por ninguém:
  `check --require-current` re-executa o cálculo fail-closed (fingerprints da árvore vs
  decisões promovidas gravadas). Nenhum ator precisa ser confiado para declarar completude —
  o label complete só aparece quando o gate na árvore do PR está verde.
- Producer ≠ verificador preservado por construção: o bot continua proibido de escrever
  (exit 3 sem writes; contrato R1 intocado — a observação continua exigindo contexto
  `independent-readiness-observer` em `observations.py`, e o assessor
  `independent-readiness-review` em `evidence.py`).
- Semântica de merge-ref: o job roda na `refs/pull/N/merge` (default do checkout) — a
  árvore que aterraria na main. Se a main andou, o gate fica vermelho até re-run (coerente
  com a regra 3 do runbook single-writer; não introduz janela nova).
- Mudança é aditiva e fail-closed: nenhum check existente é relaxado; o novo check vermelho
  só **adiciona** bloqueio na superfície onde hoje não existe sinal nenhum.

## Policy applied

- AGENTS.md raiz: producer ≠ verifier; SDLC ai-native (nada implementado sem plano aceito);
  overrides de teste proibidos (teste novo em arquivo novo; sem editar `test_regrant.py`).
- `docs/sdlc/README.md` §PRs automatizados: diff que toca autoridade de processo
  (CI/gates/guardrails) exige **countersign QA fresh-context pré-merge** + merge
  single-writer CEO citando o countersign.
- AID-1357 (fábrica): exits 0/1/2/3 e contrato R1 inalterados; dedupe/zumbi/watchdog
  lifecycle inalterados.
- AID-1890: determinismo da PR-lane preservado (o novo check é um consumidor novo e
  explícito, não uma mudança no `check` da ci.yml).
- AID-1516: recibo de fechamento com `git status --porcelain` first-hand.

## Flagged concerns

1. **Label-swap automatizado**: o workflow de completude (GITHUB_TOKEN do repo) troca labels.
   Classe de ameaça = writers do repo (mesma confiança que abrir/fechar PRs da fábrica).
   Mitigação: o label é sinal **necessário, não suficiente** — countersign QA pré-merge
   permanece obrigatório (R5/runbook). Owner: QA Lead (ca6a3f95).
2. **Emparceiramento do despacho da observação no mesmo lote** (Paperclip-side): este change
   entrega o sinal máquina e o gate, mas o despacho instantâneo do observador ao nascer a
   proposta continua dependendo do watchdog cadenciado. Opções futuras (fora do escopo):
   (a) extensão org-side do watchdog; (b) novo secret/dispatch GitHub→Paperclip (exige CEO).
   Owner: CEO (a mesma interação request_confirmation pode decidir). Até lá, a regra de
   mesmo lote é a do PR #462 (Opção 1) e o check vermelho nomeado impede o heal incorreto.
3. **Verificação `revalidateBy`**: `check --require-current` também fica vermelho quando um
   grant gravado passa da data de revalidação — correto (fail-closed) e igual à lane main;
   anotar no runbook que esse vermelho exige re-grant, não é falso positivo do check novo.
4. **Concorrência com PR #462** (REGRANT-RUNBOOK.md): seções distintas; se houver conflito,
   rebase do segundo a merged. Registrado na thread.
5. **PRs de proposta antigos** (pré-manifest): cobertos pelo retrofit (R3), mas o
   `regrant-observation-receipt` só comenta quando verde — PR antigo pendente fica só com o
   check vermelho nomeado (suficiente para o fast path não mergeiar por engano).

## Out of scope

- Automação Paperclip-side do despacho de observação (watchdog/secrets) — follow-up com CEO.
- Emenda da "Regra de merge (single-writer)" e da seção de mesmo lote (Propriedade do
  PR #462 / AID-2204 — Opção 1).
- Mudanças em `ci.yml`, nos exits do `regrant`, no contrato R1, em `enforcement.py`/
  `evaluate.py` (política de razões) e no branch protection (pendência CEO pré-existente).
- Renomear/replicar observação por bot (viola producer ≠ verifier; assertions de observação
  são julgamento documental first-hand — ver bundles em `evidence/observations/*`).
