# Runbook — Pipeline de mídia content-addressed (R2 + CDN)

Issue: AID-2925 · Owner: Storage Engineer · Status: **ativo**
ADR: `docs/storage/AID-2886_ADR_MEDIA_PIPELINE_2026-09-26.md` (**ACEITA** — Opção 2
R2 + CDN, decisão do founder registrada na ADR)
Ferramenta: `scripts/storage/media_pipeline.py` + `scripts/storage/s3_miniclient.py`
(Python 3 stdlib only — sem dependências; SigV4 nativo contra API S3-compatível)

## 1. Contrato (o que o pipeline garante)

1. **Bytes são content-addressed**: mídia sobe como `media/<sha256>.<ext>` —
   imutável e idempotente por construção (mesmo conteúdo → mesma chave → sem
   duplicata no bucket; conteúdo divergente na mesma chave é erro, não overwrite).
2. **O repo é a fonte da verdade das referências**:
   `docs/storage/manifests/media-manifest.json` mapeia `path → sha256 → key → url`.
   O bucket é armazém de bytes; o manifest vive no git e é revisto em PR.
3. **Lifecycle de órfãos**: objeto em `media/` sem referência no manifest por
   **mais de 90 dias** expira. O GC é manifest-driven (`orphan-gc`): marca o
   órfão com a tag `orphan-since`, deleta só após a carência; objeto
   referenciado **nunca** é deletado (nem no `--grace-days 0`). Regra nativa
   equivalente no R2 (seção 5) é rede de segurança, não autoridade.
4. **Orçamento**: alerta em **US$10/mês** (40% do teto), teto **US$25/mês**
   (`budgetMonthlyCents` 2500) sem aprovação expressa do CEO.
5. **Migração incremental**: apenas mídia **nova** entra no pipeline. Histórico
   existente não é reescrito (history rewrite é irreversível e exige ADR própria).

Storage move e preserva bytes — não avalia nada (producer ≠ verifier). CDN
pública de leitura não é account wall nem telemetria: Level 0 permanece sem conta.

## 2. Configuração (ambiente)

| Env | Uso | Exemplo |
|---|---|---|
| `ADS_MEDIA_ENDPOINT` | endpoint S3-compatível | `https://<account>.r2.cloudflarestorage.com` |
| `ADS_MEDIA_ACCESS_KEY_ID` / `ADS_MEDIA_SECRET_ACCESS_KEY` | token R2 (escopo: só este bucket) | — |
| `ADS_MEDIA_REGION` | região SigV4 | `auto` (R2) |
| `ADS_MEDIA_BUCKET` | bucket | `aidevschool-media` |
| `ADS_MEDIA_CDN_BASE` | base pública de URL | `https://media.cdn.<dominio>` |

Credenciais ficam fora do repo (env/secret manager). Acesso anônimo de leitura
não é necessário: a leitura pública acontece pela CDN, não pelas chaves.

## 3. Comandos

```bash
scripts/storage/media_pipeline.py bootstrap                    # cria bucket + policy object
scripts/storage/media_pipeline.py upload ARQUIVO --path PATH   # media/<sha256>.<ext> + manifest
scripts/storage/media_pipeline.py verify [--deep]              # manifest vs bucket (recibo)
scripts/storage/media_pipeline.py orphan-gc [--dry-run] [--grace-days 90]
scripts/storage/media_pipeline.py budget                       # bytes medidos → US$ vs alerta/teto
scripts/storage/media_pipeline.py restore --into DIR           # restaura, sha256 fail-closed
scripts/storage/media_pipeline.py self-test                    # e2e sem rede (fake S3 in-process)
```

Todo comando emite recibo JSON em stdout; `verify`/`budget` saem com rc=1 em
FAILED/ALERT (monitoramento pode pendurar nisso). O manifest default é o do
repo (`docs/storage/manifests/media-manifest.json`); drills usam `--manifest`
apontando fora do repo.

## 4. Provisionamento

### 4a. Produção (Cloudflare R2) — requer credenciais do CEO

1. Dashboard R2 → criar bucket `aidevschool-media` (location: auto).
2. Criar token S3 (escopo Object Read & Write **neste bucket**) → preencher env da seção 2.
3. `python3 scripts/storage/media_pipeline.py bootstrap` — cria o objeto
   `ops/lifecycle-policy.json` no bucket (política documental, seção 5) e
   tenta habilitar versionação (best-effort; R2 pode recusar — o recibo registra).
4. Conectar domínio público ao bucket (R2 public access ou custom domain por
   trás do CDN do Cloudflare) → definir `ADS_MEDIA_CDN_BASE`.
5. Configurar **budget notification** no dashboard (seção 6) em US$10.
6. Primeiro upload de mídia real de micro-lesson + `verify --deep` como recibo.

### 4b. Stand-in local (S3-compatível, sem custo/credencial)

O pipeline é idêntico; só muda o endpoint. O drill AID-2925 usou `moto_server`
5.2.3 como API S3 real (SigV4 validado de verdade). Qualquer S3-compatível
serve (MinIO incluído):

```bash
ADS_MEDIA_ENDPOINT=http://127.0.0.1:53210 ADS_MEDIA_REGION=us-east-1 \
ADS_MEDIA_ACCESS_KEY_ID=x ADS_MEDIA_SECRET_ACCESS_KEY=x \
  python3 scripts/storage/media_pipeline.py self-test
```

## 5. Lifecycle de órfãos (regra completa)

- **Autoridade**: o manifest no git. Um objeto é órfão quando nenhum `entries[].sha256`
  o referencia (chave = `media/<sha256>.<ext>`, então o stem da chave é o sha256).
- **Marcação**: `orphan-gc` aplica a tag `orphan-since=<UTC>` no primeiro avistamento.
- **Expiração**: `orphan-gc` deleta quando `now - orphan-since > grace-days` (default 90).
  Renova-se a referência (path re-manifestado) antes da expiração, a tag é removida.
- **Regra nativa R2** (rede de segurança, configurar no dashboard): Delete objects
  older than 90 days com prefixo `media/` **+ Abort incomplete multipart uploads
  older than 7 days**. A regra nativa cobre o pior caso do GC de aplicação nunca
  rodar; o GC do manifest continua sendo a autoridade para tudo que é referenciado
  (por isso a regra nativa só expira o que está velho *e* o GC confirma órfão).
  Estado desejado é espelhado no objeto `ops/lifecycle-policy.json` (via `bootstrap`).
- **Execução**: `orphan-gc` roda no sweep horário do Storage Engineer
  (`/paperclip/storage/sweeps/`) — dry-run semanal, execução real só com recibo
  no log do sweep.

## 6. Orçamento e alertas

- `budget` mede bytes no bucket (`list-objects-v2`) e estima
  `storage_GB × US$0,015/GB-mês` (preço de tabela R2; egress US$0; primeira
  camada grátis — a estimativa é conservadora, sem free tier).
- Níveis: `ok` < US$10 · `alert` ≥ US$10 · `cap_exceeded` ≥ US$25.
- **Alerta real de billing** configura-se no dashboard Cloudflare
  (Billing → notifications) em US$10/mês — custo acima de US$25 exige
  aprovação prévia do CEO (boundary do plano).
- Ops Classe A/B são desprezíveis na escala atual (uploads são eventos de
  autoria, não de leitura; leitura sairia da CDN).

## 7. Restore (drill obrigatório antes de "produção de facto")

1. `media_pipeline.py verify` — manifest vs bucket deve estar `ok`.
2. `media_pipeline.py restore --into /tmp/restore-sandbox` — baixa todos os
   objetos do manifest, **re-hasha cada um** e só grava se `sha256 == manifest`
   (fail-closed: objeto corrompido não é gravado, entra em `problems`).
3. Comparar bytes restaurados vs originais (`cmp`) — recibo no log do drill.
4. Registrar o drill em `/paperclip/storage/aidevschool/drills/DRILL-*.log`.

Drill de referência (AID-2925, 2026-09-26): bootstrap, upload+dedup, verify
deep 3/3, restore 3/3 byte-identical, tamper detectado, órfão marcado→expirado,
referenciados intactos, budget US$0,00 — **PASS**
(`DRILL-20260926T141915Z-media-pipeline.log`).

## 8. Migração incremental (regras de engajamento)

- **Novo** asset de mídia de micro-lesson (áudio/imagem/vídeo) e **novos**
  screenshots de evidência volumosos: upload via pipeline + referência no
  manifest + URL CDN no doc/aula. O PR mostra o manifest, não os bytes.
- Histórico existente (619 PNGs / ~162 MiB já rastreados) **não** é migrado
  nesta fase; `.git` congela em ~237 MiB (decisão ADR).
- O build do Netlify continua sem mídia (limite de 10k arquivos por deploy).
- Nada de `git lfs`, nada de credencial no CI, nada de CDN-rewrite mágico: a
  referência no manifest é o contrato.

## 9. Falhas conhecidas e limites

- `PutObjectTagging` exige `Content-MD5` (implementado); gateways WSGI exigem
  `Content-Type` explícito (implementado — x-www-form-urlencoded default do
  urllib consumia o body antes do handler).
- `bootstrap` envia `LocationConstraint` só quando o endpoint exige
  (`IllegalLocationConstraintException`); R2/`auto` não envia.
- `restore`/`verify --deep` fazem GET integral de cada objeto (custo Classe B
  irrelevante na escala atual; egress zero).
- O manifest cresce uma entrada por path lógico (não por conteúdo) — dedup de
  conteúdo compartilha a mesma chave/objeto.
