<!-- issue: AID-414 | key: spec | doc_id: b5e78095-0961-48bf-afdf-6963d1bfdc2d | updated: 2026-08-30 18:12:18.141+00 -->

# AID-414 — Spec final da onda C1–C3 (l18–l20) + emenda de contrato + split FPE

(AID-414)

# AID-414 — Especificação final da onda C1–C3 (l18–l20) pós-arco C4/C5

**Status:** ESPECIFICAÇÃO FINAL (v2 do draft AID-355) — somente leitura + documento. Nenhuma escrita canônica.
**Owner:** System Designer (bb7b8143). Delegada pelo CEO na triagem AID-413 (2026-08-30).
**Baseline lida e citada:** pin de produção `72130c6d` (merge PR #192, promovido pela AID-410; deploy `6a946c865e010af1557561de`, manifesto `f81bfd07…`). Fontes: `curriculum/ai-literacy/catalog.yaml` (contentVersion `2026-08-21.1`), `engines/codexdojo-os-prototype/config/mission-bindings.yaml` (dev track `2026-08-30.1`), `docs/design/ai-literacy/content-contract.md` e `evidence-contract.md`, `curriculum/ai-literacy/schemas/lesson.schema.json`, `learner/substrate/mission_catalog_rules.py`, `learner/gate/literacy_evidence.schema.json`, lições `l05/l07/l10/l15` (anatomia de referência).
**Este spec NÃO antecipa** decisão de cadência/tamanho de lote (decretos AID-286/AID-323 vigentes; ação board `9d0708a0` pendente) nem decisão de promoção. Paralelo por design à QA AID-412.

---

## 1. Remapeamento do draft v1 contra a produção vigente (`72130c6d`)

### 1.1 O que o arco C4/C5 resolveu (verificado no pin)
- Catálogo vigente: **21 missões** — trilha `ai-pratica` (l01–l14, chapterOrder 1–14, entrada recomendada `l02`) e trilha `dev` (game-02-warehouse → game-03-wormhole → game-05-relay-station → **l15 → l16 → l17** → game-06-pipeline-plant, chapterOrder 1–7, entrada recomendada `game-02-warehouse`).
- Candidatos **C4** (binding l15–l17) e **C5** (binding game-06) do draft v1: **ENTREGUES** (PRs #191/#192, promoção AID-410). Pendências 1–3 do draft §4 (recomendação AID-348, achados de sessão, baseline de promoção) estão resolvidas ou cobertas; pendências 4–5 (cadência e ratificação de escopo) seguem reservadas ao CEO — este documento é o input para essa ratificação.

### 1.2 Inconsistência observada (evidência) — drift de documentação de ids
Na produção vigente, três pontos ainda documentam o estado **anterior** a l15–l17:
1. `docs/design/ai-literacy/content-contract.md` (linha do tipo `LessonDefinition`): `id: string // estável: l01..l14` e `moduleId: string // mod-01..mod-04` — mas l15–l17 e mod-05 existem e estão promovidos.
2. `curriculum/ai-literacy/schemas/lesson.schema.json`: `id.description` = "ID estável da lição (l01..l14 na trilha inicial)".
3. `curriculum/ai-literacy/catalog.yaml`: comentário de cabeçalho "14 lições públicas de IA na Prática e 3 lições preservadas da prévia Dev" — o número público correto hoje é 17 lições no catálogo (14 ia_pratica + 3 dev).

Impacto: qualquer pessoa/agent que ler o contrato antes de estender conteúdo vai acreditar que ids > l14 são proibidos (foi exatamente o gate que motivou este spec). A emenda (§3) regulariza o drift **e** aloca l18–l20 no mesmo movimento.

### 1.3 Remapa de candidatos (o que sobra do draft v1)
| Candidato draft v1 | Estado contra `72130c6d` | Disposição nesta spec |
| --- | --- | --- |
| C1 — não-devs, biblioteca de pedidos (`l18*`) | Não entregue; continua candidato | **Especificada** (§2.1) como `l18` |
| C2 — não-devs, números e fatos (`l19*`) | Não entregue; sobreposição parcial com l10 | **Especificada** (§2.3) como `l20` (3ª na ordem de produção) |
| C3 — não-devs, conversas longas (`l20*`) | Não entregue; única lacuna sem cobertura (multi-turno) | **Especificada** (§2.2) como `l19` (2ª na ordem de produção) |
| game-07…game-18 (12 pacotes voxelDojo 0.1.x completos, não vinculados) | Ativos prontos; adoção exige verificação de qualidade por pacote vs contrato teaching-game (precedente game-06/AID-359) | **Fora desta onda** — candidatos naturais das próximas ondas da trilha dev (1 binding + QA por pacote, custo baixo–médio cada) |

Nota de ids: os ids do draft eram provisórios por definição ("a alocação real depende da atualização de contrato"). Aqui os ids finais são alocados **em ordem de produção** (l18→1ª, l19→2ª, l20→3ª) para que `chapterOrder` 15/16/17 e a numeração de ids caminhem juntos. Mapeamento explícito: C1→`l18`, C3→`l19`, C2→`l20`.

### 1.4 Colocação das lições: novo módulo `mod-06` (decisão de design)
l18–l20 entram em um **novo módulo** `mod-06` (`journey: ia_pratica`, `order: 6`), não distribuídas em mod-02/03/04. Justificativa: (a) precedente — l15–l17 ganharam mod-05 próprio; (b) módulos existentes têm `skillIds` fechados (mod-02 [pedir], mod-03 [avaliar], mod-04 [proteger, aplicar]) e lições concluídas por aprendizes — inserir lições novas em módulos "fechados" degrada o mapa de progresso; (c) um módulo de continuação dá superfície coerente nos dois consumers (mapa do app standalone `literacyDojo`, que filtra por `journey: ia_pratica`, e trilha `ai-pratica` do OS). Trade-off aceito: o app standalone passa a exibir um 5º módulo público ("Rotina com IA") com "em breve" até os arquivos existirem (mecanismo `planned`/`hasContent: false` já contratado).

---

## 2. Especificação final das missões C1–C3 (onda executável)

Convenções (todas herdadas do contrato vigente, sem exceções): formato 3–5 min; atividades dos 7 tipos já contratados com `id` estável `lNN-aM`; `evaluation.strategy: deterministic`; `feedback.onFailure` obrigatório (e `onSuccess`); `hints` 1–3 progressivas; `storage.policy: structured_only`; `evidence: { verifierRequired: true, completionClaim: lesson_completed, includesFreeText: false }`; `review.intervalsDays: [1, 7, 21]`; `completion.minimumScore: 0.75` com todas as atividades em `requiredActivityIds`; rubrica `lNN-rubric` com 3 critérios ponderados 1; `version: 1` inicial. Evidência por tentativa: envelope `literacy-evidence` v1 (`LiteracyEvidenceRecord`, `deterministicChecks` estruturados, `verifierRequired: true`), verificação independente preservada (produtor ≠ verificador).

### 2.1 `l18` — "Biblioteca de pedidos: reutilize o que funciona" (ex-C1)
- **moduleId:** mod-06 · **estimatedMinutes:** 4 · **skillIds:** [pedir, aplicar] · **prerequisites:** [l14] · **status inicial:** ready (com arquivo)
- **Objetivo (observável):** transformar um pedido bem-sucedido em modelo reutilizável e adaptá-lo a um cenário novo sem recomeçar do zero — identificando o que trocar (contexto/público) e o que preservar (estrutura/formato).
- **Atividades (3):**
  - `l18-a1` `prompt_builder` — Cenário: a pessoa recebeu uma ótima resposta para um relatório semanal e quer salvar o pedido como modelo. Campos: `tarefa` (o que o modelo pede, min 8 caracteres), `contexto` (dados da própria rotina, min 12), `publico` (para quem é a saída, min 6), `formato` (forma da saída; `mustIncludeAny` aceita 2–3 formas válidas). Evaluation: `minLength`/`mustIncludeAny` por campo (padrão de l05). Hints: 1) "o que a resposta boa tinha que a vaga não tinha?"; 2) "campos do pedido original: objetivo, contexto, público, formato"; 3) explícito por campo.
  - `l18-a2` `output_comparison` — Cenário: novo pedido (e-mail para cliente) feito (A) adaptando o modelo salvo [troca público/contexto, preserva estrutura] vs (B) recomeçando do zero [genérico]. Critérios: `c-adaptou-contexto`, `c-preservou-estrutura`, `c-sem-sobra` (não deixou resto do cenário antigo). Evaluation: `betterOutputId: A`, `requiredCriterionIds: [c-adaptou-contexto, c-sem-sobra]` (padrão de l15-a2 com `perCheck`).
  - `l18-a3` `choice` — "Em qual situação NÃO vale reusar o modelo?" 3 opções: (a) nova tarefa com público parecido [reuse OK]; (b) pedido antigo continha dados sensíveis do cliente e o novo cenário é outro projeto [**correta** — reaproveitar carrega dado sensível indevido]; (c) formato de saída igual ao anterior [reuse OK]. Evaluation: `correctOptionIds: [b]`.
- **Rubrica (`l18-rubric`):** `r-estrutura-campos` (estrutura o pedido por campos); `r-adpta-sem-recomecar` (adapta preservando o que funciona); `r-limite-do-reuso` (reconhece quando o reuso é inadequado, inclusive por dado sensível).
- **Critério de conclusão observável:** monta o modelo com os campos mínimos (checks determinísticos de comprimento/inclusão), escolhe a saída adaptada com os critérios exigidos e identifica o limite do reuso; score ≥ 0,75 com `requiredActivityIds: [l18-a1, l18-a2, l18-a3]`; evidência `literacy-evidence` v1 por tentativa + verificador independente.
- **Binding OS:** trackId `ai-pratica`, `chapterOrder: 15`, prereq `[l14]`, `kind: ai-literacy-lesson`, `projectId: 00_ai_in_practice`, `unitId: ai-literacy:l18`, fallback DOM "Salve um pedido que funcionou como modelo e adapte-o a um novo cenário por controles rotulados."

### 2.2 `l19` — "Conversas longas: gerencie o contexto" (ex-C3)
- **moduleId:** mod-06 · **estimatedMinutes:** 5 · **skillIds:** [pedir, avaliar] · **prerequisites:** [l07] · **status inicial:** ready (com arquivo)
- **Objetivo (observável):** em uma conversa multi-turno degradada, identificar qual contexto a IA "perdeu", executar a correção mínima que restaura a resposta útil e decidir entre continuar e recomeçar. (Única lição da trilha que treina multi-turno — lacuna mapeada no draft v1 e confirmada no catálogo vigente: nenhuma lição l01–l17 cobre o tema.)
- **Atividades (3):**
  - `l19-a1` `missing_context` — Transcrito curto de 4 turnos: no turno 1 a pessoa definiu "público: diretoria, tom: formal, no máximo 1 página"; no turno 4 a IA entrega 3 páginas informais para o time técnico. Pergunta: o que faltou no turno degradado? `contextOptions` (5; inclui 2 distratores plausíveis — "a IA ficou lenta", "falta de IA mais nova"), `requiredContextIds`: [público-original, tom-original, limite-de-tamanho]; `optionalContextIds`: [formato-anterior].
  - `l19-a2` `sort` — Ordenar o plano de recuperação mínima: (1) citar a restrição perdida ("volte ao público diretoria, formal, 1 página"); (2) confirmar o entendimento ("resuma em 3 linhas o que vai entregar"); (3) pedir a nova versão; (4) conferir a versão contra as restrições antes de usar. `items` 4, `expectedOrder` = essa ordem; distratores não entram (sort é permutação exata — os 4 itens são os passos corretos; o desafio é a ordem).
  - `l19-a3` `choice` — "Qual conversa vale RECOMEÇAR do zero?" 3 opções: (a) 6 turnos úteis, IA esqueceu 1 restrição [restaurar]; (b) **conversa acumulou 3 correções conflitantes e a IA mistura versões de requisitos** [**correta** — recomeçar]; (c) resposta boa, mas quer formato diferente [iterar com pedido de ajuste, padrão l07]. Evaluation: `correctOptionIds: [b]`.
- **Rubrica (`l19-rubric`):** `r-diagnostica-contexto` (identifica o contexto perdido num turno degradado); `r-correcao-minima` (restaura com a menor intervenção que resolve); `r-criterio-continuar-recomecar` (decide continuar vs recomeçar com critério explícito).
- **Critério de conclusão observável:** identifica os contextos obrigatórios ausentes, ordena o plano de recuperação correto e escolhe quando recomeçar; score ≥ 0,75 com as 3 atividades obrigatórias; mesma política de evidência de l18.
- **Binding OS:** trackId `ai-pratica`, `chapterOrder: 16`, prereq `[l07]`, `unitId: ai-literacy:l19`, fallback DOM "Leia uma conversa longa degradada e restaure o contexto perdido por controles rotulados."
- **Nota de pré-requisito:** `[l07]` preserva a identidade mínima do currículo (a lição estende "melhore a resposta em etapas"); a cadeia l07→…→l14 já é transitivamente acessível a quem completou mod-02. Desbloqueio não-linear (estilo Duolingo) é intencional e compatível com `mission_catalog_rules` (grafo acíclico, intra-track, prereqs canônicos resolvem para missões já vinculadas).

### 2.3 `l20` — "Números e fatos: verifique antes de usar" (ex-C2)
- **moduleId:** mod-06 · **estimatedMinutes:** 3 · **skillIds:** [avaliar] · **prerequisites:** [l10] · **status inicial:** ready (com arquivo)
- **Objetivo (observável):** diante de uma resposta com números e fatos específicos, marcar quais afirmações exigem verificação externa e escolher a fonte certa — aprofundamento operacional de l09/l10 (l10 decide **se** verifica; l20 treina **o quê** marcar e **onde** confirmar).
- **Atividades (3):**
  - `l20-a1` `choice` com `multiSelect: true` — Resposta da IA com 5 afirmações sobre desempenho de vendas no trimestre; marcar as que exigem fonte externa: crescimento de 23%, "pesquisa de 2024 da consultoria X", ticket médio de R$ 412 [**corretas: as 3**] vs "e-mails devem ser claros", "equipes variam" [conhecimento geral — não marcar]. Evaluation: `correctOptionIds: [as 3 específicas]`; feedback `onFailure` explica o sinal (número preciso, fato datado, citação nominal).
  - `l20-a2` `sort` — Ordenar fontes para confirmar "crescimento de 23% no trimestre": (1) relatório oficial de vendas da empresa; (2) planilha primária do setor; (3) matéria da imprensa especializada citando o relatório; (4) post em rede social sobre o assunto. `expectedOrder` = 1→4 (confiança decrescente/derivatividade crescente).
  - `l20-a3` `missing_context` — A IA afirma "as vendas cresceram 23% no último trimestre". O que falta para usar essa afirmação com segurança? `requiredContextIds`: [fonte-oficial-do-numero, periodo-exato-medido]; distratores: "nome do modelo de IA", "opinião do time".
- **Rubrica (`l20-rubric`):** `r-marca-o-que-verifica` (marca afirmações verificáveis por sinal: número preciso, data, citação); `r-hierarquia-de-fontes` (ordena fontes primárias antes de derivadas); `r-nomeia-o-que-falta` (aponta a fonte e o período que faltam).
- **Critério de conclusão observável:** marca corretamente ≥ as afirmações específicas exigidas pelos checks, ordena a hierarquia de fontes e nomeia o contexto faltante; score ≥ 0,75 com as 3 atividades obrigatórias; mesma política de evidência.
- **Binding OS:** trackId `ai-pratica`, `chapterOrder: 17`, prereq `[l10]`, `unitId: ai-literacy:l20`, fallback DOM "Marque afirmações que exigem verificação e escolha a fonte certa por controles rotulados."
- **Nota de escopo:** `includesFreeText: false` mantido (checks estruturados; nenhum texto livre persistido). `multiSelect` já é campo opcional contratado de `choice` — sem mudança de schema.

---

## 3. Emenda de contrato (texto literal para issue aprovada pelo board)

A extensão de ids de lição (l18+) e de módulo (mod-06) exige, pela regra vigente do contrato de conteúdo, atualização via issue aprovada. Emenda proposta — 4 arquivos, 0 mudanças de comportamento em runtime, 0 migração de estado:

**(A) `docs/design/ai-literacy/content-contract.md`**
1. No bloco `LessonDefinition`, substituir:
   - `id: string                    // estável: l01..l14; nunca deriva do título`
     por `id: string                    // estável: lNN — vigentes l01..l20; nunca deriva do título`
   - `moduleId: string              // mod-01..mod-04`
     por `moduleId: string              // mod-01..mod-06`
2. Na seção Catálogo, substituir "`catalog.yaml` é o índice canônico de 17 lições válidas." por "`catalog.yaml` é o índice canônico das lições válidas (20 após a onda l18–l20).", e a frase de jornadas por: "uma `journey`: `mod-01`…`mod-04` e `mod-06` pertencem a `ia_pratica` (14 lições dos módulos iniciais + 3 de continuação em `mod-06`: reutilização de pedidos, verificação de números e fatos, conversas longas) e `mod-05` pertence a `dev` (3 lições publicadas como missões hospedadas da trilha dev do OS — ver `engines/codexdojo-os-prototype/config/mission-bindings.yaml`)."
3. Em "Exports do read model", substituir "`lessons: LessonDefinition[]` — as 17 lições `ready` validadas" por "`lessons: LessonDefinition[]` — todas as lições `ready` validadas (20 após a onda l18–l20)".
4. Na seção Regras, acrescentar a regra 7: "Extensão ou aposentação de ids de lição/módulo exige emenda deste contrato via issue aprovada pelo board; ids alocados sequencialmente (próximo livre após `l20`: `l21`); ids nunca são reutilizados."

**(B) `curriculum/ai-literacy/schemas/lesson.schema.json`**
- `properties.id.description`: "ID estável da lição (l01..l14 na trilha inicial). Nunca deriva do título." → "ID estável da lição (l01..l20 vigentes; novos ids só mediante emenda de contrato aprovada). Nunca deriva do título."
- `pattern: "^l[0-9]{2}$"` e `estimatedMinutes.enum [3,4,5]`: **inalterados** (l18–l20 já são válidos pelo padrão; a restrição era apenas documentacional).

**(C) `curriculum/ai-literacy/catalog.yaml`**
1. Cabeçalho: "Fonte de verdade do índice: 14 lições públicas de IA na Prática e 3 lições preservadas da prévia Dev, separadas pelo campo `journey`." → "Fonte de verdade do índice: 17 lições públicas de IA na Prática (l01–l14 + onda de continuação l18–l20) e 3 lições da trilha Dev, separadas pelo campo `journey`."
2. Novo módulo (após mod-05):
   ```yaml
   - id: mod-06
     slug: 06-rotina-com-ia
     title: "Rotina com IA"
     order: 6
     journey: ia_pratica
     skillIds: [pedir, avaliar, aplicar]
   ```
3. Três entradas de lição (`status: planned` na emenda; cada tarefa de produção vira `ready` junto com o arquivo, mantendo a regra 5 do contrato): `l18` (prereq [l14], skills [pedir, aplicar], 4 min), `l19` (prereq [l07], skills [pedir, avaliar], 5 min), `l20` (prereq [l10], skills [avaliar], 3 min) — títulos/objetivos como no §2.
4. `contentVersion`: bump no padrão vigente `YYYY-MM-DD.N` na data do merge da emenda (referência nova para bindings de produção; bindings l01–l14/l15–l17 existentes não são reescritos neste PR — cada binding novo referencia a versão vigente no seu próprio merge).

**(D) `engines/codexdojo-os-prototype/config/mission-bindings.yaml`** (não faz parte da emenda documental; muda só nas tarefas de produção)
- Em cada tarefa (1 missão): binding `kind: ai-literacy-lesson`, `trackId: ai-pratica`, `chapterOrder` 15/16/17, prereqs canônicos ([l14]/[l07]/[l10]), `runtime.engineId: literacyDojo` + entrypoint `http://127.0.0.1:5178/?hosted=1` + `VITE_LITERACYDOJO_URL` + `protocolVersion "1.0"` + `contentVersion` = versão do catálogo vigente no merge, `evidence: literacy-evidence v1 / verifierRequired: true`, `fallback.kind: dom` (summaries no §2); `tracks[ai-pratica].contentVersion` bump no primeiro binding da onda.

**Inalterado por decisão explícito:** `estimatedMinutes ∈ {3,4,5}`; os 7 tipos de atividade e suas regras de avaliação; regras de migração de progresso (ids novos = lições novas, sem migração; `LearnerProgress.schemaVersion` não muda de forma); contrato de evidência (`literacy-evidence` v1); `mission_catalog_rules.py` (nenhuma regra nova necessária — l18–l20 satisfazem grafo intra-track, prereqs canônicos resolvem para missões vinculadas, chapterOrder contíguo 1–17, ≥1 missão/trilha preservada, entrada `l02` sem prereq mantida).

---

## 4. Ordenação (custo × cobertura × risco) e split de tarefas para o FPE

### 4.1 Ordem de produção recomendada
| Ordem | Missão | Custo | Cobertura | Risco | Por quê nesta posição |
| --- | --- | --- | --- | --- | --- |
| 1 | `l18` Biblioteca de pedidos | Médio (3 atividades, 2 padrões já provados em l05/l08/l15) | Reforça o ciclo central (pedir+aplicar) imediatamente após o desafio l14 — hábito diário de maior alavancagem para não-devs | Baixo | Maior valor por unidade de risco; extensão natural do arco recém-fechado |
| 2 | `l19` Conversas longas | Médio-alto (transcritos multi-turno autoriais, 5 min) | **Única lacuna real do catálogo** (nenhuma lição treina multi-turno; todo uso real é multi-turno) | Médio (padrão de leitura de conversa é novo para a trilha; mitigado: só usa tipos contratados) | Lacuna exclusiva supera o custo extra; beneficia os dois públicos |
| 3 | `l20` Números e fatos | Baixo (3 min, formatos mais simples) | Aprofunda l09/l10 (o que marcar, onde confirmar) | Médio (sobreposição parcial com l10 — redundância percebida) | Mais barata, mas mais substituível; por último, a telemetria/coorte de l09–l11 pode redefinir o ângulo antes da autoria |

Alternativa considerada e rejeitada: ordem do draft v1 (C1→C2→C3) — mantinha C2 na frente apesar da sobreposição com l10 e empurrava a única lacuna única (multi-turno) para o fim. **Onda mínima viável** (se capacidade restrita): l18+l19 (+12→9 min de conteúdo novo; l20 fica candidata da onda seguinte). **Tamanho do lote e cadência: decisão do CEO**, não deste spec.

### 4.2 Split em tarefas (1 missão = 1 tarefa; T0 = emenda)
- **T0 — Emenda de contrato** (issue própria, aprovação board, texto = §3): docs + schema description + catalog (mod-06 + l18–l20 `planned` + header + contentVersion bump). Critérios de aceite: `validate.py` verde; `gen:content` verde; mapa do standalone exibe mod-06 "em breve" (`hasContent: false`); zero mudança de comportamento (nenhuma lição `ready` nova); CI verde.
- **T1 — Produção l18** (FPE): flip `ready` + `modules/06-rotina-com-ia/l18-biblioteca-de-pedidos.yaml` (§2.1, `version: 1`) + binding l18 (chapterOrder 15, prereq [l14]) + bump `tracks[ai-pratica].contentVersion` + testes de fixture + regen de readiness. Critérios de aceite: `validate.py` verde; literacyDojo `gen:content/lint/test/build/test:e2e` verdes; regras do mission catalog verdes (chapterOrder contíguo 1–15, prereq canônico, entrada `l02` intacta); missão jogável hosted + fallback DOM; evidência `literacy-evidence` v1 emitida com `verifierRequired: true`; read model contém l18 em mod-06; CI verde.
- **T2 — Produção l19** (FPE): idem T1 para `l19` (chapterOrder 16, prereq [l07]), arquivo `modules/06-rotina-com-ia/l19-conversas-longas.yaml` (§2.2).
- **T3 — Produção l20** (FPE): idem T1 para `l20` (chapterOrder 17, prereq [l10]), arquivo `modules/06-rotina-com-ia/l20-numeros-e-fatos.yaml` (§2.3).
- **Pós-onda:** promoção de produção (pins/alias/permalink + rollback owner, padrão AID-410) e **QA independente wave-level** (issue irmã da QA, padrão AID-412/AID-360) — produtor ≠ verificador preservado; nenhum `mastered`; gates intocados.

### 4.3 Sequenciamento e paralelismo
T0 → (T1 ∥ T2 ∥ T3 são independentes entre si após T0; se paralelizadas, merges em ordem de chapterOrder para evitar rebases de `contentVersion`) → promoção → QA. Gatilho de abertura da onda: **CEO GO após AID-412** (triação AID-413: "AID-412 = GO → CEO abre a onda a partir do spec AID-414").

---

## 5. Método de verificação

- **Deste spec (já executado):** leitura integral das fontes no pin `72130c6d` (catálogo, bindings, contratos, schemas, regras, lições de referência); contagens conferidas (21 missões; 17 lições; 12 jogos não vinculados); nenhuma escrita no repo (working tree intocado por este trabalho).
- **Da onda (quando aprovada):** validador do catálogo + `gen:content` + suítes literacyDojo e OS (critérios por tarefa em §4.2); regras do mission catalog como gate mecânico de grafo/identidade/ordenação; QA independente pós-promoção com verificação de acessibilidade e regressão (padrão AID-412); evidência de aprendizagem por `literacy-evidence` v1, sem presunção de eficácia (coorte N=2 é direcional — repriorização de l20 permanece possível com dados de uso).

## 6. Decisões explicitamente reservadas (não tomadas aqui)
1. Cadência e tamanho do lote (onda completa × mínima) — CEO, decretos AID-286/AID-323; ação board `9d0708a0` pendente.
2. Abertura da onda (gatilho AID-412 GO) e aprovação da emenda T0 — CEO/board.
3. Vinculação de game-07+ — ondas futuras da trilha dev, 1 verificação de qualidade por pacote.
4. Eficácia pedagógica de l18–l20 — propriedade do UX Designer de Aprendizagem com evidência de coorte/uso; este spec garante apenas execução, coerência e verificabilidade.
