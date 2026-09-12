# AID-151 — correção do roteamento do Service Worker do OS

**Data:** 2026-08-24  
**Disposição:** IN REVIEW — implementação local concluída; requer verificação independente no próximo deploy candidato

## Resultado

O registro PWA do LiteracyDojo agora respeita o `BASE_URL` do build. No app
standalone ele continua em `/sw.js`; no bundle integrado do OS ele passa para
`/apps/literacydojo/sw.js`, com cache e fallback de navegação limitados ao
mesmo escopo. Assim, o fallback SPA do OS deixa de receber a requisição
incorreta por `/sw.js` descrita em AID-141 e mapeada em AID-144.

O builder do piloto compila LiteracyDojo com base
`/apps/literacydojo/`, inclui o worker nesse caminho e recusa o bundle caso o
artefato esteja ausente. Nenhum estado canônico do learner foi alterado.

## Arquivos da correção

- `engines/literacyDojo/src/pwa.ts`
- `engines/literacyDojo/src/main.tsx`
- `engines/literacyDojo/public/sw.js`
- `engines/literacyDojo/tests/pwaRoute.test.ts`
- `engines/codexdojo-os-prototype/scripts/build-pilot-bundle.mjs`
- `engines/codexdojo-os-prototype/scripts/pilot-bundle-lib.mjs`
- `engines/codexdojo-os-prototype/scripts/pilot-bundle-lib.test.mjs`
- `docs/runbooks/ENGINE_LAB_WEB_PREVIEW.md`
- `engines/codexDojo/ecosystem/MANIFEST.md`

## Evidência executável local

- `npm run test -- --run tests/pwaRoute.test.ts` em `engines/literacyDojo`: **PASS, 2/2**.
- `npm run build -- --base=/apps/literacydojo/` em `engines/literacyDojo`: **PASS**; HTML aponta assets e manifesto para `/apps/literacydojo/`, e `dist/sw.js` foi emitido.
- `node --test scripts/pilot-bundle-lib.test.mjs` no OS: **PASS, 11/11**, inclusive rejeição explícita do worker ausente e proteção de `/sw.js` antes do fallback SPA.
- `npm run lint` em `engines/literacyDojo`: **PASS, 63 arquivos**.
- `npm run lint` no OS: **PASS com 26 warnings preexistentes de CSS**, sem erro.

## Revisão independente necessária

O verificador/QA que produziu AID-141 deve executar o smoke contra um deploy
candidato novo e confirmar:

1. `/apps/literacydojo/sw.js` responde `200` com JavaScript, não HTML;
2. a jornada não solicita `/sw.js` na raiz do OS;
3. o worker controla somente `/apps/literacydojo/`;
4. o primeiro carregamento e a reabertura offline do LiteracyDojo passam;
5. nenhuma conclusão local é apresentada como mastery canônico.

A correção deve ser incorporada no candidato subsequente do OS e aprovada por esse checklist independente antes de qualquer promoção.

### Estado do heartbeat atual

Fechamento técnico concluído no repositório (implementação + validações locais + testes de regressão),
com pendência única de validação do candidato em ambiente OS:

- Revalidação em 2026-08-24: teste focado do LiteracyDojo **2/2**, contrato do bundle **11/11** e build com `--base=/apps/literacydojo/` **PASS**; `dist/sw.js` foi emitido como JavaScript e usa o escopo derivado de `self.location`.
- Revalidação em 2026-08-25 (run `c684ec45-aa51-4f2b-8400-3e222442019b`): foco de smoke local reexecutado com os mesmos resultados (**2/2**, **11/11**, build com `--base=/apps/literacydojo/` **PASS**), sem alteração adicional de implementação.
- O `Content-Type` HTTP e o controle efetivo do escopo são propriedades do host publicado; permanecem no smoke independente e não são inferidos apenas do build local.

- Responsável pela validação independente: time de QA associado ao AID-141.
- Disposição da tarefa: `in_review` com critério de aceitação objetivo documentado acima.
- Bloqueio conhecido: sem a execução desse smoke/inspeção de rota em candidato, não há sinal de produção.

Não houve deploy nem alteração de segredo: promoção de produção depende da
aprovação do CEO e do aceite independente acima.
