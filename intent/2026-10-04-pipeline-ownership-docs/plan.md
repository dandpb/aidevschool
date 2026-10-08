# Plan: R5 documental

Contrato: [spec.md](spec.md). Autorização: [intent.md](intent.md).

## Arquivos

- Novo `docs/handbook/15_pipeline_ownership.md`: mapa com links às fontes atuais.
- `docs/handbook/README.md`: somente a entrada de navegação.
- Este diretório `intent/2026-10-04-pipeline-ownership-docs/`: intent, spec, plan,
  evidência da execução e revisão independente.

## Ordem e riscos

1. Registrar checkout, delta, lacunas de transporte e limites de autorização.
2. Descrever os papéis existentes sem migrar ou repetir a mudança de procedência.
3. Conferir fontes e links; executar testes existentes focados nesses papéis.
4. Obter revisão em contexto separado contra spec, fontes e `REVIEW.md`.
5. Registrar resultados e diff final, sem commit/publicação.

Risco principal: confundir localização do helper com autoridade do estado, ou
campo declarativo com garantia de verificação. Mitigação: ligar símbolos reais,
separar prompt de runtime e declarar limites de concorrência. Não consolidar os
registros históricos, nem mover código para resolver uma ambiguidade documental.

## Verificação

- `git diff --check`: retorno zero; checar também whitespace dos novos Markdown.
- Verificação local dos links Markdown adicionados e da entrada no índice:
  todos os alvos existem; nenhuma dependência de rede.
- `.venv/bin/python -m pytest engines/openclaw/tests/test_pipeline_status.py engines/openclaw/tests/test_phase_map_pinned.py engines/openclaw/tests/test_cli_override.py engines/miniMaxEvolutionEngine/tests/test_os_adapter.py engines/miniMaxEvolutionEngine/tests/test_supervisor_autonomous.py -q -p no:cacheprovider`:
  testes existentes passam; nenhum teste é criado ou editado.
- Inventariar o diff e confirmar que apenas os arquivos documentais permitidos
  mudaram; comparar hashes de arquivos rastreados antes/depois da verificação.

## Revisão independente

Um subagente com contexto novo lê fontes, intent/spec/plan e diff, executa checks
próprios e registra resultado em `review.md`. Não edita implementação ou testes,
não usa override, não publica. O produtor só registra sua execução em `evidence.md`.
