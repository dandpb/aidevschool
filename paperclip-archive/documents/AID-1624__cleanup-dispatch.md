<!-- issue: AID-1624 | key: cleanup-dispatch | doc_id: c3adb900-b4bf-4ba9-8dc5-2624e35a30d0 | updated: 2026-09-14 12:05:28.442+00 -->

# Despacho de limpeza da fila founder — v2: 36 cancels + 5 keeps (watchdog 2026-09-14)

(AID-1624)

# Despacho de limpeza — fila founder (AID-1624) · v2

**Verificado first-hand 2026-09-14 12:00Z pelo watchdog semanal #1 (AID-1847, rotina c74695f1)** — sweep COMPLETO das 1.840 issues da companhia (incl. done/cancelled/todo; paginação verificada: ids únicos, página vazia além do fim). Resultado: **41 cards pending** = **36 órfãos/superseded (cancelar)** + **5 gates vivos (manter)**.

**O que mudou vs. v1 (09-13, 19 cards):** a v1 e o baseline AID-1736 varreram ~1.300–1.617 issues e não cobriam todo o histórico — 24 cards antigos em issues cancelled da onda do piloto/PR #161 (AID-69…AID-461, canceladas 08-26→09-03) estavam invisíveis. O backfill completo do watchdog fechou essa lacuna. Também houve movimento do founder: 4 gates vivos de ontem foram respondidos (agora restam 5, todos <48h).

Rota de cancelamento permanece **board-only** (403 p/ agentes, verificado AID-570 e testado 3x). Este despacho consolida tudo em UM lote no board UI. Card gate existente: `4199996a` nesta issue (sem card duplicado, conforme runbook).

⚠️ Lição do incidente ac2d9749 (AID-1381): responder um card NÃO cancela outro — cancelar cada card da lista.

## Lote único — CANCELAR (36 cards, oldest first)

| # | Issue (status) | Card ID | Idade | Motivo |
|---|---|---|---|---|
| 1 | AID-69 (cancelled) | `d21974c6-f10c-4590-8bf9-78d01881c4c4` | 22.5d | Novo no v2 — onda antiga do piloto/PR #161: issue hospedeira cancelled (08-26→09-03) e decisão superada por sucessores; invisível a sweeps anteriores que não cobriam todo o histórico. |
| 2 | AID-73 (cancelled) | `2e789b60-09e3-4fb4-8e1c-1914a23bd846` | 22.5d | Novo no v2 — onda antiga do piloto/PR #161: issue hospedeira cancelled (08-26→09-03) e decisão superada por sucessores; invisível a sweeps anteriores que não cobriam todo o histórico. |
| 3 | AID-89 (cancelled) | `90f4978f-64ca-420d-8ce5-aa99026034c4` | 22.1d | Novo no v2 — onda antiga do piloto/PR #161: issue hospedeira cancelled (08-26→09-03) e decisão superada por sucessores; invisível a sweeps anteriores que não cobriam todo o histórico. |
| 4 | AID-91 (cancelled) | `d0c87885-7d2b-4e90-92ac-e4d71b2cd50a` | 22.0d | Novo no v2 — onda antiga do piloto/PR #161: issue hospedeira cancelled (08-26→09-03) e decisão superada por sucessores; invisível a sweeps anteriores que não cobriam todo o histórico. |
| 5 | AID-92 (cancelled) | `29109263-d5e1-48e6-a5b1-641a45820736` | 22.0d | Novo no v2 — onda antiga do piloto/PR #161: issue hospedeira cancelled (08-26→09-03) e decisão superada por sucessores; invisível a sweeps anteriores que não cobriam todo o histórico. |
| 6 | AID-94 (cancelled) | `4173473b-5212-45e2-b72e-cd7d1fbdd76c` | 21.9d | Novo no v2 — onda antiga do piloto/PR #161: issue hospedeira cancelled (08-26→09-03) e decisão superada por sucessores; invisível a sweeps anteriores que não cobriam todo o histórico. |
| 7 | AID-106 (cancelled) | `a14e7fa6-f693-4d22-b44c-885e4abf63bc` | 21.5d | Novo no v2 — onda antiga do piloto/PR #161: issue hospedeira cancelled (08-26→09-03) e decisão superada por sucessores; invisível a sweeps anteriores que não cobriam todo o histórico. |
| 8 | AID-115 (cancelled) | `78cc4d5e-37e8-4f72-9d33-4b40e308a434` | 21.2d | Novo no v2 — onda antiga do piloto/PR #161: issue hospedeira cancelled (08-26→09-03) e decisão superada por sucessores; invisível a sweeps anteriores que não cobriam todo o histórico. |
| 9 | AID-117 (cancelled) | `8a3a6e67-9599-4192-8d44-4046a1e5512a` | 21.1d | Novo no v2 — onda antiga do piloto/PR #161: issue hospedeira cancelled (08-26→09-03) e decisão superada por sucessores; invisível a sweeps anteriores que não cobriam todo o histórico. |
| 10 | AID-119 (cancelled) | `71bf4627-268e-451d-ba67-aa06e31026da` | 21.0d | Novo no v2 — onda antiga do piloto/PR #161: issue hospedeira cancelled (08-26→09-03) e decisão superada por sucessores; invisível a sweeps anteriores que não cobriam todo o histórico. |
| 11 | AID-131 (cancelled) | `11be393b-f2c0-4646-8cf6-eaec9c21fb37` | 20.9d | Novo no v2 — onda antiga do piloto/PR #161: issue hospedeira cancelled (08-26→09-03) e decisão superada por sucessores; invisível a sweeps anteriores que não cobriam todo o histórico. |
| 12 | AID-135 (cancelled) | `1efd1bd9-8708-4948-8df2-f78da5ccff75` | 20.8d | Novo no v2 — onda antiga do piloto/PR #161: issue hospedeira cancelled (08-26→09-03) e decisão superada por sucessores; invisível a sweeps anteriores que não cobriam todo o histórico. |
| 13 | AID-140 (cancelled) | `ace557f6-df9a-40b5-b118-9d68c8dbcbf1` | 20.5d | Novo no v2 — onda antiga do piloto/PR #161: issue hospedeira cancelled (08-26→09-03) e decisão superada por sucessores; invisível a sweeps anteriores que não cobriam todo o histórico. |
| 14 | AID-140 (cancelled) | `1a56c80a-e59e-4238-beae-57c4470d23ac` | 20.5d | Novo no v2 — onda antiga do piloto/PR #161: issue hospedeira cancelled (08-26→09-03) e decisão superada por sucessores; invisível a sweeps anteriores que não cobriam todo o histórico. |
| 15 | AID-157 (cancelled) | `8072f797-7ccb-4055-aa82-aa7c4588f4d8` | 20.3d | Novo no v2 — onda antiga do piloto/PR #161: issue hospedeira cancelled (08-26→09-03) e decisão superada por sucessores; invisível a sweeps anteriores que não cobriam todo o histórico. |
| 16 | AID-165 (cancelled) | `04bea24a-0a1d-499d-88d9-fa7ed33b2423` | 20.0d | Novo no v2 — onda antiga do piloto/PR #161: issue hospedeira cancelled (08-26→09-03) e decisão superada por sucessores; invisível a sweeps anteriores que não cobriam todo o histórico. |
| 17 | AID-166 (cancelled) | `fd95f007-0829-48d3-9514-883eae90fb3f` | 20.0d | Novo no v2 — onda antiga do piloto/PR #161: issue hospedeira cancelled (08-26→09-03) e decisão superada por sucessores; invisível a sweeps anteriores que não cobriam todo o histórico. |
| 18 | AID-140 (cancelled) | `5591d831-7aff-46cd-8040-09660cb6bcb3` | 19.7d | Novo no v2 — onda antiga do piloto/PR #161: issue hospedeira cancelled (08-26→09-03) e decisão superada por sucessores; invisível a sweeps anteriores que não cobriam todo o histórico. |
| 19 | AID-181 (cancelled) | `af60fdc7-77fe-4931-9c9b-93bfadd3e8e2` | 19.7d | Novo no v2 — onda antiga do piloto/PR #161: issue hospedeira cancelled (08-26→09-03) e decisão superada por sucessores; invisível a sweeps anteriores que não cobriam todo o histórico. |
| 20 | AID-182 (cancelled) | `7d5f305e-47cd-4cbc-819d-a4e37e599e5b` | 19.6d | Novo no v2 — onda antiga do piloto/PR #161: issue hospedeira cancelled (08-26→09-03) e decisão superada por sucessores; invisível a sweeps anteriores que não cobriam todo o histórico. |
| 21 | AID-197 (cancelled) | `37f817e9-818c-4adb-9cb3-ad94102f7cee` | 19.3d | Novo no v2 — onda antiga do piloto/PR #161: issue hospedeira cancelled (08-26→09-03) e decisão superada por sucessores; invisível a sweeps anteriores que não cobriam todo o histórico. |
| 22 | AID-318 (cancelled) | `78a1a57e-58f2-4516-82b5-774176447177` | 16.4d | Novo no v2 — onda antiga do piloto/PR #161: issue hospedeira cancelled (08-26→09-03) e decisão superada por sucessores; invisível a sweeps anteriores que não cobriam todo o histórico. |
| 23 | AID-354 (cancelled) | `7efcfde2-ed74-4cbf-ad66-47e6131e59d3` | 15.7d | Novo no v2 — onda antiga do piloto/PR #161: issue hospedeira cancelled (08-26→09-03) e decisão superada por sucessores; invisível a sweeps anteriores que não cobriam todo o histórico. |
| 24 | AID-416 (cancelled) | `738d5a2c-c4a4-4c35-870f-e53405e6bbd7` | 14.7d | Novo no v2 — onda antiga do piloto/PR #161: issue hospedeira cancelled (08-26→09-03) e decisão superada por sucessores; invisível a sweeps anteriores que não cobriam todo o histórico. |
| 25 | AID-415 (cancelled) | `3c26efb9-6d2c-4059-8e43-2d013daee7e0` | 14.7d | Novo no v2 — onda antiga do piloto/PR #161: issue hospedeira cancelled (08-26→09-03) e decisão superada por sucessores; invisível a sweeps anteriores que não cobriam todo o histórico. |
| 26 | AID-461 (cancelled) | `f174a0df-a87d-47eb-87ab-e21755cb1bd5` | 14.2d | Novo no v2 — onda antiga do piloto/PR #161: issue hospedeira cancelled (08-26→09-03) e decisão superada por sucessores; invisível a sweeps anteriores que não cobriam todo o histórico. |
| 27 | AID-572 (cancelled) | `4f131405-cc8a-4a0b-9a7a-96b95fc54944` | 12.4d | Já listado no despacho v1 — issue hospedeira terminal; decisões re-roteadas/resolvidas em canais vivos. |
| 28 | AID-641 (todo) | `cf8b749c-819a-4d9b-b6aa-96b1f6e19c76` | 11.8d | Já listado no despacho v1 — issue hospedeira terminal; decisões re-roteadas/resolvidas em canais vivos. |
| 29 | AID-732 (cancelled) | `9aa50a05-23f3-49b3-9271-3aeea8d015fd` | 11.0d | Já listado no despacho v1 — issue hospedeira terminal; decisões re-roteadas/resolvidas em canais vivos. |
| 30 | AID-737 (cancelled) | `8419f040-9b80-4c04-80e2-2dbd0adc20f7` | 10.8d | Já listado no despacho v1 — issue hospedeira terminal; decisões re-roteadas/resolvidas em canais vivos. |
| 31 | AID-641 (todo) | `a3d01a76-e053-407a-be79-61dede7f3b73` | 9.0d | Já listado no despacho v1 — issue hospedeira terminal; decisões re-roteadas/resolvidas em canais vivos. |
| 32 | AID-920 (cancelled) | `776d12f7-27ed-485f-aa80-029ef934fa41` | 7.9d | Já listado no despacho v1 — issue hospedeira terminal; decisões re-roteadas/resolvidas em canais vivos. |
| 33 | AID-929 (cancelled) | `be859c7f-eda1-425a-bd82-d2a9dc2b445a` | 7.9d | Já listado no despacho v1 — issue hospedeira terminal; decisões re-roteadas/resolvidas em canais vivos. |
| 34 | AID-937 (cancelled) | `2b11bda8-a24a-43db-9d95-270848e6e1e9` | 7.8d | Já listado no despacho v1 — issue hospedeira terminal; decisões re-roteadas/resolvidas em canais vivos. |
| 35 | AID-954 (cancelled) | `a9fb9b1c-e514-4102-924b-a4ff76e79f28` | 7.7d | Já listado no despacho v1 — issue hospedeira terminal; decisões re-roteadas/resolvidas em canais vivos. |
| 36 | AID-1645 (cancelled) | `d0e5c6d1-b5d4-4733-80e2-fb9ae83688c4` | 1.2d | Issue vazia cancelada em 09-13 — card órfão recente (<48h), cancelar junto. |

## Manter — gates vivos (5, todos <48h)

| # | Issue (status) | Card ID | Idade | Gate |
|---|---|---|---|---|
| 1 | AID-1381 (in_review) | `9764e76c-051f-497c-8e53-e165ed72c82f` | 1.9d | Retry: 2 asks da AID-641 ainda pending após sua resposta |
| 2 | AID-1503 (in_progress) | `042e84fb-b34d-4c74-b45c-92430c6cf305` | 1.9d | Conta TabNews p/ Canal 2 (3 min): criar conta + entregar credencial em canal seg |
| 3 | AID-909 (in_progress) | `b0164ecb-6805-4813-b801-544d2521e9e7` | 1.5d | Canal 1 (re-ask): o pack de e-mail foi enviado? sim/nao |
| 4 | AID-1607 (in_review) | `fb3cd08b-fd97-4600-815a-66658717f077` | 1.3d | RATIFICAÇÃO founder — diretiva v3: auditorias SDLC por despacho (decisão AID-160 |
| 5 | AID-1624 (in_review) | `4199996a-4810-4fb1-b26e-f9d96e33934c` | 1.3d | Fila founder: executar lote de limpeza — cancelar 12 cards superseded (doc clean |

## Aceite (critério AID-1736, monitorado semanalmente)

Semana 1 (09-14): **vermelha** — 41 pending ≥ 10 e 35 superseded >48h ≠ 0. Após o lote acima: 5 pending, 0 superseded >48h → semana 2 verde se mantiver até 09-21.
