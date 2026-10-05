# Laya × Jev — relatório de comparação live na cloud

**Data:** 4 de outubro de 2026, America/Sao_Paulo. **Branch:** `research/laya-jev-handoff-2026-10-04`. **Baseline:** `574805d395478e98e5f9a09ca67fdc7b9765a94e`.

**Continuação com treino:** o [relatório de fine-tuning typed-decisions](finetune/REPORT.md) registra duas receitas reais em CPU. A v2 aproximou as decisões do Jev no novo teste exploratório (26,1% → 44,6% de concordância), mas regrediu no corpus original (122/142 → 121/142) e manteve ranking top1 em 0/6. A recomendação de manter Jev permanece. Os números abaixo descrevem a comparação anterior ao treino, com outra configuração Laya.

## 1. Conclusão executiva

**A comparação live foi concluída.** Laya acertou **119/142 respostas rotuladas (83,8%)**, enquanto Jev acertou **142/142 (100%)**, nas mesmas 62 entradas congeladas. Nas seis recomendações sobre o catálogo real, a engine de referência ficou no primeiro lugar em **1/6** para Laya e **6/6** para Jev. A rodada fixada de Jev também acertou 6/6 rankings.

Recomendo manter Jev nas recomendações atuais e tratar Laya como candidato a especialização por tarefa. Acurácia e latência desta bateria não demonstram superioridade universal: são casos sintéticos pequenos, com traduções correlacionadas e rótulos sem revisão externa. Classificação de métricas foi uma tarefa promissora para Laya neste corpus; recomendação e triagem exigem melhoria.

Os **três pesos foram baixados nesta sessão**, verificados por tamanho e SHA-256 e executados localmente. Nesta retomada pelo repositório, os arquivos já presentes foram reutilizados através de `LAYA_ROOT=/workspace/laya`, opção documentada, e o bootstrap/downloader fixados foram executados novamente. A verificação precedeu cada carregamento; não houve novo download redundante. Nenhum resultado fora da branch foi usado como substituto das novas rodadas versionadas.

## 2. Proveniência e ambiente

| Item | Valor |
|---|---|
| Laya source | `8a6e1328cce2460a0e5aa348ad465bb1b5821cd2`, versão 0.3.27 |
| Revisão dos três pesos | `1c5edc17a7acd8701df6fc341c0d179f1c62c982` |
| SHA-256 do corpus | `7d39088adf02780c93cc5c9361216e5bc06e3910f528431d572106d731f58e37` |
| Inferência local | CPU, quatro threads PyTorch, modo Hub/Transformers offline |
| Credencial Jev | Arquivo externo autorizado via `LAYA_JEV_ENV_FILE`, sem copiar para produção, imprimir ou versionar o valor |
| Jev solicitado → respondido | `jev-latest` → `jev-1.13.0`; rodada fixada responde `jev-1.13.0` |
| Saídas originais | `.scratch/laya-jev/output/`, nomes inéditos por rodada |
| Evidências preservadas | `evidence/live-2026-10-04/`, arquivos integrais sanitizados |

Pacotes efetivamente instalados pelo bootstrap: laya 0.3.27, torch 2.14.1+cpu, transformers 4.57.6, huggingface-hub 0.36.2, safetensors 0.8.0, python-dotenv 1.2.4. Ambiente completo em `environment-live-01.json`.

| Checkpoint | Bytes | SHA-256 verificado |
|---|---:|---|
| english | 842609210 | `891102d372688fc2a094dac56a384bc537b87c63f21f9f3dac0be2b7cbc8d86c` |
| multilingual | 643835514 | `9d628fd971b700382ac6f65920a86f149777b2e748e0c955fb3b19695aa8f204` |
| typed-decisions | 842609220 | `4fa56de72383a9d3efa9cfa78955733c81b9fc8067a587ca4beb82c78107a24e` |

A política corrente de rede foi observada como irrestrita/enforced; Hugging Face retornou HTTP 200 para a revisão fixa e TypeSafe respondeu às requisições. O 403 do handoff era uma falha de proxy, não evidência de chave inválida. `REPORT-historical.md` e as evidências diretamente em `evidence/` preservam esse estado anterior, incluindo `/health` com `loaded: []`.

## 3. Método, cobertura e validação

O corpus commitado foi preservado byte a byte: **62 casos, 220 perguntas, 142 respostas rotuladas e seis referências de engine**. Não foi regenerado nem treinado sobre ele. As 78 notas individuais das engines não possuem rótulos esperados e não entram na acurácia principal.

| Suite | Casos | Perguntas |
|---|---:|---:|
| Triagem inglês/português | 24 | 72 |
| Sentimento inglês/português | 16 | 48 |
| Classificação de métricas | 12 | 12 |
| Prompt builder português | 4 | 4 |
| Recomendação de 13 engines | 6 | 84 |

Comparação principal: 62/62 respostas válidas por backend, **142 respostas pareadas Laya × Jev por digest de entrada**. Laya auto escolheu english em inglês e multilingual em português, com idioma explícito e `max_len=8192`; os critérios e estados foram idênticos nos dois backends. O runner aqueceu cada checkpoint antes das previsões medidas. Nenhum cache de respostas/replay ou fallback entrou como previsão.

Rodadas adicionais, analisadas separadamente: typed-decisions nos 12 casos de triagem inglesa, e Jev fixado nos seis casos de school-entry. O resultado especializado não é somado ao resultado principal nem selecionado retrospectivamente para substituir a baseline. A cobertura do analyzer para subconjuntos é relativa aos 62 casos totais; suas 12/12 e 6/6 requisições selecionadas foram válidas.

O analyzer agora verifica o corpus contra `dataset.sha256`, digests por entrada, IDs conhecidos/únicos, modelo retornado, chaves/tipos, números finitos e opções/distribuições válidas. Para v2, também confere corpus/revisão/source/hash do checkpoint, routing e contrato de tempos por backend, incluindo primeira carga e aquecimento. Probabilidades arredondadas têm tolerância de 0,02 na soma. A integridade é consistência verificável do arquivo, não uma assinatura que autentica um produtor externo. Registros legados são explicitamente classificados como validação apenas de input/esquema.

Acurácia: igualdade para choice; noul ≥ 0,5; MAP da distribuição para score. Score MAE usa a média numérica prevista. Ranking: média de score, com desempate pelo ID. `paired_labelled_answers` exige presença nos dois backends; pares entre variantes Laya não são contados como comparação com Jev.

## 4. Resultados medidos

| Rodada | Requisições válidas | Acertos rotulados | Acurácia |
|---|---:|---:|---:|
| laya-auto-live-01 | 62 | 119/142 | 83,8% |
| jev-live-01 | 62 | 142/142 | 100,0% |
| jev-pinned-entry-live-01 | 6 | 6/6 | 100,0% |
| laya-typed-triage-live-01 | 12 | 32/36 | 88,9% |

| Tarefa — comparação principal | Laya | Jev |
|---|---:|---:|
| triage | 53/72 (73,6%) | 72/72 (100,0%) |
| sentiment | 47/48 (97,9%) | 48/48 (100,0%) |
| metric-lint | 12/12 (100,0%) | 12/12 (100,0%) |
| prompt-builder | 1/4 (25,0%) | 4/4 (100,0%) |
| school-entry | 6/6 (100,0%) | 6/6 (100,0%) |

| Recorte | Laya | Jev |
|---|---:|---:|
| language:en | 65/72 | 72/72 |
| language:pt | 54/70 | 70/70 |
| kind:choice | 44/52 | 52/52 |
| kind:score | 33/40 | 40/40 |
| kind:noul | 42/50 | 50/50 |

Score MAE nas 40 respostas score rotuladas: **Laya 0.33048**, **Jev 0.00275** (menor é melhor). Acurácia exata e MAE medem aspectos diferentes.

### Recomendações

| Caso | Engine de referência | Primeiro lugar Laya | Primeiro lugar Jev |
|---|---|---|
| catalog-00 | literacyDojo | codexDojo | literacyDojo |
| catalog-01 | voxelDojo | codexdojo-os-prototype | voxelDojo |
| catalog-02 | pixelDojo | codexdojo-os-prototype | pixelDojo |
| catalog-03 | dojoToday | codexDojo | dojoToday |
| catalog-04 | codexDojo | codexDojo | codexDojo |
| catalog-05 | miniTown | codexdojo-os-prototype | miniTown |

Nas seis entradas, a referência esteve no top-3 em **1/6** para Laya e **6/6** para Jev; a rodada Jev fixada também atingiu 6/6. Não houve truncamento sinalizado pelo SDK em nenhuma das 62 respostas Laya. Isso não prova que a representação das entradas é ideal; apenas elimina truncamento reportado como explicação observada.

**Não houve teste da jornada pela interface do aplicativo.** Estes casos usam o catálogo real, mas objetivos sintéticos e todas as engines deliberadamente disponíveis para avaliar somente inferência. Não testam elegibilidade, disponibilidade, login, navegação ou lançamento das engines.

### Modelo especializado

No mesmo subconjunto de triagem inglesa, english acertou **29/36**, typed-decisions **32/36** e Jev **36/36**. O ganho de 3 acertos não se estende automaticamente à recomendação, ao português ou à avaliação pedagógica. Nesta rodada não fizemos fine-tuning; a continuação está no relatório específico acima.

### Erros ilustrativos

Laya classificou a urgência de “quando conveniente” como imediata no primeiro caso inglês; em alguns pedidos sobre horários/contato escolheu billing/technical em vez de other; em uma ameaça de abandonar o serviço respondeu baixo risco de churn. Os 23 erros principais e os quatro da variante estão integralmente em `summary-live-01.json`, com rótulo esperado, resposta e caso. Não escondemos divergências por filtros de confiança.

## 5. Carga, aquecimento e tempo de resposta

| Rodada | Medida | N | P50 (ms) | P95 (ms) |
|---|---|---:|---:|---:|
| laya-auto-live-01 | warm_inference_ms | 62 | 411,6 | 10219,1 |
| jev-live-01 | http_roundtrip_ms | 62 | 132,1 | 220,8 |
| jev-pinned-entry-live-01 | http_roundtrip_ms | 6 | 122,3 | 137,4 |
| laya-typed-triage-live-01 | warm_inference_ms | 12 | 757,5 | 807,1 |

As cargas e aquecimentos da rodada auto ocorreram uma vez por checkpoint, fora das 62 medições acima:

| Checkpoint | Carga incluindo verificação SHA (ms) | Aquecimento (ms) |
|---|---:|---:|
| english | 3332,7 | 761,3 |
| multilingual | 1995,5 | 321,5 |

O exemplo offline de duas perguntas, executado por `run_local_models.py`, também separou carga e inferência aquecida:

| Checkpoint | Carga (ms) | Inferência aquecida (ms) |
|---|---:|---:|
| english | 4033,6 | 439,3 |
| multilingual | 1902,6 | 169,3 |
| typed-decisions | 840,0 | 442,2 |

Tempos aquecidos por tarefa na rodada principal:

| Suite | Laya P50/P95 (ms) | Jev HTTP P50/P95 (ms) |
|---|---:|---:|
| triage | 510,0/866,6 | 172,2/227,5 |
| sentiment | 361,5/539,6 | 127,5/159,7 |
| metric-lint | 402,6/463,8 | 118,4/171,6 |
| prompt-builder | 148,7/167,1 | 118,0/132,9 |
| school-entry | 10264,6/11768,3 | 129,2/147,5 |

No Jev, **tempo HTTP total inclui rede e computação remota**. O serviço não forneceu tempos separados, portanto não estimamos transporte puro nem tempo interno de inferência. Laya foi medido no host CPU; o hardware do Jev é desconhecido. Não há alegação de speedup equivalente por hardware. As rodadas Laya foram sequenciais entre si, com o servidor anterior parado; o host cloud compartilhado ainda pode variar. Carga e aquecimento não entram no tempo aquecido, mas aparecem em `elapsed_ms` nos primeiros registros.

Os casos de recomendação fazem 14 perguntas e levaram vários segundos no Laya: nesta máquina a rodada não sustenta atender o orçamento de cinco segundos documentado para school-entry. O exemplo curto de duas perguntas não representa esse custo.

## 6. Qualidade, calibração e próximos experimentos

O carregamento english avisou sobre temperatura `choice:11+ = 0,1005828`, ajustada pelo SDK para 0,5. Confidence afetada deve ser tratada como não calibrada. Multilingual tem limitações documentadas de score/viés de posição; calibração deve ser medida em dados próprios. Não ajustamos limiares, temperaturas, prompts nem pesos sobre o teste congelado.

Os notebooks oficiais indicam especializar com dados de domínio. Para recomendação, o próximo experimento deve comparar formatos candidatos (objetivo + descrição de uma engine, ou choice com descrições claras) em uma variante separada, e depois treinar/calibrar/testar com splits independentes em português. Incluir objetivos sem correspondência, ambiguidade, negação e diferenças entre engines. Ganhos publicados de fine-tuning no benchmark do upstream não são resultados medidos neste aplicativo.

Corpus pequeno e sintético; traduções correlacionadas; labels sem adjudicação externa; seis rankings não representam tráfego real; os intervalos Wilson por resposta na summary são descritivos, não inferência populacional. Não avaliamos perfil Dreyfus/Bloom, recorrência do diário ou o verificador pedagógico completo. Quatro exemplos de prompt não demonstram segurança de aprovação em produção. Não há avaliação de custo monetário, hardware remoto ou confiabilidade operacional prolongada.

## 7. Integração e limites de escopo

Jev e Laya aceitam state e questions tipadas choice/score/noul; Laya oferece servidor HTTP compatível e execução local offline após download. Essa compatibilidade de formato não demonstra equivalência semântica. O experimento utilizou arquivos e scripts research, sem modificar o backend do aplicativo.

**Nenhum gate, learner state, rating FSRS ou recibo canônico foi alterado.** A pendência de identificação nos recibos Python continua: podem registrar `jev-latest` independentemente do backend. Corrigi-la antes de qualquer integração Laya em produção; os resultados desta pesquisa ficam fora desses recibos.

## 8. Evidências, verificações e reprodução

`evidence/live-2026-10-04/` contém os quatro JSONL de respostas reais, `summary-live-01.json`, três exemplos offline, logs de bootstrap/download, versões, acesso HTTP e política de rede. `script-digests.json` identifica os scripts finais. Os runners e analyzer recusam sobrescrita. `SHA256SUMS.txt` cobre os artefatos versionados; pesos/venv/secrets não são commitados.

Os negativos do analyzer falharam antes da correção (7/8 e 9/10) e **18 testes passaram depois**: input digest, duplicação de IDs, tipos/distribuições/valores inválidos, checkpoint/source/revisão incorretos e contrato de timings. Ruff upstream e compileall passaram. Os 1.789 checks, 84 unit tests, 247 HTTP e 25 checks de integração descritos no handoff são históricos; não foram todos repetidos para esta mudança research. Revisão independente e evidências finais constam em `intent/2026-10-04-laya-jev-live/verification.md`.

Comandos reproduzíveis estão no README. As rodadas desta execução usaram `LAYA_ROOT=/workspace/laya` e um arquivo de credencial externo autorizado; defaults continuam em `.scratch/laya-jev`. Use novos nomes de `--output` a cada execução e passe `--files` explicitamente ao analyzer. Não regenerar o corpus.

Referências fixadas: [README upstream](https://github.com/NandhaKishorM/laya/blob/8a6e1328cce2460a0e5aa348ad465bb1b5821cd2/README.md), [BENCHMARKS](https://github.com/NandhaKishorM/laya/blob/8a6e1328cce2460a0e5aa348ad465bb1b5821cd2/BENCHMARKS.md), [fine-tuning](https://github.com/NandhaKishorM/laya/blob/8a6e1328cce2460a0e5aa348ad465bb1b5821cd2/notebooks/laya_finetune_typed_decisions_2xT4_kaggle.ipynb).
