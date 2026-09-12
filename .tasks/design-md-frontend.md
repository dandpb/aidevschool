# DESIGN.md per engine: registro e verificação

> Build this with **tlc-implement**.
> Every criterion below becomes a check with a proof, referenced by its number. Nothing under
> `Unresolved` gets settled while building.

## Intent

Os frontends do ecossistema têm identidades visuais deliberadas e distintas
(codexDojo brass-terminal, literacyDojo warm/friendly, dojoToday soft-cream,
miniTown night-town, pixelDojo arcade, voxelDojo space-HUD), mas nada no repo
diz a um agent qual é a identidade de cada engine antes de ele escrever UI:
os tokens vivem espalhados em `:root` CSS e código de cena, os valores
auditados em AA (AID-914/1023/1027) só existem como comentários em styles.css,
e nenhum surface walker (humano ou agent) tem um registry pra conferir. Quem
paga é qualquer agent (ou humano novo) tocando UI: sem contrato visual, cada
mudança pode driftar a identidade ou quebrar contraste auditado sem que nada
aponte.

A mudança: um `DESIGN.md` por engine frontend (mais um map na raiz) derivado
do CSS real — o mesmo padrão que codexDojo e pixel-quest já usam — registrado
no AGENTS.md do engine, e verificado no CI com o linter oficial
`@google/design.md` (0 errors), tratando token visual como código.

6 critérios em 3 slices · 2 one-way doors · 0 abertas

## Criteria

### Slice 1 — Arquivos DESIGN.md existem e estão registrados

1. Dado o repo na `main`, quando se lista `engines/*/DESIGN.md` (mais
   `engines/pixelDojo/pixel-quest/DESIGN.md` já existente), então os engines
   de frontend com UI própria têm arquivo: `codexDojo`, `codexdojo-os-prototype`,
   `literacyDojo`, `miniTown`, `dojoToday`, `pixelDojo/pixel-quest`, `voxelDojo`.
2. Quando um agent abre o `AGENTS.md` de um engine listado no critério 1,
   então existe uma linha apontando o `DESIGN.md` do engine como autoridade
   visual a ler antes de trabalho de UI.
3. Quando um `:root` de styles.css (ou constante de paleta em código de cena)
   muda de valor, então o `DESIGN.md` do engine correspondente reflete o novo
   valor no seu token (idêntico em hex; divergência = falha).

### Slice 2 — Tokens são reais (derivados, não inventados)

4. Dado o `DESIGN.md` de um engine com styles.css tokenizado (codexDojo,
   literacyDojo, dojoToday, pixel-quest), quando o frontmatter é comparado
   token a token com o `:root` do CSS, então cada hex do frontmatter existe
   literalmente no `:root` (nenhum valor novo introduzido pelo documento).
5. Dado o `DESIGN.md` do voxelDojo, quando comparado com
   `engines/voxelDojo/shared/palette.ts` e `docs/3d-style.md`, então os 8
   tokens `station-*` são exatamente a `PALETTE` export, na mesma ordem.

### Slice 3 — Verificação contínua (sensor)

6. Quando um PR altera ou adiciona um `DESIGN.md` ou `*.DESIGN.md` em
   `engines/**` ou `docs/design/reference/**`, então o job `design-md-lint`
   do CI roda `npx -y @google/design.md lint` em cada arquivo alterado e
   falha (exit ≠ 0) se algum apresentar `errors > 0`.

## States

Não aplicável — nenhum lifecycle muda com esta task.

## Out of scope

- Redesign/restyle de qualquer engine — os arquivos **codificam** o que existe
  (princípio do pixel-quest/codexDojo: "codifies the existing prototype").
- Derivar tokens para `codexdojo-os-prototype` além do que o DESIGN.md dele
  já codifica — esse arquivo existe (a0fc4ee0) e é a autoridade.
- DESIGN.md para `zai-duolingo-like` — diretório é submodule vazio nesta
  branch; nada a derivar.
- Integração com Tailwind/DTCG (`export`) — os engines não usam Tailwind.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| documento `DESIGN.md` (por engine) | estrutura/tom/profundidade: spec Stitch (frontmatter YAML + seções) | 1, 3 |
| documento `DESIGN.md` | o que o leitor faz a seguir: ler antes de UI, atualizar ao mudar token | 2, 3 |
| job CI `design-md-lint` | output format e exit codes | 6 |
| job CI `design-md-lint` | o que imprime quando falha | 6 |

## Swept

- validation: 4 (hex do frontmatter valida contra `:root`) e 6 (linter exit code)
- failure modes: 6 (lint errors > 0 falha o job; hex divergente falha o critério 3/4)
- idempotency and retry: n/a — arquivos estáticos, sem operações repetíveis
- authorization: existing — CI do repo já exige PR + sdlc-guards para touch em protected paths
- concurrency and ordering: n/a — um arquivo por engine, sem ordem entre eles
- data lifecycle: n/a — documentos versionados no git
- external-dependency failure: 6 (se `npx` do linter falha por rede, o job CI falha visível — sem silent pass)
- state transitions: n/a — sem lifecycle
- observability: 6 (o próprio job é o sensor; log nomeia arquivo + findings)

## Impact

| Front | What changes |
|---|---|
| domain | new term: `DESIGN.md` (per engine) - contrato visual machine-readable derivado do CSS real; lives in cada `engines/<engine>/` |
| domain | existing term: "design authority" (AGENTS.md dos engines) - agora aponta arquivo concreto em vez de só prose |
| stored data | nothing to migrate - novos arquivos markdown + 1 job CI |

## Decided

| Decision | Shape | Alternative rejected |
|---|---|---|
| Formato dos arquivos | YAML frontmatter (spec Stitch, `version: alpha`) + corpo markdown; compatível com `@google/design.md lint` | Role/Token/Value tables puras (formato codexDojo/pixel-quest legado) — não lintável por ferramenta |
| Sensor no CI | job `design-md-lint` executando `npx -y @google/design.md lint` nos `DESIGN.md` alterados (paths-from-diff) | pre-commit hook — dependência de node no ambiente de commit; CI já é o gate remoto do repo |
| Localização do Airtable reference | `docs/design/reference/airtable.DESIGN.md` (referência, não sistema) | root `DESIGN.md` carregando análise de terceiro — shadowing do map por identidade alheia |

## Relations

Não aplicável — nenhum dado persistido muda de forma.

## Surface

Não aplicável — nenhum interface externa consumida é criada/alterada (CI job é interno).

## Sources

- Decisão do Daniel (chat 2026-09-12): "sim, pode ser skill.. e implement o DESIGN.md em todo nosso frontend" — **binding**: cobertura = todos os engines frontend
- Daniel (chat 2026-09-12, veredictos): sync = manual em PR + CI lint apenas; linha no AGENTS.md root = aprovada
- `engines/codexDojo/DESIGN.md` e `engines/pixelDojo/pixel-quest/DESIGN.md` (pré-existentes, commits a0fc4ee0/b2a11b0b) — **binding para o formato de conteúdo**: codificam o existente, não redesenham
- Google Stitch DESIGN.md spec — https://stitch.withgoogle.com/docs/design-md/specification/ e CLI https://stitch.withgoogle.com/docs/design-md/cli/ — formato e linter
- `docs/design/teaching-game-contract.md` + `engines/voxelDojo/docs/3d-style.md` — autoridade visual voxelDojo
- Skill `design-md` (Hermes): método derive-from-real-CSS e pitfalls

## Unresolved

None.
