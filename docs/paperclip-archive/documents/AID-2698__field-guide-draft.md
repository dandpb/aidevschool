<!-- issue: AID-2698 | key: field-guide-draft | doc_id: e42f156d-3517-436d-87e4-aab78d8eee45 | updated: 2026-09-26 07:12:13.54+00 -->

# field-guide-draft

(AID-2698)

# Field-guide — PUBLICADA (2026-09-26 07:1xZ)

Rascunho promovido a síntese datada no wiki: `wiki/questions/Field Guide - Agentic Factory Stress 2026-09-26.md` via **PR #553** (commit `b7a07200`, base `e0f6a3d8`, docs-only).

Mudanças do rascunho → final: AID-2697 incorporada (lane de conteúdo: lição 132/132 em ~80s, CI 44/44 no head provado; E1 env-puro, E2/E3 retry lineage; propostas FPE-P1..P3 via AID-2829), tabela de lanes expandida (AID-2687/2689/2693), mitigação de continuation-wake que funcionou (release do checkout + blocked com dependência), hardenings mergeados durante o programa (#529/#533/#540/#543/#544).

O rascunho abaixo permanece como histórico da compilação.

---
# FIELD-GUIDE DA FÁBRICA AGENTE — rascunho compilado (AID-2698, parte 2)

> Status: **rascunho** — compila os achados de 20/22 POCs (ondas 1+2). Pendência: thread da **AID-2697** (única POC ainda `in_progress`); ao fechar, publico a versão final em `wiki/` (dated synthesis + fontes) e aponto aqui. Fontes primárias: friction-log (rev 14) e improvements-backlog da umbrella **AID-2681**, receipts nas threads de cada POC. Zero claim sem data + fonte.

## 1. O que a fábrica é hoje (verificado 2026-09-26, base e0f6a3d8)

Loop: `intake → claim → freeze → build → prove (clean-room) → gate → PR (manual) → merge humano (FPE single-writer, countersign AID-2768)`. Garantias testadas: lease exclusivo + fencing por época (P1), prova por check com âncora no ledger encadeado + head externo (P2/X6), produtor ≠ verificador (P3), SHA/árvore/contrato amarrados build⇄prove⇄gate (P4/X4), binding opcional de PR via `--pr-head` (P5). Suíte: 150 testes verdes na base.

## 2. O que JÁ FUNCIONA para uso real (evidência por POC)

| Uso | Evidência | Fonte |
| --- | --- | --- |
| Diff só-de-docs com checks determinísticos (estrutura/claim datada/índice/links) promove com binding de PR | PR #550 head 46322963 = SHA provado; 3/3 checks em clean-room | AID-2698 (run FE-DOC-2698) |
| Item real de learning engine e2e | promote + PR | AID-2687 |
| Mudança de plataforma de currículo (validador YAML) | promote + PR #536 | AID-2689 |
| Prova custom de a11y fail-closed | PR #539 = 91680f84 | AID-2693 |
| Concorrência (40 itens × 8 workers) sem perda | 40/40 | AID-2684 |
| Crash-recovery por estação converge via retry | kills em janelas | AID-2685 |
| Retomada idempotente / takeover atômico | PRs #533/#540 | AID-2726/AID-2748 |

## 3. O que MORDE (top achados abertos — usar com cuidado)

1. **Freeze contra o registro canônico** já foi blocker (B5/AID-2732, corrigido via #543 — validar sempre com o próprio `intent/` real, não fixture).
2. **Gate decide sobre state/ledger, não sobre a árvore viva**: `--amend` pós-prove e `M`/`D` tracked entre build/prove já furaram (cluster B4 — P0 aberto).
3. **Promote sem `--pr-head` passa**: P5 é opcional — SEMPRE gate com `--pr-head` (linha 3 do friction-log).
4. **Prova falsificável em `proofs.json`** (exit_code editável) — B1/AID-2715+2719 já merged (#544) fecha X4–X6; conferir countersign.
5. **Receipt não reflui ao registro** (sem caller + chicken-egg P5) — auditoria versionada hoje é manual (D1).
6. **Checks não rodam no CI do GitHub** (D4) — a proteção acaba no promote local.
7. **Paperclip**: coordenador não flipa children de outros (boundary); liveness loops em umbrella `in_progress` (B8, CEO).

## 4. Receita por perfil (campo)

- **Autor de docs (eu):** checks = afirmações sobre ARQUIVOS (estrutura, `Last verified: <ISO>`, índice, links relativos resolvendo); stdlib one-liners SEM `|` no comando (parser quebra pipes — A1/AID-2693); risco low; gate SEMPRE `--pr-head`.
- **Prova custom (a11y/e2e):** aguardar canal de artefatos (A-P2) — hoje só stdout/stderr; severidade dentro do comando.
- **Alta concorrência:** lease TTL vs build 3600s (B3) — heartbeat ou itens curtos.
- **Crash no meio:** só re-rodar a estação (S1); nunca editar `state.json` à mão (rollback inexistente — linha 7).

## 5. Backlog priorizado (voto do programa)

P0: B4 (re-derivação da árvore/SHA no gate + P5 obrigatório) · B5 (validado #543) · B1 (âncoras — #544). P1: B2 clean-room restante · B3 lease lifecycle · B6 crash fail-closed · B7 higiene (~210MB/run). Novas (desta POC): D-P1 handoff→PR · D-P2 contrato↔CI · D-P3 receipt reflow v2. Paralelo CEO: B8 plataforma.

## 6. Pendências para a versão final

- [ ] Thread AID-2697 (Founding Product) — última POC aberta.
- [ ] Métricas finais de ciclo (AID-2690) e volume (AID-2688) consolidadas pelo SM.
- [ ] Decisão de publicação: `wiki/factory-stress/field-guide-2026-09-26.md` + linha no `wiki/index.md`.