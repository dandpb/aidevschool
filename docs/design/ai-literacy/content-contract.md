# Contrato de conteúdo — trilha `ai-literacy`

O conteúdo é **dado versionado, não JSX escrito à mão**. A fonte canônica vive
em `curriculum/ai-literacy/` (YAML + JSON Schema) e a UI consome somente o
read model tipado gerado pelo compilador. Este documento é a referência dos
schemas em `curriculum/ai-literacy/schemas/`.

## LessonDefinition

Forma canônica de uma lição (schema: `schemas/lesson.schema.json`; tipo gerado
no read model):

```ts
type LessonDefinition = {
  id: string                    // estável: l01..l14; nunca deriva do título
  version: number               // inteiro >= 1; toda alteração de conteúdo incrementa
  moduleId: string              // mod-01..mod-04
  title: string
  objective: string             // objetivo observável
  estimatedMinutes: 3 | 4 | 5
  skillIds: string[]            // skills do catalog.yaml
  prerequisites: string[]       // ids de lições; grafo sem ciclos
  activities: ActivityDefinition[]
  rubric: LessonRubric          // ver schemas/rubric.schema.json
  evidence: LessonEvidencePolicy
  review: { intervalsDays: number[] }
  completion: { minimumScore: number; requiredActivityIds: string[] }
}
```

`estimatedMinutes` fora de `{3, 4, 5}`, `version` inválida, lição sem rubrica,
atividade sem estratégia de avaliação ou sem feedback por falha, e
`requiredActivityIds` que não existem **falham o build**.

## Tipos de atividade

`ActivityDefinition` é uma união discriminada por `type` de 7 variantes. Toda
atividade carrega: `id` estável (`lNN-aM`), `skillId`, `instruction` em
linguagem simples, `data` (tudo que a renderização precisa), `evaluation`
determinística, `feedback` com `onFailure` obrigatório, `storage.policy` e,
opcionalmente, `hints` — dicas progressivas pré-escritas (1–3 itens, em ordem
crescente de ajuda) consumidas pelo `FeedbackProvider` determinístico do
engine, sem chamada externa.

| `type` | O que a pessoa faz | `data` obrigatório | `evaluation` obrigatório |
| --- | --- | --- | --- |
| `choice` | escolhe entre opções | `options[]` (≥2; `prompt?`, `multiSelect?`) | `correctOptionIds[]` |
| `sort` | ordena partes | `items[]` (≥2) | `expectedOrder[]` (permutação dos ids) |
| `missing_context` | identifica o contexto ausente de um pedido | `prompt`, `contextOptions[]` | `requiredContextIds[]` (`optionalContextIds?`) |
| `safety_classification` | classifica itens como seguros/sensíveis | `labels {safe,sensitive}`, `items[]` (≥3) | `classification {itemId: "safe"\|"sensitive"}` (todos os itens) |
| `prompt_builder` | monta um pedido por campos estruturados | `scenario`, `genericPrompt`, `fields[]` (≥2: `id`,`label`,`hint`) | `fields {fieldId: {minLength? \| mustIncludeAny?}}` |
| `output_comparison` | compara saídas da IA | `scenario`, `outputs[]` (≥2), `criteria[]` (≥2) | `betterOutputId`, `requiredCriterionIds[]` |
| `rubric_review` | revisa uma resposta usando critérios | `responseText`, `criteria[]` (≥2) | `expectedVerdicts {criterionId: "met"\|"partial"\|"not_met"}` |

Regras de avaliação:

- `evaluation.strategy` é sempre `"deterministic"` no MVP. Feedback generativo
  pode existir no futuro, mas nunca substitui os checks.
- Os checks devem referenciar apenas ids declarados em `data` (o validador
  verifica: opções, itens, contextos, campos, saídas e critérios).
- `storage.policy`: `structured_only` (somente campos/ids estruturados),
  `digest_only` (somente digest/categorias) ou `none`. Respostas abertas não
  são persistidas por padrão.

## Rubrica (LessonRubric)

```ts
type LessonRubric = {
  id: string      // lNN-rubric
  criteria: { id: string; text: string; weight?: number }[]
}
```

Rubricas ficam próximas do conteúdo (mesmo arquivo da lição), têm testes de
contrato e expressam critérios verificáveis separadamente — são a base do
feedback "ainda falta X" e, no futuro, da verificação independente.

## Catálogo

`catalog.yaml` é o índice canônico: trilha, skills (`entender`, `pedir`,
`avaliar`, `proteger`, `aplicar`), módulos (`mod-01`…`mod-04`) e as 14 lições
com `status`:

- `ready` — lição completa; exige arquivo próprio válido em `modules/`.
- `planned` — lição anunciada; **não** exige arquivo e não entra no read model.

Catálogo e arquivo devem concordar em `moduleId`, `title`, `estimatedMinutes`,
`prerequisites` e `skillIds`; divergência falha o build.

## Pipeline de compilação

```text
curriculum/ai-literacy/*
  → validação de schema + validação semântica (tools/validate.py)
  → <outdir>/lessons.ts  (read model tipado)
  → app consome somente o read model tipado
```

Exports do read model gerado (`lessons.ts`):

- `lessons: LessonDefinition[]` — somente lições `ready` validadas;
- `contentVersion: string` — versão do catálogo;
- `track: Track` — metadados da trilha (título, público, promessa, idioma);
- `modules: ModuleDefinition[]` — módulos ordenados, cada um com suas
  `CatalogLessonEntry[]` (inclui lições `planned` com `hasContent: false`,
  para o mapa da trilha exibir "em breve" sem duplicar conteúdo na UI);
- `skills: SkillDefinition[]` — skills com título e descrição em pt-BR.

Comandos (a partir da raiz do repositório):

```bash
python3 curriculum/ai-literacy/tools/validate.py                 # valida
python3 curriculum/ai-literacy/tools/validate.py --compile <outdir>  # valida + gera lessons.ts
```

## Regras

1. Arquivos gerados carregam cabeçalho `DO NOT EDIT BY HAND` e nunca são
   editados manualmente.
2. IDs são estáveis e nunca dependem do título exibido; renomear título não
   muda id.
3. Toda alteração de conteúdo incrementa `version` da lição.
4. **Migração de progresso:** o estado local registra `contentVersion`
   (do catálogo) e a `version` de cada lição concluída. Ao subir a versão de
   uma lição, progresso anterior permanece válido para progresso de
   experiência (`completed`), mas a próxima revisão espaçada usa a versão nova;
   mudanças de `id` são proibidas — id novo = lição nova, sem migração
   automática. O app deve implementar migração forward-only de
   `LearnerProgress.schemaVersion` antes de ler estado antigo.
5. Lições `planned` não quebram o build por não terem arquivo; lição com
   arquivo precisa estar `ready`.
6. **Conteúdo inválido falha o build** — o validador sai com código não-zero e
   mensagens claras; não existe fallback silencioso nem conteúdo parcial no
   read model.
