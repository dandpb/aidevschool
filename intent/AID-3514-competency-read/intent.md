# Intent: stack de competências do currículo — ratificação, metadados inertes e read model (AID-3497/3505/3514)

> **RETROSPECTIVE RECORD (retrofit, AID-3815).** Este diretório foi criado em
> 2026-10-02, depois o stack já ter aterrissado em main, para suprir o
> **artifact home versionado faltante** (playbook `docs/sdlc/README.md`
> §Artifacts; §PRs automatizados exige registro `intent/<change-id>/` ANTES do
> merge). Origem: auditoria SDLC AID-3814 (row #328, índice
> `sdlc-audit-index-2`) → issue AID-3815. Precedente de forma: retrofit r2
> #216/#227/#228 (§Recusa também é registrada: "retrofit prontamente como
> retrospective record, marcado como tal no topo de cada arquivo, citando
> vereditos e merge SHAs"). Nada do stack é reaberto; nenhum comportamento
> muda com este registro — as cadeias de review/gate/countersign dos merges
> originais estavam íntegras (verificação 1º-mão AID-3814; re-verificada na
> construção deste registro: countersigns pinados nos heads de cada merge,
> citados no plan.md).

Author: Curriculum Platform Engineer (agente `ac0ec540`) · Change-id:
AID-3514-competency-read · Status: accepted (retrospectivo — carriers
AID-3497, AID-3505 e AID-3514 concluídos `done`; este registro é o home
faltante da cadeia, não uma mudança nova)

> Carriers de origem (link/quote — não reescrita; uma fonte de verdade):
>
> - **AID-3497** «[AID-3453] Ratificar competências por lição» (done, assignee
>   CPE): "uma matriz documental com 32 linhas, uma por lição canônica l01–l32
>   [...] Cada linha deve conter lesson ID, objetivo observável com citação de
>   arquivo/linha/SHA [...] CCE é o único produtor de todas as linhas. Content
>   Designer faz revisão formal independente [...] Curriculum Platform
>   Engineer valida formalmente a consistência com schema/glossário".
> - **AID-3505** «Incorporar metadados curriculares ratificados» (done):
>   "Implementar uma fatia aditiva e inerte do currículo compartilhado:
>   incorporar as 32 atribuições primária/apoio ratificadas em AID-3497,
>   documento matriz-competencias-32 r3, revisão
>   `1fee56a2-a980-4199-97ad-50cfe066c001`".
> - **AID-3514** «Especificar consumo do currículo compartilhado» (done):
>   "especificar contrato mínimo para um consumidor existente ler competências
>   sem alterar progresso nem prometer sincronia entre engines [...] Learner
>   App Engineer revisa o seam real e estados de erro/ausência".
> - **AID-3815** (ordem de retrofit, este registro): "O stack de competências
>   foi integrado em main **sem entrada em `intent/<change-id>/`** [...] As
>   cadeias de review/gate/countersign no board estão ÍNTEGRAS [...] o
>   problema é apenas a ausência do artifact home versionado".

## Problem

1. **(AID-3497)** As 32 lições canônicas (`l01`–`l32`) não tinham competências
   ratificadas por lição — a matriz r2.1 (AID-3456) tinha famílias agrupadas
   e linhas que o parecer Content Designer `ed7484d0` declarava não-contrato
   mecânico pronto (l17/l29/l20).
2. **(AID-3505)** Mesmo ratificada, a matriz era documento board-only: o
   currículo canônico (`curriculum/ai-literacy/modules/**`) não carregava os
   metadados; nenhum consumidor podia lê-los do repositório.
3. **(AID-3514)** Com os metadados inerts no YAML, ainda não existia contrato
   especificado para um consumidor **existente** ler `primary`/`supporting`
   sem alterar progresso (`completed`/`pass`/`mastered` permanecem dos
   domínios de progresso) e sem prometer sincronia entre engines.
4. **(AID-3815, o gap deste retrofit)** O stack inteiro aterrissou em main
   sem entrada `intent/<change-id>/` — verificado 1º-mão: `git grep -l -E
   "AID-3497|AID-3505|AID-3514" origin/main -- intent/` → **0 paths** na base
   `9a5bb1a3`. A trilha pedido → decisão → plano vivia apenas no board/PRs;
   o playbook exige a cadeia versionada no clone.

## Proposed outcome (observável, já em main — este registro só documenta)

- Matriz `matriz-competencias-32` **r3** ratificada (revisão `1fee56a2`;
  pareceres CD `ed2ea2f5` + CPE `f1cf2acd`; 32 linhas `[D]`, 0 `[P]`).
- Cada um dos 32 YAMLs canônicos carrega bloco opcional
  `competency: {primary, supporting[]}` com os valores exatos ratificados —
  fatia aditiva e inerte (PR #617 @ `f36f8b94`/head `a336a192`, merge
  `195887c2`; read model `lessons.ts` byte-idêntico com/sem metadados).
- Contrato de leitura DECIDIDO (S6): `docs/curriculum/competency-read-contract.md`
  (PR #623, merge `5f71ac42`) — read model **opcional** com default ausente,
  mecanismo separado `competency-map.ts` selecionado (in-band superseded).
- Read model Fase 1 (S5): `competency_projection.py --compile-competency` →
  `competency-map.ts` separado, opt-in, fail-closed, determinístico
  (PR #659, merge `9a5bb1a3`; doc canônico
  `docs/curriculum/competency-read-model.md`). O aprendiz **não percebe
  nada**: nenhum consumidor ativo lê o mapa; `lessons.ts` inalterado.
- Este diretório fecha o gap (AID-3815): a cadeia de intent/spec/plan do
  stack passa a existir versionada em `intent/AID-3514-competency-read/`.

## Affected users and systems

- `curriculum/ai-literacy/` (YAML canônico l01–l32, schema, tools —
  `competency_projection.py`, `validate.py`, testes de seam/contrato).
- `docs/curriculum/` (contrato + read model docs — área CPE).
- Consumidor futuro: `engines/literacyDojo/` seam de leitura (Fase 2 — PR
  aberto #660, produtor LAE; **não** parte do já mergeado).
- Sem impacto em runtime, progresso de aprendiz, deploys ou outras engines.

## Constraints

- Zero regressão nas lições live: metadados são inerts por construção
  (compilador não propaga; `contentVersion`/`version` não bumpam).
- Read model sem atainment: `carriesAttainment=false`,
  `producerWritesMastered=false`; distinção intransponível
  `completed`/`pass`/`application_reported`/`mastered` preservada.
- Nada reaberto: ratificações, reviews e merges do stack são histórico
  íntegro — este retrofit apenas registra.

## Decisão de escopo — 3497/3505 (critério 2 do AID-3815)

**Um único artifact home para o stack inteiro, ancorado em
`AID-3514-competency-read`.** Rationale: (a) é um mesmo stack
(ratificação → incorporação → contrato/read model) com uma única cadeia de
decisão — a S6 decidiu o mecanismo para o qual 3497/3505 foram insumo;
(b) os artefatos substantivos de cada carrier já têm home canônico versionado
(matriz r3 com revisões/pareceres no board citados aqui; metadados nos 32
YAMLs; contrato/read-model em `docs/curriculum/`); (c) o gap auditado é
apenas o registro `intent/` — homes separados duplicariam links sem nova
informação. Registrado como decisão do produtor (CPE, autor da cadeia) no
carrier AID-3815; PO/founder podem suplantar exigindo homes separados
(follow-up trivial, doc-only).

## Open questions

- Nenhuma aberta por este registro. Trabalho pendente do stack = **Fase 2**
  (seam consumidor no literacyDojo), já pipelineada: PR #660 aberto (draft,
  produtor LAE, despacho FPE `f9447c82`, diretiva board `22bcfffd`) — fora
  do escopo deste retrofit retroativo.
