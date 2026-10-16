# pg-d05 — Manifest (inventário congelado, prova V&E e proveniência)

Pacote `pg-d05-delegacao-controlada` (U10) — 17 arquivos, todos novos
nesta entrega (diff restrito a este diretório). Fontes pinadas na base
`e01d9d42` (branch `aid3510/sequencia-dev-guiada`, PR #620).

## Fontes citadas (papel + blob SHA na base `e01d9d42`)

| Fonte | Blob | Papel |
| --- | --- | --- |
| `docs/curso-simples/index.html` (M6–M8) | `2bcf99fbd831` | portões/fatias, produtor ≠ verificador, skill |
| `dev-workflow-claude/workflows/04-revisar-mudancas/RESULTADO.md` | `4154bcf80d11` | revisão com prova executável; CI verde ≠ aprovado |
| `…/04-revisar-mudancas/demo/test/media.test.js` | `8b0379bcb4ac` | teste-prova citado no exemplo |
| `dev-workflow-claude/workflows/07-investigar-erro/RESULTADO.md` | `736a5b267229` | investigação c/ reprodução própria |
| `dev-workflow-claude/workflows/11-aprender-com-a-sessao/RESULTADO.md` | `345cf0576bdc` | retro → regra; checagem validada nos dois sentidos |
| `…/11-aprender-com-a-sessao/demo/tools/checar-regras.sh` | `d7e8358b1fec` | checagem plugada em teste |
| `docs/curso/workflow_lab/fixtures/07-cycle-07.json` | `bd2a4cfdb5eb` | política estreita fail-closed (`check-unified-diff`) |
| `docs/curso/workflow_lab/fixtures/08-cycle-08.json` | `72c30aa71c38` | valida tudo antes de derivar (V1–V3 antes do veredito) |
| `curriculum/sequencia-dev-guiada/SEQUENCIA.md` (§2/§3/§6) | `a7c8f05f270a` | unidade U10, classificação adaptação, fila P2 |

## Inventário (sha256)

| sha256 | arquivo |
| --- | --- |
| b427ac777988c57fddbe99f5f70a8e32b08eedb2055cc9aebf2c3da9cec8a2f6 | ALLOWLIST.md |
| bd8daeb03bbf82f08de5e19c49945a9362b789db9d7944b1ea7066d00db4c8db | enunciado.md |
| 5044f2e153a1b7a9513590380147aac4cc8ce48f8a78b9d5917a91693d43b219 | exemplo-trabalhado.md |
| 4e204fb574058d8411ac8e0e83a68ebcbc9c694faca541c46e5652aea8136a43 | rubrica-v1.md |
| 048d8882c9cd89996f8fdb55f86513308bc4af481203bc2156ce599a0ca1c088 | insumos/CONTRATO.md |
| 6c28222bc272f9b7d1a1a6a04839e96fa22b25f62e854e4a820d13d7575d0cc6 | insumos/PLANO-APROVADO.md |
| 2f628016f16f2b2463deacac7215cada0559847b1c06f4aca827b70ad472fcc3 | insumos/fixture/biblioteca.py |
| e1deddbf8e2f9834406d1d4d9da1f707bd06b3b8188c7dd79ca1a50819605432 | insumos/fixture/testes.py |
| 2522c3040003e1eeb681e4ca7cd5fdd27ff3fcd195398669b6c08507f5c92e06 | insumos/verifica_delegacao.py |
| 6883e5fc25c5abc7ed230663589301eb4e29fa5bf07e4c38928410836316ead7 | insumos/delegacao-r1/diff-r1.patch |
| a82b1f3859efefc0dce165dfabaabb35e1677a90ec31fcc94616df4ecd6a6670 | insumos/delegacao-r1/resposta-produtor-r1.md |
| 5c6fe98f72f7310544c43afe9cbad15027ab8876536a510c9fc6ca5e5310b2f7 | insumos/delegacao-r2/diff-r2.patch |
| 9c997e8369b64d1058267b53b002b8eb6fef3ca8013945621d86cd37ee35522a | insumos/delegacao-r2/resposta-produtor-r2.md |
| 80161b27d5ffc42a3974705e670983ee85ce892daca0ed3631e754b3b9b1ec20 | guia-de-correcao/solucao.md |
| 49ce1f0353ff50f3d888a9020ef0f0350d39c1f4025b7acf62522cf74255f3b0 | guia-de-correcao/veredito-r1.md |
| 0c5b986b9b4492bf7f1a33cbb1e95b1a3615ecb3cf6fbcb40f37e62a17d2995c | guia-de-correcao/recibo-exemplo/recibo-aceite-r2.md |
| 61c22bbb64637fcd251289e30bc3b1cdd008752aef8ddf8a96d19e10f4b2e97c | guia-de-correcao/exemplos/recibo-falso.md |

Âncoras de integridade usadas pela prática:
`testes.py` entregue = `e1deddbf…` (r2 deve mantê-lo byte-idêntico);
sob a r1 aplicada = `41c0669d…` (prova da suíte manufaturada).

## Contrato V&E congelado (comando único + negativo)

Comando reproduzível (a partir do diretório do pacote, offline):

```
python3 insumos/verifica_delegacao.py selftest
```

Saída esperada (exata; divergência = investigar antes de aceitar):

```
ok selftest escopo r1 (deve REPROVAR) (exit=1)
ok selftest escopo r2 (deve APROVAR) (exit=0)
ok selftest evidencia recibo-falso (deve REPROVAR — negativo) (exit=1)
ok selftest evidencia recibo-exemplo (deve APROVAR) (exit=0)
selftest: APROVADO (4 sondas)
```

O negativo (`guia-de-correcao/exemplos/recibo-falso.md`) aceita a r1
citando saída do produtor: o verificador DEVE REPROVAR — falsa
comprovação não passa. Saídas reais de todos os comandos do aluno:
`guia-de-correcao/solucao.md`.

## Provenance

- Produtor: Content Designer (`f2b1e95d-bf0f-4beb-b117-533728fabb1e`),
  tarefa AID-3647 (U10), worktree própria
  `/paperclip/tmp/opencode/wt-aid3647`, base `e01d9d42`.
- Patches r1/r2 gerados com `git diff` real (repo scratch sobre a
  fixture deste pacote); todas as saídas citadas foram executadas
  first-hand nesta árvore (Python 3.13, git 2.x, offline).
- Fixture fictícia (biblioteca do bairro); nenhum dado de aluno;
  nenhum gate/catálogo/binding/runtime tocado.
- Revisão CPE (AID-3647, changes_requested sobre o head `ef8b74d6`):
  bloco "Como reproduzir" do exemplo reescrito para buscar o
  `git-historico.bundle` (refs `demo04-proposta`/`demo04-master`,
  verificado first-hand na base: proposta `fail 1`/exit 1 no
  `PROVA-CRÍTICO`; master 8/8 exit 0) e 2 nits (E2.1–E2.4 no
  enunciado; "decomposta" na rubrica) — âncoras dos 3 arquivos
  re-congeladas acima; demais 14 inalteradas.
- v1 — mudanças futuras versionam (v2) sem editar este manifest.
