# Política de Retenção de Evidência NDJSON — AID-2886

**Status:** Proposta ativa (load-bearing após merge; revisão pelo CEO)
**Data:** 2026-09-26 · **Base de medição:** `origin/main` @ `dbb6d02c`
**Owner:** Storage Engineer · **Plano aprovado:** AID-2876 rev `f5f4bbc3`, prioridades 2 e 5

---

## 1. Escopo

Esta política cobre todo NDJSON de evidência emitido pelas attempt surfaces e
consumidores do ecossistema AiDevSchool. Ela define classes de retenção,
verificação de integridade por manifest sha256, orçamento de tamanho e regras de
crescimento. Não cobre `learner/learning_state.yaml` (estado canônico, objeto de
política de backup própria) nem mídia binária (objeto do ADR de pipeline de
mídia, `AID-2886_ADR_MEDIA_PIPELINE_2026-09-26.md`).

## 2. Princípios

1. **Filesystem é a fonte da verdade.** Nenhum banco, nenhum lock. Evidência é
   arquivo linha-a-linha (NDJSON), auditável com ferramentas padrão.
2. **Producer ≠ verifier.** Storage **preserva** evidência; storage **nunca
   avalia**, pontua ou marca mastery. `pass: true` num arquivo preservado aqui é
   um fato registrado, não uma afirmação do storage sobre aprendizado.
3. **Imutável uma vez comprometido.** Evidência confirmada no git nunca é
   reescrita; correções são registros novos (append), nunca edições de histórico.
4. **Content-addressed.** Cada lote de evidência é descrito por um manifest
   sha256 por caminho; integridade = recalcular e comparar.

## 3. Mapa de produtores (streams de evidência)

| Classe | Caminho | Producer | No git? | Papel |
| --- | --- | --- | --- | --- |
| E1 | `docs/product-readiness/evidence/*.ndjson` | runs de readiness | sim | Evidência de produto comprometida |
| E1 | `learner/judgment_receipts/*.ndjson` | metric-lint / judgment runs | sim | Recibos de julgamento |
| E1 | `docs/curso/workflow_lab/evidence/**/*.ndjson` | LiteracyDojo e2e (workflow lab) | sim | Evidência de run de curso |
| E1 | `docs/qa/flaky-ledger/flaky-ledger.ndjson` | QA ledger | sim | Ledger de flakiness |
| E2 | `learner/gate/tests/fixtures/analytics/**/*.ndjson` | fixtures sintéticas | sim | Dados de teste (segue ciclo do código) |
| E3 | `engines/*/**/.logs/evidence*.ndjson` | attempt surfaces (pixelDojo smoke, voxelDojo…) | **não** (gitignored) | Evidência de runtime, regenerada a cada run |
| E3 | `engines/minimaxDojo/whiteboard/event_log/*.ndjson` | whiteboard engine | parcial | Event log de engine |
| E4 | `.scratch/factory/**/*.ndjson` | factory runs | **não** (gitignored) | Evidência efêmera de runs de fábrica |

Contrato de referência do par producer/consumer:
`engines/pixelDojo/EVIDENCE_CONTRACT.md` (o jogo emite; `python3 -m learner.gate`
decide o gate). Esta política não altera nenhum contrato — apenas define quanto
tempo e como o storage preserva o que eles produzem.

## 4. Classes de retenção

### E1 — Evidência canônica comprometida (retenção: indefinida)
- **Regra:** entra no git por PR; após merge, é imutável. Nunca apagar, nunca
  reescrever, nunca "limpar" linhas. Retenção = história do repositório.
- **Integridade:** manifest sha256 versionado junto com o corpus
  (`docs/storage/manifests/`). Verificação: `sha256sum -c` (Seção 6).
- **Exceção de remoção:** somente por decisão registrada do CEO (ex.: remoção de
  dado pessoal de learner) — e mesmo assim via commit novo que registre o quê e
  por quê, com o manifest regenerado.

### E2 — Fixtures de teste (retenção: ciclo de vida do código)
- Fixtures são insumo de teste, não evidência de aprendizagem. Seguem o ciclo
  normal do código: podem ser substituídas/removidas por PR que atualize os
  testes correspondentes. Sem valor probatório após o teste passar.

### E3 — Evidência de runtime das attempt surfaces (retenção: 90 dias ou cota, o que vier primeiro)
- **Regra:** `.logs/evidence*.ndjson` são regenerados a cada smoke run (ver
  contrato pixelDojo). São a memória de curto prazo entre producer e verifier.
- **Janela:** manter no mínimo **90 dias** OU até o tamanho da superfície
  atingir a cota (Seção 5), o que ocorrer primeiro. Compactação = arquivar o
  arquivo atual para `.logs/archive/evidence-<ISO-date>-<sha8>.ndjson.gz` com um
  manifest sha256 lado a lado, e deixar o producer regenerar do zero no próximo
  run.
- **Nunca** compactar durante sessão ativa (arquivo aberto pelo producer);
  compactar somente arquivo quiescente há > 24 h.
- **Anti-replay:** a compactação não altera semântica do gate — o verifier já
  exige `ts` estritamente novo por unidade (contrato pixelDojo §consumo).

### E4 — Evidência efêmera de factory (retenção: run fechada + 14 dias, teto de cota)
- `.scratch/factory/` é área de trabalho recreável. Retenção: até **14 dias
  após o run correspondente ser fechado** (done/cancelled) OU até a cota global
  da Seção 5. Varredura de limpeza é tarefa do sweep horário do Storage
  Engineer (single-flight, log de tudo que tocou, nada de propósito incerto é
  apagado — é escalado).

## 5. Orçamento de tamanho (budgets)

| Alvo | Cota | Alerta em 80% | Ação no estouro |
| --- | --- | --- | --- |
| Corpus E1 comprometido (NDJSON) | 25 MiB | 20 MiB | Congelar acréscimo; propor política de arquivamento externo ao CEO |
| Por superfície E3 (`.logs/` por engine) | 100 MiB | 80 MiB | Compactar arquivos quiescentes em `archive/` + manifest |
| E4 `.scratch/factory` total | 2 GiB | 1,6 GiB | Aplicar retenção 14-dias; escalar se insuficiente |
| Manifests (`docs/storage/manifests/`) | 5 MiB | — | Compactar por data, manter último e o do último arquivamento |

Evidência que estoura cota não é apagada sem manifest do que foi arquivado
para onde — "estouro de cota" nunca significa perda silenciosa.

## 6. Verificação de integridade (receita)

Manifest corrente do corpus E1 (39 arquivos, 867 842 bytes, gerado de
`dbb6d02c` em 2026-09-26 e verificado na geração — 39/39 OK):

```
docs/storage/manifests/evidence-committed-2026-09-26.sha256
```

Comando de verificação (a partir da raiz do repo):

```bash
sha256sum -c docs/storage/manifests/evidence-committed-2026-09-26.sha256
```

- **Cadência:** a cada mudança no corpus E1 o PR deve regenerar o manifest;
  o sweep semanal do Storage Engineer roda a verificação e registra o resultado
  (recebido ≠ aprovado: o storage atesta bits, não conclusões).
- **Falha = incidente:** qualquer `FAILED` congela acréscimos ao corpus até
  reconciliação (recovery do último manifest íntegro) e é escalado ao CEO.

## 7. Medição atual do corpus (2026-09-26)

Committed (39 arquivos, **867 842 bytes ≈ 848 KiB**):

| Área | Arquivos | Bytes |
| --- | --- | --- |
| `docs/product-readiness` | 1 | 696 904 |
| `learner/judgment_receipts` | 2 | 93 696 |
| `learner/gate` (fixtures E2) | 31 | 68 473 |
| `docs/curso` | 2 | 7 065 |
| `engines/minimaxDojo` | 1 | 622 |
| `engines/voxelDojo` | 1 | 555 |
| `docs/qa` | 1 | 527 |

Runtime (não comprometido, medido no workspace local):

| Área | Arquivos | Bytes |
| --- | --- | --- |
| `.scratch/factory` (E4) | 468 | 10 414 104 (~9,9 MiB) — **4,9% da cota de 2 GiB** |
| `engines/pixelDojo/pixel-quest/.logs` (E3) | 3 | 6 742 — **0,006% da cota de 100 MiB** |

Veredicto: corpus E1 a **3,3%** da cota (25 MiB); E3 e E4 folgados. Sem ação de
compactação necessária nesta data.

## 8. Não-metas

- Sem banco de dados, sem serviço de sync, sem lock — mudanças nessa direção vão
  para o CEO como ADR, não por aqui.
- Sem avaliação de evidência: nada nesta política interpreta `pass`, pontua, ou
  alimenta gate/mastery.
- Sem coleta de dado de learner Level 0 além do que já é local-first; esta
  política rege arquivos do repo e de runtime do workspace, não o navegador do
  usuário.

## 9. Registro de medições (append-only)

| Data | E1 bytes | E1 arquivos | E4 bytes | Verificado | Por |
| --- | --- | --- | --- | --- | --- |
| 2026-09-26 | 867 842 | 39 | 10 414 104 | 39/39 OK (manifest 2026-09-26) | Storage Engineer (AID-2886) |
