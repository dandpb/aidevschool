# VALIDAÇÃO — P10: baseline de peso dos bundles

## Decisão de escopo

O warning de chunks >500 kB no build do piloto não é, por si só, prova de problema para o
aluno. O processo correto é **medir antes de otimizar**. Este caso entrega a baseline
reproduzível; code splitting fica como decisão futura informada por uso real.

## Medição executada

```bash
python3 docs/prioridades/2026-08-17/caso-p10-bundle-weight/measure_bundle_weight.py
```

Resultado real (dist gerado por `npm run build:pilot` nesta rodada):

| Bundle | Arquivos | Raw | Gzip (estimado) |
|---|---:|---:|---:|
| os-shell | 20 | 4128 KB | 2431 KB |
| apps/literacydojo | 7 | 313 KB | 95 KB |
| apps/warehouse | 3 | 519 KB | 134 KB |
| apps/wormhole | 3 | 550 KB | 142 KB |
| apps/relay-station | 3 | 527 KB | 136 KB |

Baseline persistida em `baseline.json` (mesmo diretório).

## Leitura honesta

- O primeiro carregamento do shell pesa ~2.4 MB gzip. O OS é o maior custo, não os runtimes.
- Cada missão voxel adiciona ~135–140 KB gzip sob demanda (iframe), o que é aceitável para um
  piloto, mas o warning >500 kB raw indica que code splitting será útil se o piloto escalar.
- Não há medição de tempo de primeira interação em rede real; isso exige o piloto com alunos.

## Entregue

Medição reproduzível + baseline JSON. **Não entregue:** otimização, code splitting ou meta de
performance — propositalmente adiados até haver dados de uso.
