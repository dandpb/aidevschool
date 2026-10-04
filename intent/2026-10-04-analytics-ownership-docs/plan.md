# Plan: R7 documental

Contrato: [spec.md](spec.md); autorização: [intent.md](intent.md).

## Arquivos e sequência

1. Registrar intent/spec/plan neste diretório.
2. Criar `docs/handbook/16_analytics_ownership.md` e acrescentar sua entrada
   em `docs/handbook/README.md`. Não editar READMEs de runtime ou ADRs.
3. Verificar os links e confrontar as afirmações com código/configuração.
4. Executar os comandos da página contra fixtures sintéticas; registrar outputs
   em `/tmp/aidevschool-r7-evidence/`, comparar hashes anteriores e validar efeitos.
5. Revisor independente em contexto novo registra `review.md`; produtor registra
   `evidence.md`. Sem testes persistentes novos ou alteração de arquivos existentes.

## Provas delimitadas

- `git diff --check` e whitespace dos novos Markdown: exit 0.
- Resolver todos os links novos por pathlib; entrada única no índice; comparar
  README à cópia anterior R7 (somente uma linha a mais).
- `node learner/gate/analytics/refresh_vocabularies.mjs --check`: exit 0,
  nenhum bloco reescrito; afirmar somente os alvos presentes e legíveis.
- Monitor com `--input` das fixtures `synthetic`, `synthetic-v2` e `synthetic-v3`:
  exit 0, driftCount 0 e contagem dos três envelopes; writes em `/tmp`.
- Agregador com as mesmas fixtures e `--now 2026-09-18T00:00:00.000Z`:
  exit 0, outputs JSON/Markdown presentes em `/tmp`, nenhum estado alterado.
- Inventário SHA-256 antes de R7, incluindo os artefatos não rastreados de R5:
  somente README permitido mudar; nenhum teste/runtime/estado/proteção alterado.

## Riscos e revisão

Risco: repetir alegações históricas OFF/live ou tratar monitor como relatório
publicável. Mitigar com leitura do código/configuração atual e limites explícitos.
O revisor confere os cinco critérios, fontes, links e efeitos observados contra
REVIEW.md; evita repetir suites inalteradas de R5. Não executa refresh de escrita,
build/staging, export de dados reais, import do cliente Python ou probes remotos.
