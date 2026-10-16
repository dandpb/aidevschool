# Qualificação informativa dos 14 engines — 15/10/2026

**O ecossistema ainda não está qualificado para oferta do piloto.** Este relatório não concede `ReadinessTier`, não altera o aprendiz e não substitui assessments no fluxo canônico. A aprovação de código, a publicação, o deploy, a verificação de main e o aceite de Daniel são provas separadas.

Task: `intent/2026-10-15-ecosystem-product-readiness/plan.md`.
Base observada: `0a2e2dbeda5e41b00642a5280e40a0d8102d1102`.
Candidato: árvore privada com os patches dos PRs #657 e #656 e novas provas; os relatórios preservam os fingerprints dos arquivos que efetivamente observaram. Reparos registrados em commits locais separados `616eb230` (#657) e `caa6d8bb` (#656); sem publicação.

## Reparos locais

- #657: patch reutilizado sem reescrita. Os mesmos testes passaram de 15 falhas/109 passes para 124 passes. Regressão compartilhada: 918 passes, 2 skips opcionais. O gate recusa um pass de jogo sem recibo independente e mantém o backing multirregistro e o histórico válido.
- #656: patch reutilizado, incluindo a edição delimitada do teste expressamente autorizada por Daniel. Testes discriminantes: 54 falhas antes, 57 passes depois. A1/A2/A3 v4 e identidades inválidas têm provas próprias. O app passou em lint, 273 testes unitários (1 skip), build e 34 testes de browser.
- C12: uma indisponibilidade HTTP real, seguida de reinício e retry, preservou progresso/evidência e produziu recibo vinculado à tentativa a3; o aprendiz canônico permaneceu igual.
- C11: a exigência de conclusão da UI com última atividade a1/a2/a3 contradiz a navegação sequencial oferecida, que termina em a3. A observação de a3 passou; o critério permanece sem prova até a renegociação humana pendente. Não foi alterado para esconder a contradição.
- Endpoint publicado, checks dos PRs, countersign, merge e lane de main permanecem pendentes. Nenhuma prova local identifica o source SHA atualmente servido pelo deploy.

## Uso declarado observado

Os resultados abaixo são evidências de produtores de runtime. A qualificação final exige contexto independente e, para capturas, o julgamento semântico previsto em AGENTS.md. O pacote exato está em [engine-qualification.json](../evidence/observations/2026-10-15-ecosystem-beta-readiness/engine-qualification.json).

| Engine | Evidência obtida | Bloqueio ou lacuna restante |
|---|---|---|
| aiDevschoolMvp | Hermes nativo: instalação, primeira lição, tentativa dos gates e parada literal nos erros | G1/G3 chamados sem argumentos exigidos; G4 sem julgamento registrado; scheduler/card/retorno e variantes pendentes |
| codexDojo | Projeção, próxima ação, clipboard real, destino OS real e build sem URL | Julgamento semântico e verificação independente |
| codexdojo-os-prototype | Onboarding e 8/39 missões, 24 atividades | 31 missões, Hub/recovery e semântica sem prova; execução interrompida |
| dojoToday | Projeção, offline Sócrates, configuração vazia/limpeza e retorno | Jogo inline 02 renderizou a página dojoToday; BYOK real pendente |
| literacyDojo | 23/23 lições e 69 atividades via DOM; retry dos 7 tipos, onboarding e reload | 3 desafios/reviews, semântica, C11 e endpoint publicado pendentes |
| miniMaxEvolutionEngine | Claude nativo com produtores/verificadores distintos; spec PASS; implementação rejeitada e parada correta | Entrada documentada não resolve; cinco fases incompletas; autonomia não observada |
| miniTown | Câmera, relógio, noite/HUD, reentrada e recovery | Entrada vazia; conteúdo de cidade descrito e semântica sem prova |
| minimaxDojo | Núcleo Python passou nos contratos existentes | URL/app e acesso ao MiniMax Agent Team não identificados; fluxo real pendente |
| openclaw | CLI real isolada: preview readonly, bloqueios, avanço parcial e retomada | Verificação independente; resultado limitado a checklist simulate-grade |
| pixelDojo | 18/18 labs com FAIL→retry/PASS, 18 replays e NDJSON append-only | Semântica e verificação independente; retorno usa hook de entrada declarado, sem auto-pass |
| school-entry | SQLite privado, operador, checker real, destino Quest real, fallback sem chave, 401/503 | Provider configurado/timeout e semântica pendentes |
| sdlc-quest | HTTP e `file://`, pt-BR/en, 18 campanha + 16 TLC + 6 lab por combinação; backup/import/retorno | Semântica e verificação independente |
| voxelDojo | 8 jogos completos: 32/68 pares WebGL, todos os 32 pares de fallback, 8 retries e 8 reentradas | 36 pares WebGL sem prova completa; Hash Ring preservado como captura parcial; nova interrupção por carga do host |
| zai-duolingo-like | DB privado com 9 módulos/27 lições; 23 conclusões persistidas antes da interrupção | 4 lições, segunda entrada, review, chat e Bun sem prova completa; relatório parcial reconstruído com limites explícitos |

As suítes de produtor dos quatro motores Python passaram em 291 testes, com 1 skip. Os nove gates Node de lint/test/typecheck/build aplicáveis passaram. Esses resultados não substituem as jornadas acima. O browser selecionado passou em codexDojo (2), miniTown (1), Pixel (5), Zai (29), Literacy (34) e dojoToday serial (15).

A suíte OS inicial teve 22 passes, 8 skips explícitos e 6 falhas: quatro expectativas usam `Orbita` enquanto a UI oferece `Órbita`; duas atingiram timeout de 30 segundos durante uma espera de 60. A repetição foi interrompida por contenção. Produto e testes existentes não foram alterados para obter verde.

## Interrupção e limites

A carga do host chegou a 323.09/192.82/118.00. Root interrompeu os browsers desta execução, reteve os casos completos e cancelou repetições. Timeouts e casos interrompidos permanecem `unverified`; não são defeitos de produto presumidos. O registro operacional também conserva, de forma sanitizada, os diagnósticos de processos que exibiram argumentos sensíveis alheios; os valores não são reproduzidos neste pacote.

Uma retomada com apenas um jogo/browser/server por vez comprovou Task Forge, Relay, Timeline e Docking Bay. O watchdog encerrou os processos próprios quando a carga de 1 minuto voltou a ultrapassar 60. O índice consolidado conserva as duas rodadas e separa Hash Ring incompleto dos oito jogos completos. Não houve nova repetição depois desse cutoff.

Os achados novos reentraram como intents em rascunho: integração MVP, entrada nativa MME, jogo inline dojoToday e drift da prova de browser OS. Nenhum desses reparos foi incorporado sem plano próprio. O worktree original e o estado canônico compartilhado foram preservados nas verificações registradas; limites de isolamento e cleanup de cada actor permanecem nos respectivos relatórios. No Zai, a URL privada recusou conexão após a interrupção; perdeu-se a prova completa dos PIDs nativos. No Hermes, config/credenciais/estado MVP/cron/sessões default mantiveram os hashes, mas DB/WAL/SHM mudaram; a consulta somente leitura encontrou zero IDs das sessões QA no banco default. Não se afirma invariância de todos os bytes externos ao repositório.

## Encerramento pendente

O comando canônico `check --require-current` ainda retorna 1 pelas seis claims stale. Não foram produzidos grants substitutos, bundles fictícios ou receipts remotos. A verificação independente final deve contabilizar todos os 34 critérios, incluindo os que não puderam ser executados. Até lá, e enquanto houver `blocked`/`unverified`, este relatório mantém a conclusão global pendente.

Para continuar: resolver a divergência C11 com Daniel, disponibilizar o acesso MiniMax Team e a credencial Jev por canal local seguro; retomar os casos restantes serialmente em host estável; revisar e publicar os reparos somente com a autorização correspondente; comprovar o deploy e renovar as claims pelo assessor independente. O aceite do piloto permanece separado.
