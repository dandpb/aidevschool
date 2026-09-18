# Engines bilíngues PT/EN — piloto sdlc-quest e mecanismo replicável

> Plan this with **tlc-plan** (`.claude/skills/tlc-plan`).
> Decisions below carry the literal shape - copy them, do not re-derive them.

## Situation

- Project: in active construction — ecossistema pessoal sem audiência externa publicada; o aprendiz é o próprio autor (pt-BR).
- Decision: open — nenhum doc, roadmap ou convenção anterior trata de idioma; decidido nesta sessão.
- In flight: branch `feature/engine-sdlc`; trabalho de product-readiness do dojoToday (regrants v92/v93, 2026-09-18). Não intersecta o pacote `engines/sdlc-quest/` (autocontido).
- At stake: reversible — engine nova (2026-09-17, commit 9f2f487e), sem histórico de churn, um autor; erro estrutural se refaz numa tarde sobre dados já estruturados.

## Problem

Problema de **ausência**. Quem não consegue usar: um visitante sem português que chega ao ecossistema via GitHub/portfólio. O que faz em vez: sai — não existe substituto parcial, nem mesmo os READMEs estão em inglês. O que fica impossível sem o trabalho: o ecossistema existir como portfólio internacional. O custo de continuar como está é zero mensurável hoje (nada publicado externamente); a aposta é de distribuição futura, o que pede piloto antes de comprometer o rollout completo — o escopo "tudo" (14 engines, incluindo prompts de agentes e docs internas) é o mais caro de manter e o driver (portfólio) é o que menos exige paridade total.

## Evidence

- 14 engines + `shared/`, **zero maquinário de i18n** — busca por `i18n|locale|intl|translation` não retorna um único hit de código (só conteúdo de docs).
- Superfícies PT medidas (arquivos com diacríticos): literacyDojo 65, codexdojo-os-prototype 51, zai-duolingo-like 35, sdlc-quest 39, dojoToday 18, codexDojo 13, miniTown 3.
- sdlc-quest já é data-driven: `src/data.js` (251 linhas) + `src/tlc-data.js` (648) carregam missões/tarefas/opções como registros estruturados; a validação roda sobre **IDs de opção, não prosa** (`tests/golden.test.cjs` asserta IDs e XP) — traduzir não quebra o gate.
- `tools/test.cjs` enumera `tests/*.test.cjs` automaticamente → um novo teste de paridade entra em `npm test` e no gate sem tocar scripts.
- `package-lock.json` com 258 B e contrato "local-complete, sem `npm install`" (`engines/AGENTS.md`) → o mecanismo **não pode ser dependência npm** nem pressupor bundler.
- Número que ninguém tem: audiência internacional perdida — não existe por o produto não estar publicado; nada a instrumentar antes da publicação. Proxy observável definido em Success.

## Journey

Sequência confirmada do visitante-alvo: clona o pacote → lê `README.md` (EN) → `npm start` → quest abre em pt-BR (default) → alterna para EN no HUD → joga missões em EN → progresso salvo sobrevive à troca → roda `npm run gate --lang en` → completa o quest em inglês.

Estados que importam:

- **Primeira execução, sem preferência** — abre pt-BR (público-alvo doméstico é o default); toggle visível desde a primeira tela.
- **Troca de idioma no meio da run** — strings trocam, estado de progresso/XP/journal intocado (chaves de persistência neutras em idioma).
- **String sem tradução em runtime** — não deveria existir: renderiza PT como fallback (nunca chave crua) e o teste de paridade falha no gate.
- **Progresso salvo em PT aberto em EN** — mesmo estado, textos EN; nada a migrar.
- **Visitante rodando o gate** — `--lang en` explícito nas tools; default pt-BR mantém determinismo para os testes.

## Verdict

**build, phaseado** — mecanismo bilíngue + piloto sdlc-quest agora; rollout "tudo" por engine depois, na ordem que o piloto revelar. O custo de fazer nada é zero hoje; o custo de fazer tudo de uma vez é paridade permanente comprometida sem ponto de revisão. Confirmado por Daniel, 2026-09-18 (entrevista: driver portfólio/distribuição, escopo tudo, piloto sdlc-quest).

Cheaper paths considered: tradução automática do navegador no runtime — qualidade didática inaceitável e o gate não acompanha; READMEs EN apenas (a "forma leve") — descartada como veredito por escolha explícita de escopo "tudo", mas permanece como forma de descida por engine na revisão pós-piloto.

## Success

- Worked if: um visitante sem português clona, roda e **completa o sdlc-quest inteiro em EN** — missões, UI e `npm run gate --lang en` passando — sem precisar de PT. By: fechamento do piloto.
- Early signal (dias): primeiras missões jogáveis em EN **sem vazamento de PT** — `tests/i18n-parity.test.cjs` passando desde o primeiro dia de tradução. Aposta indo errado: manutenção dupla travando a evolução do conteúdo PT do quest.
- Review: ao fechar o piloto, **antes** de abrir a engine #2 do rollout — quem olha: Daniel. Se o custo dual já doer no piloto, cada engine seguinte pode descer para a forma leve sem reabrir esta decisão.

## Boundary

In: o pacote `engines/sdlc-quest/` completo (UI/missões/TLC, saída das tools, docs do pacote, manifest) + a convenção replicável (helper copiável + padrão de teste de paridade documentado para as próximas engines).
Out: as outras 13 engines — ordem e forma decididas na revisão pós-piloto; `curriculum/` e `learner/` — substrato compartilhado na raiz, regra "1 aprendiz, 1 currículo", bilínguização é outra descoberta (literacyDojo herda essa limitação: conteúdo canônico em `curriculum/ai-literacy/`); prompts dos agentes tutores — RFC própria (abaixo).

## Prior art

- Forma que se repete em jogos vanilla-JS pequenos: dicionário plano de strings + persistência da preferência + teste de paridade de chaves — convergência que carregamos para cá.
- Falha clássica: fallback silencioso escondendo traduções faltantes — por isso aqui a paridade é teste que **falha o gate**, não warning.
- Benchmarks que argumentam por mais peso (frameworks i18n, ICU): condição que não compartilhamos — pacote local-complete, zero deps, sem bundler.
- Não houve survey de vendors: a forma é convencional e nada aqui depende de escolha de provedor.

## Shape

Aposta: bilíngue por sufixo nos registros de dados existentes + um helper de idioma autocontido e copiável — o mecanismo cabe no contrato "sem npm install" e o custo de traduzir é pago uma vez, com o teste anti-drift guardando a paridade para sempre. Mudar de forma depois custa uma tarde sobre `data.js`/`tlc-data.js`; nada de one-way.

### Adds

- `src/lang.js` — helper autocontido (zero deps): resolve idioma ativo, getter `t(key)`, persistência em `localStorage`.
- Tabelas `STRINGS` (pt/en) nos três apps de UI (`app.js`, `tlc-app.js`, `harness-app.js`) e no chrome estático de `index.html` (topbar, rodapé, `noscript`, aria-labels).
- Parâmetro `lang` (default `'pt'`) nas funções user-facing dos módulos core (`validate`, `stepIncident`, `importBackup`, …) para as mensagens de feedback.
- `tests/i18n-browser.py` — jornada EN (desktop) na cadeia do gate.
- Campos sufixados `_en` em todo campo string exibível dos registros de `src/data.js` e `src/tlc-data.js`.
- `tests/i18n-parity.test.cjs` — caminha recursivamente os registros e falha para todo campo PT sem `_en` correspondente (exclusões explícitas: `id`, `url`, `color`, `glyph`, `artifact`).
- `--lang pt|en` nas tools (`quest-gate.cjs`, `check-package.cjs`, `test.cjs`, `serve.cjs`).
- `lang-btn` no HUD (ao lado de `book-btn`) e `README.pt-BR.md`.

### Changes

- `README.md` → passa a EN-primary com linha "Leia em português" no topo; o conteúdo PT atual muda-se para `README.pt-BR.md`.
- `TLC-GUIDE.md` / `HARNESS-GUIDE.md` → tradução integral EN nos arquivos atuais (EN-primary) com espelho pt-BR em `TLC-GUIDE.pt-BR.md`/`HARNESS-GUIDE.pt-BR.md` — decidido por Daniel em revisão da tarefa, 2026-09-18.
- Campo decorativo `en` das missões (`en:'PLAN'`) → renomeado para `tag` (livra o sufixo `_en` da colisão).
- `SHA256SUMS.txt` → atualizado pelo comando de recálculo documentado — emendado no tlc-plan: `npm run build` **não** regenera o manifest (`tools/build.cjs` só escreve `sdlc-quest.html`); `check:package` continua validando.
- `index.html` + launchers (`INICIAR-Mac.command`, `iniciar.sh`, `INICIAR-Windows.cmd`) → chrome bilíngue (default pt).
- `package.json` `description` → bilíngue em uma linha.

### Leaves

- `src/core.js`, `src/tlc-core.js`, `src/harness-core.js` — a **lógica** de validação por IDs permanece intocada; as **mensagens** PT user-facing desses módulos tornam-se bilíngues via `lang` com default `'pt'` (emendado no tlc-plan: os testes node e as journeys Python assertam texto PT no default — ex. `audit.test.cjs` casa `/Promessa absoluta/`, `playtest.py` espera `'Orçamento esgotado'` — e precisam continuar verdes sem edição).
- Esquema de progresso/estado (chaves de persistência) — neutro em idioma, nada migra.
- Contrato local-complete: zero dependências npm, `npm start` sem install.
- As demais engines, `curriculum/`, `learner/` (Boundary Out).

Alternativa mais pesada: extração de catálogos JSON por locale + runtime i18n compartilhado sob `engines/shared/` — só vence quando ≥2 engines de stacks diferentes consumirem o mesmo mecanismo no mesmo período; hoje apenas o piloto está na rodada, e stacks futuras (Vite/Next) podem preferir dicionário próprio seguindo a mesma convenção.

Also in the field, por perspectiva e não como candidatas: tradução automática de navegador — mata a qualidade didática e o gate não acompanha; rewrite EN-only — mata o público-alvo PT (o aprendiz); READMEs EN apenas — é a forma de descida por engine, não o mecanismo.

## Roadmap

| Block | Delivers | Clarity |
|---|---|---|
| Mecanismo no piloto (`lang.js`, `STRINGS`, toggle, fallback) | Chaveamento pt/en funcionando com strings de demonstração | clear |
| Tradução EN do quest (missões + TLC + harness + chrome + HUD + mensagens dos cores) | Conteúdo didático 100% EN | clear |
| Paridade + CLI + manifest + jornada EN | Teste anti-drift e jornada EN no gate; `--lang` nas tools; `SHA256SUMS.txt` atualizado | clear |
| Docs bilíngues do pacote | `README.md` EN + `README.pt-BR.md` + `TLC-GUIDE`/`HARNESS-GUIDE` com tradução integral EN e espelho `.pt-BR.md` + `LEIA-ME-PRIMEIRO.txt` PT | clear |
| Rollout engine #2+ | Ordem e forma por engine — decide na revisão pós-piloto | open |
| Prompts de agentes bilíngues | Bloqueado pelo RFC abaixo | rfc |

## Decisions

| Decision | Choice | Why this | Alternative, and what would make it win | Reversibility |
|---|---|---|---|---|
| Mecanismo de strings de UI | `src/lang.js` autocontido + tabela `STRINGS` por módulo + `t(key)`; zero deps, copiável | Contrato local-complete proíbe dependência; helper de ~50 linhas serve | Catálogos JSON + runtime i18n compartilhado em `engines/shared/` — venceria com ≥2 engines consumindo no mesmo período | reversible |
| Dados bilíngues | Sufixo `_en` em todo campo exibível de `data.js`/`tlc-data.js`; decorativo `en` → `tag` | Aditivo, grep-ável, teste de paridade caminha chaves genericamente | Registro aninhado `{pt,en}` — venceria se a estrutura passasse a divergir por idioma | reversible |
| Preferência de idioma | `localStorage['sdlc-quest:lang']`, default `pt`, toggle no HUD, troca mid-run sem tocar progresso | Público doméstico é default; experiência determinística para testes | `navigator.language` auto-detect — venceria se analytics mostrassem visitantes EN dominando (inmedível hoje) | reversible |
| Fallback runtime | String sem `_en` renderiza PT; `tests/i18n-parity.test.cjs` falha o gate (entra via enumeração automática de `tools/test.cjs`) | Fallback silencioso é o modo de falha clássico; teste antes da tradução | Warning não-bloqueante — venceria só se o volume de strings tornasse a paridade inviável | reversible |
| Saída das tools | `--lang pt|en`, default `pt`, em `quest-gate.cjs`/`check-package.cjs`/`test.cjs`/`serve.cjs` | Determinismo para os testes; visitante usa a flag explícita | Default EN portfolio-first — venceria se a maioria dos runners do gate fosse esperada não-PT | reversible |
| Docs do pacote | `README.md` EN-primary + link PT; PT integral em `README.pt-BR.md`; `LEIA-ME-PRIMEIRO.txt` permanece PT | README é a porta GitHub; LEIA-ME é o first-run do aprendiz PT | README único bilíngue — venceria se o PT não coubesse em arquivo separado linkado | reversible |

## Needs an RFC

1. Bilínguizar prompts dos tutores (minimaxDojo 14 agentes; comandos/skills do miniMaxEvolutionEngine) — bloqueia o rollout desses motores. Consequente porque muda a experiência pedagógica em si: tutor em EN altera o aprendizado do aprendiz PT, a língua da evidência produzida (que o gate verifica), e o princípio produtor≠verificador não diz em que língua o verificador fala.

## Open

1. Ordem do rollout pós-piloto — default: nenhum; decidida na revisão de Success, trigger = fechamento do piloto.
2. Onde traduzir (quem produz o EN) — default: rascunho assistido por IA + revisão de Daniel, missão por missão; o golden de aceitação já garante que a tradução não corrói a semântica das respostas.
3. Glossário de termos técnicos (commit, gate, streak ficam em EN nas duas línguas?) — default: termos técnicos consagrados permanecem em EN no texto PT, como o quest já faz hoje.

## Sources

- `engines/AGENTS.md` — mapa das 14 engines, contratos por engine, sdlc-quest "pt-BR, Node ≥22, native modules only".
- `engines/sdlc-quest/src/data.js`, `src/tlc-data.js` — forma estruturada dos registros de missão (evidência de que a tradução é aditiva).
- `engines/sdlc-quest/tests/golden.test.cjs` — validação por IDs de resposta, não prosa.
- `engines/sdlc-quest/tools/test.cjs`, `package.json`, `SHA256SUMS.txt` — enumeração automática de testes; scripts; manifest.
- Contagens `rg` de diacríticos PT por engine (Evidence) — 2026-09-18.
- Entrevista com Daniel, 2026-09-18 — driver portfólio/distribuição; escopo tudo; piloto sdlc-quest; veredito build phaseado confirmado via questionário.
