# AID-122 — QA independente da integração canônica AID-121

**Data UTC:** 2026-08-24  
**Candidato avaliado:** `3586cb587092abea2c4881b2f6a8b926e9487921`  
**Disposição final:** **GO para o deploy imutável `6a8c366553da9a55fed22b04`**

## Resultado executivo

O candidato é funcional no bundle estático local: LiteracyDojo e WAREHOUSE carregam na mesma origem, o retry corrigido remove o estado rejeitado obsoleto, o produto separa conclusão local de verificação/mastery e os gates focados passam. O contrato de analytics usa nomes, chaves e vocabulários fechados e rejeita resposta, pergunta livre, evidência bruta e caminho canônico.

O bloqueador inicial foi resolvido e revalidado independentemente. O Netlify registra o deploy `6a8c366553da9a55fed22b04` como `ready`, com URL imutável e título contendo o SHA candidato completo. A URL canônica e a imutável entregam os mesmos cinco hashes registrados. Esta QA observou o asset anterior `index-BPUaM4x4.js` antes do ensaio e o candidato restaurado `index-BftoyJQ1.js` depois dele, confirmando a troca. Um browser limpo também montou LiteracyDojo e WAREHOUSE na origem do deploy imutável, mantendo a verificação como “Ainda não enviada”.

## Charters e evidência reproduzível

Ambiente: Linux, Node `22` (lockfile), npm, pnpm `9.15.9`, Chromium Playwright; worktree destacada e limpa em `/tmp/aid122-qa-3586cb5`.

1. **Integridade e fronteira canônica** — executar build/smoke sem alterar `learner/learning_state.yaml`.
   - checksum antes/depois: `36419ae44e755a9bd8bd049b14d0dee03d8b5937e577285f67ffe730733735e2`.
   - `git status --short -- learner`: vazio.
2. **Rotas estáticas críticas** — hospedar runtimes empacotados na origem do OS.
   - `CI=true NODE_ENV=test npm run test:smoke:pilot`: **3/3 PASS**.
   - prova LiteracyDojo, WAREHOUSE, retry 0% → 100%, indisponibilidade honesta do verificador e retorno ao hub.
3. **Progresso honesto e recuperação** — validar save/retry, estado terminal do verificador e ausência de falso mastery.
   - `NODE_ENV=test npm test -- --run src/analytics src/journey src/progress src/host src/app/routes.test.ts src/App.characterization.test.tsx`: **19 arquivos, 121/121 PASS**.
4. **Privacidade de analytics** — tentar inserir texto/respostas/evidência fora do allowlist.
   - `NODE_ENV=test npm run test:analytics:coverage`: **61/61 PASS**, thresholds de linhas/branches/functions/statements em 100%.
   - casos negativos incluem `answer`, `question`, `evidenceRecord`, `deterministicChecks`, `canonicalPath` e checkpoint opaco.
   - `NODE_ENV=test npm run complexity:analytics`: **PASS**, 36 funções, CC máximo 8/8.
5. **Qualidade empacotável**.
   - `npm run lint`: **PASS**, 144 arquivos.
   - `NODE_ENV=production npm run build`: **PASS**.
6. **Rastreabilidade de release e rollback**.
   - `curl https://aidevschool-codexdojo-os.netlify.app/`: HTTP 200, porém asset público `index-BPUaM4x4.js`.
   - bundle local do candidato: `index-BWY3XHqz.js`, SHA-256 `c7c5b7e3ddf482d44e971047127801ca208ee846da3d1b563dc2429d63ceb84f`.
   - **PASS após AID-123**: candidato `6a8c366553da9a55fed22b04`; anterior `6a877a6a68d0cee5f09b3934`; rollback e restauração mudaram o asset canônico de `BftoyJQ1` para `BPUaM4x4` e de volta para `BftoyJQ1`.
   - API Netlify revalidada pela QA: estado `ready`, `published_at=2026-08-24T12:18:04.249Z`, permalink imutável e título `AID-123 candidate SHA 3586cb587092abea2c4881b2f6a8b926e9487921 complete pilot bundle`.
   - Probes independentes: HTTP 200 e hashes idênticos entre alias canônico e permalink para OS, LiteracyDojo, WAREHOUSE, WORMHOLE e RELAY STATION.

## Triagem

- **RESOLVIDO:** correlação deploy ↔ SHA e alvo de rollback verificável entregues em AID-123 e reproduzidos por QA.
- **INFRA (não defeito de produto):** uma tentativa sem `NODE_ENV=test` ativou `react-dom-test-utils.production.js` e falhou 18 testes antes de renderizar (`React.act is not a function`). A receita documentada com `NODE_ENV=test` passou 121/121.
- **FOLLOW-UP não bloqueante:** o fluxo de publicação permitiu dois deploys parciais durante falhas de dependências de desenvolvimento. O pipeline precisa de fail-fast e deve impedir publicação quando o bundle não estiver completo.
- **WARN não bloqueante:** builds alertam chunks acima de 500 kB; não houve falha funcional ou orçamento de performance no escopo.

## Limitações

- Não foi autorizado nem executado deploy, rollback externo ou mutação de configuração Netlify.
- Não houve teste com aluno real, mobile, rede degradada ou navegadores além do Chromium do smoke.
- A validação cobre o SHA citado; qualquer novo SHA exige nova execução.

## Aceite final

**GO** restrito ao deploy imutável `6a8c366553da9a55fed22b04` e ao SHA `3586cb587092abea2c4881b2f6a8b926e9487921`. Qualquer mudança de SHA ou deploy exige nova correlação e nova validação. O aceite não declara mastery, robustez geral nem validação com alunos reais.
