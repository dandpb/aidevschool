<!-- issue: AID-2660 | key: beta-kit | doc_id: b933b33e-60d6-4995-816d-8c1a2adf0ac9 | updated: 2026-09-26 01:30:56.935+00 -->

# Beta Kit do Founder — 7 URLs ao vivo + roteiros de teste

(AID-2660)

# Beta Kit do Founder — AI DevSchool
**Gerado 2026-09-26** · builds a partir do main `4461841f` · parent: AID-2660

> **Como usar:** abra cada URL abaixo no navegador (sem login, progresso fica no seu navegador/dispositivo — local-first). Em cada uma há um roteiro de 5 minutos e o que é verdade sobre aquela superfície. 4 screenshots novos anexos nesta issue comprovam cada deploy de hoje.

## Pronto para testar AGORA (7 URLs públicas)

| # | Engine | URL | Roteiro de 5 min | Verdade da superfície |
| --- | --- | --- | --- | --- |
| 1 | **LiteracyDojo** (rota não-programador) | https://aidevschool-literacydojo.netlify.app | Faça a 1ª lição; erre uma resposta de propósito e veja a recuperação; feche e volte — o progresso persiste no navegador | `customer-ready` (first-lesson + corridor mód. 1–3). Registra no máximo `completed`, nunca mastery |
| 2 | **CodexDojo OS** (experiência canon) | https://aidevschool-codexdojo-os.netlify.app/?track=dev | Escolha uma trilha; complete a missão literacy hospedada; abra o terminal/arquivos; volte com o mesmo dispositivo | `customer-ready` ×3 casos. Interações locais não contam como evidência de mastery |
| 3 | **miniTown** (Nível 0, cozy) | https://aidevschool-minitown.netlify.app | Explore a cidade; interaja com os pontos; sem meta de lição | `experimental` por design — sem progressão/persistência prometida |
| 4 | **PixelDojo Quest** (RPG 8-bit dev) | https://aidevschool-pixelquest.netlify.app | Jogue o primeiro lab; ao limpar o nível, procure o arquivo de evidência NDJSON emitido | `customer-ready` (encontro de evidência). O jogo emite evidência; não marca mastery |
| 5 | **dojoToday** (lição de hoje do programador) | https://aidevschool-dojotoday.netlify.app | Veja streak, revisões vencidas (FSRS) e a unidade ativa (U2 concluída; próxima decisão do líder) | `customer-ready` (daily guidance). Superfície só-leitura |
| 6 | **codexDojo** (dashboard de controle) | https://aidevschool-codexdojo.netlify.app | Navegue: Overview, Learner, Agents (14), Cycle, Roadmap (19 entradas) | Superfície interna do ecossistema (sem tier customer). Bridge para o OS configurado no build |
| 7 | **Armazém KV** (voxelDojo game-02 standalone) | https://aidevschool-voxel-warehouse.netlify.app | Complete o loop determinístico do jogo 02 | Loop standalone `customer-ready`. Os outros 17 jogos rodam dentro do OS (pilot bundle) |

**Deploys de hoje (26/09):** miniTown, PixelDojo Quest, dojoToday e codexDojo foram rebuildados do main atual e publicados; LiteracyDojo, OS e Armazém KV já estavam no ar e continuam ativos (todos HTTP 200 verificados; screenshots anexos: `shot-beta-*.png`).

## Em caminho (child issues com donos)

| Engine | Issue | Dono | Entrega |
| --- | --- | --- | --- |
| zai-duolingo-like ("Duolingo de IA") | AID-2673 | Full-Stack Feature Engineer | URL pública do jogo (investigando export estático vs. hospedagem com runtime) |
| sdlc-quest (SDLC pt-BR) | AID-2674 | Platform & Release Engineer | URL pública da quest até o gate |
| school-entry (entrada + painel do operador) | AID-2675 | Platform & Release Engineer | CI by-name + publicação + painel de liberação de engines para você operar |

## Beta local (sem URL possível/necessária)

| Engine | Como rodar em 1 comando | O que testar |
| --- | --- | --- |
| sdlc-quest (enquanto AID-2674 não entrega) | `cd engines/sdlc-quest && npm start` → http://127.0.0.1:8080 | Quest completa + `npm run gate` |
| aiDevschoolMvp (chat-tutor 24 conceitos) | Skill `SKILL.md` no seu agente de terminal (Claude Code) | Sessão de 5–10 min de um conceito; gates nos scripts |
| minimaxDojo · miniMaxEvolutionEngine · openclaw | Núcleos de agente/runner (não são produtos de navegador) | Funcionam por dentro dos fluxos acima e do SDLC do repo |
| curriculum 01–18 (trilha dev) | Jogos voxel no OS (`?track=dev`) + repositório | Jogos 02/03/05/06/07 hospedados no pilot bundle do OS |

## Limites honestos do beta de hoje

1. Progresso em todas as superfícies é **local ao navegador** (local-first, sem conta) — testar em um navegador que você não limpa.
2. Nada disso conta como **mastery** — evidência só vira mastery via verificador independente (Prometor).
3. Prontidão formal das jornadas Dev (currículo 01–18) segue `stale` até nova avaliação; as revalidações gerais vencem **2026-10-16/19**.
4. zai/sdlc-quest/school-entry ainda não têm URL — child issues acima com donos e critérios de aceitação.

*Verificação: todos os URLs HTTP 200 em 2026-09-26; builds de hoje a partir do main `4461841f` (CI verde 41✓/2 skip); screenshots anexos.*
