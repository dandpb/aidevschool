# Contrato de leitura de competências no currículo compartilhado (read model opcional)

| | |
| --- | --- |
| **Issue** | AID-3514 (filha de AID-3453 «Unificar escola e currículo de IA») |
| **Autor** | Curriculum Platform Engineer |
| **Base inspecionada** | `f36f8b9455ccf5acecf463a89190773280d6f15c` (head do draft PR #617, branch `aid3505/ratified-competency-metadata`), empilhado sobre `d853e4f77ce2a32444c730df4798c5779b03ff3f` (contrato aprovado, PR #612). `main` ainda NÃO contém nenhuma dessas fatias. |
| **Revisor alvo** | Learner App Engineer (etapa review da issue): valida o seam real (`generatedContentRepository`) e os estados de erro/ausência. |
| **Status** | Proposta (spec documental + testes de seam executáveis). Nenhum wiring de runtime nesta fatia. |

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
| Entrada estática | `engines/school-entry/server/catalog.mjs:100-124` | Lê contagens/jornada via comentário de contrato; nunca lê competência nem progresso. |

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
a chave simplesmente não existe. `getCompetency("lXX") → undefined`.

### 5.2 Catálogo (`modules[].lessons[]`)

Hoje: 8 chaves exatas por entrada (`id`, `moduleId`, `title`,
`estimatedMinutes`, `prerequisites`, `skillIds`, `status`, `hasContent`) —
pinned por teste. Proposto: 9ª chave opcional `competency?` nas entradas
`hasContent` mapeadas.

## 6. Diff proposto por arquivo (a implementar nas Fases 1–2; NÃO nesta fatia)

### 6.1 `curriculum/ai-literacy/tools/compiler.py` (owner: CPE)

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

### 6.2 `curriculum/ai-literacy/tools/validate.py` (owner: CPE)

**Antigo** (:22): `parser.add_argument("--compile", ...)` — sem opção.

**Novo**: `parser.add_argument("--with-competency", action="store_true",
help="propaga competency opcional para o read model (AID-3514; default: não propaga)")`
+ passar `include_competency=args.with_competency` em :45.

### 6.3 `engines/literacyDojo/src/application/ports.ts` (owner: Learner App Engineer)

**Antigo** (:21-27): interface com 5 métodos (§3).

**Novo**: acrescenta `getCompetency(lessonId: string): LessonCompetency | undefined;`
com import do tipo em `../data/generated/lessons`.

### 6.4 `engines/literacyDojo/src/adapters/generatedContentRepository.ts` (owner: LAE)

**Novo** (implementação inteira do método):

```ts
export function getCompetency(lessonId: string): LessonCompetency | undefined {
  return lessons.find((lesson) => lesson.id === lessonId)?.competency;
}
```

`undefined` para: id inexistente, lição sem o campo. Sem throw, sem fallback.

### 6.5 `docs/design/ai-literacy/content-contract.md` (owner: LAE; fora do meu write)

Documentar o novo export/flag na seção de exports (:122+) e o estado ausente.

### 6.6 Testes (junto com cada fase, mesma fatia)

- Fase 1 (compiler): atualizar `test_competency_field_contract.py::test_compiler_output_is_byte_identical_with_and_without_field`
  para fixar o DEFAULT (sem flag → idêntico) e adicionar o caso com flag
  (campo presente, posição do YAML preservada, catálogo com join).
  `test_ratified_competency_metadata.py` (inércia do corpus real) idem.
- Fase 2 (engine): teste de porta/adapter — lição mapeada → objeto exato;
  lição sem campo → `undefined`; id inexistente → `undefined`; prova de que
  progresso/evidência/analytics não mudam (snapshot de `LearnerProgress`
  antes/depois de ler competências).
- Este PR já entrega: `tools/tests/test_competency_read_seam.py` (§8).

## 7. Plano de ativação gradual (default ausente)

| Fase | Conteúdo | Owner | Gate |
| --- | --- | --- | --- |
| **0 (este PR)** | Spec canônica + testes de seam (fatos atuais: ausência, 8 chaves do catálogo, corpus do verificador limpo) | CPE | Review LAE nesta issue |
| **1** | Compilador emite `competency?` **somente com `--with-competency`** (default continua byte-idêntico); testes de inércia atualizados na mesma fatia | CPE | PR pequeno; QA confere default e opt-in |
| **2** | `gen:content` do literacyDojo adota a flag (`package.json:17`); porta + adapter `getCompetency`; testes de porta | LAE | PR engine; nada muda para o aprendiz |
| **3** (fora daqui) | Consumo de UI/roteiro; export de glossário; derivações de aquisição | UX/CD/produto | fatias próprias; `mastered` segue reservado |

Ativar a Fase 1 **não muda nada que o aprendiz percebe**: nenhuma superfície
lê competência hoje; o campo é opcional e invisível até a Fase 3.

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
   outras superfícies diverge — varredura na Fase 2 é pré-requisito do PR LAE
   (hoje não conheço outro consumidor de `lessons.ts` além do adapter;
   confirmação faz parte do review do LAE).
3. `ContentRepository` é interface única com um implementador; adicionar método
   obrigatório é breaking para implementadores futuros — aceito por ser
   aditivo no único adapter existente (registrar decisão no PR da Fase 2).
4. OS prototype (`mission-bindings.yaml`) referencia lições por id — não lê
   `LessonDefinition` inteira; sem impacto esperado, mas a verificação é do
   LAE (owner do engine), não minha.
5. `school-entry` não lê competência (comentário de contrato em
   `catalog.mjs:100-124`) — sem impacto.

## 10. Menor implementação pronta, responsável e pré-requisitos reais

- **Menor implementação**: Fase 1 (compiler flag `--with-competency` + join do
  catálogo + testes, ~2 arquivos editados + 2 suites ajustadas) e Fase 2
  (porta/adapter `getCompetency` + flag no `gen:content` + testes de porta,
  ~3 arquivos). Sem UI, sem glossário, sem derivação de aquisição.
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
