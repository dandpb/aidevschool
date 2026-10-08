# PROVENANCE — kit offline pg-d05-delegacao-controlada (AID-3668)

## Fonte pinada (inspecionada antes de embalar)

- **PR #646** (draft, base `aid3510/sequencia-dev-guiada` @ `e01d9d42`),
  head `f7e3228a80cecc68e426e7d59d080a234d249104`, pacote
  `curriculum/sequencia-dev-guiada/pg-d05-delegacao-controlada/` — 18
  arquivos, vendored byte-idênticos em `source/pg-d05-delegacao-controlada/`.
- Cross-check executado: os 17 hashes da tabela de inventário do
  `MANIFEST.md` do próprio pacote conferem contra os bytes vendorizados
  (17/17, drift 0); o `MANIFEST.md` (que não ha a si mesmo) foi pinado
  direto do blob `c9cc942ccf9e86474ad834af4b2f4f0785639155`.
- Cadeia de aceite preservada (nada reautorado, autoria não reaberta):
  - **AID-3647** (autoria, Content Designer `f2b1e95d`): review nativa CPE
    `ac0ec540` (changes_requested r1 → r2 approved) + aprovação pedagógica
    CCE `93e26ea9`, ambas pinadas no head `f7e3228a`.
  - **AID-3656** (contraprovas, VEE `616b5f9b`): 12/12 reproduzido
    first-hand; countersign publicada no PR #646
    (issuecomment-5939474349, 2026-10-01T20:00:12Z, veredito
    `5f1c3c7b-f974-4e1d-8457-b7e617069ff7` @ head `f7e3228a`).

## Fronteira learner/teacher (decisões explícitas)

Convenção espelhada do kit irmão pg-e01-evals-offline (AID-3667, branch
`aid3667/kit-offline-download-staged` @ `3b17ebaf`), adaptada às fronteiras
**do pacote aceito**:

- **etapa-1-pratica (13 arquivos, aprendiz):** `ALLOWLIST.md`,
  `enunciado.md`, `exemplo-trabalhado.md`, `rubrica-v1.md`,
  `insumos/CONTRATO.md`, `insumos/PLANO-APROVADO.md`,
  `insumos/verifica_delegacao.py`, `insumos/fixture/biblioteca.py`,
  `insumos/fixture/testes.py`, `insumos/delegacao-r1/{diff-r1.patch,
  resposta-produtor-r1.md}`, `insumos/delegacao-r2/{diff-r2.patch,
  resposta-produtor-r2.md}`. O par r1/r2 fica junto na etapa 1 porque o
  desenho aceito do pacote (AID-3647) mantém as duas rodadas na mesma
  sessão, governadas pela ordem do enunciado — separar as rodadas em etapas
  seria reautorar pedagogia.
- **etapa-2-docente (4 arquivos, cumulativa, pós-tentativa):**
  `guia-de-correcao/{solucao.md, veredito-r1.md,
  recibo-exemplo/recibo-aceite-r2.md, exemplos/recibo-falso.md}` — o
  enunciado §Limites manda consultar **após** a tentativa; a etapa
  cumulativa torna o kit autocontido para o docente e restaura a prova V&E
  (`selftest` APROVADO 4/4 na extração merged).
- **provenance-only (não entregue em nenhuma etapa):** `MANIFEST.md` —
  metadado de proveniência, não instrução (mesma decisão da convenção do
  kit pg-d04/pg-e01). As âncoras que o enunciado consulta nele (sha256 de
  `insumos/fixture/testes.py` = `e1deddbf…` etc.) estão no `INVENTARIO.txt`
  de cada etapa e em `manifests/pin-hashes.json`.
- **`selftest` fora da etapa 1:** o ALLOWLIST do pacote o classifica como
  "revisor/V&E" e ele depende dos fixtures docentes (recibo-falso/recibo-
  exemplo); logo não cabe na etapa do aprendiz. `verify_kit.py --check-run`
  o executa na extração cumulativa etapa-2-sobre-etapa-1.

## Determinismo do empacotador

`packager.py` (stdlib apenas): ordem de entrada ordenada, `date_time`
fixo `(1980,1,1,0,0,0)`, `create_system=3`, modos fixos (`0o755` para
`.py`, `0o644` demais), `ZIP_DEFLATED` nível 9; `ETAPA.md` e
`INVENTARIO.txt` gerados dos manifestos. Duas construções independentes
produzem ZIPs byte-idênticos entre si e aos commitados
(`verify_kit.py --check-repro`).

## Comandos e resultados reais (executados first-hand)

```
python3 packager.py --out zips
  pg-d05-etapa-1-pratica.zip  23580 bytes  13 arquivos  sha256=5c29ec691263190ca9d9efa620b6d575eb2af24d5369ef41d73a70b2da54663c
  pg-d05-etapa-2-docente.zip  29288 bytes  17 arquivos  sha256=3159a93006b1e847d2f060eafbd0bd55a99f4f212481b55160808e2aad3c47c4

python3 verify_kit.py --report RELATORIO-VERIFICACAO.md
  resumo: 12 ok, 0 falha(s)
```

Negativos (fail-closed, executados em cópia suja do kit):

- Drift de 1 byte em `source/…/enunciado.md` → `packager.py` aborta
  (`drift vs pin detectado`) e `verify_kit.py --check-source` falha.
- Entrada removida do ZIP da etapa 1 (`rubrica-v1.md`) →
  `--check-zips` falha com `faltando=[pg-d05/rubrica-v1.md]`.
- Injeção de `guia-de-correcao/solucao.md` na etapa 1 → `--check-zips`
  falha com fronteira violada (`guia-de-correcao na etapa-1-pratica`).
- ZIP commitado tampering → `--check-repro` falha (build ≠ commit).

## Limites

- Sem runtime/player/catálogo/schema/bindings/progresso/mastery; sem edição
  de nenhum arquivo-fonte aceito (o diff adiciona somente
  `docs/learner-downloads/pg-d05-delegacao-controlada/**`); sem
  merge/deploy/publicação/CI manual; worktree própria; Draft PR novo com
  Provenance real desde a abertura; base `main` (kit independente da ordem
  de merge do PR #646 — as fontes são lidas no SHA congelado e vendorizadas
  com verificação de drift contra o pin).

## Produtor

- Curriculum Content Engineer (`93e26ea9-8f2a-4f6f-9b82-3591ebc4255c`),
  tarefa **AID-3668**, run `87ae245d-accb-40fa-b276-db906347c795`,
  sessão `ses_f06c2e5a5ffeXzkygQxEIWkQ2G` (opencode, diretório
  `/paperclip`), worktree `/paperclip/tmp/opencode/wt-aid3668`.
- v1 — mudanças futuras versionam (v2) sem editar este arquivo.
