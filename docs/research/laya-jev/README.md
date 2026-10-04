# Laya × Jev — pacote de retomada

Este diretório preserva o experimento de 4 de outubro de 2026. O relatório e os logs são evidência histórica; os scripts abaixo são a interface portátil para continuar em outro checkout.

**Estado:** código instalado e testes locais passaram; nenhum checkpoint neural foi baixado ou executado. As chamadas reais a Hugging Face/TypeSafe falharam com HTTP 403 do proxy da instância anterior. A configuração exibida pelo usuário permitia todos os domínios, mas a política efetiva daquela execução continuava restrita. Verificar acesso efetivo na nova execução.

Leia [RESUME.md](RESUME.md) primeiro para continuar na conversa indicada pelo usuário. Leia [REPORT.md](REPORT.md) para a análise e [evidence/](evidence/) para os logs. Não confundir testes offline com resultados de qualidade dos modelos.

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

Usar a credencial já configurada no processo ou em `.env` na raiz, ignorado pelo Git. A chave não foi incluída neste pacote. Nenhum comando abaixo exibe seu valor.

```sh
.scratch/laya-jev/laya/.venv/bin/python docs/research/laya-jev/run_comparison.py --backend laya
.scratch/laya-jev/laya/.venv/bin/python docs/research/laya-jev/run_comparison.py --backend jev --model jev-latest
.scratch/laya-jev/laya/.venv/bin/python docs/research/laya-jev/run_comparison.py --backend jev --model jev-1.13.0 --suite school-entry
.scratch/laya-jev/laya/.venv/bin/python docs/research/laya-jev/analyze.py --files .scratch/laya-jev/output/laya-auto.jsonl .scratch/laya-jev/output/jev-jev-latest.jsonl
```

Os defaults gravam novos resultados em `.scratch/laya-jev/output/`, fora do Git. Os runners de inferência recusam sobrescrever um arquivo de evidência existente; use `--output` com nome novo para cada rodada. `LAYA_JEV_OUTPUT_DIR` muda o diretório de saídas. Logs históricos versionados nunca são usados como substitutos de chamadas live.

O corpus congelado contém 62 casos, 220 perguntas, 142 respostas rotuladas e seis referências de engine preferida. Dados sintéticos e traduções correlacionadas limitam alegações de qualidade. O corpus não inclui labels independentes de perfil Dreyfus/Bloom ou recorrência no diário. Não regenerar `dataset.jsonl` durante uma rodada; o builder é a origem auditável do conjunto, não um passo obrigatório de execução.

O script de análise padrão lê as duas tentativas históricas e retorna zero pares comparáveis. Para dados novos, passe `--files` explicitamente. A primeira chamada da comparação pode incluir carga do modelo; fazer uma rodada aquecida separada antes de declarar speedup. Não alterar gates, learner state, recibos canônicos ou limiares de produção com base neste piloto.

## Integridade

```sh
cd docs/research/laya-jev
sha256sum -c SHA256SUMS.txt
```

Em macOS, usar `shasum -a 256 -c SHA256SUMS.txt`. O manifesto cobre os artefatos versionados, sem incluir o próprio manifesto. Pesos, cache, venv e secrets ficam fora do commit.
