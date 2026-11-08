<!-- issue: AID-400 | key: sdlc-quickstart-por-papel | doc_id: c37f2877-dd39-45ff-bcde-e111d2f8db45 | updated: 2026-09-09 22:48:17.87+00 -->

# SDLC quickstart por papel (AID-400, 2026-09-09)

(AID-400)

# SDLC quickstart por papel — AiDevSchool (SM AID-400, 2026-09-09)

Guia operacional de 1 página. Canônicos completos: `docs/sdlc/README.md`, skill `.claude/skills/ai-native-sdlc/`, templates em `docs/sdlc/templates/` (`intent.md`, `spec.md`, `plan.md`). Em dúvida, pergunte no fio da sua issue — o SM responde no mesmo heartbeat.

## O loop em 7 passos
`intent → spec → plan → build → verify → review → ship` (+ maintain). Toda mudança de repo/docs passa por ele. **Fast path (small fix):** `intent/<change-id>/intent.md` + `plan.md` curtos + self-verify registrada + review independente ANTES do `done`. Precedente bom: `intent/2026-09-03-xss-dojotoday-sentinel/`.

## Regras invioláveis
1. **Producer ≠ verifier** — quem produziu não emite o veredito; QA Lead (ou pares) verifica e o veredito antecede o `done`.
2. **Gates antes de implementar** — aprovação de intent/spec/plan via `request_confirmation` / ORDEM do CEO; nunca unilateral.
3. **Guardrails** — o CI já enforced (`job sdlc-guards`): teste existente editado ou path derivado exige trailer `SDLC-ALLOW-TEST-EDIT` / `SDLC-ALLOW-DERIVED-EDIT` **com aprovação do owner no task record** (política AID-554: por onda, sem allowlist). Credencial não tem override.
4. **Disposição real no fim** — `done` (com receipt) / `in_review` (com reviewer) / `blocked` (com dono do unblock). Nada termina em comentário solto.
5. **Maintain volta ao loop** — incidente/regressão/achado vira `intent/` novo, não hotfix por fora.

## Por papel — o que é SEU no loop
- **Engineer (FPE):** produce com artefatos (`intent/<id>/` antes de codar; spec/plan quando onda), CI verde no head, receipt no fechamento (números conferíveis via API). Padrão atual: excelente (AID-987, AID-1096 com cadeia cheia).
- **QA Lead:** veredito independente com reprodução (RUNs com exit codes), evidência arquivada, follow-ups como issues nomeadas. Usar child issue quando o boundary bloquear post direto (padrão AID-512/543).
- **System Designer / UX:** spec/pre-draft em issue doc com revisões nomeadas; decisões do founder viram card/ORDEM, nunca aceitas unilateralmente. Janela de observação (AID-670) termina em close-out com evidência, não em silêncio.
- **CMO/G&R (novo, b106db1d):** seu material (outreach, kits, copy) é work product — guarde evidência (rascunhos, respostas, métricas de funil) na issue; **docs no repo** (ex.: piloto, oferta) passam pelo loop (fast path serve); nenhuma promessa learner-facing publica sem review de UX + gate founder. Comece lendo `docs/sdlc/README.md` §Métricas para reportar funil com números honestos.
- **CEO:** gates e exceções são seus — resolva interações `pending` (bug de plataforma AID-1132 está no backlog), despache ORDEMs com aceite explícito, e ratifique políticas (próxima: PRs automatizados, ver child issue).
- **Automatizados (Bolt/Palette/Sentinel):** PR aberto NÃO é entrega. Fast path documentado (intent+plan) + CI verde + merge só com aceitação registrada do founder/CEO. Política completa: ver child issue da âncora.

## Comandos úteis
- Ver guardrails locais: `bash scripts/sdlc_guard_check.sh` (o mesmo do CI).
- Templates: `docs/sdlc/templates/{intent,spec,plan}.md`.
- Veredito/verificação: referencie run IDs e SHAs — números conferíveis > adjetivos.
