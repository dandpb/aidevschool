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
| 27 lições ZAI | **9 módulos / 27 lições (3 por módulo)** [D, corrigido r1.1 — P1 da revisão] | contagem estrutural (eval do array `CURRICULUM` em Node sobre `src/lib/curriculum-data.ts`, base `1975e2c7`) → módulos 9, lições 27; inclui `por-dentro-da-maquina`, `contexto-e-specs` e `o-protocolo-final`/`caso-real-feature-previsovel`. A contagem "7/19" da r1 era artefato de grep |
| 9 módulos docs/curso + 10 ciclos workflow_lab | **M1–M9** [D] + workflows 02–11 + exemplo-pratico | `docs/curso-simples/ROADMAP.md`; `ls dev-workflow-claude/workflows/` → 10 dirs + exemplo |
| 11 workflows Claude | **10 dirs + 1 exemplo pratico** [D] | idem (02-corrigir-bug … 11-aprender-com-a-sessao + release_notes) |
| SDLCQuest 18 tarefas | **18 missões tipadas** [D] (5 classify, 4 choice, 3 select, 2 order, 1 diff, 1 patch, 1 gate, 1 incident) | histograma de `type:` em `engines/sdlc-quest/src/data.js` `missions` |
| SDLCQuest 16 TLC | **16 módulos `tlc-*`** [D] | ids `tlc-` em `engines/sdlc-quest/src/tlc-data.js` |
| SDLCQuest 6 gates | **não verificado nesta r1** [P] | dono: CPE/UX citar arquivo:linha |
| 18 projetos | **01–18 + 00_ai_in_practice** [D] | `ls curriculum/` |
| Labs Pixel/Voxel | **voxel: 17 jogos (game-02…game-18)** [D]; pixel: 1 app pixel-quest | `ls -d engines/voxelDojo/game-*` |

Seam atual [D, corrigido r1.1 por revisão da coordenação]: `mission-bindings.yaml`
= **39 bindings** — 23 `ai-pratica` (l01–l14, l18–l20, l24–l26, l30–l32) +
16 `dev` (9 lições YAML l15/l16/l17/l21/l22/l23/l27/l28/l29 — o "módulo 05"
ponte dev — + 7 jogos voxel game-02/03/05/06/07/08/09). Contagem: `len(bindings)`
via PyYAML = 39; `Counter(trackId)` = {ai-pratica: 23, dev: 16}.
**Lacunas reais: voxel game-04, game-10–game-18 (10 jogos) sem binding;
workflows, curso-simples, sdlc-quest, projetos 01–18 sem binding dev.**
Nota: l25/l26/l30/l31/l32 JÁ estão bound em ai-pratica (a r1 dizia "l25–l32
sem binding" — erro corrigido); os 3 workflows citados em §6 são exemplos do
escopo guiado/publicado, não o catálogo completo.

## 2. Família: curriculum/ai-literacy (32 lições) — canônico de conceito

Público: cotidiano (l15–l29: dev). Prática: lesson + exercício do YAML.
Evidência: literacy-evidence v1 + verificador independente (ADR-0004).

| Unidades | Competência | Pré-req | Decisão | Rastreabilidade |
| --- | --- | --- | --- | --- |
| l01, l02, l03 (mod 01) | F1 | — | manter [P] | YAML é fonte canônica; já validado por AID-2123 |
| l04–l07 (mod 02) | F3 | F1 | manter [P] | idem |
| l08–l11 (mod 03) | F4 | F3 | manter [P] | idem |
| l12–l14 (mod 04) | P: F2; S: F4 (l14: P F4 capstone cotidiano) | F1–F4 | manter; l14 melanção p/ capstone leve [P] | idem |
| l15–l17, l21–l23, l27–l29 (mod 05) | P: D1 (l15) / D3 (l16–l17, l21–l22) / D4 (l23, l27–l28) / D5 (l29); S: D3/D4 conforme linha | F1–F4 (ponte) | **melhorar**: re-ancorar módulo 05 como porta de entrada da jornada dev (bind pós-fundamentos, não pré-requisito duro) [P] | **já bound na trilha `dev` como lições YAML** (r1 dizia "sem binding dev não-voxel" — impreciso; são os 9 bindings YAML do track dev) |
| l18–l20 (mod 06), l24–l26 (mod 07), l30–l32 (mod 08) | P: F3 (l18–l20, l30–l31, l24) / F2 (l25) / F4 (l26, l32); S: F2/F4 | F3 | manter [P]; **bindings completos em ai-pratica** (r1 dizia "lacuna l25–l32" — corrigido: l25/l26/l30/l31/l32 já bound) | `mission-bindings.yaml` cobre l01–l14, l18–l20, l24–l26, l30–l32 em ai-pratica |

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

## 4. Família: zai-duolingo-like (9 módulos / 27 lições — corrigido r1.1, P1 da revisão)

Público: cotidiano (módulos finais: ponte dev). Prática: jogo cozy
(exercícios graduados). Evidência: grader local; NÃO é mastery.
Contagem estrutural por SHA (base `1975e2c7`): eval do array `CURRICULUM`
→ 9 módulos × 3 lições = 27.

| Unidades | Competência (P primária / S apoio) | Decisão | Rastreabilidade |
| --- | --- | --- | --- |
| o-que-e-ia (ia-nao-e-magica, o-que-e-algoritmo, como-ia-aprende) | P: F1 | **fundir**: teoria duplicada → consumir canônico literacy (read model gradual por módulo, com prova de dependências + R9) [P] | ↔ l01–l03 |
| dominando-o-chat (regra-de-ouro, persona, refinando) | P: F3; S: F1 | fundir (mesmo critério) [P] | ↔ l04–l07 |
| o-lado-negro (alucinacoes, vies, deepfakes) | P: F4 (alucinacoes/vies); S: F2 (deepfakes) | fundir [P] | ↔ l02/l08–l09/l12 |
| imagens-e-criatividade (descrevendo-imagem, prompt-imagem-avancado, limites-etica-imagem) | P: F3; S: F2 (limites-etica) | fundir; manter exercícios graduados como prática [P] | ↔ l24–l26 |
| ia-na-pratica (ia-para-marketing, ia-para-advogados, ia-para-educadores) | P: F3 (aplicação por domínio); S: F4 | fundir [P] | ↔ l13/l30–l32 |
| por-dentro-da-maquina (tokens-contexto-ferramentas, o-harness, prompt-sem-ruido) | P: F1 (mecânica de tokens/contexto); S: D1 (harness) | fundir; **único módulo cotidiano que introduz harness/tokens** — preservar na fusão [P] | sem equivalente literacy exato; CCE decide destino na r2 |
| contexto-e-specs (context-engineering, prd-e-specs, plan-build-validate) | P: D2; S: F3 (context-engineering) | **adiar p/ onda dev**: é conteúdo dev em engine cotidiano; vira candidato a prática guiada D2 quando a jornada dev ganhar bindings não-voxel [P] | ↔ curso-simples M1–M3 |
| esquadrao-de-agentes (agentes-e-subagentes, mcp-acp-skills, loop-engineering) | P: D6 (lite cotidiano) | **adiar**: única fonte cotidiana de "agentes"; volta na onda D6 [P] | sem equivalente literacy |
| o-protocolo-final (o-workflow-permanente, caso-real-feature-previsivel, privacidade-dados) | P: F2 (privacidade-dados); S: D4/D7-lite (caso-real = workflow de feature ponta a ponta) | manter; caso-real é **capstone cotidiano** candidato a tarefa inédita (R10) [P] | ↔ l12/l14 |

**Hard constraint (spec R8/R9):** `prisma/seed.ts` linhas 12–14 fazem
`deleteMany()` de lessonProgress/lesson/module — proibido em bancos
existentes; IDs/slugs estáveis; updates idempotentes; fixtures
antes/depois com `completed`/`in_progress`.

## 5. Família: docs/curso-simples (M1–M9 + exemplo/ciclos)

Público: dev. Prática: roadmap com gates por fase + progresso/.
Evidência: arquivo de progresso com saída de comando.

| Unidades | Competência | Decisão | Rastreabilidade |
| --- | --- | --- | --- |
| Fase 0 + M1–M3 | P: D1 (Fase 0/M2) / D2 (M1, M3); S: F3 (M1 pedido 5 campos) | manter como porta de entrada dev [P] | ROADMAP.md Fase 0/1 |
| M4–M8 + ciclos workflow-exemplo | P: D3 (construção) / D4 (M4–M8); S: D5 | manter; **melhorar**: vincular ciclos às competências D3–D5 na matriz r2 [P] | ROADMAP Fases 2–5 |
| M9 (5 perguntas + promoção de ativo) | P: D4; S: D7-lite | manter [P] | regra "promova exatamente um ativo" |

## 6. Família: dev-workflow-claude (10 workflows + exemplo-pratico)

Público: dev. Prática: workflow aplicado ao repo próprio.
Evidência: VALIDACAO/execução registrada.

| Unidades | Competência | Decisão | Rastreabilidade |
| --- | --- | --- | --- |
| exemplo-pratico (release_notes) | P: D2; S: D3 | manter — é o "Fase 0" do curso [P] | 22 tests pytest |
| 02-corrigir-bug, 07-investigar-erro, 03-refatorar-seguro | P: D4 | manter; **melhorar**: bind como missões dev opcionais (mission-bindings) [P]. Estes 3 descrevem **escopo guiado/publicado**, não o catálogo completo — a r2 da CCE cobre os 10 ciclos + exemplo | gap bindings dev |
| 04-revisar-mudancas, 05-documentar-codigo, 08-preparar-release | P: D4 | manter [P] | idem |
| 06-migrar-codigo, 09-otimizar-performance, 10-blindar-inputs | P: D4 (06, 09) / D5 (10); S: D5 (09) | manter [P] | idem |
| 11-aprender-com-a-sessao | P: D1; S: D6 | manter [P] | idem |

## 7. Família: sdlc-quest (18 missões + 16 TLC + gates) — identidade visual

Público: dev. Prática: quest 5 fases + oficina TLC.
Evidência: gate do harness (fail-closed). **Advertência (R10, P2 da
revisão): recibos do harness são simulação JS fictícia — não são evidência
de toolchain real nem autoridade de produção; não satisfazem RC-4 sozinhos
para competências D.**

| Unidades | Competência | Decisão | Rastreabilidade |
| --- | --- | --- | --- |
| 18 missões tipadas | P: D2–D4 por missão (r2 da CCE atribui primária por missão) | manter; **identidade visual da escola única = SDLCQuest v1.3** (decisão da issue) [D-issue] | data.js missions |
| 16 módulos TLC | P: D2 (discover/design/slice) / D4 (review/severity/carryover/converge) / D6 (verifier/handoff); S: conforme módulo | manter [P] | tlc-data.js |
| gates do harness | RC-2/R7 | manter; CPE cita os "6 gates" exatos (open question) [P] | HARNESS-GUIDE |

## 8. Família: projetos curriculum/01–18 + 00_ai_in_practice

Público: dev (00: cotidiano). Prática: implementação node-impl.
Evidência: `__tests__` + docs de status/review/benchmark (executável).

| Unidades | Competência | Decisão | Rastreabilidade |
| --- | --- | --- | --- |
| 00_ai_in_practice | P: F3; S: F4 | manter — projeto-ponte cotidiano [P] | já bound (ai-pratica) |
| 01–09 (fundamentos back-end) | P: D3; S: D4 (escada p/ D7) | manter; capstone escolhido em D7 [P] | sem binding dev (gap CPE) |
| 10–18 (sistemas distribuídos) | P: D3; S: D4/D5 (escada p/ D7) | manter [P] | idem |

## 9. Família: voxelDojo (17 jogos) + pixelDojo (pixel-quest)

Público: dev/ambos. Prática: simulações/jogo com Playwright evidence contract.
Evidência: teaching-game-contract + evidence.ndjson.

| Unidades | Competência | Decisão | Rastreabilidade |
| --- | --- | --- | --- |
| game-02/03/05/06/07/08/09 | P: D3–D5 por jogo (r2 atribui primária); prática opcional | manter (**7 bound** ao track dev — escopo guiado/publicado; **sem pré-requisito alheio obrigatório** — R2) [D] | mission-bindings dev |
| game-04, game-10–game-18 (10 jogos) | P: D3–D5 por jogo (r2 atribui); prática opcional | manter; **gap de binding** — decidir na r2 se viram missões dev opcionais (CPE) [P] | sem binding hoje (r1 dizia "game-02–game-18 já bound" — impreciso) |
| pixel-quest | P: D3; S: D4 — prática opcional | manter [P] | EVIDENCE_CONTRACT.md |

## 10. Gaps explícitos (o que a escola ainda não tem)

1. ~~Binding l25–l32 (ai-pratica)~~ **corrigido r1.1**: l25/l26/l30/l31/l32 já
   estão bound; o gap real de bindings é **voxel game-04, game-10–game-18** —
   dono CPE (fatia 1, com decisão CCE r2 sobre escopo).
2. Bindings dev p/ workflows, curso-simples, sdlc-quest, projetos 01–18 — CPE.
3. Campo `competency:` canônico em catalog.yaml/mission-bindings — CPE (fatia 1).
4. Fonte cotidiana de agentes (só ZAI esquadrao) — adiado p/ onda D6.
5. Contagem "6 gates" sdlc-quest ainda sem citação exata — CPE/UX citarem.
   (~~origem do "27 ZAI"~~ **resolvido r1.1**: issue certa, 9 módulos/27
   lições por contagem estrutural; erro era do grep da r1.)
6. Portão mecânico (CI) p/ contrato de release RC-1..RC-6 — follow-up QA.
7. **Estados de missão não separados**: `bound` ≠ `visible` ≠ `guided` ≠
   `readiness` — hoje o binding implica exposição; a fatia CPE deve introduzir
   os 4 estados como campos explícitos (sem sobrescrever schema v1) — dono CPE,
   com revisão UX/QA.
8. **Gate no-code já existe**: `learner/gate/no_code.py::verify_and_gate_no_code`
   (linha 66) — a escola NÃO constrói gate novo; reusa este (decisão coordenação
   2026-09-30, comentário AID-3453).
9. **Perigo ZAI seed**: `engines/zai-duolingo-like/prisma/seed.ts` linhas 11–13
   executam `lessonProgress.deleteMany()`/`lesson.deleteMany()`/`module.deleteMany()`
   — **nunca importar/executar seed em instâncias existentes** (apaga progresso);
   seeding só em banco descartável/efêmero. Dono: CPE (registrar no plano de
   fatia) + QA (checar no veredito RC-4..RC-6).
10. **Nenhuma competência tem tarefa inédita + rubrica de transferência
    versionada para os dois públicos** (R10, P2 da revisão) — autoria é da
    frente CCE (r2), verificação da frente QA (RC-4). Recibos de harness
    simulado e o piloto 5–8 devs (AID-641) não cobrem isso sozinhos.
