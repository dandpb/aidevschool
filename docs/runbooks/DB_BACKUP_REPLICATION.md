# Runbook — Replicação off-site dos dumps do Paperclip DB (R2) + drill de restore

Issue: AID-2953 · Owner: Storage Engineer · Status: **ativo**
Decisão: CEO AID-2950 (delegação) — retenção local curta `{dailyDays:3, weeklyWeeks:4,
monthlyMonths:1}` no Paperclip; **a retenção longa vive off-box**.
Ferramenta: `scripts/storage/db_backup_replicator.py` +
`scripts/storage/restore_drill.py` + `scripts/storage/pg_miniclient.py`
(Python 3 stdlib only — sem dependências; SigV4 nativo contra API S3-compatível)

## 1. Contrato (o que o pipeline garante)

1. **Upload pós-backup**: cada dump `paperclip-YYYYMMDD-HHMMSS.sql.gz` de
   `/paperclip/instances/default/data/backups/` sobe para
   `paperclip-db/<filename>` no bucket `aidevschool-backups` (R2) com
   metadados `x-amz-meta-sha256` + tamanho. RPO alvo: ≤1h (upload logo após
   cada dump horário; egress R2 = US$0).
2. **Imutável por construção**: chave existente com tamanho divergente é
   ERRO — nunca overwrite, nunca reescrita. sha256 verificado por HEAD
   pós-PUT (`replicate` reporta por objeto).
3. **O dump local NUNCA é tocado**: este pipeline apenas LÊ
   `/data/backups`; a poda local é 100% do mecanismo tiered do Paperclip
   (decisão AID-2950 D1).
4. **Retenção tiered off-box** (`retention`, dry-run default):
   janela horária de `keepHoursDays` (default 2d, tudo fica) →
   último dump de cada dia por `keepDailyDays` (30) → último dump de cada
   mês por `keepMonthlyMonths` (12). Chaves sob `paperclip-db/` sem nome
   parseável NUNCA são deletadas (uncertain purpose → surfaced).
5. **Orçamento**: alerta em US$10/mês (40% do teto), teto US$25/mês
   (US$0,015/GB-mês R2, egress zero — 31,5GB steady state ≈ US$0,47/mês).
6. **Backup só existe se restaura**: drill de restore trimestral (seção 6),
   fail-closed — dump truncado ou 1 erro SQL = drill FAILED.

Storage move bytes e preserva evidência — nunca avalia (producer ≠ verifier).

## 2. Configuração (ambiente)

| Env | Uso | Exemplo |
|---|---|---|
| `ADS_BACKUPS_ENDPOINT` | endpoint S3-compatível | `https://<account>.r2.cloudflarestorage.com` |
| `ADS_BACKUPS_ACCESS_KEY_ID` / `ADS_BACKUPS_SECRET_ACCESS_KEY` | token R2 (escopo: só este bucket) | — |
| `ADS_BACKUPS_REGION` | região SigV4 | `auto` (R2) |
| `ADS_BACKUPS_BUCKET` | bucket | `aidevschool-backups` |

Credenciais em segredo **0600** fora de qualquer repo:
`/paperclip/storage/aidevschool/creds/ads-backups.env` (padrão do intake
README do diretório `creds/`). Nunca em comentário de issue, nunca no CI.

## 3. Comandos

```bash
scripts/storage/db_backup_replicator.py bootstrap                    # bucket + policy object
scripts/storage/db_backup_replicator.py replicate [--from DIR] [--prune]
scripts/storage/db_backup_replicator.py verify [--deep] [--from DIR] # recibo, rc=1 em FAILED
scripts/storage/db_backup_replicator.py retention [--apply]          # dry-run default
scripts/storage/db_backup_replicator.py budget                       # bytes → US$ vs alerta/teto
scripts/storage/db_backup_replicator.py restore-latest --into DIR    # download + sha256
scripts/storage/db_backup_replicator.py self-test                    # e2e fake S3 in-process

scripts/storage/restore_drill.py --dump DUMP.sql.gz [--spot-issue AID-XXXX]
scripts/storage/restore_drill.py --from-bucket --into DIR            # baixa + restaura
```

Todo comando emite recibo JSON em stdout; `verify`/`budget` saem com rc=1 em
FAILED/ALERT. O sweep horário do Storage Engineer roda `replicate --prune` +
`verify` e pendura no rc.

## 4. Provisionamento

### 4a. Produção (Cloudflare R2) — requer token do CEO

1. Dashboard R2 → criar bucket `aidevschool-backups` (location: auto).
2. Criar token S3 (escopo Object Read & Write **neste bucket** — token
   separado do bucket de mídia) → `/paperclip/storage/aidevschool/creds/ads-backups.env` (chmod 600).
3. `source` do env + `bootstrap` — cria `paperclip-db/ops/lifecycle-policy.json`
   (política documental; a autoridade é o comando `retention`).
4. `replicate` inicial (backfill dos dumps locais existentes) + `verify --deep`.
5. **Budget notification** no dashboard R2 em US$10.
6. Primeiro drill de restore completo (seção 6) como recibo de aceite.

### 4b. Stand-in local (S3-compatível, sem custo/credencial)

Mesmo pipeline, só muda o endpoint. O drill AID-2953 usou o fake S3
in-process do próprio script (`self-test` e drill de 26/09 com dumps reais de
350MB); SigV4 já validado contra `moto_server` 5.2.3 no drill de mídia
(AID-2925). Qualquer S3-compatível serve (MinIO incluído).

## 5. Retenção (regra completa)

| Tier | Regra | Default | Observação |
|---|---|---|---|
| horário | tudo dentro de N dias | 2d | espelha a janela local curta (RPO fino recente) |
| diário | ÚLTIMO dump de cada dia | 30 dias | primeiro dump do dia expira |
| mensal | ÚLTIMO dump de cada mês | 12 meses | representante mensal |

- A poda é por listing do bucket — nunca por relógio local de objeto.
- `retention` sem `--apply` só PLANEJA (recibo com `planned`/`kept`).
- Objeto fora do padrão de nome: `unparsedNotTouched` — surfaced, humano decide.

## 6. Drill de restore (trimestral + pós-provisionamento)

```bash
# 1) baixar o mais novo do bucket p/ sandbox (sha256 vs meta fail-closed)
scripts/storage/db_backup_replicator.py restore-latest --into /tmp/opencode/restore-drill
# 2) restaurar num PG descartável (initdb próprio, binários do PG embutido)
scripts/storage/restore_drill.py --dump /tmp/opencode/restore-drill/<dump>.sql.gz \
  --spot-issue AID-XXXX   # issue do trimestre corrente
```

Checks fail-closed do drill:
1. **Truncamento**: dump sem `COMMIT;` final = `TRUNCATED` → FAILED antes de
   subir PG. *(Achado real 2026-09-26: `paperclip-20260916-091039.sql.gz` —
   representante mensal de setembro local — está truncado no meio de um COPY
   de `heartbeat_run_events`; envelhece naturalmente quando um dump válido
   mais novo de setembro virar o "último do mês")*.
2. **Restore**: 1 erro SQL aborta o dump inteiro (transação única BEGIN…COMMIT).
3. **Sanity**: nº de tabelas + row counts por tabela + spot-check de uma
   issue conhecida (id/título) restaurada.

Recibo: JSON completo (sha256, statements, copyBlocks, seconds, rowCounts,
spot) arquivado em `/paperclip/storage/aidevschool/drills/` + comentário no
issue do Storage.

## 7. Frequência e monitoramento

- `replicate --prune` + `verify`: no sweep horário do Storage Engineer
  (`/paperclip/storage/sweeps/`); rc≠0 ⇒ notificação (não ruído horário).
- `budget`: diário; nível `alert` ⇒ notifica CEO; `cap_exceeded` ⇒ PARA e
  escala (teto US$25 é hard cap sem aprovação).
- Drill de restore: trimestral (jan/abr/jul/out) ou após mudança no formato
  de dump do Paperclip.
