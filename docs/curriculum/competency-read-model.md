# Read model opcional de competências — spec AID-3514 (fatia S5, fila AID-3525 r2)

**Produtor:** Curriculum Platform Engineer · **Status:** draft (PR próprio, revisão LAE no seam)
**Base:** schema/scaffolding AID-3457 (PR #612, aterrissado via #617/S3) + metadados ratificados AID-3505 (32 lições, matriz r3/AID-3497).
**Contrato mínimo:** um consumidor existente lê competências **sem alterar progresso** e **sem promessa de sincronia entre engines**.

---

## 1. O que é

Projeção pontual (`competency-map.ts`) do mapeamento lição → competência
(`primary` + `supporting[]`) declarado no YAML canônico
(`curriculum/ai-literacy/modules/**`). Gerada pelo validador canônico com a
flag **opt-in** `--compile-competency`; arquivo **separado** de `lessons.ts`.

```bash
python3 curriculum/ai-literacy/tools/validate.py --compile-competency <outdir>
# → <outdir>/competency-map.ts   (validação verde; fail closed caso contrário)
```

O que o artefato expõe:

| Export | Tipo | Conteúdo |
| --- | --- | --- |
| `competencyMapVersion` | `number` | Versão do formato do mapa (hoje `1`). |
| `competencyMapContentVersion` | `string` | `contentVersion` do catálogo pinado na geração. |
| `competencyGlossary` | `CompetencyGlossaryEntry[]` | Glossário canônico F1–F4/D1–D7 (id, domain, audience, title, aliases). |
| `competencyLessons` | `CompetencyLessonEntry[]` | Uma entrada por lição **ready** (32 hoje): `lessonId`, `moduleId`, `journey`, `order`, `prerequisites`, `mapping`. |
| `carriesAttainment` | `false as const` | Contrato: o artefato não carrega estados de aprendiz. |
| `producerWritesMastered` | `false as const` | Contrato: nada aqui promove aprendiz a `mastered`. |

`mapping` é `CompetencyMapping | null` — **`null` = "não mapeada"** (default
real, registrado no schema AID-3457): ausência de atribuição é estado
explícito e legítimo, não erro.

## 2. Como os primary/supporting ratificados (AID-3497 r3) se traduzem

A matriz r3 atribuiu a cada uma das 32 lições exatamente UMA primária +
zero ou mais apoio. A projeção copia esses valores **verbatim** do YAML
canônico (sem reatribuição; a testemunha `RATIFIED` de
`tools/tests/test_ratified_competency_metadata.py` é cross-checkada no teste
de contrato). Defaults compatíveis:

- lição sem `competency:` → `mapping: null` (aparece no mapa, ordenada, com
  pré-requisitos — o consumidor distingue "não mapeada" de "ausente/erro");
- `supporting` ausente/vazio → `supporting: []`;
- consumidores que só leem `primary` ignoram `supporting` sem quebrar
  (compat M:N→1:1 da spec R1).

## 3. Distinção completed / pass / simulação / mastered (R9)

O artefato **não carrega atainment**. Os quatro estados continuam
propriedade dos domínios de progresso de cada engine:

| Estado | Dono | Definição vigente |
| --- | --- | --- |
| `completed` | Produtor/UI (teto) | Lição concluída localmente (`engines/literacyDojo/src/domain/progress.ts`: "Máximo que a UI registra é `completed`"). |
| `pass` | Verificador independente | Recibo `PASS` por tentativa (`LiteracyVerificationReceipt.verdict`, `learner/gate/literacy_verifier.py`). |
| `application_reported` | Evidência (completionClaim) | Learner relatou aplicação real (`evidence.completionClaim: "application_reported"` no YAML canônico). |
| `simulação` | Harness/piloto | Recibos de harness e pilotos (R10: "recibos de harness = simulação") — não atestado de uso real. |
| `mastered` | Gate (reservado) | Nunca escrito por produtor (`producer_writes_mastered: false`, `max_producer_claim: "completed"`). |

Ler competências **nunca** altera progresso: a projeção é read-only por
construção (não toca `learner/`, IndexedDB, Prisma nem qualquer store).

## 4. Preservações (ordem, pré-requisitos, visibilidade, IDs)

- **Ordem documental**: módulos por `order` crescente; lições na ordem do
  catálogo dentro do módulo — idêntica ao read model `lessons.ts`.
- **Pré-requisitos**: copiados verbatim do arquivo canônico (cross-check
  catálogo↔arquivo já garantido pelo validador semântico).
- **Visibilidade**: o mapa compila **as duas jornadas** (`ia_pratica` e
  `dev`); o filtro de jornada **continua no adaptador consumidor**
  (decisão AID-3453 R6 — não movida para o compilador).
- **IDs**: nenhum ID de lição/módulo/competência muda; `aliases` existe no
  glossário para que renomeações futuras de título nunca mudem IDs.
- **Não-aliasing**: competências (F1–F4/D1–D7) e `skillIds`
  (entender/pedir/…) são vocabulários distintos e nunca são aliasados — o
  mapa não expõe `skillIds` e `lessons.ts` não expõe competências.

## 5. Consumidor antigo — estados de erro/ausência

| Situação | Comportamento esperado |
| --- | --- |
| Arquivo `competency-map.ts` ausente | Normal: geração é opt-in. Regenerar com o comando do §1 (determinístico; ver §7). |
| `competencyMapVersion` desconhecido | Fail closed: recusar o consumo (formato novo exige leitura do changelog deste doc), não inferir campos. |
| `competencyMapContentVersion` ≠ `contentVersion` de `lessons.ts` | Regenerar ambos no mesmo comando/commit; nunca misturar versões. |
| `mapping: null` | "Não mapeada" — render como tal; nunca tratar como erro nem inferir competência. |
| Lição `planned` | Fora do mapa (como fora de `lessons.ts`); entra quando ficar ready. |
| Consumidor que não importa o artefato | Zero acoplamento: `lessons.ts` permanece byte-idêntico com ou sem esta projeção (testemunhado nos dois sentidos: com/sem campo `competency` no YAML — AID-3457 — e com/sem geração do mapa — este PR). |

## 6. Sem sincronia entre engines

Cada engine compila a **sua cópia** do mapa e pinna o `contentVersion` no
build (padrão `gen:content` já usado para `lessons.ts`). Não há promessa de
consistência em tempo real nem de sync entre engines: duas cópias podem
diferir até que cada uma regenere. O consumidor que precisar de garantia
compara os `contentVersion` pinados (§5).

## 7. Verificação executável

- `python3 -m pytest curriculum/ai-literacy/tools/tests -q` → inclui
  `test_competency_read_model_contract.py` (10 testes: fidelidade à
  testemunha ratificada, byte-identidade de `lessons.ts`, default null,
  glossário completo/único vs enum do schema, ordem/pré-requisitos/jornada,
  constantes sem atainment, fail closed, determinismo, version pinning).
- CI já roda esta suíte em cada PR (`.github/workflows/ci.yml`, linha do
  pytest de `curriculum/ai-literacy/tools/tests`).
- `python3 curriculum/ai-literacy/tools/validate.py` → 32 ready validadas.
- Artefato de exemplo é TypeScript estrito válido (`tsc --strict` verde).

## 8. Ativação gradual (default ausente)

1. **Este PR (CPE)**: projeção + flag opt-in + testes de contrato + este doc.
   Nenhuma ligação ao runtime; nenhum write de dados; nenhum seed.
2. **Fatia do consumidor (LAE, seam real — Fase 2 do contrato §7.1)**: importar
   o mapa no `generatedContentRepository` conforme o seam **decidido na S6 e
   integrado** (`docs/curriculum/competency-read-contract.md` §6.2–6.5, main
   `5f71ac42`) — amostras no §9. Geração passa a fazer parte do `gen:content`
   do engine consumidor quando ele optar.
3. **Consumo de produto**: somente depois de revisão LAE do seam + estados
   de erro/ausência no app; merge só pela porta única com countersign.

## 9. Seam do consumidor — contrato DECIDIDO (S6) e integrado; implementação é a Fase 2 do LAE (fatia própria)

O seam abaixo **não está implementado neste PR** (nenhum código de engine
aqui — Fase 2 é fatia própria do LAE). A formulação é a **decidida na S6**
(comentário `618a37b1`) e **integrada ao main** via PR #623 (`5f71ac42`):
`docs/curriculum/competency-read-contract.md` §6.2–6.5 (r2.1) e §7.1.

```ts
// engines/literacyDojo/src/adapters/generatedContentRepository.ts (Fase 2 — LAE)
import {
  competencyLessons,
  competencyMapVersion,
} from "../data/generated/competency-map";

const SUPPORTED_MAP_VERSION = 1;
if (competencyMapVersion !== SUPPORTED_MAP_VERSION) {
  // §7.1(1): versão desconhecida → fail closed NO LOAD — nunca "melhor
  // esforço", nunca fallback silencioso a undefined geral.
  throw new Error(
    `competency-map: mapVersion ${competencyMapVersion} não suportada ` +
      `(suportada: ${SUPPORTED_MAP_VERSION}); regenere o read model (gen:content).`
  );
}

/** Colapsada (§7.1(2)): null ≡ "não mapeada" — cobre mapping:null do mapa
 *  e o undefined legado (sem mapa importado / sem entrada). Estado legítimo,
 *  nunca erro; nunca infere primary; nunca lança. */
export function getCompetency(lessonId: string): CompetencyMapping | null {
  const entry = competencyLessons.find((item) => item.lessonId === lessonId);
  return entry ? entry.mapping : null; // sem entrada colapsa em null (§7.1(2))
}

/** §7.1(3): distingue "não mapeada" (entrada com mapping null) de
 *  fora-do-universo (planned/ausente do mapa) — para decisão de render na
 *  Fase 3 (dono UX). Não é gate de visibilidade (§4.5). */
export function hasCompetencyEntry(lessonId: string): boolean {
  return competencyLessons.some((item) => item.lessonId === lessonId);
}
```

- Antes: consumidor não tem como ler competências (campo não propagado).
- Depois: leitura opcional, pura, sem tocar progresso; `ContentRepository`
  ganha os métodos **aditivos** (consumidor antigo que não os usa não quebra).
- **null/undefined reconciliados** (§7.1(2)): `undefined` legado ≡
  `mapping: null` ≡ «não mapeada», tratados identicamente; **não-mapeada ≠
  ausente/planned** — a distinção vive em `hasCompetencyEntry` (§7.1(3)).
- **PUBLIC_JOURNEY pelo consumidor** (§7.1(4), R6): o mapa compila as duas
  jornadas; o filtro de visibilidade pública permanece no
  adaptador/consumidor — o mapa não pré-filtra.
- `package.json` do engine consumidor: `gen:content` passaria a incluir
  `--compile-competency engines/literacyDojo/src/data/generated` (opt-in do
  engine, decisão LAE).

## 10. Incompatibilidades concretas registradas

- **Nenhuma** para consumidores atuais: nenhum arquivo existente muda de
  comportamento (`lessons.ts` byte-idêntico; schema/validator ganham só a
  descrição amendada do campo `competency` e a nova flag).
- O mapa **não promete**: atainment, sync entre engines, lições planned,
  ids de competência fora do glossário F1–F4/D1–D7 (enum do schema).

## 11. Hard constraints respeitadas

- **ZAI seed**: nunca rodar `engines/zai-duolingo-like/prisma/seed.ts` em
  instâncias existentes (`lessonProgress.deleteMany()` apaga progresso —
  r2/AID-3514). Esta fatia não roda seed nenhum e não toca bancos.
- Nenhum merge/deploy/publicação aqui; PR draft isolado sobre main atual.
- Nada promove estado de learner; `mastered` permanece reservado ao gate.

## 12. Alinhamento com o contrato canônico (PR #623 — DECIDIDO na S6 e integrado ao main `5f71ac42`)

O contrato de leitura canônico da spec AID-3514 vive em
`docs/curriculum/competency-read-contract.md` (PR #623, PCI; revisões LAE
`51284f0a` r1 e `5394585605` r2 GO-condicional com r2.1 aplicada; **merged
no main `5f71ac42` — S6 fechada**). Esta fatia implementa a **Fase 1 (CPE)**
dele. Mapeamento dos invariantes:

| Contrato (PR #623 §4/§9) | Aqui |
| --- | --- |
| Default ausente = "não mapeada", estado legítimo (não erro) | `mapping: null` (§1) + teste de default. |
| Distinção intransponível completed/pass/application_reported/mastered | §3 (tabela com donos) + `carriesAttainment=false`, `producerWritesMastered=false`. |
| IDs/aliases explícitos, não-aliasing vs `skillIds` | §4 (glossário + aliases; não-aliasing). |
| Ordem/pré-requisitos/visibilidade preservados; filtro no adaptador (R6) | §4 + teste dedicado. |
| Consumidor antigo: inventário LAE (indexedDbProgressRepository, literacyMission.ts, playwright/support.ts, 5 suites vitest) aditivamente seguros | §5 (matriz de estados) + byte-identidade incondicional de `lessons.ts` (§7). |
| `CatalogLessonEntry` pinada nas 8 chaves; corpus do verificador nunca ganha competency | `lessons.ts` e `literacy-corpus.mjs` intocados por construção (nenhum diff neles). |
| Propagação NÃO bumpa `contentVersion` nem `version` de lição (r1) | Nenhum YAML autoral mudado nesta fatia (diff vazio em `modules/**` e `catalog.yaml`). |

**Mecanismo (decidido na S6, comentário `618a37b1`; integrado em
`5f71ac42`):** o contrato original do #623 *propunha* a 9ª chave opcional
in-band em `lessons.ts` (flag `--with-competency`); a **decisão S6
selecionou a projeção em arquivo separado** (`competency-map.ts`) — exatamente
o mecanismo deste PR — e a proposta in-band e o PR #634 que a implementava
ficaram **superseded** (histórico preservado no contrato §6.1.h/§6.2.h).
Motivação registrada: a identidade byte de `lessons.ts` fica preservada
**incondicionalmente** (mesmo com a projeção ligada), mantendo o garante de
zero-regressão das lições live independente de flag — e o opt-in é no import
do consumidor, não na geração. O seam normativo da Fase 2 (`getCompetency`
colapsada + `hasCompetencyEntry` + guard fail-closed de `mapVersion`) está
no §9 acima, idêntico ao contrato integrado (§6.2–6.5/§7.1).
