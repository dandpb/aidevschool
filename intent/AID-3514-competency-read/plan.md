# Plan: AID-3514-competency-read — mapa retrospectivo de fatias + fatia retrofit

> **RETROSPECTIVE RECORD (retrofit, AID-3815).** As fatias S3/S6/S5 abaixo
> já foram executadas e mergeadas (vereditos/countersigns e merge SHAs
> citados); a única fatia **nova** deste plano é o próprio retrofit
> (R1) — doc-only, sem código. Marcado como retrofit no topo por política.

Change-id: AID-3514-competency-read · From: intent/AID-3514-competency-read/spec.md ·
Status: approved (retrospectivo para S3/S6/S5; executável apenas para R1)

## Mapa de fatias (o que foi feito, onde aterrissou)

| # | Fatia | Entrega | Merge em main | Veredito/countersign |
| --- | --- | --- | --- | --- |
| S3 | Incorporação inerte (AID-3505) | 32 YAMLs + schema (PR #612 `d853e4f7` aterrissado junto) + 9 testes | PR #617 → `195887c2` (2026-10-02 14:44:44Z) | Countersign `AID-3505 verdict 54ffb832` (QA `ca6a3f95`, head `a336a192` pinado, 14:40:31Z) |
| S6 | Contrato de leitura (AID-3514) | `docs/curriculum/competency-read-contract.md` + 4 testes de seam; r1 `b6e0b8fe` (review LAE `51284f0a`), r2 `86455d33`, r2.1 `97c946d9` (GO-condicionado `5394585605` resolvido) | PR #623 → `5f71ac42` (17:58:49Z) | Countersign `AID-3514 verdict GH:5957585724` (LAE, head `d2296822` pinado, 17:55:22Z) |
| S5 | Read model Fase 1 (AID-3514) | `competency_projection.py` + `competency-map.ts` opt-in + 10 testes + `docs/curriculum/competency-read-model.md` + alinhamento doc pós-S6 `76d5779d` | PR #659 → `9a5bb1a3` (19:05:42Z) | Countersign `AID-3514 verdict GH:5956348434` (LAE, head `90e7047b` pinado, 19:03:21Z) |
| F2 | Seam consumidor — **Fase 2** | Portas `getCompetency`/`hasCompetencyEntry` + guard fail-closed no literacyDojo | **pendente**: PR #660 aberto (draft; despacho FPE `f9447c82`, diretiva board `22bcfffd`) | produtor LAE; review pendente |
| R1 | **Retrofit artifact home (AID-3815 — este plano)** | `intent/AID-3514-competency-read/{intent,spec,plan}.md` | este PR | countersign independente via porta `scripts/countersign_assign.sh`; merge pela porta única (FPE) |

## Files that change (fatia R1 — a única nova)

- `intent/AID-3514-competency-read/intent.md` (new)
- `intent/AID-3514-competency-read/spec.md` (new)
- `intent/AID-3514-competency-read/plan.md` (new)

Nenhum outro path. Zero código, zero testes editados, zero áreas protegidas
fora `intent/` (não toca `intent/README.md`).

## Order of work (R1)

1. Branch `aid3815/intent-competency-read-retrofit` a partir de
   `origin/main` `9a5bb1a3`; verificação 1º-mão do gap (`git grep` → 0
   paths) e dos fatos citados (merge SHAs, countersigns, vereditos —
   git/GitHub API/board).
2. Escrita dos 3 artefatos a partir dos templates
   (`docs/sdlc/templates/`), quoting carriers (não reescrever) e
   marcando retrospective no topo de cada um.
3. Commit único doc-only; PR pequeno com trailer `Provenance` do CPE
   (classe #634/#636/#641 — primeiro trailer do body).
4. Countersign de agente distinto via `scripts/countersign_assign.sh`
   (dedup AID-2844); merge **somente** pela porta única
   `scripts/merge_pr.sh`, executada pelo FPE (CPE não merga — hard rule
   AID-1521 até R1).
5. Recibo no carrier AID-3815 (template `docs/sdlc/templates/receipt.md`)
   apontando o commit/PR; critérios de aceite do carrier conferidos.

## Risks

- **Retrospectivo vira precedente de "registrar depois"**: mitigado
  marcando cada arquivo como RETROSPECTIVE RECORD citando a política
  violada e a auditoria de origem (AID-3814 row #328); a recorrência da
  classe segue com a auditoria, não normalizada aqui.
- **Drift entre este resumo e os docs canônicos**: mitigado por ponteiro
  único (spec.md aponta para `docs/curriculum/competency-read-contract.md`);
  este diretório nunca é fonte de verdade técnica.
- **Escopo 3497/3505 ambíguo**: decisão registrada (home única ancorada em
  3514) no intent.md §Decisão de escopo; suplantável pelo PO sem rework
  (doc-only).

Alternativas NÃO escolhidas: (a) três homes separados (duplicaria links);
(b) não registrar e só justificar no board (não fecha o gap versionado);
(c) reescrever o spec aqui (violaria link-don't-rewrite do playbook).

## Proof (R1)

- `git grep -l -E "AID-3497|AID-3505|AID-3514" origin/main -- intent/` →
  **0** (gap pré-PR, verificado na base `9a5bb1a3`);
- após o merge: mesmo grep em `origin/main` → os 3 arquivos deste
  diretório (critério 1 do carrier AID-3815);
- CI `sdlc-guards` verde no head (diff doc-only, sem paths protegidos);
- `countersign-gate` verde após countersign distinto pinar o head;
- recibo no thread AID-3815 apontando o merge SHA (critério 3).
- O que o aprendiz percebe: **nada** (doc-only; nenhum runtime/UI dado
  muda).

## Verification split

- Produtor: CPE (este plano + artefatos).
- Verificador fresh-context: QA Lead (countersign via porta de assignment —
  confere diff vs. este plan.md, SHAs/vereditos citados vs. git/board).
- Merger: FPE pela porta única `scripts/merge_pr.sh` (producer ≠ verifier ≠
  merger).
