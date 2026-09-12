# AID-254 — QA independente da promoção registrada em AID-253

**Data:** 2026-08-28 UTC  
**Disposição:** **GO — promoção verificada independentemente**

## Resultado

Nenhum defeito bloqueador, crítico, alto ou médio foi reproduzido no deploy de produção
`6a9141bc5ac75e6a300cc00e` nem no alias canônico. O risco de rastreabilidade que condicionava
AID-251 foi encerrado: o manifesto publicado referencia um commit Git imutável existente, a tree
confere com o registro de AID-253, permalink e alias servem bytes idênticos, e as duas jornadas
críticas passaram nos três viewports em ambos os endereços.

Esta verificação não altera learner canônico e não declara mastery, paridade ou robustez geral.

## Charters de risco executados

1. **Identidade e supply chain:** conferir hash do manifesto, revisão Git, tree e igualdade entre
   permalink e alias.
2. **Regressão pós-promoção:** executar a jornada IA Prática (recuperação, verificação, persistência
   e troca de trilha) e a jornada Dev (WAREHOUSE, evidência, verificação e retorno ao hub).
3. **Responsividade crítica:** repetir as jornadas em desktop 1280, tablet 768 e mobile 375.
4. **Integridade do learner:** comparar os hashes das duas vistas canônicas antes e depois.

## Evidência reproduzível

Ambiente: Linux 6.8.0-111-generic x86_64, Node 24.18.0, npm 11.17.0,
Playwright 1.62.1, Chromium, rede pública para Netlify.

```text
curl -fsSL https://6a9141bc5ac75e6a300cc00e--aidevschool-codexdojo-os.netlify.app/pilot-bundle-manifest.json | sha256sum
ddf404d93468bcf0cea776b080990774cd2b68566aa163b60d2b5f682c7fc6b7  -

curl -fsSL https://aidevschool-codexdojo-os.netlify.app/pilot-bundle-manifest.json | sha256sum
ddf404d93468bcf0cea776b080990774cd2b68566aa163b60d2b5f682c7fc6b7  -

git cat-file -t ec265fab13ac98700e9de58b5d719d55d979178d
commit

git show -s --format='commit=%H%ntree=%T' ec265fab13ac98700e9de58b5d719d55d979178d
commit=ec265fab13ac98700e9de58b5d719d55d979178d
tree=89a4cc24eb3812521236af26a6d4bd7ff0447f43

cd engines/codexdojo-os-prototype
QA_BASE_URL=https://6a9141bc5ac75e6a300cc00e--aidevschool-codexdojo-os.netlify.app \
  npx playwright test tests/release-journeys.smoke.spec.ts --reporter=line
6 passed (40.6s)

QA_BASE_URL=https://aidevschool-codexdojo-os.netlify.app \
  npx playwright test tests/release-journeys.smoke.spec.ts --reporter=line
6 passed (42.7s)
```

O manifesto dos dois endereços declara
`sourceRevision: ec265fab13ac98700e9de58b5d719d55d979178d`. A tree observada é a mesma registrada em
AID-253 (`89a4cc24eb3812521236af26a6d4bd7ff0447f43`).

Hashes antes e depois da bateria, sem alteração:

```text
c3cae54c452413b75b64f1e97ab6f34fe9d529a8be4b50fdccf861696d230bbf  learner/learning_state.yaml
a900918aeb4c29298d5a672bb6c2c9c66c7185f7b14be35c2db40a212c861bdc  .mavis/learning_state.yaml
```

## Triagem

- **Produto:** nenhum defeito observado nesta cobertura.
- **Infraestrutura:** nenhuma falha; apenas avisos não bloqueadores de conflito entre `NO_COLOR` e
  `FORCE_COLOR` emitidos pelos servidores auxiliares do Playwright.
- **Rastreabilidade:** condição de AID-251 encerrada por evidência executável.

## Limitações explícitas

- Cobertura automatizada em Chromium; Firefox, WebKit, leitor de tela e dispositivos físicos não
  foram executados.
- Não houve teste de carga, longa duração ou offline real.
- A bateria é focada nas jornadas de release e não substitui a suíte completa de cada engine
  embutido.

## Disposição final

**GO para a promoção já realizada. AID-254 concluída; sem defeito filho a abrir.**
