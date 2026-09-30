# Matriz curricular — escola única por competências

Change-id: `AID-3453-unify-school` · Base: main `1975e2c7` · Status: r1 (proposta — frentes CCE/CPE/UX/QA ratificam; ver legenda)

> Fonte da intenção: AID-3453. **Curar antes de acrescentar**: esta matriz
> classifica o QUE EXISTE; nada é removido nesta onda (limite da issue).
> Decisões: `manter` · `fundir` · `melhorar` · `adiar` · `remover(proposta)`.
> Marcação: **[D]** = decidido com evidência executável citada ·
> **[P]** = proposta desta r1, dono da ratificação nomeado.

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

Público: `cotidiano` | `dev` | `ambos`. Jogos = prática opcional (R2):
nenhum pré-requisito aponta para jogo.

## 1. Verificação das contagens (first-hand, main `1975e2c7`)

| Fonte (issue) | Verificado | Comando/prova |
| --- | --- | --- |
| 32 lições YAML | **8 módulos / 32 lições** [D] | `find curriculum/ai-literacy/modules -name '*.yaml' \| wc -l` → 32 |
| 24 conceitos/49 textos MVP | **24 conceitos / 49 content_refs** [D] | `len(json.load(...curriculum.json))`=24; soma `content_refs`=49 |
| 27 lições ZAI | **7 módulos / 19 lições** [D] — **divergência** | `grep -c 'xpReward:' engines/zai-duolingo-like/src/lib/curriculum-data.ts` → 19; `grep -c 'subtitle:'` → 7 |
| 9 módulos docs/curso + 10 ciclos workflow_lab | **M1–M9** [D] + workflows 02–11 + exemplo-pratico | `docs/curso-simples/ROADMAP.md`; `ls dev-workflow-claude/workflows/` → 10 dirs + exemplo |
| 11 workflows Claude | **10 dirs + 1 exemplo pratico** [D] | idem (02-corrigir-bug … 11-aprender-com-a-sessao + release_notes) |
| SDLCQuest 18 tarefas | **18 missões tipadas** [D] (5 classify, 4 choice, 3 select, 2 order, 1 diff, 1 patch, 1 gate, 1 incident) | histograma de `type:` em `engines/sdlc-quest/src/data.js` `missions` |
| SDLCQuest 16 TLC | **16 módulos `tlc-*`** [D] | ids `tlc-` em `engines/sdlc-quest/src/tlc-data.js` |
| SDLCQuest 6 gates | **não verificado nesta r1** [P] | dono: CPE/UX citar arquivo:linha |
| 18 projetos | **01–18 + 00_ai_in_practice** [D] | `ls curriculum/` |
| Labs Pixel/Voxel | **voxel: 17 jogos (game-02…game-18)** [D]; pixel: 1 app pixel-quest | `ls -d engines/voxelDojo/game-*` |

Seam atual [D]: `mission-bindings.yaml` = 41 bindings (24 `ai-pratica` l01–l24;
17 `dev` game-02–game-18). **Lacunas: l25–l32 sem binding; workflows,
curso-simples, sdlc-quest, projetos 01–18 sem binding dev.**

## 2. Família: curriculum/ai-literacy (32 lições) — canônico de conceito

Público: cotidiano (l15–l29: dev). Prática: lesson + exercício do YAML.
Evidência: literacy-evidence v1 + verificador independente (ADR-0004).

| Unidades | Competência | Pré-req | Decisão | Rastreabilidade |
| --- | --- | --- | --- | --- |
| l01, l02, l03 (mod 01) | F1 | — | manter [P] | YAML é fonte canônica; já validado por AID-2123 |
| l04–l07 (mod 02) | F3 | F1 | manter [P] | idem |
| l08–l11 (mod 03) | F4 | F3 | manter [P] | idem |
| l12–l14 (mod 04) | F2, F4 (l14 capstone cotidiano) | F1–F4 | manter; l14 melanção p/ capstone leve [P] | idem |
| l15–l17, l21–l23, l27–l29 (mod 05) | D1, D3, D4, D5 | F1–F4 (ponte) | **melhorar**: re-ancorar módulo 05 como porta de entrada da jornada dev (bind pós-fundamentos, não pré-requisito duro) [P] | gap: sem binding dev não-voxel |
| l18–l20 (mod 06), l24–l26 (mod 07), l30–l32 (mod 08) | F3, F2, F3/F4 | F3 | manter [P]; **lacuna de binding l25–l32** → frente CPE | `mission-bindings.yaml` cobre só l01–l24 |

## 3. Família: aiDevschoolMvp (24 conceitos / 49 textos)

Público: ambos. Prática: chat-tutor SKILL.md + quiz banks. Evidência:
gate_registry (G1–G4), mastered só por verificador.

| Unidades | Competência | Decisão | Rastreabilidade |
| --- | --- | --- | --- |
| C01–C11 (M1–M3 teoria) | F1 | **fundir**: teoria canônica passa a ser a literacy YAML; MVP mantém prática chat-tutor + quiz (não duplicar fonte) [P] | overlap com l01–l03; C11↔l02 |
| C12–C13 (M3) | F3 | fundir (mesmo critério) [P] | ↔ l04–l07 |
| C14–C15, C19 (M4) | F4 | fundir [P] | ↔ l08–l11 |
| C16–C18, C21, C23 (M5) | F2 | fundir; C17/C21 (privacidade/accountability) são os mais completos → **melhorar** literacy l12 com o que só existe aqui [P] | ↔ l12/l25 |
| C20, C22, C24 (M6) | F2 | fundir [P] | ↔ l13/l30–l32 |

## 4. Família: zai-duolingo-like (7 módulos / 19 lições) — divergência 27

Público: cotidiano. Prática: jogo cozy (exercícios graduados).
Evidência: grader local; NÃO é mastery.

| Unidades | Competência | Decisão | Rastreabilidade |
| --- | --- | --- | --- |
| o-que-e-ia, dominando-o-chat | F1, F3 | **fundir**: conteúdo teórico duplicado → consumir canônico literacy (trocar `curriculum-data.ts` por read model **gradual, por módulo, com prova de dependências** — tests/e2e do ZAI) [P] | divergência de contagem registrada (§1); dono: CCE confirma origem do "27" |
| o-lado-negro | F2, F4 | fundir [P] | ↔ l02/l12 |
| imagens-e-criatividade, ia-na-pratica | F3 (anexos/rotina) | fundir; manter exercícios graduados como prática [P] | ↔ l24–l26/l30–l32 |
| esquadrao-de-agentes | D6-lite (cotidiano) | **adiar**: única fonte cotidiano de "agentes"; volta na onda D6 [P] | sem equivalente literacy |

## 5. Família: docs/curso-simples (M1–M9 + exemplo/ciclos)

Público: dev. Prática: roadmap com gates por fase + progresso/.
Evidência: arquivo de progresso com saída de comando.

| Unidades | Competência | Decisão | Rastreabilidade |
| --- | --- | --- | --- |
| Fase 0 + M1–M3 | D1, D2 | manter como porta de entrada dev [P] | ROADMAP.md Fase 0/1 |
| M4–M8 + ciclos workflow-exemplo | D2–D4 | manter; **melhorar**: vincular ciclos às competências D3–D5 na matriz r2 [P] | ROADMAP Fases 2–5 |
| M9 (5 perguntas + promoção de ativo) | D4, D7-lite | manter [P] | regra "promova exatamente um ativo" |

## 6. Família: dev-workflow-claude (10 workflows + exemplo-pratico)

Público: dev. Prática: workflow aplicado ao repo próprio.
Evidência: VALIDACAO/execução registrada.

| Unidades | Competência | Decisão | Rastreabilidade |
| --- | --- | --- | --- |
| exemplo-pratico (release_notes) | D2, D3 | manter — é o "Fase 0" do curso [P] | 22 tests pytest |
| 02-corrigir-bug, 07-investigar-erro, 03-refatorar-seguro | D4 | manter; **melhorar**: bind como missões dev opcionais (mission-bindings) [P] | gap bindings dev |
| 04-revisar-mudancas, 05-documentar-codigo, 08-preparar-release | D4 | manter [P] | idem |
| 06-migrar-codigo, 09-otimizar-performance, 10-blindar-inputs | D4, D5 | manter [P] | idem |
| 11-aprender-com-a-sessao | D1, D6 | manter [P] | idem |

## 7. Família: sdlc-quest (18 missões + 16 TLC + gates) — identidade visual

Público: dev. Prática: quest 5 fases + oficina TLC.
Evidência: gate do harness (fail-closed).

| Unidades | Competência | Decisão | Rastreabilidade |
| --- | --- | --- | --- |
| 18 missões tipadas | D2–D4 | manter; **identidade visual da escola única = SDLCQuest v1.3** (decisão da issue) [D-issue] | data.js missions |
| 16 módulos TLC | D2, D4, D6 | manter [P] | tlc-data.js |
| gates do harness | RC-2/R7 | manter; CPE cita os "6 gates" exatos (open question) [P] | HARNESS-GUIDE |

## 8. Família: projetos curriculum/01–18 + 00_ai_in_practice

Público: dev (00: cotidiano). Prática: implementação node-impl.
Evidência: `__tests__` + docs de status/review/benchmark (executável).

| Unidades | Competência | Decisão | Rastreabilidade |
| --- | --- | --- | --- |
| 00_ai_in_practice | F3, F4 | manter — projeto-ponte cotidiano [P] | já bound (ai-pratica) |
| 01–09 (fundamentos back-end) | D3, D7 escada | manter; capstone escolhido em D7 [P] | sem binding dev (gap CPE) |
| 10–18 (sistemas distribuídos) | D3–D5, D7 | manter [P] | idem |

## 9. Família: voxelDojo (17 jogos) + pixelDojo (pixel-quest)

Público: dev/ambos. Prática: simulações/jogo com Playwright evidence contract.
Evidência: teaching-game-contract + evidence.ndjson.

| Unidades | Competência | Decisão | Rastreabilidade |
| --- | --- | --- | --- |
| game-02–game-18 | D3–D5 prática opcional | manter (já bound ao track dev; **sem pré-requisito alheio obrigatório** — R2) [D] | mission-bindings dev |
| pixel-quest | D3/D4 prática opcional | manter [P] | EVIDENCE_CONTRACT.md |

## 10. Gaps explícitos (o que a escola ainda não tem)

1. Binding l25–l32 (ai-pratica) — dono CPE.
2. Bindings dev p/ workflows, curso-simples, sdlc-quest, projetos 01–18 — CPE.
3. Campo `competency:` canônico em catalog.yaml/mission-bindings — CPE (fatia 1).
4. Fonte cotidiana de agentes (só ZAI esquadrao) — adiado p/ onda D6.
5. Contagem "6 gates" sdlc-quest e origem do "27 ZAI" — CCE/CPE citarem.
6. Portão mecânico (CI) p/ contrato de release RC-1..RC-6 — follow-up QA.
