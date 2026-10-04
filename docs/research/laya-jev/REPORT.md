# Laya × Jev no ambiente cloud — relatório técnico

**Pacote versionado para retomada:** consulte [RESUME.md](RESUME.md) e [README.md](README.md). Os caminhos `/workspace/...` abaixo descrevem a execução histórica; os scripts versionados derivam caminhos do checkout e gravam novas saídas em `.scratch/`. A inferência neural continua pendente. A última consulta antes do handoff informou política restrita na revisão 26; a próxima execução deve verificar seu próprio acesso efetivo.

**Data:** 4 de outubro de 2026, America/Sao_Paulo.
**Repositório avaliado:** <https://github.com/NandhaKishorM/laya>.
**Escopo:** baixar, instalar, executar, avaliar compatibilidade com AI DevSchool e comparar resultados com Jev.
**Estado da comparação de qualidade:** bloqueada pelo proxy; nenhuma inferência real bem-sucedida dos dois modelos nesta execução.

**Verificação adicional das distribuições:** a alternativa ModelScope documentada pelo próprio Laya também recebeu HTTP 403 do proxy. Nas 30 releases GitHub consultadas, com 56 assets, não foram encontrados pesos ou arquivos de tamanho compatível com checkpoints. A política cloud na revisão 16 segue restrita, sem domínios adicionais. A autorização já foi concedida; nenhuma aprovação adicional foi solicitada. Evidência: `evidence/distribution-check.json`.

**Atualização — execução local dos três modelos:** foram preparados `download_and_run_local.sh` e `run_local_models.py` para baixar, verificar e executar english, multilingual e typed-decisions em CPU. O runner usa arquivos locais e desabilita acesso ao Hub durante a inferência. A nova tentativa de download na revisão fixa `1c5edc17a7acd8701df6fc341c0d179f1c62c982` voltou a receber HTTP 403 do proxy. A revisão de política cloud observada é agora 15, ainda restrita. Nenhum peso foi baixado e nenhuma inferência neural local ocorreu. Evidências adicionais: `evidence/local-models-download.log` e `local-execution-status.json`.

## 1. Conclusão executiva

O Laya foi clonado e instalado na cloud, em um ambiente Python próprio. Seu roteador executou localmente e selecionou o checkpoint inglês para inglês e o multilingual para português e espanhol. Oito suítes locais passaram, somando 1.789 verificações assertivas e 84 testes unitários. A suíte HTTP também passou com 247 testes e um ignorado. Ruff e compilação passaram. O servidor está executando em `127.0.0.1:5199`, com `/health` respondendo HTTP 200 e nenhum checkpoint residente.

A chave TypeSafe fornecida foi salva em `/workspace/aidevschool/.env`, com permissão `0600` e exclusão do Git confirmada. O runner carregou essa chave e tentou uma chamada real ao Jev. O proxy negou o túnel HTTPS com HTTP 403 antes de a requisição atingir o provedor. O download do checkpoint Laya também foi negado com HTTP 403. Isso não permite afirmar que a chave é válida ou inválida.

Consequentemente, **não existe um vencedor medido neste ambiente**. Há uma comparação de arquitetura, uma execução dos componentes locais, evidências das falhas de transporte e uma análise crítica dos resultados publicados pelo projeto. A bateria para comparação controlada está pronta: 62 casos, 220 perguntas e 142 respostas esperadas, mais seis referências de engine preferida. Os resultados publicados abaixo não foram reproduzidos nesta sessão.

**Recomendação:** manter a implementação atual do Jev e avaliar Laya como alternativa local por tarefa. A compatibilidade de protocolo é promissora; equivalência de qualidade, calibração e latência ainda precisa ser medida. Não substituir o verificador pedagógico nem gerar novos recibos de aprovação com base em resultados externos ao domínio.

## 2. Ambiente e proveniência

| Item | Observação |
|---|---|
| Execução | Cloud Linux x86_64; sem GPU CUDA disponível |
| Python | 3.12.14 |
| PyTorch | 2.14.1+cpu |
| Transformers | 4.57.6 |
| Laya | 0.3.27, instalado a partir do checkout |
| Commit Laya | `8a6e1328cce2460a0e5aa348ad465bb1b5821cd2` |
| Commit AI DevSchool | `b9f77774643b94bfd9fafbd756a1b17482c33e45` |
| CPUs visíveis | 5 CPUs lógicas |
| Memória observada | Cerca de 17 GiB |
| Disco do checkout + venv | Cerca de 1,3 GiB, antes dos pesos |
| Caminho Laya | `/workspace/laya` |
| Ambiente Python | `/workspace/laya/.venv` |
| Artefatos da comparação | `/workspace/laya-jev-comparison` |

O código veio de um clone raso da branch padrão e está identificado por SHA. O runner usa checkpoints em repositórios independentes e revisões revisadas no upstream:

| Checkpoint | Revisão solicitada |
|---|---|
| `convaiinnovations/laya` | `55cf4c4ebb4ebe31b2550e8bdf3bd21b99753851` |
| `convaiinnovations/laya-multilingual` | `e4e9ddf21a7b1903b7acffd8814ad4307bf63a67` |
| `convaiinnovations/laya-typed-decisions` | `1a793eb568e6718f15941d08f85432581df534e3` |

Esses SHAs identificam a intenção de download. Não provam presença ou integridade de pesos que não chegaram a ser baixados. Versões instaladas, logs, dataset e hashes ficam em `evidence/`.

## 3. Execução efetivamente realizada

| Componente | Resultado observado | Alcance da prova |
|---|---|---|
| Clone e instalação Laya | Concluídos | Código e dependências disponíveis localmente |
| Ruff, regras recomendadas no AGENTS.md | Passou | Verificação estática, não qualidade do modelo |
| `compileall` em código e testes | Passou | Sintaxe compilável |
| `test_router.py` | 703 verificações passaram | Regras de roteamento, sem pesos |
| `test_criteria.py` | 198 verificações passaram | Tratamento de critérios |
| `test_hooks_api.py` | 450 verificações passaram | Contrato de API de hooks |
| `test_confidence.py` | 134 verificações passaram | Lógica de limites/confiança, sem validar calibração real |
| `test_revision_pinning.py` | 82 testes passaram | Seleção e pinagem de revisões |
| `test_criteria_normalization.py` | 2 testes passaram | Normalização de critérios |
| `test_option_order.py` | 52 verificações passaram | Lógica de ordenação; não mede robustez de pesos reais |
| `test_hooks.py` | 252 verificações passaram após habilitar sockets locais | Primeiro timeout era dependente do sandbox; repetição aprovada |
| `test_serve.py` | 247 testes passaram, 1 ignorado | Contrato HTTP com Router fake, não qualidade neural |
| Servidor Laya `/health` | HTTP 200 em `127.0.0.1:5199` | Processo real em execução; `loaded: []`, sem pesos |
| Testes Python da integração Jev | 24 passaram, 2 ignorados | Contratos offline; os dois testes live exigem chave exportada no processo de pytest |
| Teste Node do cliente school-entry | 1 passou | Respostas e validação do cliente com fixtures |
| Roteamento de três textos | Inglês → english; português/espanhol → multilingual | Execução real de código de roteamento, sem inferência neural |
| Primeira chamada Jev | Erro de transporte: HTTP 403 no túnel do proxy | Sem resposta do provedor |
| Primeiro download/inferência Laya | Erro de proxy no Hugging Face | Sem checkpoint carregado e sem resposta neural |

Os testes offline de Jev não exportaram a chave ao processo inteiro de pytest: o runner de inferência a carregou explicitamente do arquivo protegido. Não apresentar os testes ignorados como chamadas reais bem-sucedidas.

### Timeout inicial e correção do contexto de execução

A suíte `test_hooks.py` foi interrompida após 120 segundos. Uma segunda execução, com `faulthandler`, registrou a thread principal esperando em `concurrent.futures.Future.result()`, chamada por `laya/hooks.py:309`, durante o caso que chama `predict_batch` dentro de um event loop ativo (`tests/test_hooks.py:1434`).

O sandbox inicial restringia operações de rede/sockets, inclusive usadas por event loops locais e pelo TestClient. Após conceder acesso de rede ao comando, a mesma suíte terminou com 252 verificações aprovadas. A suíte HTTP também passou nesse contexto. A evidência aponta dependência do ambiente de execução; **não há defeito upstream confirmado por esse timeout**. Não foi necessário alterar código do Laya. As duas rodadas estão preservadas em `evidence/hooks-timeout-diagnostic.log` e `hooks-with-network.log`.

## 4. Comparação de arquitetura e integração

| Aspecto | Jev no AI DevSchool | Laya |
|---|---|---|
| Execução neural | API externa TypeSafe | No processo/servidor local, CPU ou GPU |
| Interface | `POST /v1/systemone`, state e questions | SDK Python; servidor HTTP também expõe `/v1/systemone` |
| Primitivas | `choice`, `noul`, `score` | Mesmas primitivas principais |
| Modelos no código atual | `jev-latest` no substrate; `jev-1.13.0` em school-entry | english, multilingual e typed-decisions |
| Idioma | Tratado pelo provedor | Checkpoint escolhido pelo Router; português deve usar multilingual |
| Uso offline | Replay de recibos existentes ou fallback determinístico | Inferência offline após disponibilizar os pesos |
| Custos | Uso de API, conforme contrato e tokens | Download, RAM, CPU/GPU e operação do serviço |
| Privacidade | Estado enviado ao provedor quando há chamada live | Estado pode permanecer na cloud que hospeda o serviço |
| Reprodutibilidade | `jev-latest` é alias mutável; versão fixada ajuda | Código e checkpoints podem ser fixados por SHA |
| Auditoria | Recibos NDJSON, digest da entrada e status | Saída estruturada; a integração deve criar recibos corretamente identificados |

O Laya já fornece uma implementação HTTP compatível com a superfície Jev. Portanto, não é necessário inventar todo o protocolo de transporte. Compatibilidade sintática ainda não implica equivalência semântica das respostas.

No Python atual, `http_client` aceita `api_url` e `model` por argumento, o que facilita um adaptador. A construção padrão ainda usa `TYPESAFE_API_KEY` e o endpoint externo. No Node de school-entry, URL e modelo estão fixados dentro de `model.mjs`; uma seleção de backend exigiria alteração explícita e testes de contrato.

Outro detalhe: os recibos Python gravam a constante `MODEL = "jev-latest"` e `usage = {}`, independentemente do backend real. Apontar esse cliente para Laya sem ajustar a proveniência produziria recibos com identificação enganosa. Para o piloto, os resultados ficam exclusivamente nesta pasta de comparação.

### Usos atuais de Jev que precisam ser preservados

- Perfil Dreyfus/Bloom e contagem de recorrências: enriquecimento semântico, com fallback para parsers determinísticos.
- Métricas de jogo: proposta de classificação `failure_nonzero`, `failure_true` ou `not_failure`; falha degrada para desconhecido, não aprova automaticamente uma métrica.
- `prompt_builder`: julgamento por campo; indisponibilidade bloqueia a verificação. As políticas atuais usam média ≥ 0,75 para passar e faixa de 0,4 a 0,75 para escalonamento.
- School-entry: avaliação de correspondência e scores por engine; Noul < 0,5 ou falha acionam caminhos de recuperação. O orçamento do provedor é cinco segundos.
- Ratings FSRS continuam derivados dos resultados dos gates; não são produzidos diretamente por Jev ou Laya.

O diretório versionado de recibos contém dois arquivos, com 263 registros `choice`, todos marcados `ok`, datados de 17 de setembro de 2026. Eles são evidência histórica da classificação de métricas. Não são uma nova execução desta comparação, e o nome `jev-latest` no recibo não identifica sozinho a versão concreta que respondeu.

## 5. O que dizem os números publicados

Fonte primária desta seção: `BENCHMARKS.md` do commit clonado. O documento declara que os números Jev são publicados por terceiros e não foram medidos pelo projeto na mesma execução. Prompts, amostras, hardware e condições podem diferir.

| Tarefa | Laya english | Laya multilingual | Laya typed-decisions | Jev publicado |
|---|---:|---:|---:|---:|
| AG News, acurácia | 95,0% | 93,0% | 95,3% | 91,0% |
| DAIR Emotion, acurácia | 59,5% | 53,0% | 60,0% | 48,0% |
| Banking77, acurácia | 42,5% | 42,5% | 49,2% | 87,0% |
| Typed decisions, acurácia | 36,2% | 35,2% | 76,6% | 72,7% |
| Typed decisions, ECE ↓ | 0,175 | 0,314 | 0,213 | 0,144 |
| Typed decisions, score MAE ↓ | 0,694 | 0,760 | 0,242 | 0,391 |

**Leitura adequada:**

1. O melhor resultado de 76,6% pertence ao checkpoint especializado, não ao Laya base. Os modelos base ficam abaixo da baseline de classe majoritária de 46,1% nessa tabela.
2. O upstream informa que a linha de 76,6% e os scores por workflow não têm arquivo de resultados versionado que os sustente. A documentação informa avaliação no benchmark cujo split de treino foi usado para especialização; isso não prova avaliação no próprio treino, mas exige separação rigorosa entre treinamento e teste para reproduzir o ganho.
3. Na mesma tabela, o checkpoint especializado tem maior acurácia publicada que Jev e ECE pior: 0,213 contra 0,144. Melhor acurácia não garante probabilidades melhores para os limiares pedagógicos.
4. Banking77 mostra um resultado publicado favorável ao Jev. O upstream associa a queda Laya ao orçamento fixo de tokens das opções; tarefas com muitas alternativas precisam ser avaliadas separadamente.
5. Não é válido transportar ganhos em notícias, sentimento ou workflows sintéticos para domínio Dreyfus/Bloom, recorrência no diário ou aprovação pedagógica.

### Latência publicada e aplicabilidade à cloud atual

O projeto publica p50 de 32,8 ms em uma pergunta no checkpoint multilingual em Tesla T4 e aproximadamente 236–276 ms para Jev em medições externas. Essa comparação junta inferência em GPU com serviço remoto e não representa a cloud atual, que tem CPU e nenhuma GPU CUDA disponível.

O próprio benchmark de CPU do projeto mostra tempos de centenas de milissegundos por pergunta e vários segundos quando há muitas perguntas. School-entry faz até 14 perguntas por consulta. A compatibilidade com seu orçamento de cinco segundos precisa ser medida nesta máquina, com carga e aquecimento definidos; não há base para anunciar ganho de velocidade aqui.

## 6. Limitações Laya relevantes para este projeto

- O upstream relata que `noul` sem critérios no checkpoint inglês pode ser dominado pelas opções genéricas e responder “não” independentemente do estado. O corpus preserva casos sem critérios usados nas interfaces atuais para detectar esse problema numa futura execução.
- A alternativa documentada é declarar critérios true/false específicos ou usar uma escolha binária com chaves neutras. Essa mudança é uma variante de prompt e deve ser medida separadamente, aplicada aos dois backends para uma comparação justa.
- `score` é uma primitiva fraca em algumas tarefas. Há viés de posição reportado no multilingual: o primeiro nível pode ser raramente escolhido. Isso é diretamente relevante para o ranking de engines em português.
- `action.act_probability` não tem sinal utilizável segundo o upstream. Não deve substituir gates ou critérios de aprovação.
- O modelo inglês perde qualidade fora do inglês e pode manter alta confiança. Indicação explícita de idioma é especialmente importante em JSON que mistura descrições em português e instruções em inglês.
- Contexto, perguntas e opções competem por budgets. O runner usa `max_len=8192`, mas isso não prova ausência de truncamento: a próxima execução precisa inspecionar uso e limites por pergunta.
- Calibração de temperatura, thresholds e fine-tuning devem usar treino/calibração separados do teste. Não ajustar o modelo sobre este corpus e depois apresentar o mesmo conjunto como validação independente.

## 7. Metodologia preparada para comparação controlada

O dataset foi escrito e congelado antes das tentativas de inferência. Não foi gerado nem rotulado pelo Jev ou pelo Laya.

| Suite | Casos | Perguntas | Papel |
|---|---:|---:|---|
| Triagem de atendimento | 24 | 72 | department, urgency, churn_risk; pares inglês/português, negação e retratação |
| Sentimento | 16 | 48 | choice, noul e score; pares inglês/português |
| Metric lint | 12 | 12 | Semântica documentada de contadores, booleanos e métricas de sucesso |
| Prompt builder | 4 | 4 | Instrução concreta versus texto genérico/keywords; casos diagnósticos inspirados no contrato |
| School-entry | 6 | 84 | Catálogo real de 13 engines; uma Noul e 13 scores por objetivo |
| **Total** | **62** | **220** | **142 respostas rotuladas e seis engines preferidas** |

Os 78 scores do catálogo não receberam notas esperadas inventadas. Para esses casos, há uma referência de engine preferida, permitindo analisar top-1/top-3 e ordenação. Elegibilidade e disponibilidade dos destinos não são testadas: a avaliação deliberadamente isola a inferência sobre o catálogo.

O runner registra inputs por digest, modelo solicitado, resposta integral, uso informado e duração. Erros são registrados e encerram a rodada; não há respostas fake ou fallback contabilizadas como resultados do modelo. Não sobrescreve arquivos anteriores. A chave não entra nos artefatos.

A análise preparada informa cobertura, acurácia por primitiva/idioma/suite, intervalos Wilson descritivos, score MAE e ranking de engines. Score exato usa argmax das probabilidades, enquanto MAE usa o valor numérico retornado. Ausência de resposta é medição ausente; não vira erro de classificação nem acurácia zero.

**Limites do desenho:** corpus pequeno e escrito por um único avaliador, pares traduzidos correlacionados, sem adjudicação externa, sem representação estatística de tráfego real. Perfil Dreyfus/Bloom e recorrência no diário não possuem labels independentes nesta bateria. A primeira chamada Laya inclui carga/download; não deve entrar numa alegação de speedup de inferência aquecida.

## 8. Bloqueio de rede e resultado desta rodada

O status cloud mais recente salvo em `evidence/cloud-status.json` relata observações atuais, instância em execução e política `restricted`, estado `enforced`, `allowed_hosts: []`, com apenas o preset `package_managers`. A revisão observada é 12.

Acesso a GitHub e gerenciadores de pacotes funcionou. Os destinos da API TypeSafe e dos pesos não estavam liberados. Foram usadas permissões adicionais de rede para os comandos, mantendo o proxy herdado e a validação TLS; a negação continuou.

| Backend | Tentativas de inferência | Respostas válidas | Pares comparáveis | Resultado |
|---|---:|---:|---:|---|
| Jev `jev-latest` | 1 | 0 | 0 | `URLError`: Tunnel connection failed: 403 Forbidden |
| Laya auto | 1 | 0 | 0 | `ProxyError` ao consultar revisão no Hugging Face; túnel HTTP 403 |

Não reportar os aproximadamente 15 ms e 130 ms dessas falhas como latência dos modelos: medem rejeição de transporte. Não há custo de API calculável, uso de tokens retornado ou evidência de processamento pelo Jev.

A autorização do usuário cobre a execução e a configuração. Nesta sessão, a única ferramenta de ambiente disponível consulta status; não existe operação exposta para modificar a allowlist. Alterar o JSON local não muda a política efetiva do sidecar. O bloqueio depende de aplicação da configuração do ambiente, não de nova autorização.

Destinos solicitados para a próxima execução: `api.typesafe.ai`, `huggingface.co`, `cdn-lfs.huggingface.co`, `cdn-lfs-us-1.huggingface.co`, `cas-bridge.xethub.hf.co`, `cas-server.xethub.hf.co` e `transfer.xethub.hf.co`. Os hosts efetivamente necessários para baixar pesos podem depender dos redirecionamentos da revisão escolhida.

## 9. Decisão recomendada e critérios para retomar

1. Concluir a liberação de rede e rodar a bateria já congelada contra Laya auto e Jev live. Manter separados `jev-latest` e `jev-1.13.0` quando disponíveis; registrar a versão efetivamente devolvida.
2. Medir o checkpoint Laya especializado separadamente. Não usar o melhor resultado entre variantes sem declarar a seleção.
3. Criar avaliação independente de perfil e recorrências a partir de exemplos reais revisados, mantendo privacidade e sem alterar o estado do aluno durante o experimento.
4. Para prompt_builder, acompanhar falso positivo de aprovação e falso negativo separadamente. Não reutilizar automaticamente limiares Jev, pois escalas e calibração podem diferir.
5. Para school-entry, verificar ranking e fallback, além do tempo total com 14 perguntas e da disponibilidade dos destinos. Validar o contrato HTTP do backend escolhido.
6. Fixar modelo, versão, digest das entradas, versão do prompt e proveniência verdadeira nos recibos antes de qualquer troca de backend.
7. Executar servidor e testes assíncronos com acesso a sockets locais habilitado. A rodada inicial restrita travou; a rodada corrigida passou sem mudanças no upstream.

**Parecer atual:** Laya é uma alternativa local tecnicamente plausível e com protocolo apropriado para um piloto. As evidências obtidas não demonstram que supera Jev nas tarefas do AI DevSchool. Uma substituição em produção permanece sem validação empírica.

## 10. Evidências e reprodução

- `README.md`: comandos de execução das próximas rodadas.
- `build_dataset.py`, `dataset.jsonl`, `dataset.sha256`: casos, labels e congelamento.
- `run_comparison.py`: chamadas reais e validação básica dos esquemas.
- `analyze.py` e `evidence/summary.json`: análise sem confundir falhas com resultados.
- `evidence/tests.json`, `test-*.log`: testes locais Laya.
- `evidence/jev-offline-tests-final.log` e `jev-entry-tests.log`: integração existente.
- `evidence/jev-jev-latest.jsonl` e `laya-auto.jsonl`: tentativas de inferência reais.
- `evidence/routing.json`: roteamento local de inglês, português e espanhol.
- `evidence/environment.json`, `requirements-freeze.txt`, `cloud-status.json`: contexto observado.
- `evidence/hooks-timeout-diagnostic.log`: reprodução instrumentada do travamento.
- `evidence/hooks-with-network.log`: repetição aprovada no contexto com sockets habilitados.
- `evidence/laya-serve-tests-final.log`, `laya-server.log` e `laya-http-health.json`: contrato HTTP e servidor real.

Referências upstream fixadas no commit avaliado:

- [README](https://github.com/NandhaKishorM/laya/blob/8a6e1328cce2460a0e5aa348ad465bb1b5821cd2/README.md)
- [BENCHMARKS](https://github.com/NandhaKishorM/laya/blob/8a6e1328cce2460a0e5aa348ad465bb1b5821cd2/BENCHMARKS.md)
- [Resultados de aplicações](https://github.com/NandhaKishorM/laya/blob/8a6e1328cce2460a0e5aa348ad465bb1b5821cd2/research/results/app_benchmark_results.json)
- [Servidor compatível com Jev](https://github.com/NandhaKishorM/laya/blob/8a6e1328cce2460a0e5aa348ad465bb1b5821cd2/laya/serve.py)
- [Revisões de checkpoints](https://github.com/NandhaKishorM/laya/blob/8a6e1328cce2460a0e5aa348ad465bb1b5821cd2/laya/revisions.py)
