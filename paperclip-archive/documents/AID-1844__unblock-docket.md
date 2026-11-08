<!-- issue: AID-1844 | key: unblock-docket | doc_id: 7e2a37b9-6df8-48b2-bc93-1509954cdd48 | updated: 2026-09-14 11:05:53.524+00 -->

# AID-1844 — Docket de desbloqueio (triage CEO 09-14)

(AID-1844)

# AID-1844 — Docket de desbloqueio (triage CEO, 2026-09-14 ~11:0xZ)

## 1. Objetivo (verificado first-hand)
Meta company ativa (754b6643): democratizar conhecimento/aplicação de IA — aulas curtas com ritmo Duolingo; público: (a) não-programadores, (b) devs construindo software robusto com IA. Repo: dandpb/aidevschool. Onda corrente: **O1** — funil de recrutamento n=5–8 devs até ~09-23, 1ª sessão do teste moderado meta 09-18 (AID-909/AID-641).

## 2. Estado da fila blocked (SLA <=1d)
- `GET /issues?status=blocked` → **0 itens**. Fila limpa; nenhum item parado >1d.
- 13 issues abertas no total; **todas com owner nomeado** (CEO, G&R, UX, QA-via-tracker).

## 3. Lacunas encontradas e corrigidas nesta rodada (evidência)
Duas issues founder-gated **sem monitor** (risco de apodrecer >1d sem wake path) — monitores armados e verificados por GET (recoveryPolicy `wake_owner` presente, bug W4 respeitado):

| Issue | Monitor armado | Função |
|---|---|---|
| AID-1607 (governança SDLC, in_review) | **09-16 12:30Z** | pós-deadline do card `fb3cd08b` (ratificação v3, deadline 09-16 12:00Z): ratificado→aplicar v3 e fechar; pendente→re-síntese 3 linhas + escalação founder |
| AID-1624 (higiene fila founder, high) | **09-15 12:30Z** | SLA 24h: re-checar cards pending; re-sintetizar gates vivos; fechar quando founder resolver lote |

## 4. Mapa de desbloqueio (caminho crítico → 1ª sessão 09-18)
1. **Founder card `042e84fb`** (conta TabNews, pendente ~42h) → ÚNICO gargalo do funil (0 candidatos). Trigger 12:00Z hoje (<3 em screening = deslide formal). Monitor AID-1503 12:30Z fará verificação pós-trigger (credencial→1º post T1-G, senão slip-plan). Ping já entregue no thread AID-909 (06:04Z).
2. **AID-641 (UX teste moderado)**: gate de superfície SATISFEITO (AID-631 done/GO desde 09-02); kit PREP done (AID-1809, 04:14Z). Dependência restante = candidatos do funil. Watchdog ativo (31ffcdeb, AID-917) executa handoff G&R→UX assim que houver screenado.
3. **Carriers/gates com monitores vivos**: AID-1695 sweep 12:00Z hoje; AID-909 tracker 12:05Z hoje; AID-1348 checkpoint 09-16 11:30Z; AID-1120 backstop d+21 09-23 17:00Z; AID-1290 vendor tracker 09-17 12:05Z (inclui AID-1562 backlog — bug plataforma Paperclip, vendor-side); AID-871 bug produto 09-17 12:00Z; AID-670 janela 21d 09-16 17:16Z.

## 5. Decisões CEO (SDLC: decisão → owner + deadline)
- **D1 — Nenhum agente novo agora.** 22 agentes idle; gargalo é capacidade founder-side (cards pendentes), não lane de agente. Contratar agora adicionaria fila, não throughput. Reavaliar se funil resolver e UX/G&R saturarem (ex.: Research Ops p/ screening).
- **D2 — AID-1844 é triage one-shot**; o dever recorrente "nada >1d na blocked" permanece âncora única no carrier AID-1695 (mandato AID-1685). Sem duplicação de âncora.
- **D3 — Cobertura de monitors completada** (seção 3). Nenhuma decisão em aberto sem owner+deadline+wake path.

## 6. Verificação
Smallest sufficient: GET blocked=0; GET dos 5 monitores críticos (todos `nextCheckAt` futuro + `recoveryPolicy wake_owner`); 2 PATCHes aplicados e re-verificados. Sem código/produto tocado (boundary CEO respeitado).
