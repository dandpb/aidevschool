# SDLC Quest v1.3 — Relatório de execução e revisão

Data: 16/09/2026. Avaliação interna; nenhum subagente independente executado.

## Escopo e lacuna principal

A versão v1.2 foi preservada. A v1.3 adiciona a central de execução com seis gates, vinculada à oficina TLC, e um runner local para validar o próprio jogo.

**Não é uma integração real confirmada com `dandpb/harness-toolkit`.** O repositório indicado não pôde ser lido nesta sessão. Não foram verificados seus comandos, API, commit ou licença; nenhum código dele foi copiado ou executado. O jogo exibe a referência e o status pendente. Consulte `docs/harness/integration-status.md`.

## Resultado final executado

| Bateria | Resultado |
|---|---:|
| Testes de regras e regressão | 301 passaram; 0 falharam; 0 ignorados |
| Campanha original — desktop | 144 verificações |
| Campanha original — mobile | 133 verificações |
| Oficina TLC — desktop | 261 verificações |
| Oficina TLC — mobile | 261 verificações |
| Harness Lab — desktop | 163 verificações |
| Harness Lab — mobile | 163 verificações |

Nenhum erro JavaScript registrado nas seis jornadas finais. Nenhuma requisição HTTP de runtime nessas jornadas. Os números são asserções com sobreposições; não significam funcionalidades distintas, validação de um toolkit externo ou cobertura universal.

Os 301 testes contêm os 231 anteriores, 61 testes da camada didática e 9 do runner. Incluem bloqueio de ordem, autodeclaração, patch incorreto, suíte superficial/placebo, erro/ausência do verificador, evidência antiga, mudança de entradas, nova execução de uma etapa já validada, budget, estrutura de backup, processo com erro, timeout, executável inexistente e parâmetros que tentam pular checks.

## Recibo real do runner

- Runner: `node tools/quest-gate.cjs`, código próprio deste projeto.
- Execução final: `local-2026-09-16T20-55-19-660Z-3192`.
- Início: `2026-09-16T20:55:19.663Z`.
- Fim: `2026-09-16T20:57:16.517Z`.
- Nove passos concluídos: validação estrutural do contrato, build, regras e seis jornadas.
- Exit code final: **0**, para verificações locais.
- Snapshot das entradas antes/depois: **idêntico**.
- HTML: **277,313 bytes**.
- SHA-256 do HTML: `f942bb7d6d1d820c27850f7acb2de3a12e3bcc89d0dc810ce95a4adae7a4fcfd`.
- Recibo completo: `evidence-v1.3/runs/local-2026-09-16T20-55-19-660Z-3192/run.json`.
- Logs de cada comando e seus hashes estão no mesmo diretório.

O recibo mantém `productionAuthorized: false`, `adapterExecuted: false` e `independentReview: not-executed`. Ele é local e não assinado. Seu hash identifica conteúdo, mas não autentica quem executou. O requisito opcional de release retorna bloqueio por falta de autorização externa; o mapeamento desse exit code foi testado por unidade, não por uma segunda jornada CLI completa com a opção ativada.

O HTML foi reconstruído após a execução e produziu o mesmo hash. Nenhuma alteração de código foi feita após os checks finais.

## O que o novo laboratório prova e não prova

O motor local recusa saltos e declarações sem execução. A suíte completa avalia de fato 15 asserções JavaScript em memória: a baseline defeituosa e o mutante devem falhar, enquanto a candidata correta passa. Um erro ou zero resultados impede o avanço.

Uma edição invalida os recibos dos passos dependentes. Reexecutar uma etapa também invalida os recibos posteriores, para que o parecer não permaneça vinculado a uma execução anterior. Três falhas de uma etapa interrompem a execução; editar uma entrada não remove esse limite. Nova execução é uma decisão explícita, preservando as entradas e descartando os recibos da sessão anterior após confirmação.

O parecer de Judge é uma fixture claramente marcada; não é um agente revisor real. A candidata é uma função predefinida, não uma feature implementada por IA. O pacote local nunca autoriza produção. Não são exercitados HTTP, autenticação de API, concorrência real, credenciais, processos externos do toolkit ou CI protegido.

## Revisão e correções durante o trabalho

1. A revisão das regras encontrou uma lacuna de vínculo: reexecutar um passo com as mesmas entradas poderia manter uma revisão posterior. O motor agora invalida os dependentes em toda nova execução. Há regressões específicas para cada etapa.
2. As primeiras jornadas de browser foram interrompidas durante navegação com filtro de blur no backdrop. Removi esse filtro, mantendo um fundo escurecido, inicialmente no laboratório e depois nos diálogos existentes. As jornadas completas terminaram com a versão final. Não foi um benchmark controlado de desempenho.
3. A informação de integração pendente ocupava espaço excessivo no mobile. O status continua sempre visível; os detalhes foram recolhidos em uma seção expansível.
4. A restauração foi deliberadamente limitada a entradas do laboratório. Recibos e flags de aprovação presentes num backup não recompõem uma execução. As campanhas existentes mantêm a progressão prevista.
5. Downloads do pacote exigem validações atuais no handler, além de o botão estar desabilitado. Um teste removeu o atributo disabled e confirmou que isso não produz um pacote válido.

Logs de tentativas iniciais e um recibo interrompido permanecem em `evidence-v1.3/` para rastreabilidade. Eles não contam como execuções aprovadas. A referência de aceitação é o recibo final identificado acima.

## Browser e inspeção visual

Chromium 144.0.7559.96, com `Playwright.set_content`. Perfis de 1440 e 390 px; estados adicionais em 320 e 768 px. Os novos testes amostraram 21 estados no perfil desktop e 21 no móvel, incluindo repetições dos tamanhos adicionais. Verificam overflow, limites do diálogo e amostras de contraste de texto; não são certificação WCAG. Screenshots do início, falhas, verificação, pacote, invalidação e budget estão em `evidence-v1.3/harness/`.

A navegação `file://` foi tentada e negada com `ERR_BLOCKED_BY_ADMINISTRATOR`. O erro está em `evidence-v1.3/browser-probe.json`. As jornadas usam um double explícito de armazenamento em memória. O caminho nativo de armazenamento indisponível também funciona nos testes.

Não validados: abertura por duplo clique no Mac, persistência nativa entre sessões, Safari, Firefox, celulares físicos, leitores de tela reais, eficácia pedagógica com participantes, revisão independente e integração autenticada com o repositório solicitado.

## Próximo requisito para a integração real

Disponibilizar o ZIP ou acesso ao código verdadeiro de `dandpb/harness-toolkit`, incluindo README e arquivos de execução. A partir disso, identificar a interface efetiva e validar o adaptador contra ela. Não basta renomear o runner do Quest ou aceitar um JSON externo como aprovação.
