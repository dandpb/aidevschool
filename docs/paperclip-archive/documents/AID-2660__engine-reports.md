<!-- issue: AID-2660 | key: engine-reports | doc_id: 1aa4aada-bdff-44a8-aeeb-d072a24ec505 | updated: 2026-09-26 01:17:30.296+00 -->

# Relatório por Engine — AI DevSchool — 15 engines, foto real 2026-09-26

(AID-2660)

# Relatório por Engine — AI DevSchool
**Foto real de 2026-09-26** · main `4461841f` · complemento do `product-report` (AID-2660)

Fontes: git (por diretório `engines/`), check-runs do main HEAD (GitHub API, 2026-09-26), matriz `docs/product-readiness/README.md`, READMEs das engines, deploys ao vivo. Duas fotos reais adicionais anexadas: missão literacy **hospedada no OS** (`shot-os-hosted-literacy.png`) e jogo **Armazém KV (voxelDojo 02) hospedado no OS** (`shot-os-hosted-warehouse.png`).

## Visão geral do parque

| Métrica | Valor |
| --- | --- |
| Engines no repositório | **15** (+ `shared`, primitivas) |
| Com tier de prontidão customer | **6** (literacyDojo, codexDojo OS, dojoToday, PixelQuest/pixelDojo, voxelDojo, miniTown) |
| Deploys públicos ao vivo | **2 aliases** — literacyDojo + CodexDojo OS (que hospeda literacy + 6 jogos voxel no pilot bundle com sha256 por superfície) |
| CI no main HEAD | **verde em todos os 15 checks por engine** (41 success / 2 skipped no total) |
| Engine sem job CI dedicado | **1** — `school-entry` (nova; ver lacunas) |

Ranking de atividade (commits 30d): OS-prototype 93 · literacyDojo 82 · codexDojo 39 · dojoToday 25 · sdlc-quest 15 · miniMaxEvolutionEngine 11 · minimaxDojo 6 · zai 5 · school-entry 4 · aiDevschoolMvp 3 · voxelDojo 2 · miniTown 1 · pixelDojo 1.

---

## 1. literacyDojo — microlearning de IA (não-programadores)

**O que é:** app local-first (npm/TS, PWA, mundo voxel) com 14 missões práticas de IA; registra no máximo `completed`, nunca mastery. **Stack:** Vite/TS + conteúdo gerado do YAML canon (8 módulos · 32 lições · 8 skills). **Qualidade:** CI `literacyDojo (TS + content)` ✅ · 57 testes unit + Playwright 5/5 + PWA 1/1. **Deploy:** https://aidevschool-literacydojo.netlify.app (HTTP 200, foto anexa no relatório anterior) + hospedada no OS (`/apps/literacydojo/`, foto nova anexa). **Prontidão:** `customer-ready` ×2 (first-lesson; corridor mód. 1–3), revalida **2026-10-18**. **Lacunas:** gate no-code do Prometor pendente para o projeto 00; conteúdo além do corridor (mód. 4–8) sem corridor avaliado.

## 2. codexdojo-os-prototype — experiência canon (a mais ativa)

**O que é:** desktop educacional React/Vite com terminal, navegador de arquivos, Learn Mode e mentor local; projeção read-only do learner. **Qualidade:** CI `codexdojo-os (TS)` ✅ · 212 arquivos, 93 commits/30d (líder). **Deploy:** https://aidevschool-codexdojo-os.netlify.app (HTTP 200) com `pilot-bundle-manifest.json` — integridade sha256 por superfície (os, literacydojo, warehouse, wormhole, relay-station, pipeline-plant, checkpoint-city…). **Prontidão:** `customer-ready` ×3 (missão literacy, returning learner, missões voxel), revalida **2026-10-18/19**. **Lacunas:** interações locais (missões, terminal, mentor) não contam como evidência de mastery — por design; pilot bundle requer re-pin a cada release.

## 3. codexDojo — dashboard de controle

**O que é:** SPA Vite/TS (pnpm) — console do ecossistema: status, 14 agentes, ciclo de 10 estágios, roadmap 19 entradas; dono dos docs product-facing (`ecosystem/MANIFEST.md`). **Qualidade:** CI `codexDojo (TS)` ✅ · 39 commits/30d. **Deploy:** local/dev (builds deployados devem setar `VITE_CODEXDOJO_OS_URL`; sem alias público próprio). **Prontidão:** sem caso customer na matriz (superfície interna). **Lacunas:** nenhum incidente aberto; manter MANIFEST em sync a cada mudança de contrato.

## 4. dojoToday — a lição de hoje do programador

**O que é:** superfície só-leitura (TS + substrate no prebuild) com streak FSRS, revisões vencidas e unidade ativa; pegada Duolingo/voxel. **Qualidade:** CI `dojoToday (TS + substrate)` ✅ · 25 commits/30d. **Prontidão:** `customer-ready` (daily guidance), revalida **2026-10-18**. **Lacunas:** sem deploy público encontrado (cliente roda local); revalidação vence junto com as demais.

## 5. miniTown — Nível 0 exploratória

**O que é:** cidade cozy explore-only, sem pré-requisito de código e sem writes de estado. **Qualidade:** CI `miniTown (TS)` ✅ · 42 arquivos · 1 commit/30d (estável). **Prontidão:** `experimental` **por design** (sem promessa de progressão/persistence/mastery), revalida **2026-10-16**. **Lacunas:** PRs abertas de perf (`recomputeRoads`) e a11y pendentes de merge (PR #518, #519).

## 6. pixelDojo — jogos 8-bit (canon: pixel-quest)

**O que é:** RPG top-down onde cada lab é um conceito do currículo; nível limpo emite evidência NDJSON (contrato Playwright) — nunca marca mastery. **Qualidade:** CI `pixelDojo (TS)` + `games/* (discover)` ✅ (matrix job skipped por path filter neste commit). **Evidência real:** U0 (rate-limiter robustness) **mastered** via `pixelDojo/.logs/last_run_evidence.json`. **Deploy:** draft pré-GO (preview Netlify `singular-crostata`, AID-261); sem alias público próprio. **Prontidão:** `customer-ready` (evidence encounter), revalida **2026-10-16**. **Lacunas:** só 1 commit/30d; sem presença pública estável.

## 7. voxelDojo — simulações Three.js (catálogo)

**O que é:** catálogo pnpm de 18 jogos (`game-01`…`game-18`), um conceito por jogo; `game-02-warehouse` é o pacote de referência. **Qualidade:** CI ✅ em **16 jogos individuais** + agregado — a engine com mais checks verdes no main. **Evidência real:** U2 (KV store) **mastered** via `game-02-warehouse/.logs/evidence.ndjson`. **Deploy:** jogos hospedados no pilot bundle do OS (foto nova do Armazém KV anexa). **Prontidão:** `customer-ready` (loop standalone), revalida **2026-10-16**. **Lacunas:** cobertura de readiness é do loop, não jogo-a-jogo.

## 8. zai-duolingo-like — "Duolingo de IA" (Next.js)

**O que é:** jogo cozy-cyberpunk single-page de AI-literacy; Next.js + Prisma/SQLite + Zustand; contrato de engine no `QWEN.md`. **História:** re-adicionada com conteúdo real em 2026-09-17 (209 arquivos, commit `9f2f487e`, PR #471; QA countersign AID-2281). **Qualidade:** CI `zai-duolingo-like (Next.js + Prisma)` ✅ · gate `npm run verify` (vitest + eslint + tsc) · E2E `test:e2e`. **Prontidão:** sem caso na matriz. **Lacunas:** sem tier = sem promessa customer; decidir se entra na oferta (via `school-entry`) ou fica incubada.

## 9. sdlc-quest — quest didática de SDLC (pt-BR)

**O que é:** pacote autossuficiente Node ≥22 (sem `npm install`; `npm start` em :8080), com gate próprio e manifesto `SHA256SUMS.txt` re-verificado 219/219. **Qualidade:** CI `sdlc-quest (TS)` ✅ · 232 arquivos. **Prontidão:** sem caso na matriz. **Lacunas:** novo (2026-09-17); sem avaliação de jornada customer.

## 10. aiDevschoolMvp — chat-tutor MVP (24 conceitos)

**O que é:** tutor via `SKILL.md` para trilha "AI Fluency Foundations" (24 conceitos, sessões 5–10 min, 1 aluno); gates/scoring vivem nos scripts bundled — o skill nunca decide pass/fail. **Qualidade:** CI `aiDevschoolMvp (installer + acceptance)` ✅ · testes via `make test` (Python). **Atividade:** 3 commits/30d (estável/maduro). **Lacunas:** sem superfície web; candidato a absorção pelos Dojos ou sunset — decisão pendente.

## 11. minimaxDojo — núcleo tutor (14 agentes)

**O que é:** core "Ágora Continuum": prompts, docs, whiteboard e implementação de referência Python; thresholds numéricos canônicos em `config/learner.yaml`. **Qualidade:** CI `minimaxDojo (tutor core)` ✅. **Prontidão:** n/a (não é superfície customer). **Lacunas:** nenhuma crítica aberta; 6 commits/30d.

## 12. miniMaxEvolutionEngine — motor de orquestração Claude Code

**O que é:** motor do loop de 5 fases (Spec→Implement→Review→Benchmark→Optimize) com briefing via hooks e comandos `/devschool-*`. **Qualidade:** CI `miniMaxEvolutionEngine (supervisor)` ✅ · 11 commits/30d. **Prontidão:** n/a (infra de agente). **Lacunas:** nenhuma aberta.

## 13. openclaw — runner de checklist

**O que é:** runner file-based do checklist de 5 fases (modo simulate). **Qualidade:** CI `openclaw (checklist runner)` ✅ · testes via pytest. **Prontidão:** n/a. **Lacunas:** nenhuma aberta.

## 14. school-entry — entrada sem login (NOVA)

**O que é:** porta de entrada que recomenda até 3 engines conforme o objetivo do aluno (API TypeSafe), com painel de operador e liberação global em SQLite; engine só entra na oferta após liberação **e** checagem Chromium automática da entrada. **Stack:** Node 22 (`node:sqlite`) + Playwright. **Status:** pronta para servir por origem pública, **mas não publicada**; não escreve em `learner/`/`curriculum/`. **Lacunas:** ⚠️ **sem job CI by-name no main** (única engine nessa situação); sem tier de readiness; publicação pendente de decisão.

## 15. shared — primitivas cross-engine

**O que é:** primitivas de teaching-evidence compartilhadas entre engines. **Qualidade:** coberta pelos consumers (sem CI próprio — aceitável). **Lacunas:** nenhuma aberta.

---

## Riscos e ações transversais (propostas)

1. **Revalidação em massa até 2026-10-16/19** atinge as 6 engines com tier — mesma ação do relatório principal (re-grant até 10-14; donos: QA Lead + Platform & Release).
2. **`school-entry` sem CI by-name** — criar job (padrão já usado para sdlc-quest/zai pós-AID-2286) antes de qualquer publicação. Dono proposto: Platform & Release.
3. **zai-duolingo-like e sdlc-quest sem tier** — decidir com `school-entry`: entram na oferta pública (→ criar casos de uso + cenários na matriz) ou ficam incubadas. Dono proposto: CEO com UX/Content.
4. **pixelDojo sem presença pública estável** — decidir entre alias próprio ou absorção total pelo pilot bundle do OS.
5. **aiDevschoolMvp** — decidir absorção/sunset no próximo ciclo de planejamento.

*Claims rastreáveis: check-runs `4461841f` (2026-09-26), git log por engine, readiness matrix gerada, manifest do pilot bundle ao vivo.*
