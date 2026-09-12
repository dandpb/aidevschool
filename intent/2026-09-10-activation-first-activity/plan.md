# Plan — F1 `2026-09-10-activation-first-activity` (registro de build)

> Transcrição canônica do doc `plan` rev `1ef7482c` da issue AID-1221, ACEITO pela ORDEM CEO AID-1424 (D-1423-1; interação `e3f283eb` pending = formalização board-only — clique posterior apenas re-confirma). Dispatch do build FPE: AID-1425. Este arquivo acompanha o PR de build (padrão AID-913).

# Plan — F1 `2026-09-10-activation-first-activity` (build FPE)

From: spec doc `spec` **rev `6b32912f`** (review-ready; input CD incorporado — AID-1414 doc `input-cd` rev `6d38e23e`, veredito: sem divergência estrutural) · Plan lead: System Designer · Build: **FPE** (fa8130d5) · Countersign: **QA** (ca6a3f95)
Gates já vencidos: intent `accepted` (AID-1216 item 3; registro no main via PR #341 docs-only, ainda OPEN — merge independente, sem conflito de arquivo com o PR de build) · **spec GO canônico do owner = ORDEM AID-1421 / D-1420-1** (interação `304565ca` pending = formalização board; clique posterior apenas re-confirma) · input CD obrigatório entregue.
Gate seguinte: `request_confirmation` deste doc (**plan gate**, `confirmation:…:plan:{rev}`) → aceito ⇒ dispatch build FPE (child) → PR único de build → countersign QA. Nenhuma subtask de implementação antes do aceite.
Base de build: main **`32545321`** (idêntica à base first-hand da spec §0; re-verificada neste plan).

## 1. Entregas (por spec §1/§3, ordem de dependência; teto R7 = apresentação apenas)

| # | Entrega | Arquivos ( literacyDojo=LD / codexdojo-os-prototype=OS ) | Depende de |
| --- | --- | --- | --- |
| P1 | Mapa first-touch fechado: `Record<AnalyticsActivityType, string>` com as 7 frases do **spec Anexo A verbatim** + lead-in fixo `"Primeiro passo:"`; enum fechado de 7 (`LD src/domain/analytics.ts:53-62`) — guard de drift por construção (key nova sem frase ⇒ erro de compilação) | `LD src/domain/firstTouch.ts` (novo) | — |
| P2 | Intro declara o 1º toque: bloco first-touch antes do CTA "Começar missão", frase derivada de `lesson.activities[0].type` via P1 (**sem hardcode por lição**); modo revisão herda a mesma frase; missão hospedada herda pela mesma tela (adapter OS intocado) | `LD src/screens/LessonScreen.tsx` (fase `"intro"`), `LD src/styles.css` (apresentação) | P1 |
| P3 | Framing do índice 0: no player, quando `currentActivityIndex === 0`, eyebrow estendido com copy fixa `"Primeira atividade — tente com o que você sabe; se travar, peça uma dica"`; índices >0 inalterados; botão "Pedir dica" permanece como hoje; **zero mudança** em submit/feedback/retry/hint-policy | `LD src/screens/LessonScreen.tsx` (player) | — |
| P4 | Mapa OS espelha o Hub: `MapScreen` consome `recommendMission` (fonte única, `OS src/missions/recommendation.ts`); kinds **`start`/`resume` apenas** ⇒ badge **textual** "Comece aqui" no nó (`mission-map-node`, markup semântico + aria coerente — nunca só-cor) e destaque do capítulo da trilha ativa no header; kinds `review`/`targeted-practice`/`retry`/`onboarding`/`none` ⇒ sem badge (labels próprios); overlays/travas/`studentPath` inalterados | `OS src/journey/MapScreen.tsx` | — |
| P5 | Testes + fixtures + docs: e2e LD (frase por tipo na intro; framing só no índice 0; contrato AID-1089/W2 verde), smoke OS (badge por estado de progresso), a11y (badge textual, contraste, ordem de foco e labels preservados), fixtures dos 7 tipos como 1ª atividade (guard `output_comparison` `len(outputs)==2`; `choice` número-neutro); `intent/2026-09-10-activation-first-activity/spec.md` + `plan.md` no PR de build (padrão AID-913) | `LD tests/app/` (novo `firstTouchIntro.test.tsx` + suítes existentes), `OS src/journey/MapScreen.test.tsx`, `intent/2026-09-10-activation-first-activity/` | P1–P4 |

## 2. Invariantes de implementação (spec R7 — travados por teste/revisão de diff)

- **Allowlist de diff do PR de build:** `LD src/domain/firstTouch.ts`, `LD src/screens/LessonScreen.tsx`, `LD src/styles.css`, `LD tests/**`, `OS src/journey/MapScreen.tsx`(+`.test.tsx`), `intent/2026-09-10-activation-first-activity/**`. Qualquer arquivo fora ⇒ rejeição no review, não emenda de escopo.
- **Intocados (R4/R7):** `engines/voxelDojo/game-02-warehouse/` (byte-idêntico), `curriculum/`, `learner/` (substrate/coletor/agregação v4), schemas/validadores/envelopes de telemetria (**zero eventos/props novos**), fluxos de verificação/evidência, onboarding OS.
- **Ciclo F4 intacto:** nenhuma mudança em submit/feedback/retry/hint-policy; testes de contrato W2/AID-1089 (`loopContractW3`, `lessonStateContract`) rodam verdes **sem edição**.
- **Copy = Anexo A verbatim** (countersign CD AID-1414); nenhuma redação nova sem countersign; revisão herda a mesma frase (sem bifurcação de copy).
- **R3:** badge deriva exclusivamente de `recommendMission` (mesma fonte do Hub); apenas `start`/`resume`; nenhum outro nó recebe "Comece aqui".
- R6 (métricas/ativação) **não é escopo do build**: medição já coberta pelo F2 v4 live; alvo ≥70% pertence ao relatório QA da janela pós-intros O1.

## 3. Provas (mapeadas aos aceites R1–R3 e ao countersign QA spec §3.4)

1. **R1/P2:** e2e intro de l02 exibe lead-in "Primeiro passo:" + frase `output_comparison` ("Você vai comparar duas respostas da IA e marcar os motivos — nada de digitar."); missão hospedada (adapter OS) idem — mesma tela, sem código extra.
2. **R1/P1+P5:** fixtures com os 7 tipos como `activities[0]` — cada intro exibe a frase do tipo; mapa exaustivo `Record` quebra compilação se o enum crescer sem frase; guard `len(outputs)==2` no fixture de `output_comparison`.
3. **R2/P3:** e2e índice 0 exibe o framing; índice >0 não exibe; "Pedir dica" visível; suítes de contrato W2/AID-1089 verdes sem edição.
4. **R3/P4:** smoke OS — novato (trilha escolhida no onboarding) vê badge no 1º nó disponível da sua trilha (kind `start`); aprendiz com missão `in_progress` vê badge no `resume`; nenhum outro nó com badge; kinds `review`/`retry` sem "Comece aqui"; capítulo da trilha ativa destacado; overlays por estado inalterados.
5. **a11y/P4-P5:** badge presente no DOM como texto (não-só-cor), contraste ok, ordem de foco inalterada, labels preservados.
6. **Countersign QA (ca6a3f95):** verificação independente de 1–5 + inspeção de allowlist de diff (§2) antes do merge; producer ≠ verificador preservado.

## 4. Riscos e mitigação

| Risco | Mitigação |
| --- | --- |
| Drift copy×currículo (frases envelecem com o catálogo) | Frases na camada de apresentação, chaveadas pelo enum fechado; guard por construção (P1) + fixture por tipo (P5); emenda de redação só com countersign CD |
| Badge ambíguo sobre kinds pedagógicos (review/practice/retry) | Decisão SD (spec §6): badge só `start`/`resume`; teste nega badge para os demais kinds |
| "Comece aqui" sobreposto a overlays existentes | Badge aditiva ao `OVERLAY_LABEL` (sem mudá-lo); smoke cobre os 3 estados de overlay |
| Modo revisão bifurcar copy | Revisão herda a mesma frase (R1/Anexo A); e2e cobre |
| Effort creep além do teto "apresentação" | Allowlist de diff (§2); qualquer estado/fluxo/evento novo = fora do plan gate, não emenda no build |
| PR #341 ainda OPEN (intent.md) | docs-only, sem sobreposição de arquivos com o PR de build; merge pela rota padrão (founder OU countersign QA + single-writer CEO, padrão PR #320) |

## 5. Fora de escopo (spec §7)

F3 (retorno/streak); redesign de game-02-warehouse ou qualquer engine voxel; mudanças em `curriculum/`; novos eventos/envelopes de telemetria; onboarding OS; superfícies dojoToday/pixelquest/surfaces v3; UI de verificação/evidência; notificações externas; mudanças em métricas/agregação (F2 v4 live).
