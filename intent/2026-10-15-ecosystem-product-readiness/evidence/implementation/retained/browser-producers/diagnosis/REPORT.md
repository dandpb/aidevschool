# Diagnóstico das suítes browser produtoras

Resultado: **INCOMPLETE / UNVERIFIED** para a repetição OS, interrompida por contenção severa do host a pedido do coordenador. Nenhuma conclusão de defeito do produto decorre dessa interrupção.

| Execução | Exit do comando | Pass | Skip | Fail | Interpretação |
| --- | ---: | ---: | ---: | ---: | --- |
| dojoToday inicial | 1 | 0 | 0 | 0 | Setup abortou: a execução OS paralela já usava a porta 5180. |
| dojoToday serial, mesmos 4 arquivos | 0 | 15 | 0 | 0 | Suíte produtora selecionada passou em 12,11 s. |
| OS inicial, mesmos 5 arquivos × 3 viewports | 1 | 22 | 8 | 6 | Quatro expectativas Pixel desatualizadas e dois timeouts totais de 30 s. |
| OS observador de 60 s | -15 | — | — | — | SIGTERM aos 323,07 s por pressão de recursos; sem JSON final e sem resultado atribuído ao produto. |

As quatro falhas Pixel pedem literalmente `Orbita 3D` (`tests/engines.smoke.spec.ts:58,118`). O DOM capturado já mostra `Órbita 3D`, também presente em `pixel-quest/src/ui/orbitPanels.ts:48`; o iframe estava carregado. As duas falhas de retorno Literacy foram canceladas pelo teto total de 30 s enquanto a própria expectativa de recibo em `release-journeys.smoke.spec.ts:78` permite 60 s. Esse cancelamento não demonstra perda de recibo nem que a expectativa passaria com tempo suficiente.

Os oito skips são explícitos: quatro integrações desktop-only repetidas nos projetos tablet/mobile. Não foram tratados como aprovação.

A repetição dojo mudou somente caminhos de saída, executou o mesmo escopo e ficou isolada dos servidores OS. O wrapper OS adicional aplicou timeout de 60.000 ms conforme a política compartilhada original, com screenshot/video on e trace retain-on-failure. Não houve edição de assertions, retries, fontes ou testes protegidos. A base compartilhada original foi apenas lida; está ausente do worktree e não foi copiada/importada. Hashes das fontes consultadas ficaram iguais.

Os 26 PIDs descendentes e sete grupos exclusivos da rodada OS foram encerrados e aguardados; verificação posterior não encontrou nenhum PID remanescente nem listener nas portas 4174,5175,5176,5177,5178,5179,5180. Nenhum processo externo foi sinalizado. Os logs e wrappers iniciais estão preservados sob `diagnosis/*.initial.*`; novas mídias permanecem nos respectivos diretórios `test-results/readiness-plan-suite-diagnosis`.

`report.json` contém argv/cwd/exit/stats/limites, hashes e caminhos completos. `os-rerun-cleanup.json` contém somente PIDs/PGIDs exclusivos e resultados da limpeza. A qualificação integral das jornadas, a revisão semântica e a confirmação do retorno após 60 s seguem fora da evidência concluída desta tarefa. Nova execução browser depende da autorização do coordenador após estabilização do host.
