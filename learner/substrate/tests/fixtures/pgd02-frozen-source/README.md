# pg-d02 frozen source fixture (AID-3595)

Opt-in local fixture for `test_mission_catalog_guided_practice_pgd02.py`.
Bytes are VERBATIM copies of the frozen pg-d02 source consumed as immutable
input — do not edit; refresh only from a newly ratified source contract.

Provenance (AID-3595 INPUT FINAL CONGELADO):

- Source package: `curriculum/sequencia-dev-guiada/pg-d02-pedido-estruturado/`
  at PR #631 head `4cabf984591f0d5cf4046e0264871811dd6bd18a` (content base
  `620e01d9d42b99434c10d8f155cde0cbbc57b25cf61`), byte-identical at PR #641
  head `497fcf67efedd660efc7d51ff2c6a1297edf5bb5` (verified blob-identical).
- Source contract: `curriculum/sequencia-dev-guiada/tools/fixtures/pg-d02-source-contract.json`
  at PR #641 head `497fcf67efedd660efc7d51ff2c6a1297edf5bb5` (AID-3617 F1–F3,
  CD aceite e7820c47-f021-49d0-9561-98f33cffe2e6).
- Ratified projection of that contract: sha256
  `e8054bc6e26cec03fe92bf7dd577644b8fd88c02922150350517677692ccfe4f`,
  18473 bytes; `package.contentVersion` `pg-d02@920e17baafd5`.

Layout mirrors the repository tree so tests can compose a realistic
`curriculum/sequencia-dev-guiada/` root:

- `package/` — the 8 pinned package files (6 learner-visible + 2
  guia-de-correcao provenance-only). sha256/bytes equal `contract.files[]`.
- `tools/fixtures/pg-d02-source-contract.json` — the frozen contract;
  sha256 `cab64c4b24b0fe3ed10731e3d7e9136ef2e51a1f97bdfe01988ea6fe63579438`.

Pins (path, sha256, bytes) — cross-check against `contract.files[]`:

| path | sha256 | bytes |
| --- | --- | --- |
| enunciado.md | b1311e602d9066642da8d53c34cacc273f1dcc7d5c40603081acd694d09b6318 | 6075 |
| exemplo-trabalhado.md | 9bcda0108f5dc65b57c0d930c4bd052654b31f04c1e671f3ce0cb053a1e76085 | 4031 |
| insumos/pedido-original.md | 7f8a8b59a051f5cdb7d15487ee54ebe6851765aa0e4542e3b1bcd6d2b830c905 | 1222 |
| insumos/meus_commits.json | 08bfb8391691170cd650a16bf0603ff8831832e9cb99c88a06376391e48475c6 | 1487 |
| insumos/verifica_pedido.py | ed5b034dc0f94004f2145dd2adcd0d0727a8e35a8abc769716b4b50dd7b560e8 | 3949 |
| rubrica-v1.md | 33992a7bb3e58c81851413db42a9f5e1d7c8cdbeadc60e4d8c1e807b5a1c1783 | 3241 |
| guia-de-correcao/pedido-5-campos.md | 5362c630b4c40adf6839f23bedb877cee11638cc838fb2fd08aed041ccd0bee1 | 1627 |
| guia-de-correcao/solucao.md | f07185574a44f8b3fef9ac6e6bfbcc66194fd71960310042321381ff250a9334 | 6651 |
