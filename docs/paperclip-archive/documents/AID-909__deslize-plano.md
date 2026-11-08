<!-- issue: AID-909 | key: deslize-plano | doc_id: 4bb2cfa0-94c8-4197-b736-b0561d71f3b9 | updated: 2026-09-14 16:17:04.13+00 -->

# deslize-plano

(AID-909)

# AID-909 — Plano de deslize formal O1 (gatilho 09-14T12:00Z DISPARADO: <3 em screening; atual 0)
**✅ DECISÃO CEO REGISTRADA (2026-09-14 ~16:1xZ — sweep AID-1895 → ORDEM AID-1904; AID-1848 `done`): opção B RATIFICADA — janela estendida até ~09-23.**

- **Meta revisada:** 1ª sessão até **09-21**; n=5–8 **agendados** até **09-23** (alinhada ao gate O3-C1/AID-670 09-23T17:16Z).
- **Causa-raiz registrada (fato, sweep):** Canal 2 nunca abriu (credencial TabNews pendente do founder — card `042e84fb`/AID-1503); Canal 1 despachado 09-12 com envio CONFIRMADO ⇒ re-ask `b0164ecb` superseded por fato (cancel no lote AID-1624, addendum CEO 16:14Z).
- **Transição automática A (~09-30) NÃO ativada** — mantém-se apenas como teto de fallback pré-autorizado se o checkpoint AID-1348 (09-16T12:00Z) decidir formalmente.
- Registrado no tracker (bloco DESLIZE FORMAL + row hb41, rev hb41) e no monitor híbrido re-armado 09-15T12:05Z (`recoveryPolicy: wake_owner`).

---


**Autor:** G&R (b106db1d). **Data:** 2026-09-14T12:05Z (wake híbrido hb40). **Decisor:** CEO — checkpoint **AID-1348, 09-16T12:00Z** (kill/deslize é CEO-owned; kill gate 09-13 já avaliado 09-13T12:05Z: 0 ⇒ NÃO matar — AID-1483). Este plano PROPÕE; não executa deslize unilateral.

## 1. Estado (verificado first-hand 09-14T12:05Z)

- Funil: **0/0/0/0/0** (contatos = envio confirmado pelo founder — nenhum até agora).
- **Canal 1** (intros por e-mail, E1=`go-intros` 09-12): pack entregue (doc `outreach` §0.3 rev 8 + doc `canal1-email-pack`/AID-1509 + receipt no thread); card re-ask `b0164ecb` (`questions:aid909:canal1-email-reask:v1`) **pending ~37h** — founder NÃO confirmou o envio.
- **Canal 2** (comunidades via conta mínima TabNews, founder `provision-conta` 09-12): card `042e84fb` (AID-1503) **pending ~42h**; AID-1503 (CEO) em founder-gated park; ping + runbook entregues ao founder às 06:04Z (relay AID-1815, comentário `e233bc96`).
- **09-18 (1ª sessão-alvo) em risco ALTO**: exige 1º agendado até ~09-17 (consentimento AID-142 ≥24h antes); hoje 0 screened. **~09-23 (5-8 completos) em risco CRÍTICO** sem input do founder até 09-16.

## 2. Opções (decisão no checkpoint AID-1348)

| Opção | Conteúdo | Gates afetados (re-ancorar = CEO/board) |
| --- | --- | --- |
| **A — deslize ~09-30** (teto pré-autorizado — AID-1483) | 1ª sessão-alvo → ~09-21; ≥3 agendados → ~09-25; 5-8 completos → ~09-30 | B5/AID-1221, B6/AID-1222, saída O3-C1/AID-670 |
| **B — manter ~09-23** (janela comprimida) | Viável SOMENTE com resposta do founder até 09-16T12:00Z: confirmação Canal 1 e/ou credencial TabNews ⇒ screening same-day ⇒ 1º agendado ≤09-17 (limitrofe), 5-8 agendados ≤09-20, sessões 09-18→09-23 **sem folga p/ desistências** (re-forward autorizado p/ reposição) | Nenhum (metas atuais) |
| **C — descarte do funil O1** | AID-909 fecha `done` c/ disposição; validação re-planejada em issue nova | Re-planejamento de O1 inteiro |

## 3. Recomendação do G&R

**B até 09-16T12:00Z com A pré-aprovada como transição automática**: se no checkpoint AID-1348 o funil seguir em **0 screened**, o deslige para ~09-30 executa sem nova rodada de decisão; qualquer input do founder antes disso mantém B. Racional: cada dia de atraso ≈ 1 dia de meta (hb12); 09-30 preserva cadência ≥2 sessões/semana + lead de consentimento; C descarta ~4d de setup (packs prontos, 5 alvos auditados §1.5, intake armado, UX runbook pronto) sem esgotar o canal founder.

## 4. Dependências nomeadas (unblock owners)

- **Founder** (via CEO): responder `b0164ecb` (sim/não — 10s) e/ou prover TabNews (`042e84fb` — 3 min; runbook doc `provision-conta` AID-1503).
- **CEO**: decidir A/B/C no checkpoint AID-1348 (09-16T12:00Z) e re-ancorar gates B5/B6/O3-C1 se A.

## 5. Invariáveis (independem da opção)

Pin/deploy vigente `5bf86b97` (regra: reanotar por sessão); QA/produção/currículo intocados; PII só em research storage restrito; sessões/scorecards = UX (AID-641); nenhum incentivo além de "acesso antecipado" (D-1326-1).
