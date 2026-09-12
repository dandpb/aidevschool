# AID-70 — Revisão independente de AID-66 e reconciliação dos smokes AID-65

**Data:** 2026-08-22 UTC  
**Aplicação:** `engines/codexdojo-os-prototype`  
**Disposição:** APROVADO NO GATE DE SMOKE; LIMITAÇÃO UNITÁRIA ABERTA  
**Severidade residual:** média (infraestrutura de testes unitários)

## Resultado executivo

AID-66 corrige, com evidência independente no navegador, os dois bloqueios registrados em
AID-65. Os fluxos LiteracyDojo agora usam o nome acessível real `Começar missão`, e o recibo de
evidência do PixelQuest volta a aparecer no host. O recorte focal passou com 19 casos e 8 skips
intencionais; em seguida, o smoke integrado completo passou com **62 casos e 10 skips
intencionais**, sem falhas, em 5,2 min.

A cadeia de smokes AID-55 → AID-65 → AID-66 está reconciliada. Este veredito aprova o gate de
smoke do CodexDojo OS no checkout avaliado; não declara prontidão irrestrita de release porque a
suíte unitária React do host está quebrada antes das asserções.

## Ambiente

- Debian trixie, Linux, UTC
- Node 24.18.0; npm 11.17.0; Playwright 1.57; Chromium headless
- Checkout compartilhado e sujo; alterações preexistentes preservadas
- Estado canônico do learner não foi editado por QA

## Charters e resultados

| Risco / charter | Comando | Resultado |
|---|---|---|
| Drift do nome acessível ainda bloqueia a missão LiteracyDojo | `npm run test:smoke -- tests/activation-funnel.smoke.spec.ts tests/learning-slice.smoke.spec.ts tests/engines.smoke.spec.ts` | **PASS:** 19 pass, 8 skip, 1,7 min |
| Evidência PixelQuest é emitida no iframe mas não recebida pelo host | Mesmo comando focal; caso `operates the real dashboard, PixelQuest, and HASH RING inside Engine Hub` | **PASS:** desktop, 6,4 s |
| Correções focais introduzem regressão na cadeia integrada | `npm run test:smoke` | **PASS:** 62 pass, 10 skip, 5,2 min |
| Guardas unitárias do Engine Hub continuam executáveis | `npm run test -- src/engines/EngineHubApp.test.tsx src/engines/registry.test.ts` | **INFRA FAIL:** registry 17/17 pass; EngineHub 14/14 falham antes das asserções com `React.act is not a function` |

Todos os comandos Playwright foram executados em `engines/codexdojo-os-prototype`.

## Triage

- **Produto / AID-66:** os dois sintomas de AID-65 não reapareceram; os critérios de reteste foram
  satisfeitos no smoke focal e no completo.
- **Infraestrutura unitária:** `@testing-library/react` entra em `react-dom-test-utils.production.js`
  e tenta chamar `React.act`, ausente no runtime carregado. As 14 falhas têm a mesma causa antes de
  qualquer asserção do Engine Hub; não constituem 14 defeitos funcionais.
- **Skips:** os 10 skips do smoke completo são declarados pelos specs para cenários desktop-only e
  para o caso móvel executado somente no projeto `mobile-375`; não são falhas ocultas.
- **Warnings:** `NO_COLOR` ignorado porque `FORCE_COLOR` está definido; sem impacto funcional.

## Limitações e disposição

- Não foram repetidos lint e build: AID-70 revisa especificamente as correções de AID-66 e o gate
  de smokes definido em AID-65.
- A suíte unitária React deve ser reconciliada separadamente antes de uma declaração ampla de
  prontidão de release.
- **Disposição de AID-70:** `done`; gate de smoke aprovado com evidência independente.
