# Plan — AID-5012 Onda 2

Planejamento executivo do slice (executado em 2026-10-17).

## Passos

1. **Baseline** — `npm ci --include=dev` (o sandbox define `omit=dev` em
   `~/.npmrc`; `--include=dev` é obrigatório para devDependencies) + lint +
   build + test em ambos os node-impl. Estado inicial: 06 verde com 4/4;
   07 verde com 8/8.
2. **06 código** — `allowEmptyFiles` em `config.ts` (env `ALLOW_EMPTY_FILES`,
   default false); rejeição zero-byte pós-stream em `server.ts`; validação de
   `limit`/`status` em `GET /files`.
3. **06 testes** — novo `src/__tests__/edge.test.ts` (7 casos, spec-driven).
4. **07 código** — pin `algorithms: ['HS256']` em `verifyAccessToken`.
5. **07 testes** — novo `src/__tests__/security.test.ts` (9 casos), com
   relógio mutável para expiração.
6. **Verificador** — `curriculum/_shared/verify_node_impl.sh` (POSIX,
   4 passos, VERDICT machine-readable); rodar com passo install completo em
   pelo menos um projeto e `--no-install` no outro.
7. **Documentação** — reescrever `docs/status.md` de 06/07 no formato Onda 1
   (Node-only, evidência datada, próximos ciclos); atualizar `catalog.md`
   (Status/Evidence/coverage rows + contagem do header).
8. **Projeções** — `python3 -m learner.substrate`; atualizar pin
   `scaffoldedCount` 14→12 em `learner/substrate/tests/test_substrate.py`
   (mesmo procedimento da Onda 1 em `90f89498`).
9. **PR** — branch `aid-5012/curriculo-real-onda-2`, PR pequeno e
   autocontido, sem merge (porta de merge é do FPE via countersign).

## Riscos e mitigações

- **Sandbox `omit=dev`**: verificador usa `--include=dev` explicitamente.
- **Árvore compartilhada com trabalho concorrente (AID-5006)**: stage
  estritamente escopado; hunks mistos (codexdojo/codexdojo-os `learner.ts`)
  aplicados ao index apenas na parte 06/07 (`scaffoldedCount`); arquivos
  exclusivamente alheios não entram no commit.
- **Edição de teste existente**: nenhum teste existente é editado; apenas
  novo arquivo + pin de contagem (precedente Onda 1).

## Verificação do plano

Cada passo tem critério binário (exit code / contagem de testes) registrado
em `verification.md`.
