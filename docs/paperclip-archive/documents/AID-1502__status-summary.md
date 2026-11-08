<!-- issue: AID-1502 | key: status-summary | doc_id: e3b81177-c451-404c-8018-b38a3485d86e | updated: 2026-09-12 15:27:30.984+00 -->

# AiDevSchool — Estado do projeto + Roadmap 2 semanas (2026-09-12)

(AID-1502)

# AiDevSchool — Resumo do estado do projeto

**Data:** 2026-09-12 · **Autor:** CEO · **Fonte:** auditoria first-hand do board (1.003 issues: 951 done, 33 cancelled, 16 abertas), threads canônicos e verificação ao vivo das superfícies (HTTP 200 em todas, verificado nesta run).

---

## 1. O que o produto é hoje

Duas superfícies públicas em produção (deploy contínuo do `main`, repo [dandpb/aidevschool](https://github.com/dandpb/aidevschool) — main verde, **0 PRs abertos**):

| Superfície | Link | O que tem |
|---|---|---|
| **CodexDojo OS** (hub integrado) | https://aidevschool-codexdojo-os.netlify.app | Hub + jornadas same-origin |
| ↳ IA Prática | https://aidevschool-codexdojo-os.netlify.app/apps/ai-pratica | Trilha prática de IA; capítulos 21–23 shipados (onda W1) |
| ↳ OS Literacy | https://aidevschool-codexdojo-os.netlify.app/apps/os-literacy | Jornada de literacy dentro do OS |
| ↳ Literacy same-origin | https://aidevschool-codexdojo-os.netlify.app/apps/literacy | Jornada de literacy servida pelo hub (fix same-origin) |
| ↳ dojoToday | https://aidevschool-codexdojo-os.netlify.app/apps/dojotoday/ | Painel diário (readiness v44 re-ancorado no main) |
| **LiteracyDojo** (standalone) | https://aidevschool-literacydojo.netlify.app | Jornada Duolingo-like; onboarding acessível NVDA/VoiceOver **aprovado por você** em 09-12 |

**Trilha dev l27–l29 (onda O1):** publicada em produção com QA GO wave-level (pin `7653822` verificado) — é a superfície vigente das sessões de teste moderado, acessível pelo hub OS.

---

## 2. O que o projeto já está fazendo (frentes ativas)

### A. Conteúdo & features (engenharia)
- **W1** — IA Prática cap. 21/22/23 em produção (PR #323, promoção `e91272b2`).
- **O3-C2** — retrofit das lições l08–l13 (+12 atividades) em produção (PR #330, promoção `cb128865`).
- **O1** — trilha dev l27–l29 com QA GO (AID-631, pin `7653822`) — superfície do teste moderado.
- **F1** — instrumentação activation/first-activity promvida em 09-12 (PR #342 `4504eaad`, registro de promoção PR #344).
- **F2** — instrumentação entry/brief (2 eventos de exposição) em produção (PR #324).

### B. Instrumentação & dados
- Telemetria mínima + funil anonimizado nas 2 superfícies (AID-913/918). Export do coletor comprovado E2E (200/200, 57 envelopes, dedup operante, fail-closed sem token). **Honestidade dos dados:** tráfego interativo real até agora = 6 sessões OS + 3 literacy; zero envelopes em 09-08/09-10 — o produto está pronto, falta tráfego (é exatamente o que a onda O1 ataca).

### C. Acessibilidade
- Fix `aria-expanded`/paleta Sócrates em produção; verificação NVDA/VoiceOver do onboarding literacy aprovada por você (card `20b81b4b`, 09-12) — tripla evidência (probe determinístico + produtor + humana) completa.

### D. Crescimento (onda O1 — prioridade atual)
- **Objetivo:** teste moderado com n=5–8 devs, sessões 1:1, síntese por cotas.
- **Decisão HÍBRIDA ratificada por você (09-12):** Canal 1 = intros suas (válidas até 09-16, sem nomes agora; canal preferido e-mail); Canal 2 = G&R direto em comunidades dev BR (autorizado, modo direto).
- **Funil honesto: 0/0/0/0/0** — nenhum despacho físico ainda. Blocker nomeado e com dono: despacho exige 1 conta externa mínima (TabNews) — você aprovou o provimento (card `8357d74f`); **AID-1503 (CEO) está em andamento** para prover a conta e rotear a credencial ao G&R.
- Kit UX pronto (roteiro §3, tarefas §4, cotas falsificáveis §5); handoff screening→sessão sincronizado G&R↔UX; 1ª sessão-alvo **09-18**.

### E. Qualidade / SDLC (AI-Native)
- Playbook AI-Native SDLC implementado e auditado: CI bloqueante com guardrails SDLC, branch protection, protocolo single-writer de merge, produtor ≠ verificador em todas as cadeias, 0 PRs abertos.
- Auditorias recentes **CONFORME**: AID-1440 (09-12, janela B5/F1) e AID-1496 (09-12, âncora rolling SM).

### F. Plataforma (Paperclip) — saúde do próprio time
- 4 defeitos de plataforma trackeados no vendor ([paperclipai/paperclip#13155](https://github.com/paperclipai/paperclip/issues/13155)): W0/W1/W4 + **W6** (PATCH-deadlock em issue com interação pendente — trava apenas fechamentos clericais de 2 issues, AID-1468/AID-1479; mitigado, sem trabalho perdido; unblock = 1 click seu ou fix do vendor, checagem 09-17).
- Time: 8 agentes (CEO, Founding Product Engineer, QA Lead, Growth & Recruiter, UX Designer, Content Designer, System Designer, SDLC Scrum Master).

---

## 3. Roadmap — próximas 2 semanas (2026-09-12 → 09-26)

| Data | Evento | Issue | Dono |
|---|---|---|---|
| **09-12 (hoje)** | Provimento da conta TabNews mínima; 1º despacho T1-G nas comunidades assim que a credencial existir | AID-1503 → AID-909 | CEO → G&R |
| **09-13 12:00Z** | Kill gate O1 — **pré-registrado: 0 ⇒ NÃO matar** (intros valem até 09-16; Canal 2 vivo); re-arm +24h | AID-909 | CEO |
| **09-14 12:00Z** | Gatilho intermediário: <3 candidatos somados em screening ⇒ plano formal de deslize ao CEO | AID-909 | G&R |
| **09-16 12:00Z** | **Checkpoint O1** — decisão de deslize da janela (~09-23 governa; 09-30 só como teto de fallback pré-autorizado). Também é o deadline das intros do Canal 1 | AID-1348 | CEO |
| **09-17 12:00Z** | Checagem da resposta do vendor (W0/W1/W4/W6) + critérios de re-arm | AID-1290, AID-871 | CEO |
| **09-18** | **1ª sessão moderada O1** (handoff G&R→UX same-day, pin reconfirmado por sessão) | AID-641 | UX + G&R |
| **~09-20** | Meta: 5–8 candidatos agendados | AID-909 | G&R |
| **09-23** | Meta: 5–8 sessões completas · **Saída da janela 21d O3-C1** (gate 17:16Z + veredito A1–A8; zero P1/P2 até aqui) | AID-1120/AID-670 | CEO |
| **09-24→09-26** | Síntese O1 por cotas (doc `sintese`) → decisão de próximas ondas; follow-ups do veredito de saída O3-C1 | AID-641 + board | CEO |
| Contínuo | Sweep diário da fila de intervenção (SLA ≤1d) · auditoria SDLC rolling · promoções/redeploys conforme merges | AID-1372, AID-1496 | CEO/SM/FPE |

---

## 4. Pendências que dependem de você (founder)

1. **Provimento TabNews (AID-1503)** — único item no caminho crítico do funil O1: a conta exige e-mail/credencial (capacidade board-side). Assim que existir, o G&R despacha a copy T1-G no mesmo dia.
2. **Card E2** (`ff7d1547`, AID-670) — decisão opcional sobre a janela 21d; sem resposta, o backstop 09-23 executa o veredito sozinho.
3. **Card de higiene** (`c810e371`, AID-1431) — 6 asks administrativos stale; não crítico.
4. **1 click W6** — cancelar o card umbrella `3b0f555e` destrava o fechamento clerical de AID-1468/AID-1479 (ou o fix do vendor em ~09-17 resolve).

---

## 5. Como testar cada feature agora

1. **Hub OS** → https://aidevschool-codexdojo-os.netlify.app — navegue entre jornadas (mesma origem).
2. **IA Prática** → https://aidevschool-codexdojo-os.netlify.app/apps/ai-pratica — lições dos cap. 21–23 (motor de lição).
3. **Literacy (standalone)** → https://aidevschool-literacydojo.netlify.app — onboarding em 5 etapas; teste com NVDA/VoiceOver (anúncio de etapa nova, "Etapa N de 5", Voltar anuncia a anterior).
4. **Literacy no OS** → https://aidevschool-codexdojo-os.netlify.app/apps/literacy e https://aidevschool-codexdojo-os.netlify.app/apps/os-literacy.
5. **dojoToday** → https://aidevschool-codexdojo-os.netlify.app/apps/dojotoday/.
6. **Trilha dev l27–l29 (O1)** — dentro do hub OS; é a superfície onde rodarão as sessões moderadas (pin `7653822`).
7. **Repo/CI** → https://github.com/dandpb/aidevschool (main verde, 0 PRs abertos, guardrails SDLC ativos).

*Telemetria: o export do coletor (`/__dojo/bridge/v1/analytics`) é interno, protegido por token (fail-closed) — não é superfície de teste, apenas evidência de que a instrumentação está viva.*
