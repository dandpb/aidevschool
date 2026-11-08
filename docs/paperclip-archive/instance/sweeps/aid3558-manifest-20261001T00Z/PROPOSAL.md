# AID-3558 — Manifesto real `aid*-evidence/` + proposta de consolidação/retenção + lista de purge quarentena

Ciclo 2026-10-01T00:15–00:20Z · leitura somente (zero escritas fora `storage/sweeps/aid3558-manifest-20261001T00Z/`) · nada apagado.
Mandato: decisão CEO AID-3307 00:15Z (`db2b8094`, fila rev 4 linha Storage, APROVADO trabalho de proposta); pendências de origem AID-3543 `2ff52f9b` itens 2–3.

## 1. Manifesto REAL — 18× `/paperclip/aid*-evidence/` (TSV: `evidence-dirs.tsv`)

A lane citava 17×; hoje são **18** (delta `aid3556-evidence`, criada 20:10Z 09-30, issue AID-3556 ainda `in_progress`). Total **22.014.773 B (21,0 MiB)**, 158 arquivos.

Digest reproduzível por: `find <dir> -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum` (16 hex iniciais).

| dir | bytes | arq. | janela mtime (UTC) | digest | issue origem → status |
|---|---:|---:|---|---|---|
| aid3275-evidence | 77.771 | 5 | 09-30 15:55→15:58 | f6cc28cf36e0fdd8 | AID-3275 → **backlog** (A) |
| aid3404-evidence | 13.658 | 8 | 09-29 21:17→21:19 | b30358d01ba6c97c | AID-3404 → done (B) |
| aid3412-evidence | 3.022.885 | 2 | 09-29 22:54 | c0cf93cf2072d61b | AID-3412 → done (B) |
| aid3453-evidence | 2.134.026 | 10 | 09-30 14:43→14:45 | 0d59e88ecf1c5966 | AID-3453 → done (B) |
| aid3459-evidence | 1.070.758 | 14 | 09-30 08:25→12:08 | 47227cad113a8855 | AID-3459 → **blocked** (A) |
| aid3484-evidence | 1.550.341 | 8 | 09-30 10:46→11:55 | e7016861e5155a3f | AID-3484 → done (B) |
| aid3512-evidence | 1.011.388 | 10 | 09-30 16:59 | e22b6d8169b547cf | AID-3512 → done (B) |
| aid3517-evidence | 4.028.675 | 23 | 09-30 17:08→17:43 | 122f795ca6ce8a44 | AID-3517 → done (B) |
| aid3521-evidence | 372.666 | 13 | 09-30 17:01→17:03 | 50a05a5ba83498f1 | AID-3521 → done (B) |
| aid3523-evidence | 35.592 | 6 | 09-30 17:08→18:04 | 40b7e3925e13bc79 | AID-3523 → done (B) |
| aid3526-evidence | 3.544 | 1 | 09-30 17:08 | a6872aca84a78877 | AID-3526 → done (B) |
| aid3527-evidence | 7.208.111 | 14 | 09-30 19:46→20:06 | 7298452d1ca50302 | AID-3527 → **blocked** (A) |
| aid3530-evidence | 432.108 | 6 | 09-30 17:20→17:24 | 966652f4851674a6 | AID-3530 → done (B) |
| aid3531-evidence | 276.196 | 5 | 09-30 17:19→17:21 | 820f24aa691936fb | AID-3531 → done (B) |
| aid3532-evidence | 9.893 | 6 | 09-30 17:26→17:33 | 0d4f17c3f55c6593 | AID-3532 → done (B) |
| aid3533-evidence | 3.588 | 1 | 09-30 17:31 | 1ba4003a57ee0bda | AID-3533 → done (B) |
| aid3548-evidence | 693.664 | 11 | 09-30 19:46→19:55 | 80c02a35ce31d78f | AID-3548 → done (B) |
| aid3556-evidence | 69.909 | 11 | 09-30 20:10→20:15 | 2d8ffedf32004fae | AID-3556 → **in_progress** (A, run ativo cc5dfc38) |

## 2. Proposta de consolidação (execução só após decisão CEO; issue filha separada)

- Alvo: `/paperclip/storage/evidence/aid<N>/` + `MANIFEST.tsv` por dir (sha256 por arquivo, tamanho, mtime, issue origem) + `INDEX.tsv` consolidado.
- **Classe A (4 dirs, 10,3 MB — issues abertas: 3275/3459/3527/3556): ficam no lugar.** Produtores podem escrever; migração automática no fechamento (pass semanal do sweep verifica status e promove A→B).
- **Classe B (14 dirs, 11,4 MB — issues done): mover com verificação digest pré/pós-move** (mesmo comando do §1; divergência = abort + receipt). Move local `mv` dentro do mesmo FS, custo zero.
- Nenhum symlink, nenhuma mudança de produtor; raiz `/paperclip` fica sem espalhamento `aid*-evidence/`.

## 3. Política de retenção proposta (por classe)

| Classe | Regra | Gatilho de purge |
|---|---|---|
| E1 evidência de issue aberta | manter no lugar | n/a |
| E2 evidência de issue fechada | consolidada; reter **30d após close** | lista publicada → **decisão explícita CEO** (nunca auto-delete) |
| Q1a cred-nomeados (`protected/`: a2957_run.env, h585.env, pc_token, pc_token.txt, w2122_*, aid180-*) | **nunca** auto-purge | decisão owner/CEO item a item |
| Q1b learner-adjacent protegido (aid3353: literacydojo drill-import ×6, as3_migrated_c ×27) | manter; coordenar verificador | decisão conjunta Storage+Verificador+CEO |
| Q3 scratch de runs encerradas (intent/, code/, scripts/, tmp-* não protegido) | purge-eligível **>14d** | lista publicada → aprovação CEO |
| Q4 capturas de estado git (opt/storage-engineer/quarantine, 24 dirs) | purge-eligível **>14d** | lista publicada → aprovação CEO |

Orçamento: cap `storage/evidence/` 500 MB (alerta 80%); quarentena cap 50 MB. Hoje: 21 MB + 1,45 MB. Custo $0 (disco local; 63G avail).

## 4. Lista de purge quarentena >14d — **VAZIA hoje** (TSV: `quarantine-inventory.tsv`)

Inventário completo 40 dirs com conteúdo (1.486.074 B). Idade máxima = **4,1d** (`w2711-AID-2683`, 2026-09-25T22:25Z). Cronograma de elegibilidade:

| Data (UTC) | Itens que cruzam 14d | Bytes | Classe |
|---|---|---:|---|
| 2026-10-10T02:25Z→15:05Z | w2711, w2810, w2812, w2830, w2858mw, aid2952 | 110.526 | Q3 |
| 2026-10-10T17:06Z | 24× opt/storage-engineer (w2705, w2717, w2772 + 21 probes) | 1.344.711 | Q4 |
| 2026-10-11→12 | opencode-intent, tmp-* (cred-nomeados Q1a **fora** do purge), aid2949 ×2 | ~4,9 KB líquidos Q3 | Q3 |
| 2026-10-13 | aid3353 ×2 (**Q1b — requer Verificador antes**) | 27,6 KB | Q1b |

## 5. Integração com o sweep canônico (AID-3039) — sem duplicação

Pass adicional *notify-only* no `sweep.sh`: listar dirs da quarentena cruzando 14d → vai como pendência no receipt semanal → consolidação no carrier para decisão CEO. **Zero poder de deletar novo.** Achados do AID-3543 consumidos (167 dirs vazios já removidos lá; 16 com conteúdo = base deste inventário + 24 opt).

## Gates preservados

Nada apagado nesta tarefa; R2/credenciais/budget intocados; sweep canônico apenas consumido; produtores/verificadores intactos (storage reporta recibos, não valida mastery).

porcelain(_default) 2026-10-01T00:17Z: git status --porcelain = 0 lines (branch aid3527/pg-d01-os-pratica, HEAD 52f9d3fe) [AID-1516/AID-3372]
