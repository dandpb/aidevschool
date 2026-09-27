# Learner progress — exportação, selagem e restauração (AID-2884)

Backup lossless do progresso do LiteracyDojo (loop principal), com checksum
sha256 verificável e drill de restauração executável. Spike de prioridade 1 do
plano de storage (AID-2876, rev f5f4bbc3): o progresso vive só no navegador —
um "limpar dados do site" apaga a jornada inteira. O par exportar→restaurar é
o safety-net, mantendo **local-first e sem conta** como defaults.

## Resultado esperado

- Um arquivo JSON por aparelho (`literacydojo-progress-<data>.json`) contendo o
  `LearnerProgress` inteiro, exportado pelo próprio app (`Seu progresso →
  Baixar backup JSON`).
- Um sidecar `.sha256` no formato GNU coreutils, gravado pelo CLI de storage:
  `python3 scripts/storage/progress_backup.py seal <arquivo>`.
- Restauração verificada por drill e2e (`backup-restore.spec.ts`): export →
  apagar a chave de progresso (perda simulada) → importar → estado re-persistido
  idêntico ao exportado.

## Onde o progresso vive

| Estado | Local | Entra no backup? |
| --- | --- | --- |
| `LearnerProgress` (lições, skills, XP, streak, conquistas, onboarding) | IndexedDB `literacydojo` → store `progress` → chave `learner-progress` | Sim — é o documento inteiro |
| Acks do aviso de retrofit | localStorage `literacydojo:retrofit-acks` | Não — é aviso de UX, não jornada; volta a aparecer após restaurar |
| Evidência de tentativas | NDJSON dos sinks de evidência | Não — contrato próprio de evidência (producer ≠ verifier) |

Não há conta, sincronização nem telemetria Level 0 envolvidos: o arquivo é do
learner, no aparelho do learner.

## Exportar e selar (no aparelho do learner)

1. No LiteracyDojo: `Seu progresso → Baixar backup JSON`. O teto do produtor é
   `completed` — o arquivo nunca contém `mastered` (nem o CLI aceita: rejeita
   backup com status `mastered`).
2. Selar com checksum (uma vez por cópia guardada):

```console
$ python3 scripts/storage/progress_backup.py seal literacydojo-progress-2026-09-26.json
sealed  literacydojo-progress-2026-09-26.json  sha256=93f68ebe…c061fc1c
sidecar literacydojo-progress-2026-09-26.json.sha256
```

3. Guardar o par `.json` + `.sha256` juntos (pasta pessoal, pen drive, nuvem
   do próprio learner). O sidecar é compatível com `sha256sum -c`.

## Verificar e restaurar

Antes de importar (no aparelho novo, ou depois de um incidente):

```console
$ python3 scripts/storage/progress_backup.py verify literacydojo-progress-2026-09-26.json
OK  literacydojo-progress-2026-09-26.json  sha256=93f68ebe…c061fc1c  fonte=…json.sha256
```

- `verify` recalcula o sha256, compara com o sidecar (ou `--expect <hex>`),
  valida a forma do JSON (`schemaVersion` 1–4, `lessonStatus`/`skills`/
  `streak`/`onboarding`) e rejeita `mastered`. Sai `0` somente se tudo bater.
- Backup de schema antigo (1–3) verifica OK e importa OK: a migração
  forward-only roda na importação (`migration.ts`), antes de persistir.
- A restauração em si é no app: `Seu progresso → Restaurar backup`. Num
  aparelho novo (ou dados limpos), o onboarding precisa ser completado uma
  vez até a home para a tela de progresso existir; a importação então
  **substitui o documento inteiro** e persiste no IndexedDB antes de
  responder.

## Drill executável (recibo)

O drill roda no app real, sem mocking de storage:

```console
$ cd engines/literacyDojo && npx playwright test backup-restore --project=app
  ✓  1 [app] › export→wipe→import é lossless: backup com sha256 restaura o progresso idêntico (3.9s)
  1 passed (9.3s)
```

O teste gera progresso real (onboarding + Mapa Inicial concluído, 55 XP),
exporta pelo botão de produção (download de verdade), confere igualdade
JSON↔IndexedDB, apaga a chave de progresso, recarrega (perda visível:
welcome de novo), reonboarda, importa o arquivo exportado e exige
`restored == exported` byte-a-byte em JSON. O artefato exportado fica em
`test-results/…/literacydojo-progress-drill.json` para selagem manual.

Última execução completa (2026-09-26): `1 passed (9.3s)`; artefato de 1822
bytes, `schemaVersion 4`, `xp 55`, sha256
`93f68ebe37513bc144d4d4e9b3adaf245886c1e1d893057724da7c6ec061fc1c`;
falsificação de XP detectada (`FAIL checksum`, exit 1); JSON corrompido
detectado (`FAIL estrutura`, exit 1); `mastered` injetado rejeitado (exit 1).

## Retenção e boas práticas

- O backup é pequeno (~2 KB hoje) — guardar as últimas N cópias é barato; o
  CLI é content-addressed por sha256, então cópias idênticas têm o mesmo
  checksum e não precisam de versionamento especial.
- Recomendação ao learner: exportar a cada sessão de estudo significativa ou
  antes de limpar dados/trocar de aparelho.
- Este spike não introduz banco de dados, conta, login ou telemetria —
  mudanças nessa direção vão ao CEO primeiro (limite do plano AID-2876).

## Relacionados

- `docs/handbook/12_engine_literacyDojo.md` — visão do engine.
- `engines/literacyDojo/src/domain/progressBackup.ts` — serialização/cap do
  produtor; `src/domain/migration.ts` — migração forward-only.
- `engines/literacyDojo/playwright/backup-restore.spec.ts` — o drill.
- `scripts/storage/progress_backup.py` — selo/verificação sha256.
