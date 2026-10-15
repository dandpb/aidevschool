# Spec: stack de competências — spec real é o contrato versionado (ponteiro, AID-3815)

> **RETROSPECTIVE RECORD (retrofit, AID-3815).** Este arquivo não duplica o
> spec: aponta para os documentos canônicos aprovados/mergeados e registra a
> cadeia de revisão que os produziu (vereditos e merge SHAs citados). Criado
> após o merge; marcado como retrofit no topo por política
> (`docs/sdlc/README.md` §Recusa também é registrada).

Change-id: AID-3514-competency-read · From: intent/AID-3514-competency-read/intent.md ·
Status: accepted (retrospectivo — o spec real já está DECIDIDO e em main)

## Requirements (fonte única de verdade)

O spec aprovado do stack **é** o documento versionado em main — este arquivo
apenas ancora a cadeia:

| Fatia | Spec real (home canônico) | Estado |
| --- | --- | --- |
| Schema `competency` opcional (P/S) | PR #612 (AID-3457, head `d853e4f7`) — `curriculum/ai-literacy/schemas/lesson.schema.json`; aterrissou via #617/merge `195887c2` | merged 2026-10-02 14:44Z |
| Ratificação das 32 linhas | matriz `matriz-competencias-32` **r3**, revisão `1fee56a2-a980-4199-97ad-50cfe066c001` (AID-3497); pareceres CD `ed2ea2f5` + CPE `f1cf2acd` | done |
| Contrato de leitura (S6) | **`docs/curriculum/competency-read-contract.md`** (PR #623, merge `5f71ac42`) | DECIDIDO, em main |
| Read model Fase 1 (S5) | **`docs/curriculum/competency-read-model.md`** + implementação `curriculum/ai-literacy/tools/competency_projection.py` + 10 testes de contrato (PR #659, merge `9a5bb1a3`) | merged 2026-10-02 19:05Z |
| Seam consumidor (Fase 2) | contrato §7.1 do doc S6 (porta `getCompetency` colapsada + `hasCompetencyEntry` + guard `competencyMapVersion` fail-closed no load) | PR #660 aberto (draft, LAE) |

Requisitos-chave do contrato (resumo pontual; o texto vinculante é o doc):
contrato mínimo para consumidor **existente** ler `primary`/`supporting`
**sem alterar progresso** e **sem prometer sincronia entre engines**; read
model **opcional** com default ausente; mecanismo **separado**
`competency-map.ts` (decisão S6 r2: in-band/PR #634 superseded, preservado
como histórico); `lessons.ts` byte-idêntico incondicionalmente; sem
attainment (`carriesAttainment=false`, `producerWritesMastered=false`);
`mapping: null` = «não mapeada» (estado legítimo, ≠ ausente/planned).

## Design (como o spec mapeia no repo — fatiado)

1. **S3 (AID-3505/#617):** bloco opcional `competency` nos 32 YAMLs
   canônicos; compilador não propaga (inércia é código:
   `compiler.py` strip explícito). 9 testes de fidelidade/negativos.
2. **S6 (AID-3514/#623):** spec documental + 4 testes de seam em fixtures
   sintéticas (tipos/payload sem `competency` mesmo com YAML mapeado;
   `CatalogLessonEntry` pinada nas 8 chaves; corpus do verificador
   `literacy-corpus.mjs` nunca ganha `competency`).
3. **S5 (AID-3514/#659):** projeção opt-in
   `validate.py --compile-competency` → arquivo separado
   `competency-map.ts` (versão do mapa, glossário F1–F4/D1–D7 com aliases,
   uma entrada por lição ready, `mapping` nullável); 10 testes de contrato
   em fixtures isoladas + corpus live (fidelidade à testemunha ratificada
   AID-3505).
4. **Fase 2 (PR #660, LAE):** portas do consumidor no literacyDojo
   (`ports.ts`/adaptador), guard fail-closed no load, doc do engine —
   **pendente**, despachada pelo FPE (`f9447c82`).

## Policy applied

- Playbook SDLC (`docs/sdlc/README.md`): §Artifacts (homes), §PRs
  automatizados (registro do produtor), §Merge protocol (countersigns
  citados nos merges `195887c2`/`5f71ac42`/`9a5bb1a3`).
- Learning-gate golden rules: metadados/inércia sem bump de
  `contentVersion` (invariante registrada no contrato §9.6 — bump
  dispararia `migrateProgress` e mudaria o que o aprendiz percebe).
- Áreas: `curriculum/` + `docs/curriculum/` (CPE, produtor); seam de engine
  revisado/countersignado pelo LAE (vereditos r1 `51284f0a`,
  r2 `5394585605` GO-condicionado → r2.1 `97c946d9`; S5 `5956348434`).
- Revisões do spec: r1/r2/r2.1 registradas no cabeçalho do próprio doc
  canônico (`competency-read-contract.md`).

## Flagged concerns

- **(Fechado)** Dupla numeração histórica §6.2 e citação inexistente
  `catalog.mjs:100-124` — corrigidas doc-only em r1/r2.1.
- **(Vigente, rastreada fora daqui)** Fase 2 não implementada no mergeado;
  UX de consumo depende de UX Designer (contrato §2 fora-de-escopo).
- **(Deste retrofit)** O registro é póstumo — a ordenação binding
  registro-antes-do-merge foi violada pelo stack original; a recorrência é
  objeto da auditoria AID-3814, não remedida aqui.

## Out of scope

Reabrir ratificações; reatribuir as 32 linhas; reimplementar
schema/compilador; wiring de runtime (Fase 2 é PR #660); UI/a11y; seed ou
migração de dados; exportar glossário; qualquer derivação de aquisição do
aprendiz (`mastered` etc.).
