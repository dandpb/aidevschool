<!-- issue: AID-718 | key: brief | doc_id: 1a101d14-6b93-4686-80ac-b12544f8b123 | updated: 2026-09-03 08:03:36.374+00 -->

# AiDevSchool — Brief: objetivos, estado e desbloqueio das próximas tarefas (2026-09-03)

(AID-718)

# AiDevSchool — Brief: objetivos, estado e desbloqueio das próximas tarefas

**Data:** 2026-09-03 · **Autor:** CEO (AID-718) · **Main:** `c8aa1c6a` (CI verde, 0 PRs abertos, board 100% fechado)

## 1. Objetivo (missão)

Democratizar conhecimento e aplicação de IA através de lições curtas e práticas com ritmo
Duolingo, servindo dois públicos: (i) quem quer usar IA **sem programar** (trilha IA Prática) e
(ii) devs que querem construir software robusto com IA (trilha Dev).

## 2. Estado real (verificado neste heartbeat)

| Dimensão | Estado | Evidência |
| --- | --- | --- |
| Conteúdo | **29/29 lições ready** (IA Prática l01–l14, l18–l26 · Dev l15–l17, l21–l23, l27–l29) | `curriculum/ai-literacy/catalog.yaml` @ `c8aa1c6a` |
| Ondas recentes | O1 (dev l27–l29), O2 (mod-07), O3-C1 (retrofit l01–l07, +13 atividades) — todas landed + QA GO | AID-637/643, AID-607, AID-657/668 |
| Instrumentação | OP-B-F23 landed: coletor same-origin F1, agregação funil F2b, AnalyticsSink F3 — **transporte OFF** (ativação é gate do board, ADR-0010 §4) | AID-675/676/677 (QA GO) |
| Readiness produto | 1 use-case `pass` (`os-literacy-guided-mission`) · **7 `stale`** (fingerprints envelheceram com as ondas) | `docs/product-readiness/README.md` |
| Piloto real (P6) | **pendente de execução humana** — 1–3 alunos; PRD pronto (`caso-p6-real-student-pilot/PRD.md`) | prioridades 2026-08-17 #6 |

## 3. Decisão de desbloqueio (CEO)

A regra em pé (AID-644 §RESERVADO + relatório de prioridades): **não expandir currículo antes de
evidência de uso real**. O3-C2 (l08–l13, +12) permanece RESERVADA até O3-C1 sustentar + evidência OP-B.
Portanto as próximas tarefas são validação, não produção de conteúdo:

1. **Wave R1 — readiness re-grant sweep @ `c8aa1c6a`** (QA Lead, alta): renovar os 7 use-cases `stale`
   e restaurar a confiança customer-facing pós-ondas. Desbloqueada agora.
2. **Piloto P6 — kit de facilitador + leitura de funil OP-B** (System Designer, alta): empacotar
   runbook do facilitador, formulário de observação e procedimento de leitura do relatório F2b,
   para o founder rodar 1–3 alunos reais e produzir a evidência que abre (ou não) a O3-C2.
   Preparação desbloqueada agora; execução depende de alunos humanos (founder).

**Agentes novos: nenhum necessário.** QA/SD/FPE cobrem R1 e o kit do piloto; o contato com alunos
reais é humano por natureza. Reavaliar contratação (ex.: Growth/Pilot Ops) somente se o piloto
escalar além de acompanhamento manual.

## 4. Questões para o founder (interaction pendente na AID-718)

1. Ativar o transporte OP-B durante a janela do piloto (recomendo: sim — sem isso o funil fica cego)?
2. Você tem 1–3 alunos para rodar o piloto nas próximas 2 semanas?
3. Confirmar O3-C2 segurada até evidência do piloto (recomendo: segurar)?

## 5. Critério de saída da AID-718

Desbloqueio consumado quando: R1 e kit P6 despachadas com dono (feito neste heartbeat) e o founder
responder as 3 questões. A O3-C2 entra no board somente com evidência do piloto + C1 sustentando.
