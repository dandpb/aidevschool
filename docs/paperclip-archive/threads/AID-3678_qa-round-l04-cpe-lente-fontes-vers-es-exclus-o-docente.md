# AID-3678: QA-ROUND L04 — CPE: lente 'fontes/versões/exclusão docente'

- **Status:** done | **Priority:** medium | **Origin:** manual
- **Assignee:** Learner App Engineer | **Created:** 2026-10-01T21:02:25.132341+00:00 | **Updated:** 2026-10-01T22:28:47.603+00:00
- **ID:** `e74fb940-6068-4c85-ad2c-e3a25b5fe598`

## Description

Campanha QA/release (PO `8e07a413`; manifest C0 = AID-3670).

**Lente (CPE):** fontes/versões/exclusão docente.
**Cenário exigido:** Fontes/versões do currículo no candidato e exclusão docente preservada (compilação opt-in).
**Reviewer independente:** LAE (autor não se autoaprova).

**Regras da campanha:** app real no candidato exato do manifest C0 (AID-3670) — sem branch alternativa; fixtures isoladas; evidência DOM/AX/pixels/logs conforme a lente, com head e sessão reais; emulação não é dispositivo/leitor físico (declarar limitação); sem contas reais/pagamentos/outreach/termos legais/dados destrutivos/ataques a serviços/carga; nenhum runtime AID-3630, restart, R2/setup, credencial, permissão, modelo ou provisionamento; **autor não se autoaprova** (reviewer nomeado); falhas agrupadas por severidade — correção autorizada só com reteste do afetado, sem suíte repetida por ocupação; capacidade de browser limitada — compartilhar o manifest único e escalar trabalhos pesados; **na primeira negativa de rota, parar e reportar**; reusar provas já aceitas se o objeto for idêntico (provas #647: FSE `30e119b5` @ `8ce2ea27…`, pixels PO, FPE 3658 blobs idênticos, inventário FSE `4ce65f78` — não reabrir sem delta). **Charter completo:** doc `qa-round-charter` no pai AID-3518 (a descrição do C0 AID-3670 é stub — fronteira de ator 403 registrada, sem contorno).

## Document `Continuation Summary` (2026-10-01)

# Continuation Summary

- Issue: AID-3678 — QA-ROUND L04 — CPE: lente 'fontes/versões/exclusão docente'
- Status: done
- Priority: medium
- Current mode: review
- Last updated by run: 06051203-5a50-4ae8-8f58-39963d11432c
- Agent: Learner App Engineer (opencode_local)

## Objective

Campanha QA/release (PO `8e07a413`; manifest C0 = AID-3670).

**Lente (CPE):** fontes/versões/exclusão docente.
**Cenário exigido:** Fontes/versões do currículo no candidato e exclusão docente preservada (compilação opt-in).
**Reviewer independente:** LAE (autor não se autoaprova).

**Regras da campanha:** app real no candidato exato do manifest C0 (AID-3670) — sem branch alternativa; fixtures isoladas; evidência DOM/AX/pixels/logs conforme a lente, com head e sessão reais; emulação não é dispositivo/leitor físico (declarar limitação); sem contas reais/pagamentos/outreach/termos legais/dados destrutivos/ataques a serviços/carga; nenhum runtime AID-3630, restart, R2/setup, credencial, permissão, modelo ou provisionamento; **autor não se autoaprova** (reviewer nomeado); falhas agrupadas por severidade — correção autorizada só com reteste do afetado, sem suíte repetida por ocupação; capacidade de browser limitada — compartilhar o manifest único e escalar trabalhos pesados; **na primeira negativa de rota, parar e reportar**; reusar provas já aceitas se o objeto for idêntico (provas #647: FSE `30e119b5` @ `8ce2ea27…`, pixels PO, FPE 3658 blobs idênticos, inventário F
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `06051203-5a50-4ae8-8f58-39963d11432c` finished with status `succeeded` at 2026-10-01T22:28:59.171Z.
- Evidence located. Now I'll independently verify the core claims against the candidate worktree and the exec script.

Candidate identity verified 1st-hand (head/tree/clean match). Now let me check the manifest C0 composition and the producer's final comment, then re-run key checks for reproducibility.

Manifest C0 confirms the merge list and held-out set match the script. Now re-running the core checks independently against the candidate:

Static checks all reproduce. Now the loader-computed version, substrate check, allowlist, and generated-artifact leak markers:

All static checks reproduce. Now re-running the vitest leak-guard suite (the key dynamic evidence for teacher exclusion):

Logs show 8/8. Re-running myself to confirm reproducibility:

8/8 reproduced 1st-hand, worktree stays clean. Final spot-checks: the leak-guard test content, an independent zero-embedding probe, and the producer's final comment:

Producer's report fully read. Final cleanliness check on the worktree after my re-runs, then I'll submit the review decision:

The review decision mechanism is clear from the AID-3690/AID-3686 precedents: PATCH with `status: done` + `statusComment` records
[truncated]

## Files / Routes Touched

- `scripts/tools`
- `scripts/merge_pr.sh`

## Commands Run

- Heartbeat run `06051203-5a50-4ae8-8f58-39963d11432c` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (5)

**founder** · 2026-10-01T21:14:25.880953+00:00

PO — iniciar AGORA preparação de casos distintos e observação segura do baseline publicado, conforme pedido explícito de Dani de testar com24lentes. O blocker3670 permanece para EXECUÇÃO/ACEITE FINAL no mesmo RC; não remover, não inventar pin ou testar branch alternativa. Preparação e baseline devem ser identificados como tais, não como teste final executado. L04: fontes, versões e exclusão docente; preparar repro exata643/646×loader642 e comparar contratos/versionamento combytespinados. WIP3665preservado não écodeaceito.



Fonte comum: manifest congelado do FPE3670 quando publicado, QA3672/V\&E3673 validam composição. Autorias643/646 não entram inalteradas no primeiro runtimebatch: loader642 exige contrato/layout ausente, reproduzir localmente sem catch-and-skip. PR647 já tem FSE/CD/PO pixels aceitos em8ce2ea27, reusar só sebytes/aplicabilidade iguais. Kits3665–3669 eplayer3660 fora doRC atédecisão. PreflightPRE3674 antespushremoto/mainmerge; não presumirNetlify manual só porYAML.



Sem contas reais/outreach/pagamentos/termos/ataques/carga/dadosdestrutivos, semruntime3630/restart/permissões/credenciais/modelos. Fixtures/contextos locais, browserpesado coordenado, evidência própria head/run/session/DOM/AX/pixels/logs pertinente; emulação≠dispositivo físico. Não autoaprovar própria mudança. Sua tarefa sóproduz provas/achados/preparação, semfix/merge/publicação; QA/V\&E ePO adjudicam integração. Na primeira negativa parar alvo, sem alternativa. [@Curriculum Platform Engineer](agent://ac0ec540-f683-4be0-88de-49430e95eeaa?i=file-code)

**Curriculum Platform Engineer** · 2026-10-01T21:39:16.771975+00:00

# L04 (CPE) — PREPARAÇÃO iniciada e concluída neste run + baseline observado (NÃO é teste final executado)

Recebido o despacho do PO (`f97e859e`). Mudança prática: pasei da espera do manifest para **preparar AGORA os casos distintos e observar com segurança o baseline publicado**, com o blocker **AID-3670 mantido para EXECUÇÃO/ACEITE FINAL no mesmo RC** — nenhum pin inventado, nenhuma branch alternativa, nada pushed/merged/publicado. Evidência: `/paperclip/aid3678-evidence/` (scripts + saídas íntegras; README resume).

Run: `f6072ec0-ee01-43cf-87b6-30f811c60d99` (CPE `ac0ec540`; session pelos metadados persistidos do run — sem placeholder). Pins conferidos (HEADs em `repro-out/heads.txt`): loader **PR #642** `816a0b3d`, autoria **PR #643** `32888d9f`, autoria **PR #646** `f7e3228a`.

## 1. Repro exata 643/646 × loader 642 (local, sem catch-and-skip; subprocesso por caso, traceback íntegro)

| caso | resultado |
| --- | --- |
| C1 pg-d01 só (controle positivo) | `CATALOG_OK` `pg-d01@55882460a2bf` (âncora `l27`) — ambiente são |
| C2 **pg-d04 (643) × 642** | **fail-closed** `MissionCatalogError: 'pg-d04-contexto-e-spec' is missing learner-facing file 'insumos/bugreport.md'` |
| C3 **pg-d05 (646) × 642** | **fail-closed** mesma classe (`'pg-d05-delegacao-controlada' … 'insumos/bugreport.md'`) |
| C4 pg-d02 + source-contract@1 (controle positivo do contrato) | `CATALOG_OK` `pg-d02@920e17baafd5` == ratificada no contrato |

Confirmado 1º-mão: **autorias 643/646 não entram inalteradas no primeiro runtime batch** — o loader642 exige layout inline pg-d01 OU source-contract@1 ratificado (caminho pg-d02/AID-3593), ambos ausentes nos pins; falha fechada, sem skip. WIP **AID-3665 preservado e tratado como NÃO aceito** (não usado como code).

## 2. Contratos/versionamento × bytes pinados

- **pg-d05@f7e3228a:** inventário sha256 do MANIFEST **17/17 conferem** (drift 0).
- **pg-d04@32888d9f:** pins blob12 das fontes **6/6 conferem** (`git hash-object`). **Lacuna:** MANIFEST do pg-d04 não traz inventário sha256 do pacote (pg-d05 traz) — inventário fresco gravado para comparação com o manifest C0.
- contentVersion candidata (fórmula canônica aceita do loader, **PREP-ONLY, não ratificada**): `pg-d04@730ac9dc41c2` (6 learner), `pg-d05@36767d00e2d5` (12 learner). Sem contrato ratificado o loader nunca chega a computá-las (C2/C3 provam).

## 3. Exclusão docente preservada (estático/local)

- loader642: allowlist inline sem `guia-de-correcao` ("grader-facing, never read here"); contrato exige learner ∩ provenance-only = ∅ e asserta contentVersion só sobre learner congelado.
- pg-d04: 6 learner × 17 corpos docente — **zero embutimento**; pg-d05: 12 × 4 — **zero embutimento**; disjunção OK nos dois.
- Compilação opt-in a confirmar no candidato: PR #634 `--with-competency` **default OFF** (head `b07b5b2fc35f`, open) — entra na checagem quando o manifest C0 definir a composição.

## 4. Baseline publicado (observação segura, read-only, ~17:37Z)

literacy `/` 200 (`61bb5ec7…`), **`/escola/` 200 ao vivo** (`b3fa6e31…`, onda #627), OS `pilot-bundle-manifest.json` 200 (`df09c7a5…`) com **`sourceRevision: a27f3308…` auto-declarado** (anchor OS inalterado pela onda literacy-only #627; baseline fonte `main 86fca779`). Identidade head↔deploy **não presumida do YAML** — fica para manifest C0 + PRE AID-3674. Limitação declarada: observação estática (sem browser/DOM/AX/pixels — etapa da execução pós-manifest, browser pesado coordenado).

## Reuso

PR #647 (pixels FSE/CD/PO @ `8ce2ea27`) **não reaberto** — lente/objeto distintos até o manifest C0 indicar bytes/aplicabilidade idênticos.

## Disposição

**Bloqueado para execução/aceite final** — unblock: **FPE publicar o manifest C0 (AID-3670)**; então reexecuto C2/C3 na composição exata do candidato (mesmo RC), checo `--with-competency` default OFF, comparo inventários/versões com os pinos do manifest e observo fontes/versões/exclusão docente no app real. QA (AID-3672) e V&E (AID-3673) validam a composição; PO adjudica. Sem self-approve; sem fix/merge/publish deste lado.

**founder** · 2026-10-01T22:01:07.980207+00:00

PO — o bloqueio factual desta lente foi resolvido: C0 AID-3670 publicou recibo 1a0985fd-3028-4f29-9b60-160ebe7160ae e está Done. Candidato único: e707103563bd97bde9cf1071e9c0191831982d6c, tree df865b5fe98c0728202df0c31cf3dc20f43f1781. Continue somente a parte ainda não executada da sua lente L04 no candidato exato, lendo a composição completa do recibo. Ela EXCLUI 643/646, kits incompletos e 3660; não inserir conteúdo ausente para fingir cobertura. Reuse sua prova de fontes/versões e repro 67305dfe quando bytes/aplicabilidade forem idênticos, sem repetir controles completos desnecessariamente. Confira fontes, versões e exclusão docente efetivas no candidato e registre o que está fora do lote como fora de escopo, não aprovação integrada. Preserve revisão independente e os limites existentes. Nenhuma mudança de código, permissão, infraestrutura ou publicação está autorizada nesta lente. Coordenar só esta continuação, sem nova tarefa ou execução duplicada. [@Curriculum Platform Engineer](agent://ac0ec540-f683-4be0-88de-49430e95eeaa?i=file-code)

**Curriculum Platform Engineer** · 2026-10-01T22:24:19.224841+00:00

# L04 (CPE) — EXECUÇÃO CONCLUÍDA no candidato exato do manifest C0 — lente fontes/versões/exclusão docente: PASS (0 falhas)

Despacho `5f852bac` cumprido: continuei **somente a parte não executada** da lente no candidato único do recibo `1a0985fd` (AID-3670) — `rc/qa-c0-r2` @ `e707103563bd97bde9cf1071e9c0191831982d6c`, **tree `df865b5f…` conferida 1º-mão (head+tree+clean)**; worktree local isolada, somente leitura, **nada pushed/merged/publicado**, sem código/permissão/infra/publicação. Run `f0ac6f92-d3bd-4f07-b12c-8017c7777bb4` (retry do `b99e5dd7`, que falhou por `adapter_failed` — infra, não conteúdo), session `ses_f06ae051affedWTatSZkoctz3m`. Evidência integral: `/paperclip/aid3678-evidence/rc2/` (script `rc2_l04_exec.py` + `rc2_l04.json` veredito `pass`, sem catch-and-skip).

## 1. Fontes (composição efetiva no candidato)

- 7 merges do manifest §2 são **ancestrais genuínos** (`git merge-base --is-ancestor`, todos true).
- Held-out confirmado ausente: **643/646 (HELD), 648, 634, 642** — nenhum é ancestral.
- `curriculum/sequencia-dev-guiada/` contém **só `pg-d01-debug-reproduza`**; pg-d04/pg-d05 inexistentes em toda a árvore; pg-e01 presente como fonte offline **sem wiring em src/app** (kits 3665–3669 fora, como definido).

## 2. Versões

- Catálogo efetivo carrega **com o código do próprio candidato**: `CATALOG_OK`, 40 missões, schemaVersion 1, contentVersion `2026-09-30.1`; histograma 32× `2026-09-30.1` + 7 jogos voxel pinados + 1 prática guiada; **zero** `2026-09-10.2` residual em missions.ts/bindings.
- **Tripla paridade `pg-d01@55882460a2bf`**: versão computada pelo loader do candidato == declarada em `missions.ts` == pin do artefato gerado `gen:guided-practice` (projeção byte-determinística). Mesma string da preparação (loader642) — fontes estáveis entre pins.
- `python3 -m learner.substrate --check` verde (canonical + projeções em sync).

## 3. Exclusão docente

- Allowlist do loader (7 arquivos) sem caminho docente; comentário "grader-facing and is never read here" presente.
- **Zero embutimento**: pg-d01 (7 learner × 3 corpos >200 chars), pg-c01 (8×1), pg-e01 (23×4) — nenhuma substring de corpo docente em arquivo learner.
- Artefato TS gerado sem marcadores proibidos (`guia-de-correcao`, `solucao.md`, `teste_regressao_bug001.py`); vitest `guidedPracticeProjection` **8/8** no candidato, incluindo *"never leaks the grader-facing guia-de-correcao into the learner surface"* e *"manifest matches the current canonical sources byte-for-byte"* (logs em `rc2/vitest_projection_leak_verbose.log`).

## 4. Compilação opt-in

- PR634 fora do RC; **nenhuma** ref a competency nas tools de literacy, 0 ocorrências no corpus, sem flag `--with-competency` — default OFF trivialmente preservado (feature ausente ⇒ nada compilado por padrão). Tags `P F4`/`S F2` do pg-c01 = metadados declarativos do pacote congelado (PR635/636), não compilação P/S.

## Fora do lote (registrado como fora de escopo — NÃO é aprovação integrada)

643/646 (HELD — repro da preparação permanece válida para os pins `32888d9f`/`f7e3228a`), PR648, kits 3665–3669, AID-3660, 631/633/641/642. Reuso: prova #647 (pixels FSE @ `8ce2ea27`) não reaberta — lente/bytes distintos; controles completos da preparação não repetidos.

## Limitação declarada

Sem browser/DOM/pixels nesta lente (capacidade de browser compartilhada da rodada; lente de fontes/versões/exclusão resolvida em nível catálogo+projeção+testes unitários do candidato). Estático/emulação ≠ dispositivo físico.

## Revisão independente (autor não se autoaprova)

Peço review do **LAE** como reviewer nomeado do AID-3678 sobre `/paperclip/aid3678-evidence/rc2/` (objeto: candidato `e7071035`/tree `df865b5f`, sem branch alternativa). QA (AID-3672) / V&E (AID-3673) validam a composição; PO adjudica integração.

Provenance: agent=curriculum-platform-engineer task=AID-3678 run=f0ac6f92-d3bd-4f07-b12c-8017c7777bb4 session=ses_f06ae051affedWTatSZkoctz3m

**Learner App Engineer** · 2026-10-01T22:28:47.60105+00:00

**Approved** — revisão independente L04 (LAE `d0dfd2b7`, reviewer nomeado do estágio nativo; produtor CPE `ac0ec540` não se autoaprovou). Candidato exato do manifest C0: `rc/qa-c0-r2` @ `e707103563bd97bde9cf1071e9c0191831982d6c`, tree `df865b5f…` — conferido 1ª mão (head+tree+porcelain 0).

## Reprodutibilidade (verificação própria em `/tmp/opencode/rc-l04`, não reuso dos JSONs do produtor)

1. **Fontes:** 7 merges do manifest §2 re-testados (`merge-base --is-ancestor`) → todos ancestrais; held-out re-testado → 643 (`32888d9f`), 646 (`f7e3228a`), 648 (`d32b565bd8ba`), 634 (`b07b5b2f`), 642 (`816a0b3d`) todos ausentes; `sequencia-dev-guiada/` só `pg-d01`; 0 resultados pg-d04/pg-d05 na árvore; pg-e01 sem wiring em src/learner.
2. **Versões:** loader do próprio candidato → 40 missões, schemaVersion 1, contentVersion `2026-09-30.1`; zero `2026-09-10.2` em missions.ts/bindings; **tripla paridade `pg-d01@55882460a2bf` confirmada 1ª mão** (loader-computado == missions.ts == pin do artefato gerado); `learner.substrate --check` verde (exit 0).
3. **Exclusão docente:** allowlist (7 arquivos) sem caminho docente; artefato gerado com 0 marcadores proibidos; probe independente de embutimento pg-d01 (3 corpos docentes × 7 learner) → **0 embeddings**; **vitest re-executado por mim: 8/8 passed** (~325ms) incluindo o leak guard — teste inspecionado, checa marcadores + linhas exclusivas da solução (substância real); worktree permaneceu limpa pós-regeneração (byte-determinismo).
4. **Compilação opt-in:** PR634 fora; 0 refs a competency em literacy tools/corpus; sem flag `--with-competency` → default OFF trivialmente preservado. Tags `P F4`/`S F2` = metadados declarativos do pacote congelado.

## Aderência e limitação

Cenário exigido coberto nos três eixos. Limitação declarada (sem browser/DOM/pixels) **aceitável nesta lente**: o insumo da superfície learner é a projeção gerada, verificada livre de conteúdo docente e byte-determinística; DOM/AX/pixels ficam com as lentes irmãs (browser compartilhado). Fora-de-lote do produtor (643/646 HELD, 648, kits 3665–3669, 3660, 631/633/641/642) coerente com o manifest C0 §1.4/§2.

## Notas (não bloqueantes)

- `rc2_l04_exec.py` L82–84: expressão booleana confusa que sempre reduz a `not is_ancestor(prefix)` — semântica correta, resultados confirmados independentemente com comandos diretos.
- SHA do PR648 zero-preenchido do prefixo do manifest — resolução por prefixo verificada.

Registro completo: `/paperclip/aid3678-evidence/rc2/review_lae.md`. **Aprovação de lente ≠ aprovação de integração** — composição é de QA (AID-3672)/V&E (AID-3673); integração adjudicada pelo PO.

Provenance: agent=learner-app-engineer task=AID-3678 decision=approve candidate=e707103563bd97bde9cf1071e9c0191831982d6c/tree=df865b5fe98c0728202df0c31cf3dc20f43f1781

---

