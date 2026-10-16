# Intent: prática inline 02 do dojoToday abre a página diária

Author: Codex QA, observação de runtime C20 · Change-id: 2026-10-16-dojotoday-inline-game-runtime · Status: draft

> Origem: qualificação de [prontidão do ecossistema](../2026-10-15-ecosystem-product-readiness/plan.md), critério 20: “a prática inline oferecida do jogo 02 funciona”. O achado reentra como intent conforme Stage 6 da skill `ai-native-sdlc`. Este registro não aceita uma causa, solução, spec ou plano de implementação.

## Problem

No runtime local preparado para a qualificação, o botão **Jogar aqui (inline)** abre `/games/02/index.html`, mas o iframe exibe outra instância da página diária do dojoToday. O jogo 02 não fica disponível para prática nessa entrada. O [README, seção Jogar inline](../../engines/dojoToday/README.md#jogar-inline), declara que a missão ativa pode ser jogada dentro do dojoToday e que a v1 inclui o jogo 02.

O resultado esperado era carregar o bundle do jogo 02 no iframe e permitir uma interação real com seus controles. Na observação, o documento recebeu HTTP 200, título `dojoToday — sua lição de hoje` e `canvasCount: 0`. A captura mostra **Sua lição de hoje** dentro do card da própria missão. A asserção `C20-game02-real-inline-practice` encerrou `blocked`; o comando do observador terminou com exit 1.

**Severidade proposta: média, restrita à jornada inline.** Quem aciona esse botão numa instância com a mesma preparação não consegue iniciar a prática oferecida, e a qualificação C20 permanece bloqueada. Não foram medidos usuários afetados, tráfego ou impacto de produção. A mesma coleta comprovou a leitura da projeção, o Sócrates offline, a limpeza da configuração vazia, o retorno e a saúde da página. A falha observada não estabelece perda de dados ou alteração de maestria.

### Ambiente e reprodução observados

- Checkout: `/Users/danielbarreto/.codex/worktrees/issue-375-catalog/aidevschool`; `sourceCommit: 0a2e2dbeda5e41b00642a5280e40a0d8102d1102` com candidato local de readiness. O commit sozinho não identifica o diff local; os hashes de fonte abaixo vinculam a observação.
- Coleta final: `2026-10-16T01:42:51.907Z` a `2026-10-16T01:43:06.092Z`; produtor `readiness-dashboard-runtime-producer`, `verifierContext: null`.
- Node `v22.23.2`, Playwright `1.62.0`, Chromium headless, viewport `1280×800`, perfil novo. Zero chamadas de modelo ou uso de credenciais.
- Servidor próprio iniciado em `engines/dojoToday` por `rtk proxy npm run dev -- --host 127.0.0.1 --port 52080 --strictPort`, PID `82093`, encerrado por `SIGTERM` após a coleta. A origem arquivada `http://127.0.0.1:52080/` não representa serviço atualmente disponível.
- Interação: abrir `/` → ir ao card da missão 02 → acionar **Jogar aqui (inline)** → observar o documento real do iframe. O observador aloca uma nova porta estrita a cada reprodução:

```bash
rtk proxy node intent/2026-10-15-ecosystem-product-readiness/evidence/scripts/dashboard-runtime.mjs dojoToday declared-use
```

Os hashes dos sete arquivos canônicos de estado do aprendiz, tanto no worktree quanto no checkout original, permaneceram iguais antes/depois. Os processos próprios foram encerrados e a porta recusou conexão na checagem de limpeza.

### Limite entre preparação e defeito de fonte

A causa ainda precisa ser estabelecida. O README descreve um bundle relativo pré-compilado em `public/games/02/` e um procedimento de build/cópia a partir do voxelDojo. Esse diretório estava ausente na cópia observada. O `package.json` e o `vite.config.ts` lidos não contêm uma etapa automática de cópia ou middleware para esse bundle; a coleta verificou a resposta real do iframe antes de registrar o bloqueio.

A prova estabelece indisponibilidade da prática no ambiente preparado. Ela não determina se a preparação deixou de cumprir um pré-requisito documentado ou se há falha na distribuição, no empacotamento ou no comportamento da rota. Não houve cópia de assets ou reparo de código para obter aprovação. O jogo standalone e um deployment público não foram qualificados por esse caso.

### Fontes e evidências

Todos os caminhos abaixo são relativos à raiz do checkout. Os arquivos sob `.scratch/` e `test-results/` são evidência local gerada, sem promessa de retenção remota. O relatório contém a lista completa de fontes, comandos, mídia e digests.

| Registro | Caminho | SHA-256 |
| --- | --- | --- |
| Relatório final C20 | `.scratch/readiness-implementation-20261015/qa-dashboards/dojoToday-2026-10-16T01-42-51-714Z/report.json` | `4bf5b243c8bf757479b8f34d4eafcbf17cbd01b9cb7b1d93dc6070f546dad007` |
| Documento observado no iframe | `.scratch/readiness-implementation-20261015/qa-dashboards/dojoToday-2026-10-16T01-42-51-714Z/dojoToday-inline-frame.json` | `8be3923a319496f4a2de6ba2d280cb0a39d3556108ac11c5a1ed8d8e71cf9a80` |
| Respostas de rede | `engines/dojoToday/test-results/readiness-plan-runtime/declared-use-2026-10-16T01-42-51-714Z/daily-guidance/network.json` | `5eb79ff62928aadb1ecff6e0a3e7ed6da964a4a3af2d6095364281aef3d65b99` |
| Captura do iframe aberto | `engines/dojoToday/test-results/readiness-plan-runtime/declared-use-2026-10-16T01-42-51-714Z/daily-guidance/inline-open.png` | `479fd7f6edd2f0ffd89d1d41a46dbb004391b871f0eb6855b62511b07c80a035` |
| Trace da execução bloqueada | `engines/dojoToday/test-results/readiness-plan-runtime/declared-use-2026-10-16T01-42-51-714Z/daily-guidance/trace.zip` | `7e7432293218b01b889108ad59930326739ff8b56e8942071530f30215193905` |
| Promessa de uso e preparação | `engines/dojoToday/README.md` | `9e8fd41db0d89cd8bbe29dd7f098a63a4a526e0e7fd267ce04ed488679b82c9a` |
| Comandos do engine | `engines/dojoToday/package.json` | `b5b9f3643c704f252a0487eadb93a979f7cec7dcacec373062ef334f8fe19ec5` |
| Configuração Vite | `engines/dojoToday/vite.config.ts` | `4fcee1ba32301256a40f668e54c747f0034aba7e32fe79fae41a8f8744e5e097` |
| Entrada e carregamento inline | `engines/dojoToday/src/main.ts` | `00f0d44a35eaa9f5b39d63ac7000c989d2084278ee84f9fcf45dd6067fed7447` |
| Critério congelado C20 | `.checks/product-readiness-20261015.md` | `52b0f861cb81849237d09e6cb98ae0c8c154fd09d34325a590d0b45f34ae6c56` |
| Observador reproduzível | `intent/2026-10-15-ecosystem-product-readiness/evidence/scripts/dashboard-runtime.mjs` | `c21035f43f8d7cec9c43391e5a188ddbb0e2f199f8086b01b2e2eb2f38331543` |

Fingerprint agregado das fontes do relatório: `6fa831591891ad48f9e1ee1c620e206c31e1f860f56264eab3bfeaeb89a48106`.

## Proposed outcome

Uma instância preparada pelo caminho oficialmente oferecido carrega o jogo 02 ao acionar **Jogar aqui (inline)**, permite a prática e recolhe o iframe conforme o contrato atual. A preparação necessária é reproduzível e a prova identifica o bundle e a fonte realmente servidos. O resultado permite reavaliar o trecho inline de C20; não concede prontidão global ao dojoToday nem aos demais engines.

## Affected users and systems

Aprendiz que usa a prática inline e facilitador que prepara ou qualifica essa entrada. Sistemas diretamente envolvidos: `engines/dojoToday`, o bundle estático 02 proveniente de `engines/voxelDojo/game-02-warehouse` e as instruções de preparação correspondentes. O estado canônico em `learner/` permanece somente leitura nessa jornada.

## Constraints

- Este arquivo é um intent em rascunho. Aceite do owner, spec, plano, implementação e verificação independente são etapas futuras.
- Preservar o escopo inline 02 atual; não ampliar a oferta para os outros jogos ou criar novo backend.
- Usar ambiente e perfil isolados; preservar o aprendiz real e a separação entre progresso local, evidência e maestria.
- Não editar o critério congelado nem retirar a promessa para converter o bloqueio em aprovação.
- A coleta de readiness e este registro não autorizam publicação, commit, push, deploy ou reparo de produto.
- A preocupação sobre conteúdo ausente no miniTown permanece no relatório de evidência dessa engine; não integra este incidente.

## Open questions

- Qual é o caminho suportado de preparação/distribuição que entrega o bundle relativo 02 para quem recebe o dojoToday? O ambiente observado cumpriu todos os seus pré-requisitos?
- Com essa preparação documentada aplicada numa cópia limpa, a resposta de `/games/02/index.html` passa a ser o jogo ou a página diária continua ocupando a rota?
- Que modos estão efetivamente oferecidos ao piloto, dev local e/ou preview/distribuição estática, e quais precisam da mesma prova?
- O owner ratifica a severidade proposta e o recorte após distinguir falha de preparação de defeito de produto?

### Próxima prova necessária

Uma reprodução numa cópia completa e isolada deve registrar a preparação documentada, os comandos/exits e os hashes do bundle servido, sem cópia improvisada apresentada como comportamento do produto. O navegador real precisa carregar o jogo 02, executar um controle da prática, recolher/reabrir o iframe e capturar DOM, rede, imagem e vídeo. A prova deve conservar o hash do aprendiz e passar por contexto independente, incluindo o julgamento semântico exigido pelo projeto. Se a preparação continuar bloqueada, registrar o pré-requisito concreto e o resultado, mantendo C20 aberto.
