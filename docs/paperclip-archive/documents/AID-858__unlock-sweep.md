<!-- issue: AID-858 | key: unlock-sweep | doc_id: bff72c77-78f6-469a-98a1-1db7a67f4dd5 | updated: 2026-09-05 13:05:42.663+00 -->

# AID-858 — Sweep de desbloqueio: estado do pipeline, gates armados, delegações e decisão de contratação (09-05 13:0xZ)

(AID-858)

# Sweep de desbloqueio — AID-858 (CEO, 2026-09-05 ~13:0xZ)

## 1. Objetivos (lidos do goal + plano aceito AID-558)
- **Missão:** democratizar conhecimento e aplicação de IA via lições curtas e práticas, ritmo Duolingo — dois públicos: pessoas sem programação (`ia_pratica`) e devs (`dev`). Repo: github.com/dandpb/aidevschool.
- **Plano vigente (AID-558):** O1 onda dev pós-l23 (landed; agora em teste moderado) · O2 mod-07 multimodal (recomendado pelo SD, ainda não escolhido pelo board) · O3 consolidação — **C1 promovido em produção** (`ef67fb06`, contentVersion 2026-09-04.1, readiness v29), **C2 (retrofit l08–l13, +12 atividades) pré-draft pronto** (AID-838, confirmation `02abea83` pending), dispatch gated no checkpoint d+7.

## 2. Gates temporais — cadeia de wake REARMADA nesta run (verificado first-hand pós-PATCH)
| Gate | Carrier | Gatilho | Estado verificado agora |
|---|---|---|---|| d+6 sweep | AID-840 | 2026-09-08T17:16Z | `in_progress` + monitor `scheduled` + assignee CEO |
| d+7 checkpoint O3-C1 (runbook 604c8bba) | AID-852 (backstop) / AID-815 (redundante) | 2026-09-09T17:16:03Z (backstop dispara 17:20Z) | `in_progress` + monitor `scheduled` + assignee CEO |
| d+21 saída janela | âncora AID-670 | 2026-09-23 | coberto pelos runs d+6/d+7 (rearmam o próximo token) |

Ambos estavam `in_review` — violava o workaround §5 da AID-823 (monitor válido exige carrier `in_progress` + assignee agente; PATCH em `blocked` descarta `monitor` silenciosamente). Rearmados para `in_progress` com monitor intacto. Contenção AID-814 permanece: **nenhum watchdog rearmado**.

## 3. Dois caminhos que só o FUNDADOR desbloqueia (cards pending no board)
1. **`a3d01a76`** (AID-641, request_confirmation, 12:06Z hoje): O1 em risco — estender janela até ~09-23 OU dar indicações de devs agora.
2. **`cf8b749c` / intake `42e6116b`** (ask_user_questions, pending ~33h+): indicações de devs (n=5–8) e/ou confirmação dos padrões de screening para o teste moderado O1 (l27–l29).
Sem resposta, o funil O1 segue 0/0/0/0 e a onda não valida.

## 4. Delegação desta run
- **AID-859 → SDLC Scrum Master** (`todo`, assignee set): runbook único de gates temporais sob contenção AID-814/823 (padrão carrier comprovado hoje 12:05Z na AID-832), cobrindo arme/no-op/protocolo idempotente/riscos (409 run ownership, 403 boundary) e o mapa dos 3 gates restantes. Docs-only, ≤1 run.
- Não há delegação adicional justificada: O3-C2 dispatch é pós-d+7 (09-09), spec já pré-draftada; O1 depende do fundador; QA/FPE/CD/UX ficam de prontidão para as ondas pós-gate.

## 5. Novos agentes — DECISÃO: nenhum, por ora
- Bench atual cobre todas as lanes necessárias às próximas ondas: System Designer (spec), Content Designer (autoria), FPE (engenharia), QA Lead (countersign), UX Designer (teste moderado), SM (processo).
- Os dois gargalos reais não são de capacidade de agentes: são **input do fundador** (§3) e **gate temporal** (§2). Contratar agora adicionaria custo sem desbloquear nada.
- Reavaliar contratação se: (a) o board escolher O2 (mod-07) para paralelizar com C2 — mais carga de autoria CD/FPE; ou (b) o funil O1 lotar (n=5–8 sessões) e a análise qualitativa virar gargalo.

## 6. Disposition
Sweep concluído: cadeia de wake rearmada e verificada; desbloqueios possíveis executados; delegação única emitida (AID-859); decisão de contratação documentada. Os próximos passos pertencem a: fundador (2 cards), relógio (09-08/09-09), SM (AID-859).