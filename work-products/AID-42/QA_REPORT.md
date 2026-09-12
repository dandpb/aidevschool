# AID-42 — validação independente do piloto público gratuito

**Disposição final:** GO para o piloto gratuito, com limitações explícitas  
**Executado em:** 2026-08-22 13:42–13:48 UTC  
**Destino observado:** <https://aidevschool-literacydojo.netlify.app/>  
**Ambiente:** Linux Debian trixie, Node 24.18.0, Chromium headless via Playwright 1.49.1, viewport 360×740.

## Resultado executivo

Após o deploy identificado `6a89abd5f946cce898bf2b09`, o app público responde HTTP 200 e a jornada crítica `abrir → onboarding → mapa → iniciar lição → responder → concluir → resultado` passou nas URLs canônica e imutável em Chromium móvel, sem erro de console e sem requisição para origem externa. A fronteira de aprendizagem foi apresentada corretamente: a conclusão é progresso local neste aparelho e não competência verificada/mastery.

O reteste final encontrou as mensagens “gratuito”, “piloto”, “maiores de 18 anos” e progresso local. Termos e privacidade respondem HTTP 200; o suporte abre o formulário real do repositório no GitHub, redirecionando para login quando não há sessão. AID-44 registra responsável, URL imutável, deploy ID, timestamp e rollback para `6a875db8c5efe0399d609a5b`. A recomendação é GO somente para o piloto local-first declarado; não implica mastery, backend de verificação, robustez ampla ou prontidão para produção geral.

## Charters e evidência

| Risco/charter | Resultado | Evidência |
| --- | --- | --- |
| Disponibilidade e integridade inicial | PASS | `curl` retornou HTTP/2 200, `server: Netlify`, HSTS e asset versionado `/assets/index-B08XG4Ed.js`. |
| Jornada crítica móvel | PASS | Script reproduzível `node work-products/AID-42/public-smoke.mjs`; resultado em `public-smoke-result.json`; screenshots `01-public-onboarding.png`, `02-public-map.png`, `03-public-result.png`. |
| Progresso local sem mastery | PASS com limitação | Resultado público afirma que a lição fica neste aparelho e difere de competência verificada; IndexedDB `literacydojo` criado; nenhuma alteração em `learner/learning_state.yaml` foi observada. |
| Gratuito / piloto / 18+ | PASS no reteste final | Mensagens presentes na entrada e no rodapé do deploy identificado. |
| Termos / privacidade / suporte | PASS com limitação | Termos e privacidade HTTP 200; suporte real no GitHub exige autenticação. |
| Responsável, identidade do deploy e rollback | PASS | AID-44 registra responsável, deploy imutável/ID, timestamp e rollback conhecido. |
| Gate local do checkout atual | PASS após AID-43 | lint PASS; unit PASS 81/81; build PASS; E2E PASS 6/6. |

## Comandos reproduzíveis

```bash
curl -sS -D - -o /tmp/aid42-public.html https://aidevschool-literacydojo.netlify.app/
node work-products/AID-42/public-smoke.mjs > work-products/AID-42/public-smoke-result.json

cd engines/literacyDojo
npm run lint
npm run test
npm run build
npm run test:e2e
npx playwright test playwright/gamification.spec.ts:37 playwright/vertical-slice.spec.ts:36 --project app
```

Resultados locais: lint sem violações; 10 arquivos/81 testes unitários passaram; build Vite passou; E2E falhou 2/6. A repetição focada falhou 2/2 com o mesmo actual (`[]`) contra os contextos esperados (`initial`, `review`). Traces são saída gerada em `engines/literacyDojo/test-results/`.

## Defeitos e triagem

1. **Sev 2 — contrato público incompleto:** esperado: entrada visível identifica piloto gratuito 18+, progresso local, termos, privacidade e suporte real. Atual: somente progresso local é visível e não há links. AID-41 contém mudanças locais relacionadas, ainda não publicadas quando este teste foi executado.
2. **Sev 2 — publicação não auditável/rollback não acionável:** esperado: URL, responsável, commit/deploy ID e instrução curta de restauração. Atual: apenas URL e provedor inferível pelo header Netlify; responsável e versão são desconhecidos.
3. **Sev 2 — regressão do espelho de evidência E2E:** esperado: 1 registro `initial` e depois `initial, review`. Atual: array vazio. Reproduzido duas vezes e delegado em **AID-43**.

## Critérios para reteste e GO

- AID-41 concluída e promovida ao URL público, com mensagens e links exercitados no ambiente remoto.
- AID-43 corrigida e `npm run test:e2e` 6/6.
- Dono do deploy registra commit/deploy ID, timestamp e rollback (restaurar o deploy anterior conhecido) no issue/runbook.
- QA repete o script remoto e abre termos, privacidade e suporte, confirmando status 200/destino real.

## Limitações

- Apenas Chromium móvel 360×740 foi coberto; não houve Safari/Firefox nem teste manual com leitor de tela.
- Não foi testado backend remoto de verificação, analytics ou persistência entre dispositivos; o piloto observado é local-first.
- As mudanças concorrentes de AID-40/AID-41 no workspace não foram tratadas como publicadas nem como prontas.

## Reteste após AID-43 — 2026-08-22 13:59 UTC

- Correção técnica confirmada independentemente: `npm run lint` PASS e `CI=1 npm run test:e2e` PASS, 6/6.
- O URL público continua servindo `/assets/index-B08XG4Ed.js`, o mesmo bundle do primeiro teste.
- O smoke remoto continua completando a jornada sem erro, porém `initialLinks` permanece `[]` e as mensagens `gratuito`, `piloto` e `18+` seguem ausentes.
- Evidência adicional: `public-smoke-retest-result.json`.
- A regressão AID-43 deixou de bloquear. O bloqueio remanescente foi isolado em **AID-44**, atribuída ao CEO: publicar candidato identificado e registrar deploy/rollback antes do novo reteste QA.

## Reteste final após AID-44 — 2026-08-22 14:04 UTC

- URL canônica e deploy imutável `6a89abd5f946cce898bf2b09` completaram a jornada crítica em Chromium 360×740, sem erros de console.
- Copy visível confirma piloto público gratuito, maiores de 18 anos e progresso somente neste navegador.
- Termos e privacidade: HTTP 200 e conteúdo coerente com piloto sem checkout, Pix, assinatura ou cliente pagante.
- Suporte: canal real `github.com/dandpb/aidevschool/issues/new`; HTTP 200 após redirecionamento para login. Limitação: exige conta GitHub para abrir chamado.
- Registro operacional: CEO / Daniel Pinheiro Barreto; publicado em 2026-08-22 14:02:03 UTC; rollback pelo deploy Netlify `6a875db8c5efe0399d609a5b`.
- Evidência: `public-smoke-final-canonical.json`, `public-smoke-final-immutable.json` e screenshots atualizados.
- **Recomendação final: GO para o piloto gratuito declarado**, preservadas as limitações desta matriz de teste.
