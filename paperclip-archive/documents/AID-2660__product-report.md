<!-- issue: AID-2660 | key: product-report | doc_id: b3b9ed95-0f7b-455a-8431-5610d5d93c54 | updated: 2026-09-26 00:59:10.424+00 -->

# Relatório de Produto — AI DevSchool — foto real 2026-09-26

(AID-2660)

# Relatório de Produto — AI DevSchool
**Foto real de 2026-09-26** · main `4461841f` (2026-09-25 21:47 -03) · elaborado pelo CEO (AID-2660)

---

## 1. A foto real (imagens ao vivo, anexadas nesta issue)

| # | Superfície | URL ao vivo | Estado agora |
| --- | --- | --- | --- |
| 1 | **LiteracyDojo** — microlearning de IA para não-programadores | https://aidevschool-literacydojo.netlify.app | HTTP 200, título "LiteracyDojo — IA com confiança no trabalho" — screenshot anexo (`shot-literacydojo.png`) |
| 2 | **CodexDojo OS** — experiência canon de aprendizado (desktop educacional) | https://aidevschool-codexdojo-os.netlify.app/?track=dev | HTTP 200, título "codexDojo OS" — screenshot anexo (`shot-codexdojo-os.png`) |

Screenshots capturados em 2026-09-26 direto das deploys públicas (headless Chromium 153). As duas rotas de aprendizagem browser-only estão **no ar**, local-first, sem conta obrigatória.

## 2. O produto em uma frase

AI DevSchool democratiza conhecimento e aplicação de IA via microlições curtas e práticas, ritmo estilo Duolingo, para dois públicos: **quem quer usar IA sem programar** e **devs que querem construir software robusto com IA**. Princípio norteador: *one learner, one curriculum, many engines* — e a regra inegociável: **certeza de conclusão nunca mora no LLM** (mastery só com evidência independente apropriada ao gate).

## 3. Prontidão de customer (a matriz oficial, foto de agora)

Fonte: `docs/product-readiness/README.md` (gerada de fontes canônicas — não é auto-relato).

- **8 casos de uso `customer-ready` com `pass`**: first-lesson e corridor módulos 1–3 do LiteracyDojo; missão guiada de literacy, returning learner e missões voxel no CodexDojo OS; daily guidance do dojoToday; encontro-de-evidência no PixelQuest; loop standalone no voxelDojo.
- **1 caso `experimental`**: miniTown (exploração, sem promessa de progressão/mastery — por design).
- **Jornadas Dev (currículo 01–18): prontidão `stale`** até nova avaliação — README é explícito: *não* é claim customer-ready para 01–18.
- ⚠️ **Todas as revalidações vencem entre 2026-10-16 e 2026-10-19** (janela de ~3 semanas).

## 4. Currículo e aprendizagem (onde realmente estamos)

- **19 entradas (00–18)**: `00_ai_in_practice` scaffolded (conteúdo canon: **8 módulos · 32 lições · 8 skills**, contentVersion 2026-09-10.2); **01_rate_limiter e 02_key_value_store `implemented`** com evidência executável completa (spec→testes→review→benchmark→evolution→verifier), com caveat Node.js-only para certificação de performance; **03–18 scaffolded** (16 de 19 aguardando verificação).
- **Learner real**: 2 unidades **mastered com evidência executável** (U0 rate-limiter robustness via PixelQuest; U2 key-value-store via voxelDojo). Streak 2 (máx. 2). **Último gate: 2026-08-13 — ~6 semanas frio**: o aprendizado do aluno parou enquanto a engenharia do produto acelerou. `next_action` canônico: líder escolhe a próxima unidade (Cartógrafo) **antes** de qualquer implementação.

## 5. Engenharia e qualidade (números reais de agora)

| Métrica | Valor | Fonte |
| --- | --- | --- |
| Commits totais | **1.425** | git |
| Commits últimos 30 dias | **988** | git |
| Commits últimos 7 dias | **13** | git |
| PRs mergeadas últimos 14 dias | **84** | GitHub API |
| PRs abertas agora | **8** (varreduras Bolt de perf e Palette de a11y) | GitHub API |
| CI no main HEAD | **verde: 41 success / 2 skipped** (inclui literacy, OS, voxel×16, sdlc-quest, zai-duolingo, dojoToday, curriculum Rust, readiness) | check-runs `4461841f` |
| Committer principal 90d | Daniel (707 de ~1.220 commits) + agentes do time | git shortlog |

## 6. Time e operação (Paperclip)

- **15 agentes** ativos: CEO, 3 designers (UX/Content/System), QA Lead, Platform & Release (devops) e 9 engenheiros (curriculum, engines, growth, acessibilidade, analytics, entrega).
- Board agora: **486 done · 5 in_progress · 2 in_review · 2 blocked · 5 cancelled**.
- Execução disciplinada: SDLC loop com intent→spec→plan→build→verify→review→ship, hooks de guard no repo (ex.: guard de secret-token reforçado no PR #514/AID-2321), countersign QA em mudanças sensíveis.

## 7. Sombras da foto (riscos reais, sem cosmético)

1. **Readiness expira em massa até 2026-10-19** — sem revalidação, os 8 claims customer-ready viram `stale` e a promessa pública enfraquece. **Dono: QA Lead + Platform & Release; ação: rodar o ciclo `enforce`/re-grant até 2026-10-14.**
2. **Jornadas Dev stale + 16/19 projetos scaffolded** — o público dev (metade da missão) ainda não tem corredor customer-ready ponta a ponta.
3. **Aprendizagem do aluno fria há 6 semanas** (streak travado em 2 desde 2026-08-13) — o produto ensina, mas o aluno-fundador não está usando o próprio loop. Decisão do líder: próxima unidade (Cartógrafo) pendente.
4. **8 PRs abertas de perf/a11y** sem merge — pequeno, mas é débito na borda.
5. **Certificação de performance Node-only** em 01/02 — claims de paridade Go/Rust não certificados por execução.

## 8. Leitura executiva e próximos 30 dias (proposta, não decisão)

**Onde estamos**: um produto de literacy **no ar e verificável** (8 corredores customer-ready, CI verde, 84 merges em 14 dias), com a metade dev do produto ainda em construção (2/19 implementados, readiness stale) e o aluno real em pausa.

**Prioridades propostas**:
1. **Revalidar readiness antes de 2026-10-14** (protege o que já é público).
2. **Decidir a próxima unidade do learner** (Cartógrafo) e retomar o streak — a escola precisa do próprio aluno como case nº 1.
3. **Fechar as 8 PRs Bolt/Palette** e manter a borda limpa.
4. **Escolher foco do trimestre**: profundidade na trilha Dev (implementar 03–05) vs. alcance literacy (módulos 4–8). Recomendo decidir com dados de uso do LiteracyDojo ao vivo.

---
*Toda claim deste relatório tem fonte rastreável: matriz de readiness gerada (`docs/product-readiness/README.md`), `curriculum/BACKLOG_STATUS.md` (gerado), `learner/learning_state.yaml` (canônico), git/GitHub API (2026-09-26) e board Paperclip.*
