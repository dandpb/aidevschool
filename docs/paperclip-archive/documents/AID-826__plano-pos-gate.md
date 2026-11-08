<!-- issue: AID-826 | key: plano-pos-gate | doc_id: 6c38f5d8-03df-4fae-9652-ddd2cb47f147 | updated: 2026-09-04 22:09:21.417+00 -->

# AID-826 — PLANO pós-gate (janela 21d O3-C1 + O1): menu de próximas ondas/decisões founder

(AID-826)

# PLANO PÓS-GATE — menu de próximas ondas e decisões founder (janela 21d O3-C1 + O1)

**Status:** PLANEJAMENTO PURO (ORDEM AID-825/A). Zero conteúdo/código, zero merges, zero métricas novas — só superfícies e receipts existentes como evidência; hipóteses, nunca claim. Não reabre lanes fechadas.
**Owner:** System Designer (bb7b8143). **Público:** founder/CEO (decisão), CD/FPE/QA/UX (execução pós-gate).

---

## 0. Fatos-âncora verificados nesta rodada (fontes)

| Fato | Fonte |
|---|---|
| d+0 = 2026-09-02T17:16:03Z (promoção O3-C1); **d+7 = 09-09T17:16Z**; **d+21 = 09-23T17:16Z** | AID-670, tokens AID-782/802/810 |
| Watchdogs do chain de gate **removidos** (contenção regressão AID-727; zero watchdogs ativos no chain, verificado CEO 09-04) | AID-814, AID-815, memória CEO 09-04 |
| Caminho de wake canônico restante = **rotina horária do founder `c68a1d61`** (verificada first-hand 09-04 20:08Z); monitor one-shot **degradado** (PATCH em `blocked` descarta `monitor` silenciosamente) | AID-823, run CEO AID-820 |
| Instruções do watchdog removido `6e4029b6` preservadas **verbatim** para re-arme | AID-783, rodada 5 |
| AID-814 `in_review`: confirmação founder `97f3b5d6` (relay `upstream-defect-report`) pendente; AID-823 `backlog` (mesmo lote) | AID-814/823 |
| O1 (AID-641, UX) `in_progress`: funil 0/0/0/0; intake `42e6116b` pendente desde 09-04 03:16Z; watchdog `13f1ee95` arma declaração de risco + opção janela estendida em **09-05T12:00Z** | AID-641/768/785 |
| Espera da lane O1 documentada 6h→30h (gatilho `long_active_duration`) | reviews AID-697/715/730/756 |
| ONDA C1 (l15–l17 v1→v2, +3 atividades) promovida (main `ef67fb06`, deploy `6a9b26ed`) | receipt CEO AID-825, AID-821/822 |
| Pós-C1, as únicas lições abaixo do padrão de 3 atividades são **l08–l13 (1 cada)** = exatamente o escopo O3-C2; **pré-spec O3-C2 entregue** (GO→dispatch ~imediato) | contagem YAML `modules/`; AID-807 §2 |
| Pipeline 29/29 `ready`, 0 `planned` (por construção do regime evidence-first) | AID-792 §1 |
| P6/OP-B: kit pronto + pre-flight QA VERDE; aguardando **n≥3** (G1); T1/F2b merged (PR #251, `5cfae21`); ativação de transporte = decisão **board-only** | CRITERIO_O3C2.md, AID-673, ADR-0010 §4 |

---

## 1. Pós-d+7 (09-09) — execução do checkpoint e re-arme condicionado ao fix upstream

### 1.1 Já ordenado (nenhuma decisão nova)
Sweep CEO d+6 (AID-815, 09-08 17:16Z) → no gate d+7: fechar tokens AID-782/802/810 → runbook `checkpoint-d7-runbook` rev `604c8bba` (doc na AID-780; varredura P1/P2 C1 l01–l07, CI pin `4c2aeb7`, N/A-sem-canal) → comentário **"CHECKPOINT d+7"** na âncora AID-670 + ledger `janela-21d` → AID-780 `done` (`resume: true`) com veredito de tendência d+1→d+7 (insumo pré-go/no-go do O3-C2).

### 1.2 Ramo A — fix upstream landed antes de o re-arme ser necessário
**Checklist de re-arme (todos obrigatórios):**
1. Confirmação do fix pelos mantenedores (resposta ao relay) OU hot-patch local autorizado pelo founder (alternativa já registrada em AID-814).
2. Verificação first-hand do CEO: ≥1 ciclo completo **sem** re-trigger com delta composto só de bookkeeping (cláusula de regression watch do gate record AID-727).
3. AID-823 verificado: `monitor` honrado em issue `blocked` (ou 4xx explícito) antes de qualquer dependência de monitor one-shot.

**Re-arme minimalista proposto:**
- **UM único watchdog de âncora em AID-670** cobrindo d+21 (protocolo análogo ao preservado em AID-783; alvo 2026-09-23T17:16:03Z; rodada pré-gate = NO-OP barato).
- **NÃO re-armar o chain inteiro**: o firing acoplado mesmo-segundo `6e4029b6`+`255989ed` foi acelerador do loop (AID-814 timeline T1–T5: 9,5h→2,9h→21m→3m). Um watchdog por momento de gate, no máximo.
- Auto-teste pós-re-arme: 24h de observação; qualquer re-trigger com zero delta na árvore vigiada → remover e voltar ao Ramo B.

### 1.3 Ramo B — fix upstream NÃO landed (trajetória atual): cobertura do d+21 SEM watchdogs
- **Primário:** rotina horária do founder `c68a1d61` (canônico; único wake programático confiável enquanto AID-823 aberto).
- **Recomendação (criação pelo CEO, autoridade existente AID-779 — precedente AID-815; sem nova decisão founder):**
  1. **Token de gate d+21** (`blocked`, condição única `now(UTC) ≥ 2026-09-23T17:16:03Z`) + **ordem SD de checkpoint d+21** espelhando a AID-780 (runbook análogo: A1–A8 + contagem P1/P2 + veredito de saída §6 da AID-670). Bloqueador first-class é visível a qualquer sweep — não depende da maquinaria de watchdog.
  2. **Sweep CEO d+20** (2026-09-22T17:16Z) espelhando a AID-815 — fallback manual 24h antes do gate.
  3. Momento da criação: **logo após o d+7 executar** (não deixar para o d+20).
- **O que NÃO fazer:** re-armar watchdogs com o defeito atuando (queima de budget com período decrescente — AID-814); depender de monitor one-shot em issue `blocked` até AID-823 fechado.

### 1.4 Decisões founder neste bloco
- **Nenhuma nova** para a cobertura do d+21 em si (token + ordem + sweep = delegáveis ao CEO).
- **Pendente existente que destrava o Ramo A:** confirmação `97f3b5d6` (relay AID-814 + AID-823 no mesmo lote).

---

## 2. Pós-O1 — loop de iteração l27–l29 (achados → retrofit v2)

**Gatilho:** doc `sintese` por cotas publicado pela UX na AID-641 — (i) conclusão ≥80% sem abandono por quebra de expectativa; (ii) atividades centrais l27-a2/l28-a2/l29-a2 ≤2 tentativas ≥80%; (iii) transferências ≥80%; (iv) a11y oportunístico → QA no mesmo dia.
**Regra dura herdada (AID-641 passo 6):** <80% em qualquer cota → issue de retrabalho da lição específica **antes** de l30+ travar.

**Gates do loop (ordem):**
1. **G0 — triagem da síntese** (UX+SD, 1 rodada): cada achado classificado *content* (autoria) × *flow/padrão* (UX/SD) × *platform* (FPE); denominadores conferíveis; nada anonimizado vira PII.
2. **G1 — retrabalho por lição** (CD, issue por lição com cota falhada): bump v1→v2 in-place, **ruling AID-640 E1–E4 obrigatório**; zero ids novos → sem T0.
3. **G2 — landing** (FPE) somente se conteúdo mudar; bump único de `contentVersion` no primeiro landing (padrão C1).
4. **G3 — QA independente** wave-level (padrão AID-631; producer ≠ verifier preservado).
5. **G4 — re-teste condicional** (única decisão founder do loop): só se o retrabalho mudar materialmente o comportamento visível ao learner → mini-rodada direcionada (n=2–3, só cotas falhadas); caso contrário, coberto pelas métricas da janela seguinte. Founder aprova apenas o custo da nova rodada de recrutamento.
6. **G5 — pacote l30+ atualizado** (doc `sequencia-evidencia`, AID-639 §3.2) — insumo da decisão W4.

**Quem entra:** CD (autoria) · FPE (landing) · QA (verificação independente) · UX (desenho do re-teste) · SD (coordenação + captação de padrões para o design system). Founder: só G4 (se disparar) + priorização l30+.
**Se a síntese vier após o d+21:** o loop corre inteiro pós-janela sem conflito (nenhuma regra de janela o trava).

---

## 3. Menu de próximas ondas candidatas (custo/risco/pré-requisitos)

| # | Onda | Pré-requisitos (gates) | Custo (est.) | Risco | Decisão |
|---|---|---|---|---|---|
| **W1** | **O3-C2 — retrofit l08–l13 (+12)** **[recomendada 1ª]** | d+21 sustentando (A1–A8 verdes + zero P1/P2 C1 — §6 AID-670) **E** P6 GO (G1–G5 do `CRITERIO_O3C2.md`; GO autoriza SOMENTE o despacho da produção) **E** dispatch CEO. Pré-spec pronta (AID-807 §2) → GO→dispatch ~imediato. | ≈12–18h ponta-a-ponta (autoria +12 ≈6–9h; landing/QA/promo ≈5–8h; referência actual C1: 5–6,5h para +3) | Médio — padrão conhecido (ruling AID-640, zero T0, zero ids); atenuante: lições do caminho central medidas pelo funil na janela seguinte | Founder (escolha de onda) |
| **W2** | **OP-B-F23 — execução P6 + passos de funil** **[motor de evidência — contínua]** | Participantes n≥3 (G1) — **gargalo founder** (indicações). Próximos passos técnicos: completar F2 (R1/R7/R21, além do D1/D2 merged PR #251), F3 (composição do `AnalyticsSink` atrás de `VITE_ANALYTICS_ENDPOINT` — spec AID-673 §2), leitura de retenção (readout especado AID-807 §3) quando ≥5 instalações. Ativação de transporte em produção = board-only (ADR-0010 §4). | Baixo eng. (kit pronto, pre-flight VERDE) | Técnico baixo; dependência externa alta (humanos) | Founder: recrutamento P6 + ativação; resto delegável |
| **W3** | **T0 trilha no-code — mod-08 ia_pratica (opção B AID-792)** [2ª na sequência] | Mesmos gates de W1 (P6 GO + d+21) + preferencialmente 1ª leitura de funil (≥5 instalações) | ≈9–12h (autoria + catálogo/bindings + QA — AID-792 §B) | Médio-alto — módulo novo para exatamente o público que o P6 testa; nasce cego ao atrito se despachado antes do readout | Founder (módulo/ids novos → regra 7 → T0 board-gated por construção) |
| **W4** | **dev pós-l29 (opção A AID-792)** | Síntese O1 lida **E** loop §2 concluído (não despachar onda dev antes de ler o instrumento) | ≈8–11h | Inversão do regime evidence-first se adiantado | Founder (priorização l30+ via `sequencia-evidencia`) |
| **W5** | **Hardening de plataforma + higiene (novidades da janela)** | Nenhum gate — executável pós-gate a qualquer momento | <1h por item | Baixo | Nenhuma nova (itens já registrados) |

**Itens W5 (enumerados):** verificação do fix AID-814/823 + checklist de re-arme §1.2; lote de interações `pending` stale em issues `done` (card `b009c210`/AID-570, rota board); desligar `allow_force_pushes` no main (achado A5-F2, MEDIO).

---

## 4. Recomendação de sequência — founder decide × delegável direto

### 4.1 Linha do tempo de gates (sem ação nova exigida)
09-05 12:00Z (risco O1, watchdog `13f1ee95`) → 09-08 17:16Z (sweep CEO d+6, AID-815) → **09-09 17:16Z (d+7: tokens → runbook → CHECKPOINT d+7 → veredito de tendência)** → [janela: sessões O1 se destravadas; loop §2 se síntese] → 09-22 17:16Z (sweep d+20 recomendado) → **09-23 17:16Z (d+21: checkpoint de saída → veredito de próxima janela para o board — mandatório §6 AID-670)**.

### 4.2 Decisões FOUNDER (cards existentes + futuros, em ordem de vencimento)
1. **AGORA — vence 09-05 12:00Z:** intake O1 `42e6116b` (como contribuir com indicações n=5–8) — ou aceitar a opção de janela estendida que o watchdog apresentará (estender ~09-23, alinhado ao d+21).
2. **Pendente:** relay upstream `97f3b5d6` (AID-814 + AID-823 no mesmo lote) — destrava o Ramo A do re-arme.
3. **Pendente (higiene):** card `b009c210`/AID-570 — lote de interações stale.
4. **Pós P6-GO + d+21:** escolha de onda **W1 × W3**. *Recomendação SD: W1 primeiro* — pré-spec pronta (dispatch no mesmo dia), qualidade do caminho central alimenta o funil que valida W3, e W3 sai de "cego" com a 1ª leitura (≥5 instalações). W2 segue contínua em paralelo (motor de evidência). W4 espera síntese O1 + loop.
5. **Pós-síntese O1:** priorização l30+ (W4) + aprovação da mini-rodada G4 se disparar.

### 4.3 Delegável DIRETO pós-gate (sem nova decisão founder)
- Execução do chain d+7 (ordens existentes AID-815/780/782/802/810).
- Criação do token d+21 + ordem SD de checkpoint d+21 + sweep CEO d+20 (CEO, autoridade AID-779 — idealmente no mesmo dia do d+7).
- Loop de retrabalho O1 G0–G3 e G5 (issues filhas da AID-641, padrões existentes).
- Passos técnicos OP-B-F23 (F2/F3 — lanes FPE já especificadas).
- Itens W5 (hardening/higiene).
- Registro do veredito de próxima janela no board na saída d+21 (mandatório).

---

## 5. Lacunas registradas (gap log)
1. **Fix upstream sem ETA pública** (depende do relay founder) — plano cobre os dois ramos; nenhuma ação bloqueada por isso.
2. **Tranches OP-B-F23 pós-T1 não formalizadas** como spec única — recomendo spec complementar somente quando P6 G1 for atingido (evitar spec prematura).
3. **Custos de W1/W3/W4 são estimativas** (proposta AID-792 + actuals C1); nenhuma métrica nova foi coletada nesta rodada (regra da janela). Hipóteses de esforço, não claims.

---

**Disposição:** rodada única conforme ORDEM — doc publicado; receipt no comentário de fechamento; issue `done`. Sem polling.