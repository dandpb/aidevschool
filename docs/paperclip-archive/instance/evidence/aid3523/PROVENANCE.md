# Proveniência dos artefatos de evidência — AID-3523

Run `4c88c212-4f9d-43da-b12e-802872299740` (2026-09-30, sessão opencode_local do Engine Systems Engineer).

- `run_matrix.py`, `matrix_run.json`, `synthetic_fixtures.json`, `vitest_aid3523_seam.log`:
  gravados diretamente na execução; inalterados desde então (SHA-256 no manifesto anexado à issue).
- `vitest_spec_aid3523_matrix_seam.test.ts`: **fonte restaurada verbatim do transcript do run**
  (o arquivo executado em `engines/literacyDojo/tests/domain/` foi removido logo após a execução,
  conforme documentado no doc §5 e no comentário de fechamento `8b048a6f`). A cópia executada
  original não existe mais em disco; os 6 nomes de teste do log arquivado conferem, um a um, com
  os `describe/it` deste fonte. Não houve re-execução nesta rodada de complemento (diretriz do
  comentário `776b4df2`).

Nenhuma suíte foi re-rodada para este complemento; nenhum dado de aprendiz real, token, variável
de ambiente ou segredo está presente — apenas fixtures sintéticas (learners `synth-*`).
