# Continuação do typed-decisions em CPU

Experimento autorizado de especialização do head a partir do checkpoint oficial, sem integração de produção. O corpus histórico não é treino. Novos arquivos train/calibration/test são congelados pelo data-manifest; têm famílias textuais distintas, mas intenções e muitas frases componentes compartilhadas. Essa limitação impede tratá-los como avaliação real independente.

Receita: encoder congelado; camadas de decisão/type embedding/scorer; soft cross-entropy contra distribuições reais Jev-1.13.0; shuffle de opções choice/noul; quatro épocas; quatro threads CPU; microbatch 2, acumulação 8; lr do head 5e-5; max_len 512/head_max_len 256. A calibração usa apenas as 138 perguntas do split separado, jamais o teste. O resultado mede head mais calibração juntos.

Uma segunda receita exploratória parte novamente da mesma base com `--head-lr 5e-4 --model-name laya-typed-decisions-aidevschool-head-v2`; demais parâmetros iguais. A política pré-execução em `evidence/selection-policy-02.json` escolhe pelo KL mínimo na calibração entre os dois candidatos. A calibração passa a servir também para escolha da receita; não representa avaliação independente. Como o teste já foi visto após v1, a rodada v2 nele é exploratória. Nenhum resultado dessa escolha aciona produção.

## Reprodução

`build_data.py` é a origem auditável dos dados já congelados; não executá-lo em uma rodada existente, pois recusa sobrescrita. O catálogo necessário está em catalog.json, junto ao builder.

```sh
# A partir da raiz do repositório; definir LAYA_ROOT=/workspace/laya para reutilizar esta cloud.
export LAYA_ROOT="${LAYA_ROOT:-$PWD/.scratch/laya-jev/laya}"
# Instalar/baixar seguindo ../README.md se esse checkout ainda não existir.
python3 docs/research/laya-jev/finetune/test_data.py
python3 docs/research/laya-jev/finetune/test_targets.py
python3 docs/research/laya-jev/finetune/test_analysis.py
# Coleta nova opcional: os targets já estão em finetune/evidence/.
# Para novas chamadas, definir LAYA_JEV_ENV_FILE ou TYPESAFE_API_KEY sem imprimir valores.
"$LAYA_ROOT/.venv/bin/python" docs/research/laya-jev/finetune/collect_teacher.py --split train --output .scratch/laya-jev/finetune/new-teacher-train.jsonl
"$LAYA_ROOT/.venv/bin/python" docs/research/laya-jev/finetune/collect_teacher.py --split calibration --output .scratch/laya-jev/finetune/new-teacher-calibration.jsonl
"$LAYA_ROOT/.venv/bin/python" docs/research/laya-jev/finetune/collect_teacher.py --split test --output .scratch/laya-jev/finetune/new-teacher-test.jsonl
"$LAYA_ROOT/.venv/bin/python" docs/research/laya-jev/finetune/train_adapter.py --base "$LAYA_ROOT/models/laya-typed-decisions" --teacher-train .scratch/laya-jev/finetune/new-teacher-train.jsonl --teacher-calibration .scratch/laya-jev/finetune/new-teacher-calibration.jsonl --output .scratch/laya-jev/finetune/new-checkpoint
"$LAYA_ROOT/.venv/bin/python" docs/research/laya-jev/finetune/evaluate.py --checkpoint "$LAYA_ROOT/models/laya-typed-decisions" --corpus docs/research/laya-jev/finetune/test.jsonl --output .scratch/laya-jev/finetune/new-base-test.jsonl
"$LAYA_ROOT/.venv/bin/python" docs/research/laya-jev/finetune/evaluate.py --checkpoint .scratch/laya-jev/finetune/new-checkpoint --corpus docs/research/laya-jev/finetune/test.jsonl --output .scratch/laya-jev/finetune/new-trained-test.jsonl
python3 docs/research/laya-jev/finetune/analyze_training.py --corpus docs/research/laya-jev/finetune/test.jsonl --teacher .scratch/laya-jev/finetune/new-teacher-test.jsonl --base .scratch/laya-jev/finetune/new-base-test.jsonl --trained .scratch/laya-jev/finetune/new-trained-test.jsonl --training-report .scratch/laya-jev/finetune/new-checkpoint/training-report.json --output .scratch/laya-jev/finetune/new-analysis.json
```

Comparar base e treinado no mesmo formato. Na recomendação nova, cada decisão vê objetivo e somente a descrição de uma engine; o ranking reúne as 13 notas. Separar esse teste do catálogo completo usado no corpus histórico. Concordância com o teacher não equivale a ground truth; referências semânticas sintéticas também não são rótulos adjudicados independentemente.

Para verificar regressões no formato anterior, repetir as duas avaliações com `--corpus docs/research/laya-jev/dataset.jsonl` e nomes novos. Passar ao analyzer os resultados correspondentes e o Jev histórico validado em `../evidence/live-2026-10-04/jev-live-01.jsonl`. Esse corpus nunca entra em treino ou calibração. `test_analysis.py` usa as evidências versionadas em `evidence/`, sem rede ou pesos.

Pesos/configs exportados ficam em scratch, com hashes; nunca substituem os arquivos oficiais. `package_checkpoint.py` verifica cada tensor exportado do encoder contra a base e cria o pacote das camadas de decisão. `restore_adapter.py` reconstrói um checkpoint a partir da base verificada e desse pacote, e confere o hash integral final. Binários e secrets não são versionados no Git.

```sh
"$LAYA_ROOT/.venv/bin/python" docs/research/laya-jev/finetune/package_checkpoint.py --base "$LAYA_ROOT/models/laya-typed-decisions" --trained .scratch/laya-jev/finetune/new-checkpoint --output .scratch/laya-jev/finetune/new-adapter
"$LAYA_ROOT/.venv/bin/python" docs/research/laya-jev/finetune/restore_adapter.py --base "$LAYA_ROOT/models/laya-typed-decisions" --adapter .scratch/laya-jev/finetune/new-adapter --output .scratch/laya-jev/finetune/new-restored-checkpoint
```

Para restaurar o pacote entregue, extrair o ZIP fora do Git e apontar `--adapter` para sua pasta `typed-head-adapter-02`. O comando recusa um destino existente e só aceita reconstrução com o hash integral publicado em `evidence/adapter-manifest-02.json`.

A restauração/reprodução do treino pode usar `evidence/teacher-train-02.jsonl` e `evidence/teacher-calibration-02.jsonl` como targets, sem chave ou nova API. Para reproduzir a seleção, avaliar cada checkpoint com `--corpus docs/research/laya-jev/finetune/calibration.jsonl` e passar essas duas saídas e os dois training-reports a `select_checkpoint.py`; seus argumentos `--teacher`, `--v1`, `--v1-report`, `--v2`, `--v2-report`, `--policy` e `--output` são obrigatórios. Todos os outputs precisam de nomes inéditos.
