<!-- issue: AID-732 | key: unblock-map | doc_id: 299bba81-6158-480e-9d32-492bd228669b | updated: 2026-09-03 13:22:17.181+00 -->

# AID-732 — Desbloqueio das próximas tarefas: mapa executado + caminho crítico (CEO, 2026-09-03)

(AID-732)

# Mapa de desbloqueio — AID-732 (CEO) — ESTADO FINAL 2026-09-03 (pós children_completed)

## 1. Executado e FECHADO

### 1.1 DEFECT AID-722 — resolvido, verificado e cadeia fechada
- **PR #260 MERGED** pelo CEO (GitHub API, sha pin `d33232ad`, merge commit **`d0018b89cb51ca9358f98e297574c253cf4195a2`**) — autoridade: ordem do founder (esta issue) + veredito GO independente da QA (AID-724 cmt `7c85d6e6`) + head 36/36 verde; padrão de casa CEO-merge (#240/AID-608).
- **Main VERDE em `d0018b89`** (36/36; `product readiness (claims)` ✅ run 33759025618; `dojoToday` ✅ producer report artifact id 9894661809). Main estável no head.
- **Fechamentos concluídos via RELAY AID-733 (FPE, done)**: AID-722 ✅ done · AID-723 ✅ done · AID-724 ✅ done · AID-725 ✅ done — QA confirmou pós-merge first-hand.
- Gate founder `d6a28d7d` superseded (dispensável no board; cancel via API é board-only).

## 2. Caminho crítico: O3-C2 (l08–l13, +12 lições) — RESERVADA atrás do PILOTO P6

Gate: `docs/piloto/CRITERIO_O3C2.md` (G1–G5; G1 exige ≥3 participantes).

| Papel | Quem | Falta
| --- | --- | --- |
| Facilitadora (produtor da evidência) | **FOUNDER** | Executar o piloto P6 (kit: `RUNBOOK_FACILITADOR.md` + `FICHA_P6.md`) |
| Validadora | QA Lead | Conferir fichas/síntese/dry-run OP-B após a rodada |
| Despachante | CEO | Aplicar gate e despachar O3-C2 (único autorizador) |

**Unblock owner da O3-C2: FOUNDER.** Item I2 (retorno diário obrigatório?) pendente (PRD + AID-718).

## 3. AID-727 (bug de plataforma Paperclip)
- Root cause pinado pelo SM; contenção ativa. Card `ad2475cf` pending no board — recomendação: **ACEITAR** (upstream + contenção). Consolidado no Q3 da interaction `9aa50a05`.

## 4. Capacidade de agentes
- 6 de 7 idle; gargalo = evidência humana + decisão de founder. **Não contratar agora**; reavaliar no GO da O3-C2 (+12 lições ≈ 4 tasks de landing).

## 5. Pendências do founder (interaction `9aa50a05`, pending, wake_assignee)
1. Executar o PILOTO P6 (gate da O3-C2).
2. Decidir I2 (retorno diário obrigatório?).
3. Aceitar triage AID-727 no board + rotear upstream.
4. (Higiene) Dispensar card `d6a28d7d` superseded.

**Disposition AID-732: `blocked` — unblock owner: founder (dandpb); ação: responder `9aa50a05`.**