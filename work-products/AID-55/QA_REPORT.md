# AID-55 — Reteste da correção de workspace e smokes QA

**Data:** 2026-08-22 UTC  
**Disposição:** CORREÇÃO DE WORKSPACE APROVADA; SMOKE DO OS NÃO APROVADO  
**Severidade residual:** Alta para release do CodexDojo OS

## Resultado executivo

Os dois workspaces antes inválidos agora declaram `packages: ["."]` e preservam a política de build de `esbuild` por `onlyBuiltDependencies`. O comando normal do MiniTown passa sem bypass, e o smoke integrado do CodexDojo OS consegue iniciar todos os sete webservers, inclusive o dashboard CodexDojo e o MiniTown. Portanto, o bloqueio de infraestrutura registrado no AID-23 foi removido.

O smoke completo do OS continua reprovado por um defeito distinto de runtime: a página fica em branco e o Vite registra `ReferenceError: $RefreshSig$ is not defined` em `src/app/ServicesProvider.tsx`. Dois testes independentes expiraram aguardando controles que nunca foram renderizados; a execução foi interrompida após a terceira repetição para evitar 69 timeouts redundantes.

## Ambiente

- Debian trixie, Linux, UTC
- Node 24.18.0; npm 11.17.0; pnpm 9.15.9 via `/paperclip/.local/bin`
- Playwright 1.57, Chromium headless já provisionado
- Checkout compartilhado e sujo; alterações preexistentes preservadas
- Estado canônico do learner não foi alterado por QA

## Charters e evidência executável

| Risco / charter | Comando | Resultado |
|---|---|---|
| MiniTown ainda depende de bypass do workspace | `cd engines/miniTown && PATH=/paperclip/.local/bin:$PATH pnpm run smoke` | **PASS**: 1/1, 2,9 s; jornada carregou a cidade e avançou a simulação |
| OS integrado ainda falha ao iniciar engines por workspace inválido | `cd engines/codexdojo-os-prototype && PATH=/paperclip/.local/bin:$PATH DEBUG=pw:webserver npm run test:smoke` | **PASS no critério de workspace**: 7/7 webservers responderam HTTP 200; CodexDojo `:5175`, MiniTown `:5179` |
| OS renderiza a jornada crítica após subir os servidores | mesmo comando | **FAIL**: tela branca; `$RefreshSig$ is not defined`; 2 testes falharam por timeout e 1 foi interrompido |

## Defeito residual reproduzido

1. Execute o smoke integrado acima.
2. Aguarde o OS responder HTTP 200 em `http://127.0.0.1:4174` e os demais webservers ficarem disponíveis.
3. Observe o console do webserver do OS.
4. **Esperado:** onboarding renderiza controles como `Trilha técnica Dev` e `Entrar na escola`; testes prosseguem.
5. **Atual:** página em branco; Vite registra `ReferenceError: $RefreshSig$ is not defined` apontando para `src/app/ServicesProvider.tsx:3`; locators expiram após 30 s.

Evidência gerada pelo Playwright:

- `engines/codexdojo-os-prototype/test-results/accessibility.smoke-keeps--6d390-able-with-semantic-fallback-desktop-1280/test-failed-1.png`
- `engines/codexdojo-os-prototype/test-results/accessibility.smoke-keeps--6d390-able-with-semantic-fallback-desktop-1280/trace.zip`
- `engines/codexdojo-os-prototype/test-results/activation-funnel.smoke-re-03106-nel-without-learner-content-desktop-1280/test-failed-1.png`
- `engines/codexdojo-os-prototype/test-results/activation-funnel.smoke-re-03106-nel-without-learner-content-desktop-1280/trace.zip`

## Triage

- **Resolvido / infraestrutura:** `packages field missing or empty` não reapareceu; pnpm e Vite iniciaram normalmente nos dois workspaces corrigidos.
- **Novo / produto-toolchain do OS:** erro de runtime do React Fast Refresh impede qualquer jornada do OS. Não é indisponibilidade de browser nem falha de inicialização dos workspaces.
- **Impacto:** blocker de release do CodexDojo OS; MiniTown isolado está liberado no escopo deste reteste.

### Reteste focal adicional (2026-08-22 14:09–14:10 UTC)

- Executado: `cd engines/codexdojo-os-prototype && PATH=/paperclip/.local/bin:$PATH npm run test:smoke -- tests/accessibility.smoke.spec.ts -g "keeps the compact"`
- Resultado: reproduziu 3 falhas por timeout em 3 viewports (desktop/tablet/mobile).
- Erro de console repetido em bootstrap do OS:
  - `[vite] (client) [Unhandled error] ReferenceError: $RefreshSig$ is not defined`
  - `> src/app/ServicesProvider.tsx:3:10`
- Falha persistente no fluxo de locators (`getByRole('button', { name: /Trilha técnica.*Dev/ })`) após 30 s.
- Evidência atualizada:
  - `engines/codexdojo-os-prototype/test-results/accessibility.smoke-keeps--6d390-able-with-semantic-fallback-desktop-1280/trace.zip`
  - `engines/codexdojo-os-prototype/test-results/accessibility.smoke-keeps--6d390-able-with-semantic-fallback-tablet-768/trace.zip`
  - `engines/codexdojo-os-prototype/test-results/accessibility.smoke-keeps--6d390-able-with-semantic-fallback-mobile-375/trace.zip`

### Encaminhamento técnico (alta prioridade)

- Bloqueio reaberto para engenharia do CodexDojo OS.  
- Objetivo de correção: eliminar `$RefreshSig$ is not defined` no runtime de desenvolvimento sem alterar dados do learner.  
- Validação de aceite: retestar primeiro onboarding smoke focal; depois, com sucesso, executar `npm run test:smoke` completo.

## Limitações

- O suite do OS tem 72 testes. QA interrompeu após duas falhas completas e uma terceira reprodução do mesmo sintoma; 69 testes não rodaram.
- Lint, unit e build não foram repetidos: AID-55 verifica especificamente a correção de workspace e o desbloqueio dos smokes.
- A execução usa alterações preexistentes do checkout compartilhado; QA não atribui autoria nem aprova mudanças fora dos dois critérios testados.

## Critério para novo reteste

Engenharia deve eliminar o erro `$RefreshSig$ is not defined` no runtime de desenvolvimento do CodexDojo OS. Depois, QA deve repetir primeiro um smoke focal de onboarding e, se passar, o `npm run test:smoke` completo.

### Auditoria de delta antes de novo reteste (2026-08-22 UTC)

- Verificados `git diff` e timestamps de `src/app/ServicesProvider.tsx`, `vite.config.ts` e `playwright.config.ts`.
- Não há mudança posterior à reprodução QA nos arquivos de runtime associados ao defeito: `ServicesProvider.tsx` e `vite.config.ts` permanecem datados de 2026-08-04; a evidência QA mais recente é de 2026-08-22.
- As alterações existentes em `playwright.config.ts` tratam da inicialização de MiniTown/dojoToday e já foram aprovadas no critério de workspace; não eliminam o erro de React Fast Refresh.
- Decisão: não repetir o mesmo smoke sem novo artefato de engenharia. AID-55 permanece **bloqueado**.
- Responsável pelo desbloqueio: **Founding Product Engineer / time do codexdojo-os-prototype**. Ação: entregar correção de runtime e solicitar reteste QA apontando o commit ou diff correspondente.
