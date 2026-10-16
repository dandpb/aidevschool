# learner/analytics_metrics — métricas de aprendizagem observável (AID-3515)

Pacote offline do Learner Analytics Engineer. Nada aqui toca coletor,
emissores, produção ou dados reais: é o **dicionário versionado de métricas**
+ **cálculo reproduzível** sobre **fixtures sintéticas rotuladas** +
**controles negativos** contra dupla contagem.

## Conteúdo

| Caminho | Papel |
| --- | --- |
| `dictionary.yaml` | dicionário v1 (observáveis, métricas, riscos, limites, NC-1..NC-8) |
| `compute.py` | dedup por `eventId` → funil por sessão → retry/erro/retomada → transferência; supressão k≥5; guarda anti-mastery |
| `fixtures/synthetic/` | NDJSON 100% sintético (recusa linha sem `synthetic:true`) |
| `examples/report-synthetic-v1.{json,md}` | relatório exemplo regenerável byte-a-byte |
| `tests/test_metrics.py` | 12 controles negativos (NC-1..NC-8 + extras, incl. `lessonVersion` inteiro) |

## Rodar

```bash
python3 -m pytest learner/analytics_metrics/tests/ -q
python3 learner/analytics_metrics/compute.py \
  --fixtures learner/analytics_metrics/fixtures/synthetic \
  --out-json /tmp/r.json --out-md /tmp/r.md
```

Doc de leitura: `docs/metrics/AID-3515-evidencias-observaveis.md`
(taxonomia, mapa eventos→observáveis, lacunas TF-1..TF-3, baseline real
honesto, próxima instrumentação).

Regras inegociáveis (herdadas de ADR-0009/0010): conclusão ≠ mastery;
analytics ≠ evidência; exemplos autorais nunca contam como resultado de
aluno; célula n<5 é `suppressed`, ausência é `not_measured` — nunca zero.
