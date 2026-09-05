# AID-516 — Triagem da fila de PRs automatizados (Bolt/Palette/Sentinel #173–#217): plano de disposição consolidado

> **Provenance:** verbatim do comentário-final na issue AID-516 (board Paperclip, 2026-09-01T09:12:05Z, autoria Founding Product Engineer fa8130d5). Commitido no repo pela issue AID-521 (pedido direto do founder: "commitar todo o codigo e decisoes de volta pro repo aidevschool"). Fonte de verdade operacional continua sendo o thread da issue; este arquivo preserva a decisão no repo.
> **Status na data deste commit:** plano autorizado via card `525cd240` (AID-520, request_confirmation wake-on-accept) como parte da fila completa; execução dos merges permanece gated pelo board (regra SDLC — sem merge direto de agente em main).

---

## AID-516 — Triagem da fila Bolt/Palette/Sentinel + plano de disposição (final)

Fontes: `gh api` ao vivo em 2026-09-01 ~05:1xZ; main @ `a88a2ba0` (merge #213, 2026-08-31T11:54Z). Artefatos: `files_*.json`, `meta_*.json`, `ci_candidates.json`, `main_assistant.ts`, `main_state.ts`, `main_zones.ts` (workspace tmp/aid516). Sem merge, sem close de PR, sem push — gate do board preservado.

### 1. Inventário (21 PRs de automação abertos, #160–#217, todos sob a conta dandpb)
- **Bolt** (perf, `engines/miniTown/src/scene/state.ts` [+`zones.ts` a partir de #174]): #160,#165,#172,#174,#185,#198,#217
- **Palette** (a11y, `engines/codexDojo/src/render/agents.ts` [+`render.test.ts`; #171/#187 +`roadmap.ts`; #173 +e2e]): #164,#169,#170,#171,#173,#177,#187,#197,#215
- **Sentinel** (segurança, `engines/dojoToday/src/assistant.ts`): #175,#176,#186,#196,#216
- Cada família também faz append no próprio log `.jules/<bot>.md` (+5 linhas) → todo par de PRs da mesma família conflita entre si após o 1º merge.
- Demais 13 PRs abertos são internos (#154,#161–#163,#166–#168,#183,#184,#189,#214,#218,#219) — fora deste escopo.

### 2. Segurança ao vivo (o que o Sentinel reporta existe?)
**CONFIRMADO no main atual (`a88a2ba0`)**: `engines/dojoToday/src/assistant.ts:91-99` — `askSocrates()` monta `fetch(`${config.baseUrl}/chat/completions`)` com header `Authorization: Bearer ${config.apiKey}` **sem exigir `https://`**. É o único ponto de egress da chave (verificado em `src/main.ts`: chave só sai do localStorage → `askSocrates`; nenhum outro fetch a usa).
**Severidade real: MEDIUM/HIGH, não CRITICAL**: sem segredo de servidor no repo; chave é BYOK do aprendiz (localStorage, `assistant.ts:20,39-41`); default `baseUrl` já é https (`assistant.ts:23`); exige que o próprio aprendiz configure `http://` (mixed-content mitiga quando servido em https — existe `netlify.toml` — mas dev local/LAN é caminho realista). Títulos "[CRITICAL]" do Sentinel são inflados; o defeito é genuíno e o fix vale a pena. PR canônico que corrige: **#216** (≡ #196).

### 3. Canônicos por tema (≤1, mais completo/recente sem conflito, CI verificada no head)
- **Sentinel → #216** (`355a66b`, atualizado com main, CI verde 34✓+1 skip; BLOCKED só pela review exigida). Fix correto: `new URL()` antes do fetch, fail-closed com mensagem clara, exceção `localhost`/`127.0.0.1` p/ dev. **#196 é semanticamente equivalente** (comentário ligeiramente mais rico) mas está BEHIND.
- **Palette → #171** (`991c8ca`, CI verde; BEHIND). Único com `escapeHtml` no `aria-label` composto, texto visível estável ("Copiar prompt"/"Copiado") e inclui o fix de `roadmap.ts` (=#187). #173 tem e2e mas muda texto visível ("Copiar") e escape parcial; #215 usa IIFE no template sem escape total; **#197 reprova check required `codexdojo-os (TS)` no próprio head**; #164/#169/#170/#177/#187 são subconjuntos/iterações.
- **Bolt → #198** (`68daf0c`, CI verde; BEHIND). Cobre os 3 hot paths: `findZoneById` (hoje chamado dentro de `filters` O(N) → O(N²) efetivo em `pickRandomShopId`/`pickRandomTrafficTarget`), `findBuildingById`, e novo `findBuildingByZoneId` (remove o `.find` por frame em `zones.ts:63`). Mapas só-append são seguros: **sem remoção** de zones/buildings no `state.ts` do main (sem stale-map). #217 (atualizado com main) é **subconjunto estrito** (só building-by-zone).

### 4. Gate de merge (branch protection do main, lida ao vivo)
`strict: true` (exige branch atualizada → update re-roda CI) + 4 contexts required + **1 approving review com `require_last_push_approval`** + `enforce_admins`. Logo: #215/#216/#217 estão atualizados e verdes — falta apenas review; #171/#198 precisam update-branch + re-CI + review.

### 5. Plano de disposição
**(a) Merge recomendado (ordem):** 1º **#216** (segurança), 2º **#171** (a11y), 3º **#198** (perf). Árvores disjuntas (dojoToday/codexDojo/miniTown) — sem conflito entre canônicos.
**(b) Close recomendado (17):** Bolt: #160,#165,#172,#174,#185,#217 · Palette: #164,#169,#170,#173,#177,#187,#197,#215 · Sentinel: #175 (DIRTY + edita whiteboard do minimaxDojo fora do tema), #176 (≡#216, mais antigo), **#186 (bypassável: `startsWith("http://localhost")` aceita `http://localhost.evil.com` — não mergear)**, #196 (supersede se #216; ou o inverso se o board preferir).
**(c) Riscos/limitações:** PRs Bolt não trazem benchmark (claim de perf sem evidência executável — melhoria de complexidade com risco funcional baixo; recomendo micro-bench pós-merge como follow-up não-bloqueante); #216/#196 não excepcionam `[::1]`/`0.0.0.0` (aceitável); após o merge canônico os irmãos da família conflitam em `.jules/<bot>.md` — fechar em sequência; o churn continua (~2-3 PRs/dia) — recomendo o board definir política para os autores Bolt/Palette/Sentinel (bloqueio ou tema único), decisão fora do meu escopo. Nenhum merge/close/push executado por mim (SDLC: merges ao main seguem gate do board).

**Veredito: done** — inventário, verificação de segurança ao vivo, dedup, CI/mergeable e plano publicados. Execução dos merges/closes é decisão do board.
