# AID-65 — Reteste dos smokes integrados após correção Fast Refresh

**Data:** 2026-08-22 UTC  
**Aplicação:** `engines/codexdojo-os-prototype`  
**Disposição:** FAST REFRESH APROVADO; RELEASE BLOQUEADO POR DOIS DEFEITOS RESIDUAIS  
**Severidade:** alta

## Resultado executivo

A correção que torna `react-grab` e `react-scan` opt-in eliminou o erro de bootstrap
`$RefreshSig$ is not defined`. A guarda unitária passou (3/3), e o smoke focal que antes
falhava passou nas três viewports (3/3). O smoke completo iniciou todos os runtimes e
exercitou 72 casos, mas terminou com **52 passados, 10 falhos e 10 ignorados** em 9,1 min.

O OS ainda não está pronto para release. Nove falhas compartilham uma quebra de contrato entre
o host e o LiteracyDojo: a UI embarcada oferece **“Começar missão”**, enquanto os smokes procuram
o nome acessível exato **“Começar”**. A décima falha ocorre após o PixelQuest confirmar
`Evidencia PASS emitida`: o host não renderiza `.embedded-evidence` com `01_rate_limiter`.

## Ambiente

- Debian trixie, Linux, UTC
- Node 24.18.0; npm 11.17.0; Playwright 1.57; Chromium headless provisionado
- Checkout compartilhado e sujo; alterações preexistentes preservadas
- Estado canônico do learner não foi alterado por QA
- Uma primeira tentativa foi impedida por Vites órfãos deste checkout na porta 4174 e demais
  portas integradas. Os PIDs foram identificados e encerrados de forma restrita antes do reteste.

## Charters e evidência executável

| Risco / charter | Comando | Resultado |
|---|---|---|
| MiniTown continua operável isoladamente | `cd engines/miniTown && pnpm run smoke` | **PASS 1/1**, 2,2 s |
| Instrumentação volta a contaminar Fast Refresh | `npm run test -- src/devInstrumentation.test.ts` | **PASS 3/3** |
| OS ainda fica branco no onboarding | `npm run test:smoke -- tests/accessibility.smoke.spec.ts -g "keeps the compact"` | **PASS 3/3**, desktop/tablet/mobile |
| Jornadas integradas permanecem operáveis | `npm run test:smoke` | **FAIL**: 52 pass, 10 fail, 10 skip; 9,1 min |

## Defeito 1 — contrato de ação inicial do LiteracyDojo

**Severidade:** alta para o gate integrado; provável drift de contrato/teste.  
**Abrangência:** 9 falhas: activation funnel (3 viewports) e dois learning slices (3 viewports cada).

1. Execute `npm run test:smoke` no OS.
2. O host abre `iframe[title="Missão IA não é uma fonte de verdade"]` e a missão renderiza.
3. **Esperado pelo contrato automatizado:** botão acessível `Começar` exato permite iniciar.
4. **Atual:** o iframe expõe `Começar missão`; o locator exato aguarda 30 s e expira.

Evidência representativa:

- `engines/codexdojo-os-prototype/test-results/activation-funnel.smoke-re-03106-nel-without-learner-content-desktop-1280/error-context.md`
- `engines/codexdojo-os-prototype/test-results/activation-funnel.smoke-re-03106-nel-without-learner-content-desktop-1280/trace.zip`
- `engines/codexdojo-os-prototype/test-results/learning-slice.smoke-compl-27e1d--changing-canonical-mastery-desktop-1280/error-context.md`

## Defeito 2 — recibo de evidência PixelQuest ausente no host

**Severidade:** alta para a jornada de evidência integrada.  
**Abrangência:** 1 falha desktop; casos equivalentes são intencionalmente ignorados em tablet/mobile.

1. No Engine Hub, abra PixelDojo Quest e conclua o treino de token bucket conforme o smoke.
2. O iframe exibe `Evidencia PASS emitida`.
3. **Esperado:** o OS recebe e apresenta `.embedded-evidence` contendo `01_rate_limiter` e
   `Verificação independente obrigatória`.
4. **Atual:** `.embedded-evidence` não existe após 5 s; o recibo não aparece no host.

Evidência:

- `engines/codexdojo-os-prototype/test-results/engines.smoke-operates-the-62424-HASH-RING-inside-Engine-Hub-desktop-1280/error-context.md`
- `engines/codexdojo-os-prototype/test-results/engines.smoke-operates-the-62424-HASH-RING-inside-Engine-Hub-desktop-1280/trace.zip`

## Triage e limitações

- **Fast Refresh:** resolvido com evidência independente; nenhuma tela branca ou
  `$RefreshSig$ is not defined` reapareceu.
- **MiniTown:** smoke isolado aprovado; o bloqueio residual está no OS integrado, não no Level 0.
- **Colisão inicial de porta:** infraestrutura residual, resolvida antes da medição válida.
- **LiteracyDojo:** a aplicação carregou e mostrou conteúdo; a falha é drift do nome acessível
  entre runtime e contrato automatizado, não indisponibilidade do iframe.
- **PixelQuest:** o jogo concluiu e emitiu evidência internamente; a falha está no transporte ou
  renderização do recibo pelo host.
- Não foram repetidos lint, build e toda a suíte unitária: AID-65 é um reteste focal seguido do
  smoke integrado. A guarda modificada recebeu teste unitário direto.
- QA não implementou correções e não atribui autoria sobre o checkout compartilhado.

## Critérios para novo reteste

1. Alinhar e documentar o nome acessível da ação inicial do LiteracyDojo; repetir os três specs
   afetados nas três viewports.
2. Restaurar o recibo de evidência PixelQuest no Engine Hub; repetir o caso desktop focal.
3. Se ambos passarem, repetir `npm run test:smoke` completo antes de declarar prontidão.
