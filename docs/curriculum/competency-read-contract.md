# Contrato de leitura de competências no currículo compartilhado (read model opcional)

| | |
| --- | --- |
| **Issue** | AID-3514 (filha de AID-3453 «Unificar escola e currículo de IA») |
| **Autor** | Curriculum Platform Engineer |
| **Base inspecionada** | `f36f8b9455ccf5acecf463a89190773280d6f15c` (head do draft PR #617, branch `aid3505/ratified-competency-metadata`), empilhado sobre `d853e4f77ce2a32444c730df4798c5779b03ff3f` (contrato aprovado, PR #612). `main` ainda NÃO contém nenhuma dessas fatias. |
| **Revisor alvo** | Learner App Engineer (etapa review da issue): valida o seam real (`generatedContentRepository`) e os estados de erro/ausência. |
| **Status** | Proposta (spec documental + testes de seam executáveis). Nenhum wiring de runtime nesta fatia. |
| **Revisão** | r1 (2026-09-30): 3 correções doc-only do review LAE (comentário `51284f0a`, head revisto `3cd9fef2`): (1) §3/§9.5 — citação inexistente `catalog.mjs:100-124` corrigida (arquivo = 100 linhas, lista estática) e entrada estática `escola/` declarada (PR #616, fora da base); (2) invariante «propagação não bumpa `contentVersion`/`version`» adicionada (§7 gates das Fases 1–2 + §9.6); (3) §9.2 — inventário de consumidores de `lessons` confirmado pelo LAE substitui o «não conheço outro consumidor». §4/§5/§6/§8 intocados, conforme combinado. |
| | **r2 (2026-10-02): reconciliação com a decisão S6** (comentário `618a37b1`, escopo delegado pelo Dani): **mecanismo selecionado = projeção em arquivo separado `competency-map.ts`** (PR #659, review LAE no head `3f636429`/comentário `5956348434`). A proposta in-band de §6.1–6.2 (`--with-competency`) e o PR #634 que a implementava ficam **superseded** — branches, commits, provas e histórico preservados; nenhum dos dois mecanismos é integrado ao outro e nenhum teste/proteção existente foi alterado para a decisão caber. §6/§7 reescritos para o mecanismo selecionado; contrato da Fase 2 explicitado (§7.1). §3/§4/§5/§8/§9/§10 e os testes de seam permanecem válidos (não redundantes). |
| | **r2.1 (2026-10-02): condição única do review LAE r2 resolvida** (GO CONDICIONADO, review `5394585605` @ `86455d33`): §6.2–6.5 re-derivados para o mecanismo selecionado (porta `getCompetency` colapsada + `hasCompetencyEntry` §7.1(2)/(3); tipos/import de `competency-map.ts`; guard de `mapVersion` fail-closed §7.1(1); plano de testes re-ancorado no PR #659 e na Fase 2). Dupla numeração histórica resolvida (ex-«§6.2 validate.py» dentro do registro histórico renomeado §6.2.h). §5.1/§5.2 ganharam marcadores de registro superseded (samples in-band preservados como histórico, sem reescrita). Doc-only; nenhum teste/proteção alterado. |

## 1. Proveniência

- **Atribuições ratificadas**: matriz `matriz-competencias-32` **r3**, revisão
  `1fee56a2-a980-4199-97ad-50cfe066c001` (AID-3497) — 32 linhas `[D]`, 0 `[P]`.
  Pareceres: Content Designer `ed2ea2f5-a913-42bf-af3c-1ed0ea50832c` e CPE
  `f1cf2acd-3ebe-4a18-a555-861c17c03cf2`.
- **Incorporação inerte**: PR #617 @ `f36f8b94` (AID-3505) — bloco opcional
  `competency: {primary, supporting[]}` nos 32 YAML de lição `l01`–`l32`,
  compilador **não propaga** (read model byte-idêntico).
- **Contrato de schema**: PR #612 @ `d853e4f7` (AID-3457) — `primary` obrigatória
  com enum do glossário atual (F1–F4, D1–D7), `supporting[]` uniqueItems,
  ausência = «não mapeada» (default registrado).
- **Glossário/objetivos-fonte**: `579ce995baa7aa28084127b15a9886103ad68a44`
  (`intent/AID-3453-unify-school/spec.md:7–21`).
- **Decisão de mecanismo (S6, r2)**: `competency-map.ts` separado — PR #659
  (`competency_projection.py --compile-competency`; `lessons.ts` byte-idêntico
  **incondicionalmente**; opt-in no import do consumidor). Alternativa in-band
  (PR #634, `--with-competency`) **superseded** — preservada como histórico.

## 2. Escopo e não-escopo

**Especifica** o contrato mínimo para um consumidor **existente** ler competências
do currículo compartilhado, **sem alterar progresso** e **sem prometer sincronia
entre engines**.

Fora de escopo (explícito): reimplementar schema/compilador; reatribuir as 32
linhas; wiring de runtime; seed/migração de dados; exportar glossário
(títulos/descrições de competência); qualquer derivação de aquisição do aprendiz
(`mastered`, veredito, "competência adquirida"); UI (depende de UX Designer);
integração 621 ou posterior por suposição.

## 3. O seam hoje (inspeção real na base f36f8b94)

| Ponto | Arquivo:linha | Fato |
| --- | --- | --- |
| Porta de conteúdo | `engines/literacyDojo/src/application/ports.ts:21-27` | `ContentRepository` = 5 métodos de leitura pura (`getTrack`, `listModules`, `getLesson`, `getSkillTitle`, `getContentVersion`). Sem escrita. |
| Adapter gerado | `engines/literacyDojo/src/adapters/generatedContentRepository.ts:24-46` | Lê SOMENTE `src/data/generated/lessons.ts` (DO NOT EDIT). `listModules` filtra `PUBLIC_JOURNEY = "ia_pratica"` e ordena por `order` (:30-34); `getLesson` por id (:36-38). |
| Read model | `engines/literacyDojo/src/data/generated/lessons.ts` | Gerado por `npm run gen:content` → `validate.py --compile` (`package.json:17`, rodado em `pretest`/`prebuild`/`pretest:e2e`). `LessonDefinition` hoje **não tem** `competency`. |
| Compilador | `curriculum/ai-literacy/tools/compiler.py:211-220` | Strip explícito: `{key: value for ... if key != "competency"}` — a inércia é código, não acidente. |
| Estados de aquisição | `engines/literacyDojo/src/domain/progress.ts:9,13,18-19,341-360` | UI registra no máximo `completed` (`LessonStatus`); tentativas aprovadas incrementam `passes`; `mastered` reservado ao verificador independente. |
| Evidência | `compiler.py:122` (tipo gerado) | `completionClaim: "lesson_completed" \| "application_reported"` — relato de aplicação ≠ pass. |
| Corpus do verificador | `curriculum/ai-literacy/tools/compiler.py:247-267` | `literacy-corpus.mjs` = projeção mínima (version, skillIds, activities). «Do not add producer-facing fields here». |
| Entrada estática | `engines/school-entry/server/catalog.mjs` (exatas 100 linhas na base) | Lista estática de engines (`id`/`name`/`description`/`reason`/`source`); não lê contagens, jornada, competência nem progresso. *(r1: a citação anterior «:100-124» não existia — o arquivo termina na linha 100.)* |

**Declaração fora da base inspecionada (r1)**: a outra entrada estática que
existe hoje é `engines/literacyDojo/public/escola/entry-contract.js`
(PR #616, mergeado em `main` em 2026-09-30) — **não é ancestral da base
inspecionada** `f36f8b94`, portanto não consta da tabela acima: dados
estáticos portados verbatim com hashes pinados por
`tests/static-entry/escola-honesty.test.ts`. A conclusão substantiva vale nos
dois lugares — nenhum dos dois lê competência nem progresso (verificado por
grep pelo LAE na r1 do review, em ambos os pontos).

**Conclusão da inspeção**: o único caminho legítimo de leitura é
YAML canônico → `validate.py --compile` → `lessons.ts` → porta/adapter. Não
existe hoje nenhum consumidor de competência — o campo nasce **opcional** com
**default ausente** e nenhum leitor atual muda de comportamento.

## 4. O contrato proposto (mínimo)

### 4.1 Formas (tipos gerados no `lessons.ts`)

```ts
export type CompetencyId =
  | "F1" | "F2" | "F3" | "F4"          // cotidiano (glossário atual)
  | "D1" | "D2" | "D3" | "D4" | "D5" | "D6" | "D7"  // dev

export type LessonCompetency = {
  primary: CompetencyId      // exatamente UMA (espelha o schema do PR #612)
  supporting: CompetencyId[] // zero ou mais, sem duplicatas; ORDEM documental
}                            // ratificada é significativa (ex.: l13 [F4, F3])
```

- `LessonDefinition.competency?: LessonCompetency` — **opcional**. Ausência =
  «não mapeada» (mesmo default e mesma palavra do schema; lições novas/planned
  começam ausentes por construction).
- `CatalogLessonEntry.competency?: LessonCompetency` — mesma forma, para listas
  que não carregam a lição inteira; presente **somente** quando
  `hasContent && mapeada` (join feito pelo compilador a partir do YAML da lição
  ready; entradas `planned` ficam sempre sem o campo).
- Posição no objeto gerado: a mesma do YAML canônico (entre `prerequisites` e
  `activities`, onde o bloco foi incorporado no PR #617) — o compilador só
  deixa de filtrar a chave, sem reordenar; determinística por construction.

### 4.2 Porta do consumidor

```ts
// ports.ts — aditivo, leitura pura
getCompetency(lessonId: string): LessonCompetency | undefined;
```

- `undefined` é **estado legítimo**, não erro: cobre lição inexistente, planned
  e «não mapeada». O adapter não lança, não loga, não faz fallback inventado
  (nenhum `primary` default).
- Sem mutação: `getCompetency` não escreve progresso, evidência ou analytics.
  O vocabulário de analytics (ADR-0009) **não ganha** props de competência
  nesta fatia.

### 4.3 IDs, aliases e não-aliasing (explícito)

- Vocabulários **distintos e não-aliásados**: `skillIds` (`entender`, `pedir`,
  …) é o legado por lição e permanece intocado; `CompetencyId` (F\*/D\*) é o
  framework unificado. `competency` **não substitui, não renomeia e não deriva**
  `skillIds` nesta fatia; `getSkillTitle` segue como está.
- `primary` é a chave canônica. **Proibido** introduzir aliases paralelos
  (`competencyId`, `mainSkillId`, `primarySkill`…). Consumidores que só querem
  a primária leem `competency?.primary`.
- `supporting` preserva a ordem ratificada; consumidores não reordenam nem
  deduplicam (o validador já rejeita duplicatas).
- Títulos/descrições de competência **ficam de fora**: o read model carrega
  apenas IDs; exportar glossário é fatia futura (evita duplicar fonte sem
  ratificação de formato machine-readable).

### 4.4 Distinção de estados de aquisição (invasável)

`competency` é metadado de **conteúdo** — diz *o que a lição ensina*, nada diz
sobre o aprendiz. O contrato proíbe concluir aquisição a partir dele:

| Estado | Dono semântico | Onde vive | Este contrato |
| --- | --- | --- | --- |
| `completed` | UI local (máximo permitido) | `progress.ts` `LessonStatus` | intocado |
| `pass` | tentativa avaliada aprovada | `progress.ts` `passes` | intocado |
| `application_reported` (simulação/relato) | claim de evidência | `completionClaim` | intocado |
| `mastered` | **reservado** ao verificador independente | proibido no app | **intocado** — nenhuma leitura de competência promove, sugere ou simula `mastered` |

Nenhuma sincronia entre engines é prometida: cada engine regenera o read model
localmente (`gen:content`) e lê a própria cópia; não há runtime compartilhado,
evento ou fila nesta fatia.

### 4.5 Preservação de ordem, pré-requisitos e visibilidade

`competency` **não participa** de nenhuma decisão de percurso: sort de módulos
(`order`), `prerequisites`, filtro `PUBLIC_JOURNEY`, `status`/`hasContent`,
`nextLessonIdFor`, onboarding/Mapa Inicial. Visibilidade **nunca** é gated por
competência (lição mapeada ≠ lição visível; lição não mapeada ≠ oculta).

## 5. Exemplos antigo/novo

### 5.1 Read model (`lessons.ts`) — l01

> r2.1 (registro): o sample «Após a Fase 1» abaixo é da proposta **in-band
> original (SUPERSEDED pela decisão S6)** — preservado como histórico. Na Fase 1
> selecionada (§6.1/PR #659), `lessons.ts` permanece **byte-idêntico para
> sempre**; a leitura vive no mapa separado `competency-map.ts` (amostras §6.2–6.3).

Hoje (base f36f8b94, com ou sem o YAML mapeado — saída idêntica):

```ts
{
  "id": "l01",
  "version": 1,
  "moduleId": "mod-01",
  "title": "Sua primeira conversa com uma IA",
  "skillIds": ["entender"],
  "prerequisites": [],
  "activities": [ /* … */ ],
  "rubric": { /* … */ },
  "evidence": { /* … */ },
  "review": { "intervalsDays": [1, 7, 21] },
  "completion": { "minimumScore": 0.75, "requiredActivityIds": ["l01-a1"] }
}
```

Após a Fase 1 ativada (§7) — **mesma lição, campo opcional na posição do YAML**:

```ts
{
  "id": "l01",
  "version": 1,
  "moduleId": "mod-01",
  "title": "Sua primeira conversa com uma IA",
  "skillIds": ["entender"],
  "prerequisites": [],
  "competency": { "primary": "F1", "supporting": [] },
  "activities": [ /* … */ ],
  "rubric": { /* … */ },
  "evidence": { /* … */ },
  "review": { "intervalsDays": [1, 7, 21] },
  "completion": { "minimumScore": 0.75, "requiredActivityIds": ["l01-a1"] }
}
```

Lição **não mapeada** (ou planned no `CatalogLessonEntry`): idêntica ao «hoje» —
a chave simplesmente não existe. `getCompetency("lXX") → null` (colapsada,
§7.1(2); a formulação `undefined` do r0 é histórica).

### 5.2 Catálogo (`modules[].lessons[]`)

Hoje: 8 chaves exatas por entrada (`id`, `moduleId`, `title`,
`estimatedMinutes`, `prerequisites`, `skillIds`, `status`, `hasContent`) —
pinned por teste. Proposto (in-band original, **SUPERSEDED** — registro
histórico): 9ª chave opcional `competency?` nas entradas `hasContent`
mapeadas; no mecanismo selecionado (§6.1) o catálogo permanece **nas 8
chaves para sempre** e a leitura vive no mapa separado.

## 6. Mecanismo selecionado (r2 — decisão S6) e seam do consumidor

> **r2:** a proposta original de §6.1–6.2 (9ª chave in-band via `--with-competency`,
> implementada no PR #634) está **superseded** pela decisão S6 — mantida abaixo apenas
> como registro histórico; **não integrar**. O mecanismo selecionado é o do PR #659.
> **r2.1:** §6.2–6.5 re-derivados para o mecanismo selecionado (condição única do
> review LAE `5394585605`); amostras in-band originais preservadas em §6.1.h/§6.2.h.

### 6.1 (selecionado) Projeção em arquivo separado — owner: CPE (implementado no PR #659)

- `curriculum/ai-literacy/tools/competency_projection.py`: `--compile-competency OUTDIR`
  emite **`competency-map.ts` separado**; `lessons.ts` permanece **byte-idêntico
  incondicionalmente** (mesmo com a projeção ligada — zero-regressão não depende de flag).
- Entrada por lição: `lessonId`, `moduleId`, `journey`, `order`, `prerequisites`,
  `mapping` — `mapping: null` = «não mapeada» (default real). Glossário canônico
  F1–F4/D1–D7 com aliases estáveis e **não-aliasing** vs `skillIds`.
- `validate.py`: flag opt-in `--compile-competency OUTDIR`; fail closed (validação
  vermelha ⇒ nenhum arquivo escrito).
- ~~6.1 original (in-band, superseded)~~ e ~~6.2 original (flag `--with-competency`,
  superseded — renomeado §6.2.h)~~ — ver PR #634 (histórico preservado).

### 6.1.h Registro histórico — proposta in-band original (SUPERSEDED pela decisão S6; não integrar)

*Conteúdo da r0/r1 preservado abaixo como registro; o PR #634 o implementou e está
superseded. Nada deste bloco deve ser aplicado.*

<details>
<summary>Diff in-band original (compiler <code>--with-competency</code> + validate.py) — clique para expandir</summary>

**Antigo** (types, :109-139 — trecho):

```ts
export type LessonDefinition = {
  id: string
  version: number
  moduleId: string
  title: string
  objective: string
  estimatedMinutes: 3 | 4 | 5
  skillIds: SkillId[]
  prerequisites: string[]
  ...
```

**Novo**:

```ts
export type CompetencyId =
  "F1" | "F2" | "F3" | "F4" | "D1" | "D2" | "D3" | "D4" | "D5" | "D6" | "D7"

export type LessonCompetency = {
  primary: CompetencyId
  supporting: CompetencyId[]
}

export type LessonDefinition = {
  id: string
  version: number
  moduleId: string
  title: string
  objective: string
  estimatedMinutes: 3 | 4 | 5
  skillIds: SkillId[]
  /** Opcional — ausência = "não mapeada" (default; AID-3514). */
  competency?: LessonCompetency
  prerequisites: string[]
  ...
```

(o mesmo campo opcional entra em `CatalogLessonEntry`, após `skillIds`.)

**Antigo** (strip incondicional, :211-220):

```python
lessons_payload = [
    {key: value for key, value in lesson.items() if key != "competency"}
    for lesson in ready_lessons_all
]
```

**Novo** (propagação com default OFF — byte-idêntica continua sendo o default):

```python
def _lesson_payload(lesson, include_competency):
    keys = [k for k in lesson.keys() if include_competency or k != "competency"]
    payload = {k: lesson[k] for k in keys}
    return payload

def compile_track(track_dir, outdir, validated=None, include_competency=False):
    ...
    lessons_payload = [_lesson_payload(l, include_competency) for l in ready_lessons_all]
```

E `_catalog_entries` ganha o join (entrada `competency` apenas quando
`hasContent` e mapeada), preservando as 8 chaves quando ausente.

### 6.2.h (registro histórico — in-band, SUPERSEDED) `curriculum/ai-literacy/tools/validate.py` (owner: CPE)

**Antigo** (:22): `parser.add_argument("--compile", ...)` — sem opção.

**Novo**: `parser.add_argument("--with-competency", action="store_true",
help="propaga competency opcional para o read model (AID-3514; default: não propaga)")`
+ passar `include_competency=args.with_competency` em :45.

</details>

### 6.2 `engines/literacyDojo/src/application/ports.ts` (owner: Learner App Engineer)

> r2.1 (condição do review LAE `5394585605`): amostras re-derivadas para o
> mecanismo selecionado (§6.1 — mapa separado do PR #659). A formulação in-band
> original (import de `../data/generated/lessons`) está preservada em §6.1.h.

**Antigo** (:21-27): interface com 5 métodos (§3).

**Novo** (aditivo; tipos do **mapa separado** — `../data/generated/competency-map`;
`lessons.ts` e seus tipos permanecem intocados):

```ts
import type { CompetencyMapping } from "../data/generated/competency-map";

export interface ContentRepository {
  // …5 métodos atuais intocados…
  /** Colapsada (§7.1(2)): null ≡ «não mapeada» — cobre `mapping: null` do mapa
   *  e o `undefined` legado (sem mapa importado / sem entrada). Estado legítimo,
   *  nunca erro; nunca infere `primary`; nunca lança. */
  getCompetency(lessonId: string): CompetencyMapping | null;
  /** §7.1(3): distingue «não mapeada» (entrada com mapping null) de
   *  fora-do-universo (planned/ausente do mapa) — para decisão de render na
   *  Fase 3 (dono UX). Não é gate de visibilidade (§4.5). */
  hasCompetencyEntry(lessonId: string): boolean;
}
```

### 6.3 `engines/literacyDojo/src/adapters/generatedContentRepository.ts` (owner: LAE)

> r2.1 (condição do review LAE `5394585605`): amostra re-derivada — a leitura
> vem do mapa separado; o sample in-band original (`lessons.find(…)?.competency`,
> 9ª chave inexistente no mecanismo selecionado) está em §6.1.h.

**Novo** (implementação inteira dos métodos; `lessons` intocado):

```ts
import {
  competencyLessons,
  competencyMapVersion,
} from "../data/generated/competency-map";

const SUPPORTED_MAP_VERSION = 1;
if (competencyMapVersion !== SUPPORTED_MAP_VERSION) {
  // §7.1(1): fail closed no load — nunca «melhor esforço», nunca fallback
  // silencioso a undefined geral.
  throw new Error(
    `competency-map: mapVersion ${competencyMapVersion} não suportada ` +
      `(suportada: ${SUPPORTED_MAP_VERSION}); regenere o read model (gen:content).`
  );
}

export function getCompetency(lessonId: string): CompetencyMapping | null {
  const entry = competencyLessons.find((item) => item.lessonId === lessonId);
  return entry ? entry.mapping : null; // sem entrada colapsa em null (§7.1(2))
}

export function hasCompetencyEntry(lessonId: string): boolean {
  return competencyLessons.some((item) => item.lessonId === lessonId);
}
```

Lição mapeada → objeto exato `{ primary, supporting }` (nunca mutado nem
reordenado — a ordem ratificada é preservada); entrada com `mapping: null` →
`null`; **sem entrada** (planned / fora do universo da versão do mapa) → `null`
em `getCompetency` **e** `false` em `hasCompetencyEntry` — a distinção vive
exclusivamente na segunda porta (§7.1(3)). Sem throw no caminho de leitura,
sem fallback inventado, sem aliasing com `skillIds` (§4.3), sem mutação de
progresso/evidência/analytics (§4.2).

### 6.4 `docs/design/ai-literacy/content-contract.md` (owner: LAE; fora do meu write)

> r2.1 (condição do review LAE `5394585605`): alvo re-derivado para o mecanismo
> selecionado (mapa separado; a flag in-band `--with-competency` é histórico).

Documentar na seção de exports: o **artefato separado** `competency-map.ts`
(exports `competencyMapVersion`, `competencyMapContentVersion`,
`competencyGlossary`, `competencyLessons`, `carriesAttainment`,
`producerWritesMastered`; tipos `CompetencyId`, `CompetencyMapping`,
`CompetencyLessonEntry`, `CompetencyGlossaryEntry`), a flag opt-in
`--compile-competency OUTDIR` (default ausente; `lessons.ts` byte-idêntico
**incondicionalmente**) e os estados de erro/ausência do consumidor antigo (§9).

### 6.5 Testes (junto com cada fase, mesma fatia)

> r2.1 (condição do review LAE `5394585605`): plano re-ancorado no mecanismo
> selecionado — a âncora in-band original (caso «com flag» no
> `test_competency_field_contract.py`) é histórico (§6.1.h).

- **Fase 1 — entregue no PR #659**: `tools/tests/test_competency_read_model_contract.py`
  (10 testes, fixtures isoladas + corpus live): fidelidade verbatim 32/32 vs
  testemunha ratificada (`RATIFIED` de `test_ratified_competency_metadata.py`);
  byte-identidade de `lessons.ts` com/sem geração do mapa (default
  incondicional); `mapping: null` como default explícito; glossário
  completo/único espelhando o enum do `lesson.schema.json` (drift falha
  fechado); ordem documental + pré-requisitos verbatim + **duas jornadas**
  compiladas (filtro `PUBLIC_JOURNEY` no consumidor); constantes sem
  atainment (`carriesAttainment`/`producerWritesMastered`); fail closed em
  ID fora do glossário; determinismo; pin de `contentVersion` (invariante r1:
  **sem bump**). Mais os 4 seam tests deste PR (§8).
- Fase 2 (engine, PR próprio do LAE): porta/adapter — lição mapeada → objeto
  exato; `mapping: null` → `null`; id inexistente/planned → `null` em
  `getCompetency` **e** `false` em `hasCompetencyEntry`;
  `competencyMapVersion` desconhecida → load falha fechado (§7.1(1)); prova
  de que progresso/evidência/analytics não mudam (snapshot de `LearnerProgress`
  antes/depois de ler competências).
- Este PR já entrega: `tools/tests/test_competency_read_seam.py` (§8).

## 7. Plano de ativação gradual (default ausente)

| Fase | Conteúdo | Owner | Gate |
| --- | --- | --- | --- |
| **0 (este PR)** | Spec canônica + testes de seam (fatos atuais: ausência, 8 chaves do catálogo, corpus do verificador limpo) | CPE | Review LAE nesta issue |
| **1 (r2: selecionada)** | **Projeção em arquivo separado `competency-map.ts`** (`--compile-competency OUTDIR`; `lessons.ts` byte-idêntico **incondicionalmente**) — implementada no PR #659 | CPE | Review LAE no head `3f636429` (comentário `5956348434`); QA confere byte-identidade e fidelidade 32/32; **sem bump de `catalog.contentVersion` nem de `version` de lição** |
| **2** | Seam do consumidor: import opcional do mapa, porta + adapter `getCompetency`, filtro `PUBLIC_JOURNEY` aplicado **pelo consumidor** — conforme contrato explícito §7.1 | LAE | PR engine; nada muda para o aprendiz; **sem bump de `catalog.contentVersion` nem de `version` de lição** |
| **3** (fora daqui) | Consumo de UI/roteiro; export de glossário; derivações de aquisição | UX/CD/produto | fatias próprias; `mastered` segue reservado |

### 7.1 Contrato explícito da Fase 2 (r2 — decisão S6, comentário `618a37b1`)

1. **Versão de mapa desconhecida falha fechado:** o consumidor que importa
   `competency-map.ts` **rejeita** mapa com `mapVersion` não reconhecido (erro explícito
   no load) — nunca "melhor esforço", nunca fallback silencioso a `undefined` geral.
2. **Reconciliação `undefined` legado × `mapping: null`:** ambos significam
   «não mapeada» e são tratados **identicamente** pelo consumidor (estado legítimo,
   não erro). `undefined` = ausência legada (consumidor sem mapa importado / lição sem
   entrada na versão do mapa); `mapping: null` = entrada explícita de não-mapeada no
   mapa vigente. Nenhum código pode inferir competência a partir de nenhum dos dois.
3. **Distinção lição não-mapeada × ausente/planned (quando necessária):** o mapa contém
   entradas por lição `ready`; lição **presente no catálogo com status `planned`** ou
   **ausente do mapa** não é «não mapeada» — é fora do universo daquela versão do mapa.
   A porta distingue quando o consumidor precisa decidir (ex.: renderizar vs ocultar);
   a UI só consome a distinção na Fase 3, com dono UX.
4. **`PUBLIC_JOURNEY` aplicado pelo consumidor:** a projeção compila **as duas
   jornadas** (dev incluída — missões hospedadas do OS podem servir lições dev); o
   filtro de visibilidade pública **continua no adaptador/consumidor** (R6,
   `generatedContentRepository`) — o mapa **não** pré-filtra.

**Não-conclusões explícitas:** a escolha do mecanismo NÃO conclui automaticamente o
crosswalk/l16 (PRs #611/#613), E2E, UI/a11y ou a conformidade integral da AID-3457 —
cada um segue com dono e gates próprios. Sequência vigente: CPE reconcilia (esta r2) →
LAE revisa a mudança contratual → countersign independente no head final → FPE pela
porta única (`scripts/merge_pr.sh`) somente após os gates técnicos vigentes.

Ativar a Fase 1 **não muda nada que o aprendiz percebe**: nenhuma superfície
lê competência hoje; o campo é opcional e invisível até a Fase 3.

**Invariante de versão (Fases 1–2; adicionada na r1 do review LAE)**:
propagar `competency` **não bumpa `catalog.contentVersion` nem `version` de
lição**. O `contentVersion` é autorado em `catalog.yaml` (lido pelo compilador
em `compiler.py:238-239`) — bump é uma escolha editorial, não consequência
mecânica do diff. Divergência dispara `migrateProgress`
(`engines/literacyDojo/src/domain/migration.ts:98-108`): toda skill praticada
ganha `nextReviewAt: now` (tempestade de revisão devida para todo aprendiz
ativo) e rearma a máquina de retrofit (`retrofitNotice.ts:16-20`, mapas
keyed por `contentVersion`). Um bump acoplado à ativação das Fases 1–2
mudaria o que o aprendiz percebe — exatamente o que este gate promete que
não acontece.

## 8. Evidência executável deste PR (fixtures isoladas, sem suite cara)

`curriculum/ai-literacy/tools/tests/test_competency_read_seam.py` — 4 testes
novos sobre fixtures sintéticas em `tmp` (reusa `TrackFixtureMixin`; não toca o
corpus canônico; não duplica as suites de PR #612/PR #617):

1. tipos gerados hoje não declaram `competency` (mudança futura = deliberada);
2. payload sem a chave **mesmo com YAML mapeado** (strip é fato no head);
3. `CatalogLessonEntry` = exatamente as 8 chaves atuais, nesta ordem;
4. corpus do verificador (`literacy-corpus.mjs`) **nunca** contém
   `competency` — fronteira de confiança pinada para sempre.

Executado na base `f36f8b94` + este PR (ambiente: linux, Python 3.13.5):

```
$ python3 -m unittest discover -s tools -t .          # curriculum/ai-literacy/
Ran 67 tests in 9.890s
OK                                                      # 63 pré-existentes + 4 novos
```

## 9. Consumidor antigo — tratamento e incompatibilidades concretas

**Sem a flag (default, hoje e na Fase 1)**: read model byte-idêntico — provado
por `test_compiler_output_is_byte_identical_with_and_without_field` (PR #612),
pela suíte de inércia do PR #617 e pelo teste 2 acima. Consumidor antigo =
consumidor atual, zero mudança.

**Com a flag (Fase 2 em diante)**: campo opcional não quebra destructuring,
spread nem `getLesson`; `IndexedDB` progress repository persiste apenas
`LearnerProgress` (ids/status/passes — nunca `LessonDefinition`); analytics tem
vocabulário fechado; corpus do verificador intocado (teste 4).

**Incompatibilidades registradas (evidência negativa real):**

1. Os testes de inércia (PR #612 e PR #617) ** falham** se a propagação ligar
   sem flag — a atualização deles é parte obrigatória da Fase 1 (§6.6), não
   débito posterior.
2. `engines/literacyDojo/package.json:17` chama `--compile` sem flag; se a
   Fase 2 adotar a flag, qualquer snapshot byte-exato de `lessons.ts` em
   outras superfícies diverge. **Inventário de consumidores de valor de
   `data/generated/lessons` — além do adapter — confirmado pelo LAE na r1 do
   review (2026-09-30, comentário `51284f0a`); todos aditivamente seguros
   com chave opcional:**
   - `engines/literacyDojo/src/adapters/indexedDbProgressRepository.ts:2` —
     importa somente `contentVersion` (inofensivo se a invariante do item 6
     for respeitada);
   - `engines/codexdojo-os-prototype/tests/support/literacyMission.ts:2` —
     `lessons`, filtros por id (uso estrutural, seguro);
   - `engines/literacyDojo/playwright/support.ts:8,312-313` — `lessons` +
     import dinâmico de `modules` (seguro);
   - suites vitest: `tests/app/lessonStateContract.test.tsx:5`,
     `tests/adapters/indexedDbProgressRepository.test.ts:4`,
     `tests/app/services.analytics.test.ts:4`,
     `tests/screens/lessonExposureEmission.test.tsx:8`,
     `tests/components/OutputComparisonView.test.tsx:6` — usam
     `lessons`/`modules` como valores; nenhum faz igualdade de formato
     exato que uma chave nova quebraria;
   - scripts de observação arquivados em
     `docs/product-readiness/evidence/observations/**` importam `lessons.ts`,
     mas são evidência point-in-time, não superfícies vivas.

   A «varredura na Fase 2» do PR LAE fica assim declarada contra esta lista
   real (nenhum consumidor desconhecido pendente).
3. `ContentRepository` é interface única com um implementador; adicionar método
   obrigatório é breaking para implementadores futuros — aceito por ser
   aditivo no único adapter existente (registrar decisão no PR da Fase 2).
4. OS prototype (`mission-bindings.yaml`) referencia lições por id — não lê
   `LessonDefinition` inteira; sem impacto esperado, mas a verificação é do
   LAE (owner do engine), não minha.
5. `school-entry` não lê competência: `engines/school-entry/server/catalog.mjs`
   é lista estática de engines (100 linhas na base inspecionada; a citação
   anterior «:100-124», inexistente, foi corrigida na r1). A entrada estática
   `engines/literacyDojo/public/escola/` (PR #616, em `main`, fora da base
   inspecionada — declarada em §3) também não lê: dados estáticos verbatim com
   hashes pinados — sem impacto.
6. **Invariante de `contentVersion` (r1)**: a propagação de `competency`
   (Fases 1–2) **não bumpa `catalog.contentVersion` nem `version` de lição**
   — ver §7. Um bump acidental dispara `migrateProgress` (revisão devida em
   toda skill praticada, `migration.ts:98-108`) e rearma a máquina de retrofit
   (`retrofitNotice.ts:16-20`): risco real de quebra perceptível na superfície
   live. `contentVersion` é autorado, não derivado de hash — o bump não
   acontece por acidente.

## 10. Menor implementação pronta, responsável e pré-requisitos reais

- **Menor implementação (r2)**: Fase 1 = projeção separada `competency-map.ts`
  (PR #659 — implementada; o texto original desta linha, com a flag in-band
  `--with-competency`, está superseded) e Fase 2 (porta/adapter `getCompetency` +
  import opcional do mapa + testes de porta, ~3 arquivos). Sem UI, sem glossário,
  sem derivação de aquisição.
- **Responsáveis**: Fase 1 — Curriculum Platform Engineer (este agente);
  Fase 2 — Learner App Engineer (arquivos do engine); merge — exclusivamente
  FPE pela porta única (política R1).
- **Pré-requisitos reais**: (a) review/aprovação deste contrato pelo LAE nesta
  issue; (b) o stack PR #612 → PR #617 precisa ser mergeado (ou a Fase 1
  rebaseada) antes de qualquer ativação — `main` hoje não tem nem o schema;
  (c) decisão explícita de adotar a flag no `gen:content` (Fase 2, PR do LAE).
  Nenhum blocker de conteúdo: as 32 atribuições estão ratificadas e incorporadas.
- **Não crio follow-ups duplicados**: dedup declarada — AID-3505 (metadados) e
  AID-3497 (matriz) permanecem as fontes; integrações futuras (621+) só nascem
  de issue própria com este contrato como referência.
