# Fine-tuning Laya typed-decisions para AI DevSchool

**Experimento research concluído, sem integração de produção.** Duas receitas de quatro épocas foram executadas a partir da mesma base; a v2 foi escolhida pela calibração. Revisão independente confrontou dados, hashes, restauração e análises. Branch `research/laya-jev-handoff-2026-10-04`, continuação de `cf0f363d44b165487492d7cf1745139f3e33f22c`.

## Resultado atual

A receita selecionada **v2** aproximou o Laya do Jev no teste exploratório: concordância **107/410 (26,1%) → 183/410 (44,6%)**, ganho de **18,5 pontos percentuais**. O KL médio caiu **36,5%** e o MAE das notas caiu **24,3%** contra a base. Os acertos semânticos sintéticos passaram de **62/72 para 63/72**. São efeitos da cabeça treinada mais calibração, sem atribuição isolada aos pesos.

O ranking continuou abaixo do Jev: **17/26 → 16/26** top1, contra **24/26 do Jev**. A primeira receita v1 melhorara apenas as distribuições, sem alterar nenhuma decisão discreta do novo teste. No corpus original, a v2 regrediu de **122/142 para 121/142 acertos**, manteve o ranking em **0/6 top1** e reduziu top3 de **3/6 para 1/6**. **Não recomendo trocar Jev por esta variante.** A baseline anterior com routing english/multilingual acertou 119/142 no corpus original e é outra configuração.

Nenhuma troca de backend decorre desta pesquisa. O experimento roda pelo SDK local sobre entradas research; não é um teste E2E de navegador dentro do aplicativo.

## Dados e método

| Split novo | Casos | Perguntas | Uso |
|---|---:|---:|---|
| Treino | 244 | 316 | Gradientes da cabeça |
| Calibração | 98 | 138 | Temperaturas e comparação das duas receitas |
| Teste | 362 | 410 | Medição; exploratório após consulta na rodada1 |

Os dados são sintéticos, em inglês e português. A recomendação usa objetivo + descrição de uma única engine por entrada; o ranking do teste agrega as notas das 13 engines para cada um de 26 objetivos/idiomas. Triagem e sentimento exercitam choice/score/noul. As 72 referências semânticas desses dois grupos e as 26 engines pretendidas foram escritas no builder; não são rótulos adjudicados externamente.

As famílias de formulação diferem entre splits e não há estados idênticos, mas as intenções e várias frases componentes são compartilhadas. Essa correlação limita a generalização. O catálogo real versionado está em `catalog.json`. Não há dados de alunos.

Os 704 casos novos receberam distribuições reais da API, solicitando e recebendo **jev-1.13.0**. Targets são as probabilidades do teacher, normalizadas pelo código upstream; noul vira distribuição false/true. O corpus histórico não entra nos targets: continua byte a byte em 62 casos, 220 perguntas, 142 labels e 6 referências de engine, SHA `7d39088adf02780c93cc5c9361216e5bc06e3910f528431d572106d731f58e37`. Seu Jev é a rodada histórica validada dessa mesma versão, não uma nova chamada nesta fase.

Hashes dos três splits constam em `data-manifest.json`; treino `04d71f7544970d1f42624775361b883b7745e0be000c730ed5daf894fb9922a8`, calibração `04bf092c4dd2a5d0dfd64b8c59340f634a5781baafa9cab5ff7b7e0bbc72ddfe`, teste `5874e4601467b2302ec40b0852c74fdb0aacef062a840e38e5702088132ee047`.

## Receitas e proveniência

Base: typed-decisions oficial, SHA `4fa56de72383a9d3efa9cfa78955733c81b9fc8067a587ca4beb82c78107a24e`. Código Laya `8a6e1328cce2460a0e5aa348ad465bb1b5821cd2`, versão 0.3.27. PyTorch 2.14.1+cpu, Transformers 4.57.6. CPU com quatro threads; sem GPU.

As duas receitas partem da mesma base oficial, não uma da outra. Encoder congelado; soft cross-entropy contra Jev; quatro épocas; microbatch 2/acumulação 8; AdamW; scheduler cosine; seed 20261004; max_len 512/head_max_len 256; embaralhamento de opções choice/noul com permutação correspondente dos targets. São 26.512.131 parâmetros treináveis dentre 421.293.827 totais. O módulo upstream é `laya.train`; a adaptação para CPU não reproduz o notebook GPU com encoder treinável/RLCD.

| Receita | LR da cabeça | Épocas | Perdas médias | Treino CPU |
|---|---:|---:|---|---:|
| v1 | 5e-5 | 4 | 1,0658;1,0292;1,0174;1,0154 | 571 s |
| v2 | 5e-4 | 4 | 1,0142; 0,9514; 0,9501; 0,9178 | 566 s |

Calibração usa somente 138 perguntas separadas e remove o mapa herdado `temperature_by_options`. O resultado mede os pesos treinados e as novas temperaturas juntos; não há ablação que atribua todo ganho ao treino. Temperatura sozinha não altera o argmax.

A segunda receita foi fixada antes de sua execução e após observar a primeira avaliação. `selection-policy-02.json` registra esse contexto: escolher menor KL(Jev || modelo) na calibração, empate v1; nenhum critério de seleção lê teste ou corpus antigo. A calibração foi usada também para temperaturas, logo seu KL é ajuste, não evidência independente. O teste já consultado e o corpus histórico conhecido são diagnósticos exploratórios/de regressão. A v2 foi selecionada: KL de calibração 0,43876 contra 0,50377 da v1, nas mesmas 138 perguntas; essa seleção é anterior à avaliação do teste v2.

Na v1, o digest em memória do encoder ficou igual antes/depois. O empacotador verificou igualdade exata dos 170 tensores exportados do encoder com a base ; 31 tensores não-encoder mudaram e 36 foram incluídos no pacote. A restauração confirmou o SHA integral `e16f0aa70287f37f3d945c7b4fe7581a5fa996af9fe306ccbc3db43ffec8be97`. Config SHA `6e18387740edd4dd53bb21612d7b1dcb1b0ad293d7705394bcf23ef99e78d526`.

Na v2, a mesma verificação confirmou os 170 tensores de encoder iguais e 31 tensores não-encoder alterados. A restauração confirmou o SHA `760d6479aef421be52656431caea0a5a79099888027c92886f21d588e10393cf`; configuração `4d6a62266839cebe2cc2f749f4b9762a5548ae87c2ebc175a04be7095498903e`.

O campo SHA da configuração-base da v1 foi finalizado depois do treino, conferindo o arquivo original inalterado, snapshot e todos 362 registros BASE02. O relatório bruto e o script efetivamente executado foram preservados; o relatório final só adiciona essa proveniência. O runtime retorna o nome genérico `laya-rl-agent`; a identidade da variante é ancorada nos hashes dos pesos/configuração.

## Teste novo: entradas idênticas antes/depois

| Métrica | Base typed | v1 | v2 selecionada | Jev |
|---|---:|---:|---:|---:|
| Concordância de decisões com Jev | 107/410 (26,1%) | 107/410 (26,1%) | 183/410 (44,6%) | Referência |
| Acertos semânticos sintéticos | 62/72 (86,1%) | 62/72 (86,1%) | 63/72 (87,5%) | 72/72 |
| KL médio Jev→modelo, menor melhor | 0,90791 | 0,71803 | 0,57614 | 0 |
| MAE das notas contra Jev, escalas do corpus, máximo 3 | 1,02663 | 0,91844 | 0,77721 | 0 |
| Engine pretendida em top1 | 17/26 | 16/26 | 16/26 | 24/26 |
| Engine pretendida em top3 | 21/26 | 20/26 | 21/26 | 24/26 |

Todas as 410 distribuições/respostas numéricas mudaram na v1, mas nenhuma mudou a decisão discreta. A comparação da base com a v1 usa exatamente as mesmas entradas do formato de uma engine; não atribui à atualização de pesos o efeito de reformular o input.

| Recorte de concordância | Base | v1 | v2 |
|---|---:|---:|---:|
| Notas de recomendação | 45/338 | 45/338 | 120/338 |
| Triagem | 31/36 | 31/36 | 32/36 |
| Sentimento | 31/36 | 31/36 | 31/36 |
| Inglês | 65/205 (31,7%) | 65/205 (31,7%) | 101/205 (49,3%) |
| Português | 42/205 (20,5%) | 42/205 (20,5%) | 82/205 (40,0%) |

O encoder desta variante é originalmente inglês, uma limitação relevante para português.

Concordância compara choice retornado, threshold 0,5 de noul e MAP das probabilidades score. MAE compara médias numéricas das notas. KL usa as distribuições normalizadas, com piso 1e-8 no log. Ranking usa média score, desempate por ID. Concordância com o teacher é imitação; não é acurácia independente. Jev 100% de concordância consigo mesmo é tautológico e não entra como alegação de qualidade.

## Regressão no corpus original

| Métrica | Base typed | v1 | v2 selecionada | Jev histórico |
|---|---:|---:|---:|---:|
| Acertos rotulados | 122/142 (85,9%) | 122/142 (85,9%) | 121/142 (85,2%) | 142/142 |
| Concordância total, incluindo 78 notas sem labels | 128/220 | 129/220 | 129/220 | Referência |
| KL médio | 0,63576 | 0,56762 | 0,51264 | 0 |
| MAE score contra Jev | 0,93890 | 0,89528 | 0,76007 | 0 |
| Ranking top1 | 0/6 | 0/6 | 0/6 | 6/6 |
| Ranking top3 | 3/6 | 3/6 | 1/6 | 6/6 |

A pergunta explícita choice de engine acertou 6/6 em base, v1, v2 e Jev. O ranking por notas individuais é outro resultado, e falhou mesmo quando o choice foi correto. As 78 notas históricas não têm labels independentes; não se somam aos 142 acertos rotulados. Não comparar scores de formatos distintos como se fossem a mesma tarefa. A regressão rotulada foi `triage-07-pt/churn_risk`: referência false, probabilidade 0,4669 na base e 0,5138 na v2, atravessando o threshold de 0,5. As outras 141 decisões rotuladas mantiveram o mesmo estado de acerto/erro.

## Latência e carregamento

| Rodada local | Casos | p50 aquecida | p95 aquecida | Carregamento |
|---|---:|---:|---:|---:|
| Base no teste novo | 362 | 495,5 ms | 703,6 ms | 3,207 s |
| v1 no teste novo | 362 | 489,3 ms | 700,2 ms | 3,144 s |
| v2 no teste novo | 362 | 499,3 ms | 740,1 ms | 3,220 s |
| Base no corpus original | 62 | 613,8 ms | 33,381 s | 3,211 s |
| v1 no corpus original | 62 | 649,0 ms | 33,229 s | 3,217 s |
| v2 no corpus original | 62 | 632,1 ms | 33,442 s | 3,157 s |

Uma chamada inicial foi descartada para aquecimento; sua duração não foi registrada nesta extensão. `load_ms` mede o loader, incluindo verificação de integridade, construção e desserialização. `warm_inference_ms` mede chamada SDK local mais validação/hash bookkeeping; não contém HTTP. São chamadas por caso, não por pergunta: o ranking antigo recebe o catálogo inteiro e 14 perguntas, enquanto o novo recebe uma engine por caso e agrega 13 chamadas. As distribuições de custo são diferentes; não atribuir essa diferença ao treino.

No teacher do teste novo, **HTTP roundtrip p50 119,9 ms e p95 167,7 ms**, 362 requisições com até três em voo. Esse tempo combina inferência remota e transporte; não é possível separá-los sem telemetria do provedor, nem comparar como inferência no mesmo hardware. Não houve ganho material de latência com fine-tuning. Estatísticas integrais e por suite estão em `evidence/timing-summary-01.json`; são uma rodada por variante, não um microbenchmark repetido/controlado.

## Checkpoint entregue

Selecionado: `laya-typed-decisions-aidevschool-head-v2`. Checkpoint carregável pelo SDK em `.scratch/laya-jev/finetune/typed-head-02/`, ou sua reconstrução byte-equivalente em `typed-head-restored-02/`. Pacote de decisão+configs+tokenizer: `.scratch/laya-jev/finetune/laya-typed-decisions-aidevschool-head-v2.zip`, **56.642.276 bytes**, SHA `1562baae01907e22c489b3e8553e3055f605f5e2a8ae40a54a309a332e98f888`.

Os binários ficam fora do Git; scripts, targets e evidências permitem reproduzir o treino. O pacote usa a base oficial verificada e `restore_adapter.py`; não contém os pesos do encoder. O resultado restaurado deve ter SHA integral `760d6479aef421be52656431caea0a5a79099888027c92886f21d588e10393cf`. Conferir `evidence/artifact-manifest-02.json` e `evidence/adapter-manifest-02.json`.

## Validação, evidências e limitações

Antes das análises: cobertura completa; IDs únicos/conhecidos; digest de entrada; corpus congelado; resposta com chaves/tipos/probabilidades válidos; versão teacher exata; hashes oficiais/base e treinados/config. Falhas e registros incompletos não entram nas métricas. Os analyzers recusam sobrescrita.

Um draft inicial tinha associação incorreta de índices para duas engines; o teste de inclusão da engine pretendida falhou antes da correção e passou depois. Esse draft/targets e a primeira avaliação parcial foram preservados em scratch e excluídos. Train02/calibration02/test01 e BASE02 são os arquivos válidos usados aqui. O corpus histórico não foi alterado.

Testes offline: 18 de validação/proveniência do runner original e 10 do fine-tuning passaram; casos negativos rejeitam teacher errado, split/digest errado, config-base alterada e linhagem incorreta. `test_analysis.py` usa evidências versionadas e não exige rede/pesos. O builder foi reexecutado em diretório temporário e reproduziu os três splits e o manifesto byte a byte. Na simplificação, removemos uma variável de caminho não usada que exigia profundidade específica de diretório. Revisão independente confronta scripts, dados, hashes, restauração e métricas.

Os hashes dão consistência/integridade, não assinatura de produtor externo. Não há ECE independente, dados de produção, UI E2E, avaliação de perfil Dreyfus/Bloom ou integração dos recibos. Gates, learner state e backend de produção permaneceram fora do experimento. A identificação canônica de backend/modelo precisa ser corrigida antes de uma eventual integração de Laya.

Evidências integrais em `evidence/`: targets teacher, previsões base/treinadas, análises, configs/receitas, fonte executada, logs, manifesto dos binários e política de seleção. Os binários permanecem fora do Git. A partir da raiz do repositório, verificar a integridade com `(cd docs/research/laya-jev && sha256sum -c SHA256SUMS.txt)`.

## Fontes e reprodução

- [Fine-tuning upstream no commit fixado](https://github.com/NandhaKishorM/laya/blob/8a6e1328cce2460a0e5aa348ad465bb1b5821cd2/docs/finetune.md): dados de domínio, targets soft e calibração separada. Resultados publicados pelo upstream pertencem a outro benchmark.
- [Loop upstream reutilizado](https://github.com/NandhaKishorM/laya/blob/8a6e1328cce2460a0e5aa348ad465bb1b5821cd2/laya/train.py): soft-ce/RLCD, frozen encoder, permutação de opções e exportação.
- [README da reprodução](README.md) e [comparação anterior](../REPORT.md).

## Próxima decisão de pesquisa

A v2 é um artefato experimental, não substituto de produção. O ganho principal foi na aproximação das notas ao teacher no novo formato; ranking e regressão histórica não sustentam a troca. Uma rodada futura precisa de novos casos reais/anônimos com referências adjudicadas, objetivos ambíguos/sem correspondência e um teste realmente cego, além de avaliar a adaptação do encoder para português. Aumentar épocas sozinho não foi demonstrado como solução.
