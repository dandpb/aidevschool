# AID-113 — validação independente do build LiteracyDojo

**Data (UTC):** 2026-08-24  
**Checkout:** `9d4b744` com alterações locais atribuídas à correção  
**Escopo:** `engines/literacyDojo/` e conteúdo de entrada em `curriculum/ai-literacy/`  
**Ambiente:** Node `v24.18.0`, npm `11.17.0`, Python `3.13.5`, Linux headless

## Disposição

**APROVADO para integrar a correção do build, sem defeito bloqueante observado.**

A dependência de caminho absoluto foi removida de `gen:content`: o comando agora resolve
`${PYTHON:-python3}` e funcionou pelo `PATH` deste ambiente. `@types/node` está declarado no
manifesto e lockfile. O build TypeScript/Vite encerrou com código 0.

## Cartas de risco e evidência

| Risco | Verificação | Resultado |
| --- | --- | --- |
| Gerador não portável ou conteúdo inválido | `npm run gen:content` | PASS — 17 lições `ready`, 0 `planned`; read model gerado |
| Erro estático no código alterado | `npm run lint` | PASS — 61 arquivos, nenhuma correção aplicada |
| Regressão de domínio, adapters ou fluxo React | `npm test` | PASS — 10 arquivos, 81 testes |
| Correção incompleta do build de produção | `npm run build` | PASS — `tsc -b && vite build`; 68 módulos; bundle JS 285,04 kB (88,03 kB gzip) |
| Quebra das jornadas críticas do learner | `npm run test:e2e` | PASS — 6/6 Playwright (gamificação, revisão, rotas do Mapa Inicial, viewport compacto e PWA offline) |
| Geração altera fonte/read model sem mudança esperada | `git diff --exit-code -- engines/literacyDojo/src/data/generated/lessons.ts` | PASS — sem divergência |
| QA altera estado canônico | `git status --short -- learner/learning_state.yaml` | PASS — arquivo canônico não modificado |

Todos os comandos foram executados a partir de `engines/literacyDojo`, exceto a inspeção Git,
executada na raiz. Os hooks `pretest`, `prebuild` e `pretest:e2e` também repetiram com sucesso a
geração do conteúdo.

## Triage e limitações

- Os avisos de runner sobre `NO_COLOR` ignorado por `FORCE_COLOR` são ruído de infraestrutura;
  não houve falha nem impacto funcional observado.
- A aprovação cobre o checkout e ambiente acima. Não valida deploy público, matriz de versões
  Node suportadas, navegadores além do Chromium headless, nem disponibilidade de um endpoint
  externo de verificação.
- `.mavis/learning_state.yaml` já constava modificado no worktree e permaneceu fora do escopo;
  nenhuma escrita de QA foi feita nele. O arquivo canônico `learner/learning_state.yaml` não consta
  modificado.
- Não foram implementadas correções de produto durante esta validação.
