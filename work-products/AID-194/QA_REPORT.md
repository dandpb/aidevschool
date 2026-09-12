# AID-194 — QA independente do candidato WAREHOUSE corrigido

**Data:** 2026-08-26 UTC  
**Candidato imutável:** `6a8e4946e0a6aeca65a0ce65`  
**Disposição:** **NO-GO — blocker crítico de retry/verificação**

## Resultado executivo

A correção de empacotamento foi confirmada: o iframe WAREHOUSE carrega no subpath publicado,
inicializa WebGL e permite jogar. Porém, a jornada crítica falha quando o aluno erra e usa o retry
oferecido pelo próprio jogo. A primeira evidência `pass:false` terminaliza a sessão no host como
`Evidência rejeitada`; a segunda tentativa correta gera evidência `pass:true` no iframe, mas o host
não a ingere nem executa nova verificação. O candidato não está pronto para coorte.

## Charters de risco

1. Revalidar a correção do blocker anterior: subpath/MIME, iframe e WebGL.
2. Exercitar WAREHOUSE como aprendiz: tentativa incorreta, retry visível e tentativa correta.
3. Confirmar que cada tentativa fica auditável e que a tentativa correta chega ao verificador
   separado sem alterar estado canônico.
4. Rodar checks locais mínimos para separar defeito publicado de regressão no jogo.

## Ambiente e comandos

- Linux, UTC; Chromium headless de `@playwright/test` 1.61.1; viewport 1280×800.
- Deploy Netlify imutável, sem promoção de alias.
- Checkout compartilhado já estava sujo; alterações do usuário foram preservadas.

```text
cd engines/codexdojo-os-prototype && npm run test:pilot-bundle
cd engines/voxelDojo/game-02-warehouse && pnpm run lint
cd engines/voxelDojo/game-02-warehouse && pnpm run test
cd engines/voxelDojo/game-02-warehouse && pnpm run typecheck
cd engines/voxelDojo/game-02-warehouse && pnpm run build
node work-products/AID-194/qa-warehouse-candidate.mjs
```

## Evidência

- PASS — bundle pilot: 17/17 testes.
- PASS — unit WAREHOUSE: 3 arquivos, 19/19 testes.
- PASS — typecheck.
- PASS — build Vite, 31 módulos.
- INFRA — lint: Biome processou zero arquivos porque `src` e `playwright` são ignorados pela
  configuração; falha já registrada anteriormente e sem sinal de defeito funcional.
- PASS — iframe navega para `/apps/warehouse/?hosted=1...`, título WAREHOUSE correto, WebGL ativo,
  sem erros de console. Isso fecha o blocker de MIME/subpath do candidato anterior.
- FAIL — retry integrado:
  - tentativa 1: HUD `Wave failed — evidence emitted. Retry?`, evidência bruta `pass:false`, acurácia 0;
  - retry: estado reiniciado em `predicting`, `pendingIndex:0`;
  - tentativa 2: HUD `Wave cleared — evidence emitted.`, evidência bruta `pass:true`, acurácia 1;
  - host permanece `Evidência rejeitada`; não aparece `Verificação independente aprovada`;
  - IndexedDB contém apenas a primeira tentativa, `status: gateway-unavailable`; a segunda não é
    persistida e não recebe recibo/`attempt_id` separado.

Artefatos reproduzíveis:

- `qa-warehouse-candidate.mjs` — roteiro executável;
- `qa-result.json` — estados, duas evidências do iframe e registro IndexedDB;
- `warehouse-pass.png` — tela final mostrando WAREHOUSE concluído e host rejeitado.

## Defeito e impacto

**Severidade crítica — sessão do host terminaliza no primeiro FAIL e ignora retry válido.**

Esperado: ao escolher `Retry level`, iniciar uma nova tentativa correlacionada; a evidência correta
deve ser persistida e enviada ao verificador, produzindo recibo independente, mantendo o gate
canônico separado.

Atual: o jogo aceita e conclui o retry, mas o host já marcou a prática como concluída/rejeitada e
ignora a evidência seguinte. Um aprendiz que erra uma vez não consegue recuperar a missão dentro do
fluxo oferecido.

Triagem: defeito de integração/produto entre ciclo de vida da sessão do OS e o retry do engine, não
falha Netlify, CSP, MIME, WebGL ou lógica do WAREHOUSE.

## Limitações e decisão

Não foram testados WORMHOLE/RELAY, outras viewports nem alias, pois AID-194 está restrita ao
WAREHOUSE e o blocker crítico já determina a disposição. Nenhum learner state canônico foi escrito.

**NO-GO.** Manter alias e convites em HOLD. Engenharia deve tornar a falha recuperável por nova
tentativa real (novo run/attempt ou reabertura explicitamente contratada), persistir/verificar a
evidência seguinte e publicar outro candidato imutável para QA independente.
