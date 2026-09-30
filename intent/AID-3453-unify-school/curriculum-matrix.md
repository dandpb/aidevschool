# Matriz curricular — escola única por competências (r2 ratificada)

Change-id: `AID-3453-unify-school` · Base: main `1975e2c7` · PR #610 @ `e8f386ec` ·
Status: **r2 — ratificada pela frente CCE (AID-3456, 2026-09-30)**.

> r1 (proposta) → r1.1 (correções P1/P2) → r1.2 (open question 6 gates) →
> **r2 (ratificação item a item pela CCE)**. Contagens da r2 foram re-executadas por
> parse estrutural (YAML/JSON/eval de objeto — nunca grep de linha) em **dois refs**:
> main `1975e2c7` e PR #610 `f9f18ed6`→`e8f386ec` (arquivos idênticos onde citado).
> A verificação independente da CCE **converge** com a r1.1 (ZAI 9×27; bindings
> 39 = 23+16; 32/32 lições bound). Marcação: **[D]** = decidido com evidência citada.
> Limite preservado: **nenhuma remoção executada**; `remover` exige prova de
> dependências + caminho de recuperação Git. Decisões: `manter` · `fundir` ·
> `melhorar` · `adiar` · `remover(proposta)`.

## 0. Competências da escola única

### Jornada IA no cotidiano (fundamentos compartilhados)

| ID | Competência | Descrição observável |
| --- | --- | --- |
| F1 | Entender IA | Explica o que IA faz bem/mal, limites, alucinação; distingue treino de uso |
| F2 | Uso seguro | Protege dados próprios/de terceiros; sabe o que não vai ao chat; transparência de uso |
| F3 | Prompt/contexto | Pede com objetivo, contexto, público/formato; itera por etapas |
| F4 | Verificação | Confere fatos/números em fontes externas; compara alternativas; hábito de checagem |

### Jornada IA para Dev

| ID | Competência | Descrição observável |
| --- | --- | --- |
| D1 | Fundamentos/harness | Regras/permissões/memória do próprio harness; quando (não) delegar |
| D2 | Intenção/spec/plano | Pedido em 5 campos; spec antes de código; fatia vertical planejada |
| D3 | Construção | TDD/iteração com assistente; código+testes anexados; dependências avaliadas |
| D4 | Teste/debug/review/manutenção | Reproduz antes de perguntar; refatora sem quebrar; revisa diff; prepara release |
| D5 | Produto IA/evals | Integra API de IA; evals/provas de produto; blindagem de inputs |
| D6 | Agentes/tools/skills | Orquestra agentes; ferramentas/skills; handoff e verificação cruzada |
| D7 | Capstone | Projeto escolhido ponta a ponta com evidência executável independente |

Público: `cotidiano` | `dev` | `ambos`. Jogos = prática opcional (R2) [D]:
nenhum pré-requisito aponta para jogo; jogos não são o eixo Dev.

### 0.1 Níveis de evidência (ratificados — distinguem ensaio, execução e transferência) [D]

| Tag | Nível | O que prova | O que NÃO prova |
| --- | --- | --- | --- |
| T1 | Ensaio/simulação | Desempenho no ambiente determinístico da escola (grader local, quest, quiz, rubrica simulada, recibos do harness SDLCQuest) | Competência fora do simulacro; autoridade de produção (corrobora advertência R10/RC-4) |
| T2 | Execução real | Learner executa no próprio repo/mundo real e anexa saída de comando/artefato verificável | Generalização para situação inédita |
| T3 | Transferência inédita | Aplicação a problema novo escolhido pelo learner, com evidência executável independente (verificador/terceiro — RC-4) | — |

Regras transversais [D]: (i) cada família declara seu teto de evidência e nenhuma
declara mastery acima dele; (ii) **segurança antes de dados reais** — nenhuma prática
T2/T3 que exponha dados reais é pré-requisito de conteúdo F2; a lição de segurança
precede o exercício com dado real, para ambos os públicos.

## 1. Verificação das contagens (re-executadas pela CCE em ambos os refs, por parse)

| Fonte (issue) | Verificado r2 | Comando/prova |
| --- | --- | --- |
<<<<<<< HEAD
| 32 lições YAML | **8 módulos / 32 lições** [D] | `find curriculum/ai-literacy/modules -name '*.yaml' \| wc -l` → 32 |
| 24 conceitos/49 textos MVP | **24 conceitos / 49 content_refs** [D] | `len(json.load(...curriculum.json))`=24; soma `content_refs`=49 |
| 27 lições ZAI | **9 módulos / 27 lições (3 por módulo)** [D, corrigido r1.1 — P1 da revisão] | contagem estrutural (eval do array `CURRICULUM` em Node sobre `src/lib/curriculum-data.ts`, base `1975e2c7`) → módulos 9, lições 27; inclui `por-dentro-da-maquina`, `contexto-e-specs` e `o-protocolo-final`/`caso-real-feature-previsovel`. A contagem "7/19" da r1 era artefato de grep |
| 9 módulos docs/curso + 10 ciclos workflow_lab | **M1–M9** [D] + workflows 02–11 + exemplo-pratico | `docs/curso-simples/ROADMAP.md`; `ls dev-workflow-claude/workflows/` → 10 dirs + exemplo |
| 11 workflows Claude | **10 dirs + 1 exemplo pratico** [D] | idem (02-corrigir-bug … 11-aprender-com-a-sessao + release_notes) |
| SDLCQuest 18 tarefas | **18 missões tipadas** [D] (5 classify, 4 choice, 3 select, 2 order, 1 diff, 1 patch, 1 gate, 1 incident) | histograma de `type:` em `engines/sdlc-quest/src/data.js` `missions` |
| SDLCQuest 16 TLC | **16 módulos `tlc-*`** [D] | ids `tlc-` em `engines/sdlc-quest/src/tlc-data.js` |
| SDLCQuest 6 gates | **6 estágios do ciclo Harness Lab** [D, verificado r1.2]: `discover`, `plan`, `implement`, `verify`, `judge`, `package` | `engines/sdlc-quest/src/harness-core.js:73–78` (6 entradas de estágio; `package` = "gate local do Quest"); runner CLI `tools/quest-gate.cjs` executa 10 steps locais (1 contract-shape + 9 comandos) — decomposições distintas, não conflito |
| 18 projetos | **01–18 + 00_ai_in_practice** [D] | `ls curriculum/` |
| Labs Pixel/Voxel | **voxel: 17 jogos (game-02…game-18)** [D]; pixel: 1 app pixel-quest | `ls -d engines/voxelDojo/game-*` |
=======
| 32 lições YAML | **8 módulos / 32 lições** [D] (mod-05 = l15–l17, l21–l23, l27–l29 · journey `dev`; 23 `ia_pratica` + 9 `dev` = 32) | parse de `curriculum/ai-literacy/catalog.yaml` (PyYAML) |
| 24 conceitos/49 textos MVP | **24 conceitos / 49 content_refs** [D] | `python3 -c "import json;d=json.load(open('engines/aiDevschoolMvp/aidevschool/curriculum.json'));print(len(d),sum(len(c['content_refs']) for c in d))"` → `24 49` |
| 27 lições ZAI | **9 módulos / 27 lições / 97 exercícios (3 lições por módulo)** [D] — divergência resolvida: o 27 estava certo | parse do array `CURRICULUM` (bracket-match + eval) em `engines/zai-duolingo-like/src/lib/curriculum-data.ts`, refs `1975e2c7` e `f9f18ed6` idênticos: o-que-e-ia(3), dominando-o-chat(3), o-lado-negro(3), imagens-e-criatividade(3), ia-na-pratica(3), por-dentro-da-maquina(3), contexto-e-specs(3), esquadrao-de-agentes(3), o-protocolo-final(3). Origem do erro r1: `grep -c 'xpReward:'` na árvore antiga `816e3c36` → 19 (18 lições + 1 linha da interface `LessonData`); no ref atual dá 28 (27 + interface) — contagem por linha de grep é método proibido |
| 9 módulos docs/curso + ciclos workflow_lab | **M1–M9** [D] + workflows 02–11 + exemplo-pratico | `grep -oE "M[0-9] — " docs/curso-simples/ROADMAP.md` → 9; `ls dev-workflow-claude/workflows/` |
| 11 workflows Claude | **10 dirs + 1 exemplo pratico** [D] | idem |
| SDLCQuest 18 tarefas | **18 missões tipadas** [D] (5 classify, 4 choice, 3 select, 2 order, 1 diff, 1 patch, 1 gate, 1 incident) | regex de `id/type` em `engines/sdlc-quest/src/data.js` → 18 |
| SDLCQuest TLC | **4 módulos (`tlc-discover`, `tlc-plan`, `tlc-implement`, `the-judge`) / 16 tarefas `tlc-*`** [D] — r1/r1.1 rotulavam os 16 como "módulos": errata e4 | parse JSON de `engines/sdlc-quest/src/tlc-data.js` |
| SDLCQuest 6 gates | **resolvido com arquivo:linha** [D — r2 CCE, convergente com r1.2]: `engines/sdlc-quest/src/harness-core.js:73-78` = `discover, plan, implement, verify, judge, package` | corroborado por `TEST-REPORT-v1.3.md:7` ("seis gates"), `src/harness-app.js:30` e r1.2; runner CLI `tools/quest-gate.cjs` executa 10 steps locais (1 contract-shape + 9 comandos) — decomposições distintas, não conflito |
| 18 projetos | **01–18 + 00_ai_in_practice** [D] | `git ls-tree --name-only 1975e2c7 curriculum/` |
| Labs Pixel/Voxel | **voxel: 17 jogos (game-02…game-18)**; pixel: 1 app pixel-quest [D] | `git ls-tree --name-only 1975e2c7 engines/voxelDojo/ \| grep -c game-` → 17 |
>>>>>>> d6fdd14f (docs(sdlc): AID-3456 — matriz r2 ratificada (ZAI 9m/27l por parse nos refs 1975e2c7/f9f18ed6; bindings 39=23ai+16dev com l15-l29 mod-05 no track dev; 6 gates harness-core.js:73-78; erratas e1-e5) + correções limitadas: gabarito vazado C14/C15 (exemplo de formato = planted), contrato de erro l16 c-erros, sobre-promessa de primeira resposta l16/l27, merge-sem-medo l28; YAMLs re-validados (32 OK, 46 tests) + MVP 48 tests)

Seam atual [D — verificação CCE independente, convergente com r1.1]:
`engines/codexdojo-os-prototype/config/mission-bindings.yaml` (idêntico nos refs) =
**39 bindings** — 23 `ai-pratica` (l01–l14, l18–l20, l24–l26, l30–l32) + 16 `dev`
(9 lições YAML l15/l16/l17/l21/l22/l23/l27/l28/l29 do mod-05 ponte dev + 7 jogos voxel
game-02/03/05/06/07/08/09). Parse PyYAML: `len(bindings)`=39;
`Counter(trackId)`={ai-pratica: 23, dev: 16}. **As 32 lições têm binding.**
**Lacunas reais: voxel game-04, game-10–game-18 (10 jogos) sem binding;
workflows, curso-simples, sdlc-quest, projetos 01–18 sem binding dev.**

## 1.5 Erratas acumuladas (r1 → r2)

| # | dizia | verificado | status |
| --- | --- | --- | --- |
| e1 | ZAI 7 mód/19 lições | 9 mód/27 lições (§1) | corrigido r1.1, confirmado CCE |
| e2 | bindings = 41 (24 ai + 17 dev) | 39 (23 + 16) | corrigido r1.1, confirmado CCE |
| e3 | "lacuna l25–l32 sem binding" | falso — l25/l26/l30–l32 `ai-pratica`; l27–l29 `dev` | corrigido r1.1, confirmado CCE |
| e4 | "16 módulos tlc-*" | 4 módulos / 16 tarefas | corrigido r2 (CCE) |
| e5 | — | contagem inicial da CCE dizia "11 jogos sem binding"; correto é **10** (game-04 + game-10–18) | auto-corrigido r2 |

## 2. Família: curriculum/ai-literacy (32 lições) — canônica de conceito

Público: cotidiano (mod-05: dev). Prática: lesson + exercício do YAML.
Evidência: literacy-evidence v1 + verificador independente (ADR-0004) — teto T1,
capstones l14/caso-real aspiram T2/T3 (§0.1).

| Unidades | Competência | Pré-req | Decisão r2 | Rastreabilidade |
| --- | --- | --- | --- | --- |
| l01, l02, l03 (mod 01) | F1 | — | **manter** [D] | YAML canônico; validado por AID-2123 |
| l04–l07 (mod 02) | F3 | F1 | **manter** [D] | idem |
| l08–l11 (mod 03) | F4 | F3 | **manter** [D] | idem |
| l12–l14 (mod 04) | P: F2; S: F4 (l14: P F4 capstone cotidiano) | F1–F4 | **manter**; l14 = capstone leve cotidiano [D] | idem |
| l15–l17, l21–l23, l27–l29 (mod 05) | P: D1 (l15) / D3 (l16–l17, l21–l22) / D4 (l23, l27–l28) / D5 (l29); S: D3/D4 | F1–F4 (ponte macia, não pré-req duro) | **manter + melhorar**: porta de entrada da jornada dev; revisão prioritária aplicada nesta onda em l16/l27/l28 (§11) [D] | já bound na trilha `dev` como lições YAML |
| l18–l20 (mod 06), l24–l26 (mod 07), l30–l32 (mod 08) | P: F3 (l18–l20, l30–l31, l24) / F2 (l25) / F4 (l26, l32); S: F2/F4 | F3 | **manter** [D] — bindings completos em ai-pratica | `mission-bindings.yaml` cobre l01–l14, l18–l20, l24–l26, l30–l32 |

## 3. Família: aiDevschoolMvp (24 conceitos / 49 textos)

Público: ambos. Prática: chat-tutor SKILL.md + quiz banks. Evidência:
gate_registry (G1–G4), mastered só por verificador — teto T1.

| Unidades | Competência | Decisão r2 | Rastreabilidade |
| --- | --- | --- | --- |
| C01–C11 (M1–M3 teoria) | F1 | **fundir**: teoria canônica = literacy YAML; MVP fica com prática chat-tutor + quiz (não duplicar fonte) [D] | overlap com l01–l03; C11↔l02 |
| C12–C13 (M3) | F3 | **fundir** (mesmo critério) [D] | ↔ l04–l07 |
| C14–C15, C19 (M4) | F4 | **fundir + melhorar**: vazamento de gabarito corrigido nesta onda (§11) [D] | ↔ l08–l11 |
| C16–C18, C21, C23 (M5) | F2 | **fundir**; C17/C21 (privacidade/accountability) + ZAI privacidade-dados → **melhorar** l12 [D] | ↔ l12/l25 |
| C20, C22, C24 (M6) | F2 | **fundir** [D] | ↔ l13/l30–l32 |

## 4. Família: zai-duolingo-like (9 módulos / 27 lições / 97 exercícios)

Público: cotidiano (módulos finais: ponte dev). Prática: jogo cozy (exercícios
graduados). Evidência: grader local (T1); NÃO é mastery.

| Unidades | Competência (P/S) | Decisão r2 | Rastreabilidade |
| --- | --- | --- | --- |
| o-que-e-ia (ia-nao-e-magica, o-que-e-algoritmo, como-ia-aprende) | P: F1 | **fundir**: teoria consome canônico literacy (read model gradual por módulo, com prova de dependências + R9) [D] | ↔ l01–l03 |
| dominando-o-chat (regra-de-ouro, persona, refinando) | P: F3; S: F1 | **fundir** (mesmo critério) [D] | ↔ l04–l07 |
| o-lado-negro (alucinacoes, vies, deepfakes) | P: F4; S: F2 | **fundir** [D] | ↔ l02/l08–l09/l12 |
| imagens-e-criatividade | P: F3; S: F2 (limites-etica) | **fundir**; exercícios graduados permanecem como prática [D] | ↔ l24–l26 |
| ia-na-pratica | P: F3; S: F4 | **fundir** [D] | ↔ l13/l30–l32 |
| por-dentro-da-maquina (tokens-contexto-ferramentas, o-harness, prompt-sem-ruido) | P: F1; S: D1 | **fundir preservando** — decisão r2 da CCE (pendência r1.1): é a única introdução cotidiana de tokens/harness; fica como ponte viva para mod-05 dev, conteúdo exclusivo não se perde na fusão [D] | ponte p/ l15 (D1) |
| contexto-e-specs (context-engineering, prd-e-specs, plan-build-validate) | P: D2; S: F3 | **adiar p/ onda dev** (ratificado): conteúdo dev em engine cotidiano; candidato a prática guiada D2 quando a jornada dev ganhar bindings não-voxel [D] | ↔ curso-simples M1–M3 |
| esquadrao-de-agentes | P: D6 (lite cotidiano) | **adiar**: única fonte cotidiana de "agentes"; volta na onda D6 [D] | sem equivalente literacy |
| o-protocolo-final (o-workflow-permanente, caso-real-feature-previsivel, privacidade-dados) | P: F2; S: D4/D7-lite | **manter**; caso-real ratificado como capstone cotidiano candidato a tarefa inédita (R10); privacidade-dados alimenta `melhorar` l12 [D] | ↔ l12/l14 |

**Hard constraint (spec R8/R9) [D]:** `engines/zai-duolingo-like/prisma/seed.ts`
linhas 11–14 executam `deleteMany()` de lessonProgress/lesson/module — proibido em
bancos existentes; IDs/slugs estáveis; updates idempotentes; fixtures
antes/depois com `completed`/`in_progress`.

## 5. Família: docs/curso-simples (M1–M9 + exemplo/ciclos)

Público: dev. Prática: roadmap com gates por fase + progresso/. Evidência:
arquivo de progresso com saída de comando (T2).

| Unidades | Competência | Decisão r2 | Rastreabilidade |
| --- | --- | --- | --- |
| Fase 0 + M1–M3 | P: D1 (Fase 0/M2) / D2 (M1, M3); S: F3 | **manter** como porta de entrada dev [D] | ROADMAP.md Fase 0/1 |
| M4–M8 + ciclos workflow-exemplo | P: D3 / D4 (M4–M8); S: D5 | **manter**; ciclos vinculados a D3–D5 nesta matriz [D] | ROADMAP Fases 2–5 |
| M9 (5 perguntas + promoção de 1 ativo) | P: D4; S: D7-lite | **manter** [D] | regra "promova exatamente um ativo" |

## 6. Família: dev-workflow-claude (10 workflows + exemplo-pratico)

Público: dev. Prática: workflow aplicado ao repo próprio (T2).
Evidência: VALIDACAO/execução registrada.

| Unidades | Competência | Decisão r2 | Rastreabilidade |
| --- | --- | --- | --- |
| exemplo-pratico (release_notes) | P: D2; S: D3 | **manter** — "Fase 0" do curso [D] | 22 tests pytest |
| 02-corrigir-bug, 07-investigar-erro, 03-refatorar-seguro | P: D4 | **manter**; bind como missões dev opcionais = gap CPE (§12) [D] | gap bindings dev |
| 04-revisar-mudancas, 05-documentar-codigo, 08-preparar-release | P: D4 | **manter** [D] | idem |
| 06-migrar-codigo, 09-otimizar-performance, 10-blindar-inputs | P: D4 (06, 09) / D5 (10); S: D5 | **manter** [D] | idem |
| 11-aprender-com-a-sessao | P: D1; S: D6 | **manter** [D] | idem |

## 7. Família: sdlc-quest (18 missões + 4 módulos TLC/16 tarefas + 6 gates) — identidade visual

Público: dev. Prática: quest 5 fases + oficina TLC. Evidência: gate do harness
(fail-closed) — **advertência R10 ratificada: recibos do harness são simulação JS
fictícia (T1); não são evidência de toolchain real nem autoridade de produção;
não satisfazem RC-4 sozinhos para competências D.**

| Unidades | Competência | Decisão r2 | Rastreabilidade |
| --- | --- | --- | --- |
<<<<<<< HEAD
| 18 missões tipadas | P: D2–D4 por missão (r2 da CCE atribui primária por missão) | manter; **identidade visual da escola única = SDLCQuest v1.3** (decisão da issue) [D-issue] | data.js missions |
| 16 módulos TLC | P: D2 (discover/design/slice) / D4 (review/severity/carryover/converge) / D6 (verifier/handoff); S: conforme módulo | manter [P] | tlc-data.js |
| gates do harness | P: D2 (discover/plan) / D3 (implement) / D4 (verify/judge) / D4 (package: "pronto localmente não é deploy") — os **6 estágios do Harness Lab** (`harness-core.js:73–78`) | manter; citação r1.2 acima; **recibos do lab são didáticos/locais** (R10: não são autoridade de produção) [D] | HARNESS-GUIDE.pt-BR.md |
=======
| 18 missões tipadas | P: D2–D4 por missão (atribuição primária por missão fica na autoriação de conteúdo pós-r2, junto com `competency:` — gap CPE §12.3) | **manter**; identidade visual = SDLCQuest v1.3 (decisão AID-3453) [D-issue+D] | data.js missions |
| 4 módulos TLC / 16 tarefas | P: D2 (discover/design/slice) / D4 (review/severity/carryover/converge) / D6 (verifier/handoff); S: conforme módulo | **manter** [D] | tlc-data.js |
| 6 gates do harness | P: D2 (discover/plan) / D3 (implement) / D4 (verify/judge/package) | **manter** — arquivo:linha citado na §1 (harness-core.js:73-78); recibos do lab são didáticos/locais (R10) [D] | HARNESS-GUIDE.pt-BR.md |
>>>>>>> d6fdd14f (docs(sdlc): AID-3456 — matriz r2 ratificada (ZAI 9m/27l por parse nos refs 1975e2c7/f9f18ed6; bindings 39=23ai+16dev com l15-l29 mod-05 no track dev; 6 gates harness-core.js:73-78; erratas e1-e5) + correções limitadas: gabarito vazado C14/C15 (exemplo de formato = planted), contrato de erro l16 c-erros, sobre-promessa de primeira resposta l16/l27, merge-sem-medo l28; YAMLs re-validados (32 OK, 46 tests) + MVP 48 tests)

## 8. Família: projetos curriculum/01–18 + 00_ai_in_practice

Público: dev (00: cotidiano). Prática: implementação node-impl (T2; D7 = T3).
Evidência: `__tests__` + docs de status/review/benchmark (executável).

| Unidades | Competência | Decisão r2 | Rastreabilidade |
| --- | --- | --- | --- |
| 00_ai_in_practice | P: F3; S: F4 | **manter** — projeto-ponte cotidiano [D] | já bound (ai-pratica) |
| 01–09 (fundamentos back-end) | P: D3; S: D4 (escada p/ D7) | **manter**; capstone escolhido em D7 [D] | sem binding dev (gap CPE) |
| 10–18 (sistemas distribuídos) | P: D3; S: D4/D5 (escada p/ D7) | **manter** [D] | idem |

## 9. Família: voxelDojo (17 jogos) + pixelDojo (pixel-quest)

Público: dev/ambos. Prática: simulações/jogo com Playwright evidence contract (T1).
Evidência: teaching-game-contract + evidence.ndjson.

| Unidades | Competência | Decisão r2 | Rastreabilidade |
| --- | --- | --- | --- |
| game-02/03/05/06/07/08/09 | P: D3–D5 por jogo; prática opcional | **manter** (7 bound ao track dev; sem pré-requisito alheio obrigatório — R2) [D] | mission-bindings dev |
| game-04, game-10–game-18 (10 jogos) | P: D3–D5 por jogo; prática opcional | **manter**; decisão r2: **viram missões dev opcionais quando o CPE fechar o binding** — prática opcional não exige binding p/ existir [D] | sem binding hoje |
| pixel-quest | P: D3; S: D4 — prática opcional | **manter** [D] | EVIDENCE_CONTRACT.md |
| quizzes dos projetos (ex.: curriculum/01, 02 `docs/quiz.md`) | D4 | **melhorar antes de reutilizar**: quizzes são calibrados contra o fonte *atual* dos projetos e podem pressupor bugs já corrigidos — **versionar fixture/SHA do código-base no momento da calibração** antes de qualquer reuso na escola única [D] | quiz.md "calibrated against the current {go,rust,node}-impl/ source" |

## 10. Overlap de teoria F1–F4 — família canônica por conceito [D]

<<<<<<< HEAD
1. ~~Binding l25–l32 (ai-pratica)~~ **corrigido r1.1**: l25/l26/l30/l31/l32 já
   estão bound; o gap real de bindings é **voxel game-04, game-10–game-18** —
   dono CPE (fatia 1, com decisão CCE r2 sobre escopo).
2. Bindings dev p/ workflows, curso-simples, sdlc-quest, projetos 01–18 — CPE.
3. Campo `competency:` canônico em catalog.yaml/mission-bindings — CPE (fatia 1).
4. Fonte cotidiana de agentes (só ZAI esquadrao) — adiado p/ onda D6.
5. ~~Contagem "6 gates" sdlc-quest~~ **RESOLVIDO r1.2**: são os 6 estágios do
   ciclo Harness Lab — `discover/plan/implement/verify/judge/package` —
   `engines/sdlc-quest/src/harness-core.js:73–78` (runner CLI executa 10
   steps locais: `tools/quest-gate.cjs` steps contract-shape + build/rules/
   campaign×2/tlc×2/harness×2/i18n). Citação liberada para CPE/UX.
   (~~origem do "27 ZAI"~~ **resolvido r1.1**: issue certa, 9 módulos/27
   lições por contagem estrutural; erro era do grep da r1.)
=======
1. **Conceito canônico** = `curriculum/ai-literacy` YAML (fonte única de verdade).
2. **Prática chat-tutor** = aiDevschoolMvp (C01–C24 consomem o canônico).
3. **Prática jogo** = ZAI (exercícios graduados; teoria migra p/ read model gradualmente).
4. Conteúdo exclusivo que migra: C17/C21 + ZAI privacidade-dados → **melhorar l12**
   (tarefa CCE pós-aprovação desta r2).

## 11. Revisão prioritária de conteúdo (decisões `melhorar` executadas nesta onda — correções limitadas)

Achados e fixes aplicados no PR #610 (draft; revisão Content Designer pendente).
Nenhuma exclusão, nenhuma alteração de progresso, nenhum deploy, nenhum merge.
IDs preservados; schemas inalterados.

| Achado (arquivo:linha) | Problema | Fix aplicado |
| --- | --- | --- |
| `engines/aiDevschoolMvp/aidevschool/content/C14.l1.md:41`, `C14.l2.md:39`, `C14.l3.md:35` | exemplo de formato "like: 2, 5, 7, 9" **era exatamente o gabarito** (`keys/c14_seeded_bio.json` planted=[2,5,7,9]) | exemplo trocado por números fora do gabarito + "(example only — not the answer)" |
| `C15.l1.md:40`, `C15.l2.md:39` | idem (planted=[2,4,6,7]) | idem |
| `curriculum/ai-literacy/modules/05-dev-contexto-e-escolha/l16-*.yaml` a2 | `c-erros: not_met` contradizia o próprio critério ("ex: lança") e o hint de a1 ("retorna Result ou lança") — contrato de exceção inconsistente; `c-redact: partial` precisava de justificativa explícita (tipo declara intenção, runtime não remove nada) | critério `c-erros` reescrito p/ exigir contrato de erro **declarado ao chamador**; perChecks de `c-erros`/`c-redact` reescritos; veredictos preservados |
| l16 a1 `onSuccess`, l27 a2 `onSuccess` | prometiam sucesso garantido na primeira resposta ("código útil de primeira", "correção certa na primeira resposta") — sobre-promessa anti-F4 | reescrito p/ chance + verificabilidade ("aumenta muito a chance de acertar na primeira — e torna a resposta conferível contra o pedido") |
| l28 a3 | "merge sem medo" / "pronto para o merge" — testes como prova absoluta | reescrito p/ "risco localizado e verificável" e "base sólida para revisão e merge" (suíte verde não substitui review; alinha com RC-2/R7) |
| Quizzes 01/02 dos projetos | podem pressupor bugs já corrigidos | §9 última linha: versionar fixture antes do reuso (CPE) |
| Segurança × dados reais | ordenação de pré-requisito | regra transversal ratificada em §0.1 [D] |
| Ensaio × execução × transferência | não distinguidos por família | níveis T1/T2/T3 ratificados em §0.1, por família [D] |

Verificação: `curriculum/ai-literacy`: `python3 tools/validate.py` → "OK: 32 lições
validadas" + 46 tests tools; `engines/aiDevschoolMvp`: 48 tests passed.

## 12. Gaps explícitos (o que a escola ainda não tem) → donos e blockers

1. ~~Binding l25–l32~~ corrigido r1.1; gap real de bindings voxel = **game-04,
   game-10–game-18 (10 jogos)** — dono CPE; decisão de escopo ratificada aqui (§9).
2. Bindings dev p/ workflows, curso-simples, sdlc-quest, projetos 01–18 — CPE;
   bloqueado por r2 aprovada + contrato compatível + QA independente.
3. Campo `competency:` canônico (P/S) em catalog.yaml/mission-bindings — CPE (fatia 1);
   inclui atribuição primária por missão sdlc-quest (§7) e por jogo voxel (§9).
4. Fonte cotidiana de agentes (só ZAI esquadrao) — adiado p/ onda D6 [D].
5. ~~Contagem "6 gates"~~ **RESOLVIDO r2** (convergente r1.2): harness-core.js:73-78 (§1).
>>>>>>> d6fdd14f (docs(sdlc): AID-3456 — matriz r2 ratificada (ZAI 9m/27l por parse nos refs 1975e2c7/f9f18ed6; bindings 39=23ai+16dev com l15-l29 mod-05 no track dev; 6 gates harness-core.js:73-78; erratas e1-e5) + correções limitadas: gabarito vazado C14/C15 (exemplo de formato = planted), contrato de erro l16 c-erros, sobre-promessa de primeira resposta l16/l27, merge-sem-medo l28; YAMLs re-validados (32 OK, 46 tests) + MVP 48 tests)
6. Portão mecânico (CI) p/ contrato de release RC-1..RC-6 — follow-up QA.
7. Estados de missão (`bound`≠`visible`≠`guided`≠`readiness`) como campos explícitos
   (sem sobrescrever schema v1) — dono CPE, revisão UX/QA.
8. Gate no-code existente `learner/gate/no_code.py::verify_and_gate_no_code` (linha 66)
   — reusar, não construir novo (decisão coordenação 2026-09-30, AID-3453) [D].
9. Perigo ZAI seed (`prisma/seed.ts` deleteMany) — CPE registra no plano de fatia;
   QA checa no veredito RC-4..RC-6.
10. Tarefa inédita + rubrica de transferência versionada por público (R10) — autoria
    CCE (próxima onda de conteúdo, pós-aprovação r2), verificação QA (RC-4).
11. **Preservado**: l33–l35 (W2 dev) seguem data-gated por AID-1222 — T0 não abre
    antes do gate de dados §5-R4; nada nesta matriz altera esse bloqueio.
