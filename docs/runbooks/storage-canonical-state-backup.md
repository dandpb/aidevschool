# Runbook — Backup e restore do estado canônico (repo-as-database)

Issue: AID-2885 · Owner: Storage Engineer · Status: **ativo**
Ferramenta: `scripts/storage/snapshot_canonical_state.py` (Python 3 stdlib only)

## 1. O que está protegido (escopo do snapshot)

O repositório é o banco (filesystem é a fonte da verdade). O backup cobre o
estado canônico que pode estar à frente do git (não commitado) — o resto do
repo é recuperável pelo próprio git.

| Caminho | Papel | Obrigatório |
|---|---|---|
| `learner/learning_state.yaml` | progresso do learner (fonte canônica) | sim (fail-closed) |
| `curriculum/catalog.md` | catálogo do currículo | sim (fail-closed) |
| `.mavis/` | read models gerados | opcional (warn se ausente) |
| `engines/*/src/data/` | read models dos dashboards (ex.: curriculum-data) | opcional (warn se ausente) |

Exclusões: `__pycache__/`, `node_modules/`, `*.pyc`, symlinks (registrados em
`meta.json` como `skipped_symlinks`). Se um arquivo obrigatório estiver
ausente, o snapshot **falha fechado** (exit 1) — nunca grava backup parcial
silencioso.

Evidência NDJSON (retenção imutável) e pipeline de mídia têm contrato próprio
(AID-2886). Export/restore do progresso no navegador é AID-2884.

## 2. Onde ficam os snapshots

```
/paperclip/storage/aidevschool/          (override: env AID_SNAPSHOT_ROOT)
  snapshots/<UTC-ts>/bundle.tar.gz       imagens exatas, caminhos relativos ao repo
  snapshots/<UTC-ts>/manifest.sha256     compatível com `sha256sum -c`
  snapshots/<UTC-ts>/meta.json           proveniência (git HEAD, dirt), digests, política
  snapshots/LATEST                       ponteiro para o snapshot mais novo
  drills/DRILL-<UTC-ts>.log              receipts dos drills de restore
```

Criação é atômica (dir temporário + rename). Single-flight via flock em
`.locks/snapshot.lock` — chamadas concorrentes saem com `{"status":"busy"}`
sem erro. Disquete local hoje; migração para R2/S3 é proposta à parte (ADR no
AID-2886), sem quebrar o formato.

## 3. Política de retenção (declarada)

| Bucket | Regra | Manter |
|---|---|---|
| horário | chamado pelo sweep de cada hora | últimos 24 |
| diário | último snapshot de cada dia UTC | 7 dias |
| semanal | último de cada semana ISO | 4 semanas |
| mensal | último de cada mês UTC | 6 meses |
| idade mínima | nunca apagar snapshot com menos de 1h | — |
| mais novo | nunca apagar | sempre |

Orçamento de storage (dentro do teto geral de US$ 25/mês; custo atual em disco
local = US$ 0):

- **Soft cap: 2048 MiB** — alerta em ≥ 80% (exit 2 no `status`).
- **Hard cap: 2560 MiB** — prune emergencial dos mais antigos; se persistir
  acima, exit 2 e escalada ao CEO.

O sweep horário (AID-2883) deve, a cada execução:
`snapshot --prune` + `status --json`, e somar `bytes` ao orçamento de storage
do relatório. `status` com exit 2 = notificação (não é ruído).

## 4. Comandos

```bash
# snapshot agora + aplicar retenção (é o que o sweep chama)
python3 scripts/storage/snapshot_canonical_state.py snapshot --prune

# verificação de integridade de um snapshot (bundle + manifest)
python3 scripts/storage/snapshot_canonical_state.py verify LATEST

# relatório de orçamento (JSON para o sweep)
python3 scripts/storage/snapshot_canonical_state.py status --json

# restore verificado para um diretório alvo
python3 scripts/storage/snapshot_canonical_state.py restore LATEST --target /tmp/restore-x

# restore sobre um repo vivo (exige força e faz backup .pre-restore-backup-* antes)
python3 scripts/storage/snapshot_canonical_state.py restore <id> --target <repo> --force-overwrite

# drill completo (snapshot + verify + tamper test + restore + diff) com receipt
python3 scripts/storage/snapshot_canonical_state.py drill
```

O restore sempre: (1) verifica o snapshot ANTES de extrair; (2) recusa
sobrescrever arquivos existentes sem `--force-overwrite`; (3) com força, faz
backup dos arquivos sobrescritos em `.pre-restore-backup-<ts>/`; (4) verifica
byte-a-byte DEPOIS de extrair (fail-closed).

## 5. Drill de restore (procedimento)

Executar a cada mudança do contrato e no mínimo 1×/semana (sweep agenda):

1. `drill` roda: snapshot novo → verify in-place → `sha256sum -c` externo →
   simulação de desastre (tamper em `learner/learning_state.yaml` restaurado,
   verificação DEVE falhar) → restore em sandbox limpo → diff byte-a-byte
   contra o repo vivo (0 diffs esperados logo após snapshot).
2. Receipt = log real salvo em `drills/DRILL-<ts>.log` + respostas coladas na
   issue de storage. Receipt com output de comando, não afirmação.
3. Falha em qualquer passo = drill FAIL → incidente: comentário na issue +
   escalada ao CEO se houver suspeita de perda de dados.

Disaster path real (perda do `learner/learning_state.yaml`):
`restore LATEST --target <repo> --force-overwrite` restaura o estado do último
snapshot horário; o pre-restore-backup preserva o estado anterior sobrescrito.

## 6. Histórico de drills

| Data (UTC) | Snapshot | Resultado | Receipt |
|---|---|---|---|
| 2026-09-26 | (primeira execução — ver issue AID-2885) | — | — |

> Producer never verifies: este runbook preserva bytes e reporta integridade;
> nunca marca domínio/mastery. Storage dá receipt, não veredito.
