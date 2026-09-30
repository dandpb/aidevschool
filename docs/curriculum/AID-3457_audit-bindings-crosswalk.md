# AID-3457 — Auditoria dos contratos de bindings + crosswalk aditivo competência/lição/IDs/progresso

Change-id: `AID-3457-audit-bindings` (issue AID-3457, filha da frente de integração AID-3453).
Base auditada first-hand: `main` `1975e2c7` (mesma base da revisão independente citada no thread).
Status: **auditoria + proposta mínima** — implementação suspensa até a matriz r2 da frente CCE
(AID-3456) e a correção do plano (PR #610) serem revisadas.

## 1. Correção de premissa (confirmada first-hand)

A revisão independente no thread da AID-3457 está correta; os números do spec/plan do PR #610
estão desatualizados:

| Afirmativa | PR #610 (spec R6 / plan) | Realidade em `1975e2c7` (verificado) |
| --- | --- | --- |
| Total de bindings | 41 | **39** |
| Bindings `ai-pratica` | 24 (l01–l24) | **23** (l01–l14, l18–l20, l24–l26, l30–l32) |
| Bindings `dev` | 17 (game-02–game-18) | **16** (9 lições + 7 jogos voxel) |
| l25–l32 | "sem binding" (lacuna) | **todos já têm binding** |
| Track de l27–l29 | — (implícito ai-pratica na fatia 1) | **`dev`** (módulo `mod-05`, journey `dev`) |

Comando re-executável da contagem:

```bash
python3 - <<'EOF'
import re
txt = open("engines/codexdojo-os-prototype/config/mission-bindings.yaml").read()
blocks = txt.split("  - missionId: ")[1:]
rows = [(b.split("\n")[0].strip(), re.search(r"\n    trackId: (\S+)", b).group(1)) for b in blocks]
from collections import Counter
print(len(rows), Counter(t for _, t in rows))
EOF
# -> 39 Counter({'ai-pratica': 23, 'dev': 16})
```

**Consequência:** a "fatia vertical 1 = adicionar bindings l25–l32 (41→49)" é vazia — executá-la
duplicaria bindings e violaria a invariante de unicidade lição↔missão do substrate
(`mission_catalog_bindings.py`: *"curriculum lesson has multiple mission bindings"*). O plano do
PR #610 precisa de r2 antes de qualquer implementação CPE.

## 2. Auditoria dos contratos atuais (cadeia completa)

### 2.1 `engines/codexdojo-os-prototype/config/mission-bindings.yaml`

- `schemaVersion: 1`; tracks `ai-pratica` e `dev`, ambos `contentVersion: "2026-09-10.2"`;
  entrada recomendada `ai-pratica = l02`, `dev = game-02-warehouse`.
- 39 bindings: 23 lições `ai-pratica` + 9 lições `dev` (`mod-05`: l15–l17, l21–l23, l27–l29)
  + 7 jogos `project-voxel-game` (game-02, 03, 05, 06, 07, 08, 09).
- Contrato por binding de lição: `curriculum.kind: ai-literacy-lesson`,
  `runtime.engineId: literacyDojo` (hosted, `protocolVersion: "1.0"`,
  `contentVersion` = catálogo canônico), `evidence: literacy-evidence v1 verifierRequired: true`,
  `fallback.kind: dom` (jogos: `canvas2d`).

### 2.2 Invariantes impostas pelo substrate (`learner/substrate/mission_catalog_bindings.py`)

Para lições (`ai-literacy-lesson`): `missionId` DEVE igualar o `lessonId` canônico; `unitId`
DEVE ser `ai-literacy:{lessonId}`; `prerequisites` DEVEM igualar os canônicos do catálogo;
`runtime.contentVersion` e o `contentVersion` do track `ai-pratica` DEVEM igualar o
`contentVersion` do catálogo canônico; o track do binding DEVE ser o `journey` do módulo da
lição (`ia_pratica→ai-pratica`, `dev→dev`); lição precisa `status: ready`; no máximo um binding
por lição; engine obrigatoriamente `literacyDojo`. `verifierRequired: true` é obrigatório
(literacy-evidence v1 / teaching-game-evidence v1).

### 2.3 Currículo canônico (`curriculum/ai-literacy/`)

- `catalog.yaml`: `schemaVersion: 1`, `contentVersion: 2026-09-10.2`, 8 módulos
  (7 `ia_pratica` + 1 `dev` = `mod-05`), 32 lições `ready` (l01–l32).
- `schemas/lesson.schema.json`: **`additionalProperties: false`** no objeto raiz —
  **achado F-1: adicionar `competency:` ao YAML de lição sem emenda de schema quebra o
  validate/build** (não existe fallback silencioso). IDs têm padrão `^l[0-9]{2}$` e a descrição
  do contrato já exige emenda aprovada para novos ids.
- `catalog.yaml` é hand-maintained (não é gerado); o read model TS é que é gerado
  (`npm run gen:content` = `validate.py --compile engines/literacyDojo/src/data/generated`).
- O filtro `ia_pratica` (o que o público cotidiano vê) continua no adaptador literacyDojo
  (`generatedContentRepository.ts`), decisão AID-3453 — não mover para o compilador.

### 2.4 Acoplamento de versão (achado F-2, corrigido pela revisão do PR #611)

Qualquer mudança de conteúdo/estrutura no catálogo ou lições exige bump único de
`contentVersion` propagado em **três lugares** do `mission-bindings.yaml`. A proteção,
porém, **não é uniforme** — distinção first-hand (`learner/substrate/mission_catalog_bindings.py`):

| Lugar | Proteção runtime hoje | Proteção nesta auditoria |
| --- | --- | --- |
| track `ai-pratica` `contentVersion` | **rejeita** divergência do catálogo canônico (`validate_tracks`, `mission_catalog_bindings.py:45`) | — |
| track `dev` `contentVersion` | **NÃO rejeita** — exige apenas string não-vazia (`:44`); igualdade hoje é convenção espelhada | **pin de teste** (`test_ai_pratica_content_versions_match_canonical_catalog`): divergência Dev falha em CI, não no runtime |
| `runtime.contentVersion` dos 32 bindings de lição | **rejeita** divergência, para toda lição independente de track (`mission_catalog_bindings.py:130`) | — |

Exige ainda `gen:content` + regeneração das views (`python3 -m learner.substrate`) e, se
contrato produto-facing mudar, `engines/codexDojo/ecosystem/MANIFEST.md` no mesmo change.
**Runtime não é ampliado nesta onda** (proteção Dev fica só no teste; ampliar runtime =
change conjunta com o dono do substrate, fora do escopo audit-only).

#### 2.4.1 Registro de defaults de schema (first-hand, antes de futuros consumidores)

Não existe estado implícito/silencioso no contrato atual — tudo ausente ou inválido **rejeita**:

- `lesson.schema.json`: `additionalProperties: false` (F-1) → campo desconhecido (ex. `competency`
  hoje) é **erro**, nunca ignorado; ao introduzi-lo, a ausência deve ganhar semântica explícita
  ("não mapeada" — crosswalk [P]) documentada no schema + validador.
- `evidence.verifierRequired`: sem default — deve ser literalmente `true`
  (`mission_catalog_bindings.py:75`); `false`/ausente rejeita.
- `evidence.version`: int requerido, precisa estar em `SUPPORTED_EVIDENCE_SCHEMAS`; sem default.
- `curriculum.kind` / `fallback.kind`: requeridos, sem default; `fallback.kind` ∈ `SUPPORTED_FALLBACKS`.
- track `contentVersion` (dev): único campo com "default fraco" — qualquer string não-vazia passa
  no runtime (ver tabela acima).

**Testes negativos exigidos antes de consumidores usarem estados novos** (pré-requisito da
fatia de implementação, não desta auditoria): (1) schema rejeita campo desconhecido hoje
(prova F-1 mecanicamente); (2) `validate_tracks` rejeita `ai-pratica` divergente; (3) pin do
comportamento atual: `validate_tracks` **aceita** `dev` divergente (gap consciente; virar
proteção runtime é decisão futura); (4) `verifierRequired: false`/ausente rejeita;
(5) pós-`competency`: id F/D inválido rejeita e ausência = "não mapeada" com teste dos dois lados.

### 2.5 IDs e progresso

Progresso do learner é chaveado por unit `ai-literacy:{lessonId}` e missões por `missionId`
(= lessonId). Campo aditivo opcional **não** muda nenhum ID, prerequisite ou estado
(`learner/learning_state.yaml` intocado; nada vira `mastered`; `completed/pass/simulação`
continuam não sendo mastery — RC-4).

### 2.6 Separação bound / visible / guided / readiness (vocabulário comum da frente)

- **bound**: existe binding em `mission-bindings.yaml` (39 hoje).
- **visible**: lição `ready` no catálogo canônico e compilada no read model; o que o público
  `ia_pratica` efetivamente vê passa pelo filtro de journey no adaptador literacyDojo.
- **guided**: missão com runtime hospedado + fallback declarado (contrato OS).
- **readiness**: pré-requisitos canônicos declarados no catálogo (grafo), distintos do gating
  pedagógico real (gate AID-1222 / `learner/gate/no_code.py`, intocado).

### 2.7 Aliases de unit_id do pack Pixel — contrato congelado (complemento 696dc5d3)

`engines/pixelDojo/pixel-quest/src/content/curriculumPack.ts:666` (`unitId(module)`) **não segue
um padrão uniforme** — o crosswalk de IDs precisa de aliases explícitos, não de inferência por nome:

| Projeto | unit_id emitido pelo pack | Origem do alias |
| --- | --- | --- |
| `01_rate_limiter` | `U0-sonda-rate-limiter-robustness` | contrato de persistência congelado; U0 é a unit canônica do substrate (única em `learner/learning_state.yaml:85`) |
| `04_concurrent_task_queue` | `U4-task-queue` | decisão CEO AID-1859 Option A (dispatch AID-1877); mesma identidade do catálogo voxelDojo — **não** é o default de template `U-04_concurrent_task_queue` (classe de drift L4) |
| demais | `U-${project}` (template) | ex. `U-02_key_value_store` só existiria via template; o binding voxel canônico é `U2-key-value-store` |

Regras decorrentes (travadas em teste, §5):

- `regionId` = `lab-${project}` (ex. `lab-01_rate_limiter`) é **região**, não unit_id; nada no
  formato `:lab…`/`lab-…` é unit_id do pack.
- Equivalência Pixel↔Voxel↔substrate só por **alias explícito + fixture** (tabela acima /
  constantes do teste); nunca inferir por semelhança de nome — `U4-task-queue` (canônico,
  compartilhado) ≠ `U-04_concurrent_task_queue` (template Pixel) são ids distintos.
- **Nenhum engine inteiro foi provado seguro para excluir** da matriz de progresso compartilhado:
  a matriz r2 (AID-3456) não pode descartar superfície por superfície sem evidência; pixelDojo
  emite evidência consumida pelo gate (`learner/gate/`) e o substrate já persiste U0.

## 3. Crosswalk aditivo competência ↔ lição ↔ IDs ↔ progresso [P]

Proposta ([P] — ratificação item a item é da frente CCE, matriz r2/AID-3456). IDs, tracks,
pré-requisitos e progresso preservados; nenhuma fusão executada nesta onda (R4).

Framework: F1 entender IA · F2 uso seguro · F3 prompt/contexto · F4 verificação ·
D1 fundamentos/harness · D2 intenção/spec/plano · D3 construção · D4 teste/debug/review/manutenção ·
D5 produto IA/evals · D6 agentes/tools/skills · D7 capstone dev.

### 3.1 Jornada IA no cotidiano (23 bindings `ai-pratica`)

| Lição | Módulo | Competência [P] | Secundária | Título (resumo) |
| --- | --- | --- | --- | --- |
| l01 | mod-01 | F1 | — | Sua primeira conversa com uma IA |
| l02 | mod-01 | F1 | F4 | IA não é uma fonte de verdade |
| l03 | mod-01 | F1 | — | O que a IA faz bem e onde costuma falhar |
| l04 | mod-02 | F3 | — | Dê um objetivo claro |
| l05 | mod-02 | F3 | — | Dê contexto para obter uma resposta útil |
| l06 | mod-02 | F3 | — | Defina público, tom e formato |
| l07 | mod-02 | F3 | — | Melhore a resposta em etapas |
| l08 | mod-03 | F4 | — | A primeira resposta não é necessariamente a melhor |
| l09 | mod-03 | F4 | — | Como reconhecer uma resposta inventada |
| l10 | mod-03 | F4 | — | Quando procurar fontes externas |
| l11 | mod-03 | F4 | — | Como comparar alternativas e explicitar critérios |
| l12 | mod-04 | F2 | — | Proteja suas informações |
| l13 | mod-04 | F4 | F3 | Use IA para uma tarefa real de trabalho |
| l14 | mod-04 | F4 | F1 | Desafio final: pedir, avaliar, melhorar e aplicar (capstone cotidiano) |
| l18 | mod-06 | F3 | — | Biblioteca de pedidos |
| l19 | mod-06 | F3 | — | Conversas longas: gerencie o contexto |
| l20 | mod-06 | F4 | — | Números e fatos: verifique antes de usar |
| l24 | mod-07 | F3 | — | Anexe, cole ou descreva |
| l25 | mod-07 | F2 | — | Anexos seguros |
| l26 | mod-07 | F4 | — | Confira o que a IA extraiu |
| l30 | mod-08 | F4 | F3 | Rotinas repetitivas: o que automatizar |
| l31 | mod-08 | F4 | — | Pequenas automações: onde o humano valida |
| l32 | mod-08 | F4 | — | Quando a automação erra |

### 3.2 Jornada IA para Dev — lições (9 bindings `dev`, `mod-05`)

| Lição | Competência [P] | Secundária | Título (resumo) |
| --- | --- | --- | --- |
| l15 | D1 | — | Quando usar IA e quando não usar |
| l16 | D3 | D1 | Seu primeiro código com um assistente de IA |
| l17 | D5 | D3 | Integre uma API de IA em um projeto real |
| l21 | D4 | — | Peça testes que valem a pena |
| l22 | D4 | — | Revise o código sugerido como engenheiro |
| l23 | D4 | D1 | O que aceitar: limites do assistente |
| l27 | D4 | — | Debug com assistente: reproduza antes de perguntar |
| l28 | D4 | — | Refatore com assistente sem quebrar comportamento |
| l29 | D4 | — | Avalie as dependências sugeridas |

### 3.3 Jogos voxel (7 bindings `dev`) — prática opcional

`game-02-warehouse`, `game-03-wormhole`, `game-05-relay-station`, `game-06-pipeline-plant`,
`game-07-checkpoint-city`, `game-08-timeline-tower`, `game-09-docking-bay` →
**D3 (construção), prática recomendada [P]**. R2: nenhuma competência exige jogo como
pré-requisito; jogos mantêm os próprios pré-requisitos internos de track `dev`.
IDs: bindings voxel usam os ids canônicos compartilhados (`U2-key-value-store`,
`U3-url-shortener`, `U5-websocket-chat`, …) — ver aliases do pack Pixel em §2.7; só `U4-task-queue`
é hoje identidade canônica emitida simultaneamente pelo pack Pixel e pelo catálogo voxel.

### 3.4 Cobertura por competência e lacunas reais

| Competência | Lições bound | Lacuna real |
| --- | --- | --- |
| F1 | 3 | — |
| F2 | 2 | — |
| F3 | 7 | — |
| F4 | 11 | — |
| D1 | 1 | parcial (harness amplo) |
| D2 | **0** | intenção/spec/plano sem binding (workflows, curso-simples, sdlc-quest) |
| D3 | 1 (+7 jogos opcionais) | parcial |
| D4 | 6 | — |
| D5 | 1 | parcial (evals sem binding) |
| D6 | **0** | agentes/tools/skills sem binding |
| D7 | **0** | capstone dev sem binding (projetos 01–18) |

**A lacuna da escola unificada não é l25–l32 (já cobertos): são as jornadas dev não-voxel**
(D2/D6/D7 + evals) — fontes já mapeadas na matriz r1 do PR #610 (workflows 02–11,
curso-simples M1–M9, sdlc-quest, projetos 01–18). Any binding novo dessas fontes depende da
decisão `manter|fundir|melhorar|adiar|remover` da matriz r2 (AID-3456).

## 4. Proposta mínima (quando desbloqueada pela matriz r2 + plano corrigido)

1. **Emenda de schema (achado F-1):** `lesson.schema.json` ganha propriedade **opcional**
   `competency: { "type": "string", "pattern": "^[FD][0-9]+$" }` (emenda documentada;
   `schemaVersion` permanece 1 — campo opcional aditivo é compatível para leitores existentes).
2. **Catálogo:** `competency:` declarado por lição em `catalog.yaml` (hand-maintained) e
   opcionalmente nos bindings; lições sem campo continuam válidas.
3. **Bump único de `contentVersion`** (achado F-2): propagar o novo valor para track
   `ai-pratica`, track `dev` e `runtime.contentVersion` dos 32 bindings de lição no mesmo
   change; `gen:content` + `python3 -m learner.substrate` + `MANIFEST.md` se produto-facing.
4. **Substrate:** `mission_catalog_bindings.py` aceita e propaga `competency` quando presente
   (sem exigir); read model OS expõe o campo; teste novo cobre presença/ausência.
5. **Compatibilidade:** o read model TS gerado só passa a carregar o campo quando o consumidor
   (adaptador literacyDojo) o consumir — filtro `ia_pratica` permanece no adaptador (R6).
6. **Fora de escopo:** qualquer fusão de conteúdo, mudança de IDs/pré-requisitos, estado
   learner, novos bindings de fontes não decididas na matriz r2.

## 5. Testes de compatibilidade (entregues nesta auditoria)

`curriculum/ai-literacy/tools/tests/test_os_bindings_crosswalk.py` (novo, suite compartilhada
`testpaths`) pinja o estado live a partir dos arquivos reais — guarda de zero regressão para
as lições live:

- total de bindings = 39 (23 `ai-pratica` + 16 `dev`) — duplicar l25–l32 falha aqui;
- toda lição `ready` do catálogo tem exatamente 1 binding com `missionId == lessonId`;
- track do binding = journey do módulo (inclui l27–l29 = `dev`);
- conjunto dev-lição = exatamente as lições de `mod-05`;
- contrato de evidência uniforme (`literacy-evidence` v1, `verifierRequired`, engine
  `literacyDojo`) nos bindings de lição;
- `contentVersion` do track `ai-pratica` **e do track `dev`** e dos runtimes = catálogo canônico
  (⚠ pin `dev` é proteção **de teste** — o runtime hoje não exige igualdade no track dev; ver §2.4);
- jogos voxel: 7, todos `dev`, `project-voxel-game` (prática opcional);
- aliases do pack Pixel (§2.7) avaliados como **mapeamento completo emitido por projeto**:
  o teste parseia a função `unitId` (branches ordenadas + fallback) e a lista de módulos do
  fonte, computa o unit_id de cada projeto e compara com o mapa explícito esperado
  (`PIXEL_UNIT_ALIASES` + template) — trocar branches/strings/template muda o mapa e falha
  (mutação executada na verificação, §6); U0 persistido no substrate; unit_id nunca região-shaped;
- **sete pares completos missão→(projeto, unit)** do track voxel pinados (`VOXEL_MISSION_UNITS`)
  — adotar default de template como id canônico (ex. `U-02_key_value_store`) falha (mutação
  executada, §6); contraexemplos estáticos da revisão d5910962 eliminados.

Pin negativo do comportamento atual do runtime (distinção revisão PR #611):
`validate_tracks` **aceita** track `dev` com `contentVersion` divergente (gap documentado §2.4);
quando a proteção virar runtime, este teste deve flipar conscientemente junto com o change
conjunta do substrate.

Testes que acompanham a implementação (futuro, quando desbloqueado): parse com
`competency` ausente/presente nos 4 níveis (lesson YAML, catalog, bindings, read model),
round-trip do read model, e update consciente dos pins de contagem.

## 6. Verificação executada nesta auditoria

- Contagem/distribuição: script §1 (39 = 23 + 16).
- Catálogo: 8 módulos/32 lições ready; journeys via `catalog.yaml` módulos.
- Suíte nova: `python3 -m pytest curriculum/ai-literacy/tools/tests/test_os_bindings_crosswalk.py`
  (verde) + `python3 -m pytest curriculum/ai-literacy/tools/tests -q` (sem regressão).
- Nenhum arquivo de contrato, catálogo, binding ou learner state foi modificado.
- **CI independente (revisão 8180d1a8, 2026-09-30):** job 109882768049 testou o merge commit
  `5c3a971` do head `d5910962` sobre main `1975e2c7` — **847 passed / 2 skipped**, zero falha
  no pacote completo do repo. Countersign job 109882767323 falhou por ausência do trailer de
  proveniência do produtor (AID-2493) na conversa do PR — corrigido adicionando o trailer
  canônico ao body do PR (identidade real do agente produtor; sem trailer fabricado); novo
  head informado para re-checagem.
- **Mutações executadas (revisão final 499ec177, contraexemplos estáticos eliminados):**
  (1) trocar o alias do branch `01_rate_limiter` em `curriculumPack.ts` →
  `test_pixel_pack_emits_the_complete_unit_id_map` **falha**; (2) `unitId: U2-key-value-store` →
  `U-02_key_value_store` em `mission-bindings.yaml` → `test_voxel_bindings_pin_all_seven_mission_unit_pairs`
  **falha**. Ambas as mutações aplicadas e revertidas localmente na verificação (nunca commitadas;
  worktree limpa em `engines/`).

## 7. Candidatos r2 (consolidação AID-3462 — sem autorização de implementar)

AID-3462 foi cancelada como duplicata recuperável desta frente (histórico preservado). Os
requisitos CCE r2 (PR #610 @ `f31f21e3`, §12) chegam aqui como **candidatos dependentes** de
revisão Content Designer + contratos compatíveis + QA — nenhuma implementação automática:

- fontes Dev opcionais: workflows (02–11), curso-simples (M1–M9), SDLCQuest, projetos 01–18;
- 10 jogos Voxel sem binding (além dos 7 vinculados em §3.3);
- competency primária/apoio e estados bound/visible/guided/readiness (§2.6);
- fixtures/SHA dos quizzes 01/02 antes de qualquer reuso.

Delegações seguem pelo pai (AID-3453); sem merge/deploy; sem mudança de progresso do learner.
