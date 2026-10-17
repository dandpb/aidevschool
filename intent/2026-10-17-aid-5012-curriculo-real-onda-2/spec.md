# Spec — AID-5012 Onda 2 (06 + 07)

Contrato executável por projeto. Fonte canônica de comportamento:
`curriculum/06_file_upload_pipeline/docs/spec.md` e
`curriculum/07_rest_api_auth/docs/spec.md`.

## 06_file_upload_pipeline (node-impl)

### Comportamento novo exigido

1. **Arquivo vazio (spec §Edge Cases):** upload de 0 bytes é rejeitado com
   `400` + `invalid_file_type` por padrão; aceito (`201`) somente com
   configuração explícita (`ALLOW_EMPTY_FILES=true`).
2. **Paginação/filtro (spec §API GET /files):** `limit` deve ser inteiro
   positivo (`400 invalid_pagination` caso contrário); `status` deve ser um
   status conhecido (`400 invalid_filter`).

### Cobertura de testes exigida (nova, `src/__tests__/edge.test.ts`)

- Transferência chunked sem `Content-Length` completa e verifica checksum (RF-002).
- Zero-byte: rejeição padrão + aceite explícito.
- Após 413 e 409: nenhum artefato parcial/final residual (RF-006/RNF-007).
- Uploads concorrentes idênticos: registros e artefatos separados (§Edge Cases).
- Filename com traversal confinado ao diretório `files/` (§Edge Cases).
- `400` para paginação/filtro inválidos; caminhada de cursor em 2 páginas (RF-012).

### Invariantes preservados

Streaming com Busboy + hash incremental SHA-256; escrita via temp file +
rename; abort antecipado em oversize; ids de upload seguros contra path.

## 07_rest_api_auth (node-impl)

### Comportamento novo exigido

1. **Pin de algoritmo JWT:** `verifyAccessToken` fixa `algorithms: ['HS256']`;
   tokens com qualquer outro algoritmo são rejeitados com `401` mesmo com
   segredo correto (endurece contra confusão de algoritmo).

### Cobertura de testes exigida (nova, `src/__tests__/security.test.ts`)

- Token forjado com segredo estranho → `401` + audit `token_verify_failed`.
- Token HS512 com segredo correto → `401` (prova o pin).
- Access token expirado (relógio injetado) → `401`.
- Refresh token expirado (relógio injetado) → `401 INVALID_REFRESH_TOKEN`.
- Update cross-usuário por não-admin → `403` + audit `authorization_forbidden`.
- Update de id inexistente → `404 USER_NOT_FOUND`.
- Usuário disabled: login `401` e refresh `401`.
- Replay de refresh ancestral após duas rotações → `401 REFRESH_TOKEN_REPLAYED`.
- Shape de senha/e-mail com detalhes por campo; campo desconhecido em login `400`.

## Verificador (compartilhado)

`curriculum/_shared/verify_node_impl.sh <node-impl-dir> [--no-install]` roda
`npm ci --include=dev` → `lint` → `build` → `test` e emite VERDICT PASS/FAIL;
exit 0 somente com todos os passos verdes. É o contrato de verificação
reutilizável para Ondas seguintes.

## Critérios de aceitação

- `verify_node_impl.sh` VERDICT PASS 4/4 para ambos os projetos (incluindo
  passo install pelo menos uma vez por projeto).
- 06: 11/11 testes (server 4 + edge 7). 07: 17/17 (app 6 + jwt-secret 2 + security 9).
- `catalog.md` com 06/07 "Partially implemented … verified green" + evidência
  datada; `docs/status.md` honestos sobre o que falta; projeções do substrate
  regeneradas; pin de contagem do snapshot atualizado (12 scaffolded).
