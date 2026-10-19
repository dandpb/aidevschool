# Review — AID-5012 Onda 2 (auto-revisão produtor)

Self-review do produtor contra o checklist de revisão (REVIEW.md) antes do
PR. A revisão independente acontece no PR (second reviewer do time + gates).

## Diffs por arquivo

| Arquivo | Tipo | Nota |
| --- | --- | --- |
| `curriculum/06_.../node-impl/src/config.ts` | código | +`allowEmptyFiles` (env, default false). Sem mudança de default visível. |
| `curriculum/06_.../node-impl/src/server.ts` | código | zero-byte 400 pós-stream; validação `limit`/`status` em `GET /files`; `uploadStatuses` derived de `UploadStatus`. |
| `curriculum/06_.../node-impl/src/__tests__/edge.test.ts` | teste novo | 7 casos spec-driven; usa raw HTTP p/ chunked; tmp dirs únicos por teste. |
| `curriculum/07_.../node-impl/src/app.ts` | código | 1 linha: `algorithms: ['HS256']` no verify. |
| `curriculum/07_.../node-impl/src/__tests__/security.test.ts` | teste novo | 9 casos; relógio mutável; padrão `bodyOf<T>` do projeto. |
| `curriculum/_shared/verify_node_impl.sh` | ferramenta | novo; POSIX; logs em `/tmp/verify-node-impl-*.log`; exit 0 só com 4/4. |
| `curriculum/06_.../docs/status.md`, `07_.../docs/status.md` | docs | formato Onda 1; honesto sobre pendências. |
| `curriculum/catalog.md` | docs canônico | 06/07 → Partially implemented + evidence datada; header count 3→5. |
| `curriculum/BACKLOG_STATUS.md` | gerado | via substrate. |
| `engines/codexDojo/src/data/projects.ts` | gerado | via substrate (só hunks 06/07). |
| `learner/substrate/tests/test_substrate.py` | teste (pin) | `scaffoldedCount` 14→12, precedente Onda 1 `90f89498`. |
| `intent/2026-10-17-aid-5012-.../*` | SDLC | intent/spec/plan/verification/review. |

## Checklist

- [x] Nenhum teste existente editado (apenas pin de contagem, com precedente).
- [x] `npm run lint`/`build`/`test` verdes nos dois projetos (recibo acima).
- [x] Nenhum segredo/credencial introduzido; secrets de teste são fixtures
      explícitas nomeadas como tal.
- [x] Sem `node_modules`/`dist`/lockfile no commit (política do repo:
      lockfiles já rastreados não foram tocados).
- [x] Sem deploy/produção/pipeline; nenhum arquivo de gate alterado.
- [x] Mensagens de erro sem vazamento de internals (spec 06 §Error Handling).
- [x] Migração de comportamento documentada (zero-byte agora rejeita por
      padrão — alinhado ao spec, que exigia rejeição salvo configuração).
- [x] Projeções regeneradas pela ferramenta canônica, não à mão.

## Pendências declaradas (não bloqueiam o slice)

06: RNF-002/003/004/005, RNF-008, RF-007 real. 07: rotação atômica, KDF,
latência p95, política de revogação. Todas listadas em `docs/status.md`
(próximo ciclo) e no `catalog.md` (caveats).
