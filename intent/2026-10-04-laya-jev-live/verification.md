# Verificação — comparação live

Baseline: 574805d395478e98e5f9a09ca67fdc7b9765a94e. Corpus preservado com SHA-256 7d39088adf02780c93cc5c9361216e5bc06e3910f528431d572106d731f58e37.

## Executado pelo produtor

- Bootstrap com LAYA_ROOT=/workspace/laya passou; upstream fixado e dependências do script instaladas. Downloader do repositório verificou todos os três pesos e runner executou exemplos offline. Arquivos já baixados nesta sessão foram reaproveitados; nova inferência não foi inferida de /health.
- 62/62 Laya auto e 62/62 Jev: 142 respostas rotuladas pareadas por digest; respectivamente 119 e 142 acertos. Jev responde jev-1.13.0. Rodadas adicionais: typed triagem inglesa 12/12 (32/36 respostas), pinned Jev entrada 6/6 rankings. Arquivos integrais em docs/research/laya-jev/evidence/live-2026-10-04/.
- Regressões de esquema/digest: 7/8 falhavam antes, 8/8 passam depois. Proveniência v2: 9/10 falhavam antes, 10/10 passam depois. Testes negativos mantidos sem enfraquecer assertivas.
- Analyzer verificou corpus/digests/respostas/proveniência/timings antes de métricas e criou summary nova, sem sobrescrever resultados. Erros históricos continuam excluídos de qualidade.
- Ruff e compileall upstream passaram; scripts research compilam, shell bash -n passa. Testes de produção não foram repetidos indiscriminadamente porque não houve alteração de produção.

## Revisão independente

Agente separado verify_live, exigido por AGENTS.md e ai-native-sdlc, executou 8 e 10 regressões offline, compilação e validação dos quatro JSONL. Encontrou duas lacunas iniciais: proveniência v2 opcional e contagem de pares Laya×Laya. Ambas foram corrigidas; rechecagem independente confirmou rejeição de provenance incorreta e paired_labelled_answers=0 em rodada apenas Laya. Executou também o teste Node existente: 1/1 passou. Pytest ausente; não houve alegação de testes Python de produção repetidos.

Revisão final independente: PASS, nenhum finding de correção pendente. O revisor regenerou a summary em diretório temporário a partir dos quatro JSONL versionados e confirmou igualdade JSON integral. Conferiu todas as tabelas de acurácia/recortes/MAE/ranking/P50/P95, carga/aquecimento e exemplos offline; verificou fisicamente tamanho e SHA-256 dos três pesos; corpus/manifesto/scripts de bootstrap invariáveis; relatório histórico idêntico; SHA256SUMS e script-digests completos; nenhum candidato de segredo encontrado em arquivos live.

Ajustes finais editoriais/higiene: unignore explícito para logs da subpasta live evita manifesto apontar para arquivo ausente no checkout novo; RESUME descreve a lacuna do analyzer no passado. Ambos aplicados. O teste Node 1/1 é evidência adicional do revisor, não inferência neural nem prova de UI.

## Simplificação e REVIEW.md

1. Correção/plano: mudanças restritas à pesquisa e intent; entradas congeladas e limites de produção preservados. Registros de tempos são explícitos por backend.
2. Provas: regressões negativas antes da correção; respostas reais mantidas integrais; revisão independente acima.
3. Convenções: nenhuma edição em gates, learner, engines ou recibos; rtk indisponível, comandos shell normais usados.
4. Higiene: chave permanece em arquivo externo ignorado, não é impressa/versionada; pesos/caches/venv fora do diff. HTTP total não é chamado de transporte puro.
5. Simplificação: contrato de validação centralizado e compartilhado pelo runner/analyzer; downloader upstream reutilizado; parâmetros/proveniência em registros eliminam duplicação de sidecar por caso. Nenhum refactor de produção.
