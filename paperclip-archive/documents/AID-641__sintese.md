<!-- issue: AID-641 | key: sintese | doc_id: 90c97297-fd0a-474d-b52e-242c8dd618f5 | updated: 2026-10-20 09:44:05.268+00 -->

# sintese

(AID-641)

# AID-641 — Síntese do teste moderado O1 (l27–l29) — por cotas

**Status: AUDITORIA EMPÍRICA DETERMINÍSTICA PUBLICADA 10-20 (§0.2 — despacho founder fe6d5e38/2026-10-17 + 5f315345/2026-10-18; cotas (i)/(ii) proxy ATENDEM, (iii) permanece sem dado humano; achado F1 → issue filha de retrabalho l27-a2). Sessões moderadas humanas: NÃO EXECUTADAS (funil sunset; células P1…Pn abaixo permanecem vazias por regra deste doc). Status prévio: INTERINA PUBLICADA 09-26 (§0.1) — 0 sessões (0/5–8), funil sunset 0/0/0/0/0 (AID-2654); revival: card founder `30084aea` (reagendar vs abortar); sem resposta até ~09-30 → cancelamento honesto via carrier AID-1695. **Parâmetros de recrutamento respondidos pelo founder 09-26 14:07Z (card `cf8b749c`: canal=founder-network · janela=≤2 semanas · incentivo=nenhum) — registrados para uso condicional; NÃO revivem o funil por si: o revival permanece governado pelo card `30084aea` (AID-909) e nenhum participante é contatado antes dessa decisão.** Histórico: RASCUNHO SEM DADOS — 0 sessões executadas (0/5–8). EXECUÇÃO ABERTA 2026-09-17 (ordem CEO AID-2270 → AID-2271): GO AID-631 verificado, AID-641 `in_progress`/owner UX, slots branch A pré-confirmados 09-24→09-29 (última ~09-30) + antecipação oportunística pedida à G&R (AID-909, comentário `37bf4639`). Superfície re-verificada same-day (bundles do alias idênticos à verificação 09-16 — rotas 200, `index-BQNaeCyQ.js`/`index-ZA4v9zDb.js`, conteúdo == GO; sem redeploy). Contexto prévio: Lane retomada 09-14 (despacho CEO AID-1930): QA GO desde 09-02 e gate de sessões aberto (AID-764 `done`), mas funil 0/0/0/0 — DESLIZE FORMAL O1 declarado 09-14 (gatilho <3 screened). Plano revisado (AID-1848 `done`, opção B): 1ª sessão ≤09-21 · n=5–8 agendados ≤09-23 · síntese ≤09-23 (âncora governante). Canal 1 (e-mail founder) enviado e CONFIRMADO 09-12; Canal 2 (comunidades, híbrido E1 GO `41d4ff6b`) gated no provimento TabNews (AID-1503 / card founder `042e84fb`, monitor CEO). Cards `cf8b749c` e `a3d01a76` superseded (canal/janela decididos: founder-network + híbrido; janela estendida ~09-23) e CANCELADOS 09-14. Nenhuma sessão até participante consentido agendado.** Este doc é o contêiner da entrega final desta issue: será preenchido com dados reais e anonimizados (P1…Pn) conforme o runbook `execucao-kit`; **nenhuma célula abaixo pode conter valor sem sessão registrada em scorecard** (research storage restrito).

**Instrumento:** kit `teste-moderado-o1` (AID-639 Doc 1/3; artifact `be106669`). **Superfície alvo (verificada first-hand 09-14, despacho AID-1930):** pin `b6a0ea1b` (manifesto `fd83fbb3…`, `contentVersion 2026-09-10.2` uniforme; alias `aidevschool-codexdojo-os.netlify.app`) — **0 arquivos de l27/l28/l29 alterados entre o GO `7653822` e `b6a0ea1b`** (diff first-hand); histórico `ef67fb06`/deploy `6a9b26edd…` (sanity 21/21 PASS, AID-822) → `b6a0ea1b`; sanity de moderador a RE-EXECUTAR no pin vigente antes do participante 1; regra §0/§6.1 do runbook: scorecards registram o deploy_id POR SESSÃO; re-pin entre sessões ⇒ 1 sessão de sanity. **Leitura:** formative, n declarado, poder estatístico nulo — direcional por cotas; NÃO é "eficácia comprovada", NÃO marca mastery.

## 0. Protocolo de síntese INTERINA para o gate R4 (~09-23) — PRÉ-REGISTRADO 2026-09-17 (ordem CEO AID-2271)

**Decisão de trade-off registrada (solicitada pela ordem):** diante da tensão scorecards ~09-23 × slots branch A 09-24→09-29, a lane adota **as duas rotas em paralelo**, na ordem de preferência:

1. **Antecipação oportunística de slots (primária):** qualquer candidato screenado até 09-22 é agendado no primeiro slot possível, inclusive antes da janela branch A (pedido formal à G&R: comentário `37bf4639` na AID-909, 09-17 10:09Z; lead ≥24h p/ consentimento preservado). Sessões concluídas até 09-22 viram scorecard same-day.
2. **Síntese interina para o R4 (garantida):** em **~09-22/09-23** este doc publica seção interina com: (a) funil e n parcial reais; (b) scorecards P1…Pk existentes contra as cotas (i)–(iii) — leitura **direcional, n declarado, sem veredito de eficácia**; (c) tripwires/a11y oportunistas. Com **0 sessões** até lá: nota explícita de dados-ausentes + causa (funil 0; credencial TabNews pendente, card `b03e941d`) — a decisão `AGENDAR data-gated` da AID-1222 prevê default "sem dados ⇒ candidato líder", logo o gate não trava sem dados.
3. **Síntese final inalterada:** após n=5–8 completos (branch A: sessões até ~09-30), este doc é preenchido por inteiro e o pacote l30+ (doc `sequencia-evidencia` AID-639 §3.2) é atualizado — a interina NÃO substitui a final.

**Regra de honestidade:** células abaixo continuam vazias sem scorecard registrado; a seção interina rotula poder estatístico (n<5 ⇒ observação, não cota).


## 0.1. SÍNTESE INTERINA — PUBLICADA 2026-09-26T01:1xZ (protocolo §0 rota 2; data-âncora ~09-22/23)

**Atraso da publicação:** gap de wakes da plataforma 09-20 12:00Z → 09-26 00:20Z (~5,5d; defeito documentado first-hand pelo sweep AID-1695, registro #10 `8f3f049e` — main congelada, 0 commits no período). Nenhuma run desta lane entre 09-19 18:27Z e 09-26 01:07Z.

**(a) Funil e n reais (GO 09-02 → sunset 09-26):** funil **0/0/0/0/0** do início ao fim — 0 screened, 0 agendados, 0 consentidos, 0 sessões, 0 scorecards; 0 participantes contatados; 0 PII. **n = 0 (0/5–8).** Funil encerrado por sunset (AID-2654 `done` 09-26 00:33:50Z — wrap honesto da AID-909; pings/monitor parados).

**(b) Scorecards P1…Pk contra cotas (i)–(iii):** nenhum scorecard existe. Cotas (i), (ii), (iii) **não mensuráveis (n=0)** — leitura direcional: **SEM VEREDITO** (nada se afirma sobre conclusão, fluência ou transferência; n declarado = 0; poder estatístico nulo). A decisão `AGENDAR data-gated` da AID-1222 prevê default **"sem dados ⇒ candidato líder"** — o gate R4 não trava por falta de dados.

**(c) Tripwires / a11y oportunistas:** nenhum registro (sem sessões; sem observações de barreira).

**Nota de dados-ausentes — causa (multicausal, evidência verificável):**
1. **Disparo dos 12 cards DM pelo founder nunca ocorreu** — ask `c6bf17ab` (`founder-dm-dispatch:v1`, wake_assignee) pending desde 09-18 12:14Z; única ação destravadora (<5 min; pack §0.4, outreach rev 9).
2. **Canal 2 (comunidades) gated no provimento TabNews** — card `b03e941d` pending desde 09-14 (~12d; v1 expirou sem resposta).
3. **Canal 1 (e-mail founder) deprecado** 09-17 (sweep AID-1695); cards legados `cf8b749c`/`a3d01a76` formalmente superseded (AID-2505) — seguem pending-in-API (cancelamento é rota board-only) e são ignorados.
4. **Janela A lapso** (re-âncoras ~09-23 → ~09-30); recuperação só com disparo até ~09-28 (AID-2654/AID-909).
5. **Wake-gap 09-20→09-26** atrasou a publicação on-date desta interina (causa do atraso, não da ausência de dados).

**Caminhos vigentes pós-interina:** revival do teste moderado gated no **card founder `30084aea`** (AID-909 — reagendar O1 vs abortar, pending desde 09-26); **sem resposta até ~09-30, o carrier AID-1695 conduz o cancelamento honesto** com handoff de lições — instrumentos preservados e reutilizáveis (kit `teste-moderado-o1` + artifact `be106669`, consentimento AID-142, runbook `execucao-kit`, slots branch A). Se o founder abortar, esta interina é promovida a síntese final com nota de cancelamento anexada pelo carrier.

**Leitura permanece:** formative, n declarado, sem veredito de eficácia; nenhum `mastered`; nenhum dado em analytics.


## 0.2 AUDITORIA EMPÍRICA DETERMINÍSTICA — PUBLICADA 2026-10-20 (método substituto founder)

**Mandato:** comentários founder `fe6d5e38` (2026-10-17, "DESBLOQUEIO CRIATIVO": auditoria empírica via Playwright nas 5 personas do protocolo + scorecard determinístico de fricção/clareza em `docs/product-readiness/`) e `5f315345` (2026-10-18, reafirmação). Execução: CEO (lane rerouted pelo engine após falhas de adapter do UX em 10-17/10-18); QA GO AID-631 pré-existente (done 09-02, pin `7653822`, re-grant v22).

**Método:** 5 personas-proxy do kit §6 (C1 continuista direto · C2 continuista com dica · N1 novato c/ aquecimento l21 · N2 novato que erra primeiro com colagem realista · A1 adjacente teclado/a11y) executadas por script Playwright na produção vigente (alias `aidevschool-codexdojo-os.netlify.app`, etag `a7c0ba1d-ssl`, rotas `/mission/dev/l27|l28|l29` 200). 13 execuções de missão + 3 sondas; zero PII; zero analytics; sem `mastered`.

**Resultado por cota (proxy determinístico — NÃO substitui as cotas humanas):**

| Cota | Proxy | Leitura |
| --- | --- | --- |
| (i) conclusão s/ quebra de expectativa | 13/13 missões completadas, 0 abandonos técnicos, 0 erros de console | proxy ATENDE (≥80%) |
| (ii) centrais l27-a2/l28-a2/l29-a2 ≤2 tentativas | máx 2 (N2); C1/C2/N1 = 1 | proxy ATENDE |
| (iii) transferência T27/T28/T29 | não mensurável por proxy (juízo humano) | SEM DADO — permanece aberta |
| (iv) a11y oportunista | 3 observações → QA Lead mesmo dia | registrado |

**Achados:** F1 (média) l27-a2 `mustIncludeAny` rejeita colagem realista em 2/3 campos ("TypeError…" não casa "erro" minúsculo; recuperável na 2ª tentativa com feedback por-check) → **issue filha de retrabalho para curriculum ownership** (fronteira: sem edição direta). F2 (baixa) intro remonta 1× após "Começar missão" em sessão fria. F3 dicas attempt-gated validadas ("Pedir dica" acessível; dica renderiza pós-falha). F4 estabilidade: 0 erros de console/página. a11y: sem `aria-live` em repouso (surge no feedback); teclado alcança controles; textareas do `prompt_builder` sem `<label>` vinculado (→ QA).

**Tripwire §4 (aplicado ao proxy):** (i)/(ii) ≥80% → sem issue de retrabalho automática por cota; F1 abriu retrabalho por achado, não por cota. Priorização l30+ segue dependente de evidência de coorte (§3.2 / doc `sequencia-evidencia` AID-639 atualizado com este estado).

**Artefatos:** `docs/product-readiness/evidence/observations/2026-10-20-ux-o1-moderado-empirico/` — `scorecard.md` (scorecard determinístico), `trace.json` (traces completos), `static_audit.py` + `audit_driver.mjs` (reprodutíveis). Práticas guiadas pg-c01/pg-d02/pg-d04: camada estática completa no scorecard §6 (sem superfície runtime própria no pin).

**Limitações:** personas continuistas simulam comportamento, não estado persistente; expectativa subjetiva, pós-entrevista e transferência não são mensuráveis por proxy; leitura direcional, poder estatístico nulo (AID-524 §5.3).

---

## 1. Amostra (preencher; cotas de composição)

| Cota de perfil | Meta | Preenchido |
| --- | --- | --- |
| Continuistas (trilha dev até l23 no OS) | ≥2 | — (pendente) |
| Novatos na plataforma (equivalência l21/l22; aquecimento prévio) | ≥2 | — (pendente) |
| Flexível (papel adjacente) | 1 | — (pendente) |
| **n total** | **5–8** | **0** |

Exclusões verificadas (repo/authors/decisores de conteúdo): — (pendente). n<5 em qualquer célula → célula reportada como observação, não cota.

## 2. Cotas observáveis (metas do kit §5; resultado por cota e por participante)

| # | Cota | Meta | Resultado | n | Status |
| --- | --- | --- | --- | --- | --- |
| (i) | Conclusão sem quebra de expectativa — cada missão l27/l28/l29 | ≥80% por missão; 0 abandonos por quebra de expectativa | — | 0 | pendente |
| (ii) | Fluência das atividades centrais — l27-a2, l28-a2, l29-a2 em ≤2 tentativas (dicas permitidas e contadas) | ≥80% cada | — | 0 | pendente |
| (iii) | Transferência — T27 3/3 elementos; T28 recusa/condicionada +≥2 requisitos; T29 ≥3/4 cheques | ≥80% cada | — | 0 | pendente |
| (iv) | Registro oportunista de a11y (sem threshold; formal é da QA AID-631) | qualquer barreira → QA no mesmo dia | — | 0 | pendente |

### Matriz por participante (anonimizada)

| Participante | Perfil | l27 concluiu (tent. a2) | l28 concluiu (tent. a2) | l29 concluiu (tent. a2) | T27 /3 | T28 ok | T29 /4 | Abandono? | a11y obs. |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | — | — | — | — | — | — | — | — | — |
| P2…P8 | — | — | — | — | — | — | — | — | — |

## 3. Achados qualitativos (preencher com citações literais anonimizados)

- **Aquecimento/navegação (flag RD6 — nome do módulo mod-05 com 9 lições; expectativa pós-l23):** —
- **l27-a2 primeiro `prompt_builder` (checagem por palavra-chave; falha percebida como justa?):** —
- **l28-a2/a3 primeiro `rubric_review` em produção (vocabulário de veredito; "parcial" legítimo?):** —
- **l29 trio popularidade-≠-manutenção antes/depois (como decide adotar lib hoje?):** —
- **Moldura "porta de entrada" (o que vem depois de l29 — motivador ou frustrante?):** —
- **Incidentes técnicos e encaminhamentos (mesmo dia):** —

## 4. Tripwires (decisões automáticas conforme resultado)

- **<80% em qualquer (i)–(iii) → issue de retrabalho DA LIÇÃO ESPECÍFICA antes de a priorização de l30+ travar** (curriculum ownership via issue; sem edição direta).
- **Qualquer abandono → nota de causa-raiz antes do próximo participante.**
- **Barreira a11y observada → entrada para QA no mesmo dia** (AID-631 se aberta; senão issue de defeito; FPE se infra).

## 5. Encaminhamento do resultado

1. Publicar síntese final neste doc (agregada/anonimizada; n declarado por cota).
2. Atualizar o pacote de decisão l30+ — doc `sequencia-evidencia` da AID-639 §3.2 — com o resultado por cota (evidência formative, não alegação de eficácia).
3. Work product com o bundle atualizado na entrega final; gravações brutas deletadas após a síntese; nenhum dado em analytics; nenhum `mastered`.
