# AID-172 — QA independente do deploy `6a8dbcd3260b4cc6a25a426a`

**Data:** 2026-08-25 UTC  
**Disposição:** **BLOCKED / NO-GO**  
**Severidade máxima:** **Sev 1 — jornada principal pública indisponível**

## Resultado executivo

O candidato imutável não está apto a receber convites. O OS público carrega, mas ao iniciar a
missão recomendada **IA Prática** publica o iframe do LiteracyDojo com origem local:

```text
http://127.0.0.1:5178/?hosted=1&hostOrigin=https%3A%2F%2F6a8dbcd3260b4cc6a25a426a--aidevschool-codexdojo-os.netlify.app
```

Em um browser público limpo isso aponta para a máquina do aprendiz, não para
`/apps/literacydojo/`. A missão não abre; consequentemente não é possível acessar os documentos
legais pela jornada, enviar tentativa, obter verificação independente nem comprovar a ausência de
falso mastery pelo fluxo completo.

**Esperado:** iframe do LiteracyDojo servido pelo próprio bundle público (ou origem HTTPS pública
configurada).  
**Atual:** iframe aponta para `127.0.0.1:5178`.

Evidência visual: [broken-literacydojo-iframe.png](./broken-literacydojo-iframe.png).

## Ambiente e reprodução

- Linux, UTC, Node `v24.18.0`.
- Chromium headless fornecido por `@playwright/test` `1.61.1`.
- URL: `https://6a8dbcd3260b4cc6a25a426a--aidevschool-codexdojo-os.netlify.app`.
- Viewport: 1280 × 800; contexto novo, sem estado persistido.

Passos:

1. Abrir o permalink.
2. Manter a trilha recomendada **IA Prática** e clicar **Entrar na escola**.
3. Clicar **Começar missão**.
4. Inspecionar `iframe[title="Missão IA não é uma fonte de verdade"]`.

Resultado reproduzido: `src` em `http://127.0.0.1:5178/`; o botão interno **Começar missão** não
fica disponível e a espera automatizada expira após 30 s.

## Charters e evidência

### 1. Integridade do candidato e do alias — PASS

`curl -fsSL <url>/<path> | sha256sum` confirmou HTTP 200, hashes iguais entre alias e permalink e
iguais ao manifesto para:

- manifesto `77bf8a7d2512be7e2353912a564439086a7058dd7db51e8294870dcff42de209`;
- OS `f36d610024ec26fea145009f55f2c538272535651ec47591b585dfb905f68a75`;
- LiteracyDojo `ccc53b8f9852079bd64c51cae20d6bf24d0e4561a8f2ccc0917b8414e785c185`;
- termos `385d87d6c123385137dee041abe6f9904b193ad19811cc71e45c7399a6763b12`;
- privacidade `27fe5a37e1aff970029adcd348cb32c0597b1fb3bee5ba4c5eada235b42cd487`;
- WAREHOUSE, WORMHOLE e RELAY STATION conforme o manifesto.

`/sw.js` na raiz retornou 404 como esperado. O alias reproduz exatamente o mesmo bug; não há drift
entre alias e permalink.

### 2. Jornada crítica IA Prática + legais + verificação — FAIL / Sev 1

Bloqueada pelo iframe localhost descrito acima. Os documentos legais existem e retornam HTTP 200
quando acessados diretamente, mas **não** foram validados pela jornada real porque o runtime não
carrega. Nenhuma conclusão de mastery/read-only pode ser emitida para o fluxo remoto completo.

### 3. Regressão técnica do source — PASS com limitação ambiental documentada

- `npm run lint`: exit 0, 26 warnings preexistentes de especificidade CSS.
- `NODE_ENV=test npm run test`: 43 arquivos, 218 testes, todos PASS.
- `npm run build`: PASS, 1.864 módulos transformados.
- `npm run test:pilot-bundle`: 11/11 PASS.

Executar `npm run test` com o `NODE_ENV=production` herdado pelo harness produziu 35 falhas em
React Testing Library (`React.act is not a function`) e 3 suites com resolução de `node:`. A
repetição explícita com `NODE_ENV=test` passou integralmente; triagem: falha de ambiente do runner,
não evidência de regressão do produto.

## Limitações e decisão

- O artefato declara `sourceRevision: local-uncommitted`; não existe commit Git isolado para
  reconstrução independente. A identidade testada é deploy + hash do manifesto.
- Não foi alterado estado canônico ou derivado do learner.
- Smoke/E2E local completo não substitui a falha observada no deploy público e não foi necessário
  para o veredito.

**NO-GO.** Manter HOLD de convites. Dono do desbloqueio: produtor/release owner do
`codexdojo-os-prototype`; ação: publicar novo deploy imutável com a URL pública do LiteracyDojo no
host e solicitar nova QA independente. Este deploy não pode ser aprovado retroativamente.

## Reconciliação após conclusão dos filhos — 2026-08-25T18:29:06Z

AID-174 foi concluída por substituição, não por alteração deste artefato. Uma nova inspeção em
Chromium limpo confirmou que `6a8dbcd3260b4cc6a25a426a` ainda publica o iframe em
`http://127.0.0.1:5178/`; portanto o **NO-GO histórico permanece definitivo**.

O caminho de desbloqueio foi concluído separadamente:

- AID-177 publicou OS `6a8ddcddb4a14cda431ff91e` e LiteracyDojo
  `6a8ddc9afe6838bdcf19a465`;
- AID-178 executou QA independente e emitiu GO somente para esses dois permalinks, com jornada
  limpa, verificador HTTP 200, `context_isolated=true`, `attempt_id` correlacionado, documentos
  legais íntegros, ausência de `mastered` e estado canônico inalterado;
- evidência normativa do sucessor: [AID-178/QA_REPORT.md](../AID-178/QA_REPORT.md).

Disposição final de AID-172: **done como avaliação concluída, resultado NO-GO**. O HOLD desta issue
continua aplicável ao deploy antigo; qualquer remoção de HOLD pelo CEO deve referenciar apenas os
permalinks aprovados em AID-178.
