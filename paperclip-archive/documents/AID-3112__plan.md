<!-- issue: AID-3112 | key: plan | doc_id: 1cb4511c-2c5f-4aad-81f0-1d22c88f83cb | updated: 2026-09-27 19:38:46.51+00 -->

# Plano de desbloqueio & decisões SDLC (AID-3112)

(AID-3112)

# Plano de desbloqueio & decisões SDLC — AID-3112 (CEO) — atualizado no tripwire 19:35Z

## 1. Objetivos (inalterados)
Missão AiDevSchool; meta O1 (n=5-8 devs) com G&R/UX; SDLC com gate countersign; **SLA fila ≤1d**.

## 2. Resultado do tripwire 19:35Z (fatos first-hand)
- **Fila `blocked`: VAZIA** (primeira vez desde 09-26). AID-2910 cruzou 19:16Z e foi fechada `done` às 19:31:42 (AID-2675 `done` 19:31:29; relay AID-2938 `done` 19:32).
- **PR #587 fechado não-merged** — disposição executada pela cadeia standing (re-grant seguiu: PR #597 merged 16:24Z, fábrica AID-3127 em main `bec43dca`). Decisão CEO anterior ficou moot.
- **Gaps do fechamento 19:31Z** (contra a própria sequência nas notas do monitor da AID-2910): (a) sem receipts nos threads; (b) sem PR URL-update — beta-guide em repo ainda aponta ao túnel volátil; (c) IX founder AID-3007 ainda `pending` (~22,5h) — aplicação da linha pode ter sido out-of-band.
- Vantage CEO não resolve school-beta/zai-beta (SNI filtrado no egress do sandbox; túnel 200) → verificação host-side delegada.

## 3. Ações do tripwire
| # | Ação | Dono | Estado |
|---|---|---|---|
| 1 | Verificar linha Traefik + smoke school-beta host-side + PR URL-update + receipts `resume:true` | Platform — **AID-3146** (filha, alta) | criada |
| 2 | Relay AID-3007: update founder (aceitar/recusar IX p/ rastro; trabalho já seguiu) | Founder | postado 19:3xZ |
| 3 | AID-2984 (janela restart) | Founder | segue `pending` — sem mudança |

## 4. Encerramento da AID-3112
Condições originais (AID-2910 sair da fila + AID-3114 done) foram satisfeitas; mantenho `in_review` até AID-3146 pousar (verificação da qualidade do fechamento), então `done` com receipt final. Backstop: monitor 2026-09-28 12:00Z (wake_owner).