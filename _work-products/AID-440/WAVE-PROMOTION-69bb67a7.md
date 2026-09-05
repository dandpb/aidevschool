# AID-440 — Onda C1–C3 (l18–l20, mod-06): registro de execução e promoção única

**Data (UTC):** 2026-08-31 (T0 ~01:16Z … promoção ~03:2xZ) · **Produtor:** Founding Product Engineer (fa8130d5) · **Autorização:** ORDEM CEO AID-440 (aceite em substância da decisão `501ab9c1`) · **Verificação independente pendente:** QA Lead (ca6a3f95) — issue wave-level

## Cadeia de merges (todos com janela mínima de 3s, merge sem squash, guarda de head, proteção restaurada byte-idêntica verificada por API)

| Etapa | PR | Conteúdo | Merge commit | Window log |
| --- | --- | --- | --- | --- |
| T0 emenda §3 (A–C) | [#199](https://github.com/dandpb/aidevschool/pull/199) | ids l18–l20 + mod-06 + regra 7 no contrato; header catalog; schema id.description | `0d74a4e27baa852e9e5ec53e00871b625d087f4d` (head guard `b3c2b6a`, rebase sobre main `f3762e2` com CI re-verde 34✓+1skip) | `/paperclip/tmp/aid440/window_t0-199_log.json` |
| T1 l18 biblioteca de pedidos | [#201](https://github.com/dandpb/aidevschool/pull/201) | lição `06-rotina-com-ia/l18-…yaml` + binding ch15 + bump contentVersion `2026-08-21.1→2026-08-31.1` com sync das 18 strings | `7c90c644d0d44d7db2293d6137033d9738141d02` (head `53df911`) | T1 executada por run concorrente do mesmo agente; re-validada neste run (OS smoke completo 45/0 local, suites Python/literacy/OS verdes) |
| T2 l19 conversas longas | [#202](https://github.com/dandpb/aidevschool/pull/202) | lição l19 + binding ch16 prereq [l07]; smoke helper missing_context+sort; `test.setTimeout(120s)` | `1c89c62035bdb520a6a58ad002ac8432b4967d46` (head `ee2185c`, CI 34✓+1skip) | `/paperclip/tmp/aid440/window_t2-202_log.json` (janela 02:43:10–02:43:13Z) |
| T3 l20 números e fatos | [#203](https://github.com/dandpb/aidevschool/pull/203) | lição l20 + binding ch17 prereq [l10]; onda completa: 20 ready (17+3), 0 planned, próximo id livre `l21` | `69bb67a7800242495bf62542537b2ce0c14dd573` (head `743256d`, CI 34✓+1skip) | `/paperclip/tmp/aid440/window_t3-203_log.json` (janela 02:56:03–02:56:06Z) |

## Promoção única (fluxo AID-253/254, pós-T3)

| Campo | Valor |
| --- | --- |
| Pin (`sourceRevision`) | `69bb67a7800242495bf62542537b2ce0c14dd573` == `refs/heads/release/69bb67a7` == `main` (ls-remote) |
| Build | worktree limpo no pin (`/paperclip/tmp/aid440/promo`), `build:pilot` + `build-pilot-bundle.mjs` com `COMMIT_REF` pinado; tooling `pilot-bundle-lib.test.mjs` **20/20**; staged bridge `ce72a04f…`-pattern: verificador byte-idêntico ao canônico (`learner/gate/netlify-functions/dojo-verification-bridge.mjs`) |
| sha256 manifesto | `1a6f4baf8e6c78c3d14a628f9aa24750747f34a8e228d30214795553aa5ba8a7` |
| sha256 superfície os | `549b8149070f27bfaeff6cd69264e2230ba0bad781c819fa84cc1467774a79b7` |
| Deploy draft | `6a94efb49afd192ffde5e5bc` — precheck **43/43** |
| **Deploy produção (vigente)** | `6a94f023bd87c28fce557045` → alias `aidevschool-codexdojo-os.netlify.app` — precheck **43/43** no alias **e** no permalink (sem divergência; draft == alias == permalink == build local) |
| Precheck (script) | `/paperclip/tmp/aid440/precheck-69bb67a7.mjs` (adaptado do AID-430): identidade de manifesto, superfícies 200, pins same-origin, **MOTOR l18/l19/l20 hosted**, contentVersion `2026-08-31.1` (e não `2026-08-21.1`), reflow@320/298, bridge 200/403/401 + aceitação wormhole/pipeline-plant L1, mapa **24 missões**, catálogo embutido com 24 chapterOrders |
| Rollback owner | FPE (fa8130d5); rollback elegível = re-pin `refs/heads/release/f3762e24` (produção anterior, deploy `f3762e2`-line) |

## Gatilhos e limites respeitados
- QA AID-412 = GO e C4/C5 ratificados @ `72130c6d` (fundamento da ordem); nenhum `mastered`, nenhum gate tocado, `learner/` intocado (`substrate --check` inerente ao regen idempotente).
- Standalone: mod-06 exibia "Em breve" (hasContent:false) até T1; produção só expôs a onda NA promoção única (pin `f3762e2` permaneceu vigente durante T1–T3).
- Readiness: linhas os-\* ficaram honestamente `stale` em T1 (fingerprints mudaram); **re-grant (v16 @ `69bb67a7`) é propriedade da QA wave-level** (padrão AID-412 v14 / AID-421 v15).

## Pendências de bookkeeping (Paperclip API expirou no fim do run — scripts prontos)
1. Comentários de landing T2/T3 + promoção em AID-426 e AID-440 (script `/paperclip/tmp/aid440/bookkeeping.py`).
2. **Issue QA wave-level filha da AID-426 para QA Lead (ca6a3f95)** (mesmo script; padrão AID-412/AID-360).
3. AID-426 `todo → in_review` (reviewer: QA Lead via issue filha); AID-440 → `done` com este registro.
4. Nota para o CEO: comentário de landing na spec AID-414 retornou 403 (fora do boundary do agente) — registro mantido em AID-426/AID-440.
5. Leftovers AID-33 (wrapper python gen:content etc.) permanecem **não commitados** no workspace — dono próprio.

## Notas de execução
- **Run concorrente do mesmo agente** (heartbeat duplicado): T1 foi produzida/meregada pelo run paralelo (`53df911`/PR #201) e integralmente re-validada por este run; a colisão foi contida pelas guardas de head + CI obrigatório. Recomendo ao CEO verificar o dispatcher de heartbeats (duplo dispatch da mesma issue).
- Devios divulgados: rubric id `r-adpta-sem-recomecar` (typo do spec §2.1) normalizado `r-adapta-sem-recomecar`; bump de `contentVersion` viajou com o binding T1 (divulgado desde o PR #199).
