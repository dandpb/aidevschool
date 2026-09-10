# Intent: O funil de ativação deixa de ser cego — instrumentar entrada, brief e exposição à 1ª atividade

Author: UX Designer (AID-1213, estágio LEARN do piloto) · Change-id: `2026-09-10-entry-brief-instrumentation` · Status: **accepted**

> **Registro do aceite (gate canônico):** conteúdo = Draft 2 do doc `intent-drafts` (rev `54c02e18`) da issue AID-1213, transcrito abaixo sem reescrita. Aceite pelo product owner (CEO por delegação AID-1211): decisão `3 ACEITAR` (F2 = 1º da fila da onda Build) na issue AID-1216, baseada na triagem SM AID-1215 doc `triagem` rev `9040fe6b` §1 item 2 / §3 / §4-B1. Spec autoritativa: doc `spec` na issue AID-1218 (lead System Designer, colaboração UX). Nada em `intent/` antes deste commit (verificado: diretório inexistente no main `e839d0fc`).

## Problem

O pipeline de medição funciona E2E, mas o vocabulário de eventos não cobre a etapa exatamente onde está o gargalo (F1): não sabemos distinguir "leu o brief e saiu" de "não entendeu o que fazer" de "nunca viu a 1ª atividade". Entradas por deep-link não emitem evento de entrada; não há evento de exposição ao brief nem à 1ª atividade sem submissão. Cada rodada MEASURE futura reporta o abandono sem poder explicá-lo.

## Proposed outcome

Observável: no próximo relatório QA (janela futura acordada), (a) 100% das sessões interativas têm um evento de entrada (qualquer superfície, incluindo deep-link); (b) existe medida de dwell/exposição entre `mission.started`/`lesson_started` e a 1ª submissão, permitindo segmentar o abandono de F1 em "saiu no brief" vs "saiu na 1ª atividade"; (c) zero PII adicionado (mesmos campos dimension/enum, auditável por inspeção como no 1º relatório).

## Affected users and systems

Engines `codexDojo` (OS, envelope v1) e `literacyDojo` (v2) — emissão de eventos; coletor `/__dojo/bridge/v1/analytics` (sem mudança de contrato além de vocabulário aditivo); QA (consumidor do export); UX e product owner (consumidores do funil).

## Constraints

- Vocabulário aditivo e retro-compatível (envelopes antigos continuam válidos; dedup e retention 90d intactos).
- Zero PII: só enums/contagens/UUIDs pseudônimos — sem texto livre, sem timing de tecla, sem IP/UA (ADR-0009/0010).
- Não usar analytics como evidência de funil O1 (regra do tracker AID-909) — estes eventos explicam comportamento, não contam participantes.
- Mudanças de schema seguem o processo dos contratos de telemetria existentes (producer≠verifier na verificação).
- Teto de esforço definido na spec (triagem AID-1215 gap menor 1): conjunto mínimo de 2 eventos de exposição + 1 prop opcional de entrada; sem eventos de saída/scroll/focus.

## Open questions

- Quais eventos mínimos cobrem o gap sem inflar o envelope: `mission_brief_viewed`? `activity_presented`? (Design define o conjunto mínimo.)
- Como tratar `journey.returned` no funil OS sem quebrar a série histórica do 1º relatório (linha de base precisa ser comparável)?
- O eventId não-UUID do OS (§8.5) precisa de convenção de prefixo de sonda formalizada junto?

> **Disposition:** as três open questions são respondidas na spec AID-1218 doc `spec` (§1 R2, R4, R5).
