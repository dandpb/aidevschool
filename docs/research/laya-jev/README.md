# Laya × Jev — pacote de retomada

Este diretório preserva o experimento de 4 de outubro de 2026, incluindo evidências históricas e as novas rodadas live. Os scripts abaixo permitem reproduzir em outro checkout.

**Estado atual:** os três checkpoints foram baixados nesta sessão, verificados e executados offline. A rodada do repositório concluiu 62 casos Laya e 62 Jev, com 142 respostas pareadas por digest; métricas em [REPORT.md](REPORT.md) e [evidence/live-2026-10-04/](evidence/live-2026-10-04/). O bloqueio 403 e os testes anteriores permanecem como histórico em [REPORT-historical.md](REPORT-historical.md).

Leia [RESUME.md](RESUME.md) primeiro para continuar na conversa indicada pelo usuário. Leia [REPORT.md](REPORT.md) para a análise e [evidence/](evidence/) para os logs. Não confundir testes offline com resultados de qualidade dos modelos.

O [fine-tuning typed-decisions](finetune/REPORT.md) foi executado em duas receitas, com [reprodução](finetune/README.md), splits congelados e targets Jev versionados. A v2 selecionada melhorou a concordância no teste exploratório, mas teve regressões no corpus original; permanece um checkpoint experimental fora da produção. Pesos em scratch, hashes e instruções de restauração no relatório.

## Instalar e executar os três modelos localmente

A partir da raiz deste repositório:

```sh
bash docs/research/laya-jev/bootstrap.sh
bash docs/research/laya-jev/download_and_run_local.sh
```

O bootstrap clona Laya no commit `8a6e1328cce2460a0e5aa348ad465bb1b5821cd2` e cria seu venv em `.scratch/laya-jev/laya/.venv`. Pode-se reutilizar outro checkout da mesma revisão com `LAYA_ROOT=/caminho/para/laya`.

O download usa o manifesto upstream [checkpoint-manifest.json](checkpoint-manifest.json), na revisão de pesos `1c5edc17a7acd8701df6fc341c0d179f1c62c982`; cada peso é verificado por SHA-256. `run_local_models.py` carrega diretórios locais, força modo offline e executa english, multilingual e typed-decisions sequencialmente em CPU. Não usa Jev nem uma chave externa. Uma chamada de aquecimento fica fora da medição de inferência.

```sh
.scratch/laya-jev/laya/.venv/bin/python docs/research/laya-jev/run_local_models.py --model all
```

## Comparar com Jev

Usar a credencial já configurada no processo ou em `.env` na raiz, ignorado pelo Git. `LAYA_JEV_ENV_FILE` permite carregar um arquivo externo autorizado sem mudar configuração de produção. A chave não foi incluída neste pacote. Nenhum comando abaixo exibe seu valor.

```sh
.scratch/laya-jev/laya/.venv/bin/python docs/research/laya-jev/run_comparison.py --backend laya
.scratch/laya-jev/laya/.venv/bin/python docs/research/laya-jev/run_comparison.py --backend jev --model jev-latest
.scratch/laya-jev/laya/.venv/bin/python docs/research/laya-jev/run_comparison.py --backend jev --model jev-1.13.0 --suite school-entry
.scratch/laya-jev/laya/.venv/bin/python docs/research/laya-jev/analyze.py --files .scratch/laya-jev/output/laya-auto.jsonl .scratch/laya-jev/output/jev-jev-latest.jsonl
```

Os defaults gravam novos resultados em `.scratch/laya-jev/output/`, fora do Git. Os runners de inferência recusam sobrescrever um arquivo de evidência existente; use `--output` com nome novo para cada rodada. `LAYA_JEV_OUTPUT_DIR` muda o diretório de saídas. Logs históricos versionados nunca são usados como substitutos de chamadas live.

O corpus congelado contém 62 casos, 220 perguntas, 142 respostas rotuladas e seis referências de engine preferida. Dados sintéticos e traduções correlacionadas limitam alegações de qualidade. O corpus não inclui labels independentes de perfil Dreyfus/Bloom ou recorrência no diário. Não regenerar `dataset.jsonl` durante uma rodada; o builder é a origem auditável do conjunto, não um passo obrigatório de execução.

O script de análise padrão lê as duas tentativas históricas e retorna zero pares comparáveis. Para dados novos, passe `--files` explicitamente. O runner v2 carrega e aquece cada checkpoint antes da medição: `load_ms`, `warmup_ms` e `warm_inference_ms` são separados; `elapsed_ms` inclui todas essas etapas quando ocorrem. Jev registra `http_roundtrip_ms`, incluindo inferência remota e transporte, que não são isoláveis sem telemetria do provedor. Não comparar esse valor como se fosse inferência no mesmo hardware. Não alterar gates, learner state, recibos canônicos ou limiares de produção com base neste piloto.

## Integridade

```sh
cd docs/research/laya-jev
sha256sum -c SHA256SUMS.txt
```

Em macOS, usar `shasum -a 256 -c SHA256SUMS.txt`. O manifesto cobre os artefatos versionados, sem incluir o próprio manifesto. Pesos, cache, venv e secrets ficam fora do commit.

## Validação antes da análise

O analyzer valida o corpus congelado e cada digest de entrada, IDs únicos, identidade do modelo retornado e respostas (chaves, tipos, valores finitos, opções e distribuições). Registros v2 exigem ainda corpus SHA, manifesto/revisão/source do checkpoint, routing e contrato de tempos. Evidência legada recebe `validation_scope=legacy_input_and_schema_only`, sem afirmar proveniência de pesos ou inferência aquecida. `paired_labelled_answers` conta somente respostas disponíveis tanto em Laya quanto em Jev; a cobertura de rodadas de subconjunto continua relativa aos 62 casos totais.

```sh
python3 docs/research/laya-jev/test_validation.py
python3 docs/research/laya-jev/test_provenance.py
```

O analyzer também recusa sobrescrever summaries existentes. Os hashes são verificações de integridade e consistência dos arquivos, não assinaturas que provam autoria de um produtor externo.
