# sdlc-quest bilíngue PT/EN (piloto do mecanismo de engines)

> Build this with **tlc-implement** (`.claude/skills/tlc-implement`).
> Every criterion below becomes a check with a proof, referenced by its number. Nothing under
> `Unresolved` gets settled while building.

## Intent

Um visitante sem português que clona `engines/sdlc-quest/` encontra o pacote inteiro em pt-BR — README, chrome da UI, missões, feedback de validação, saída das tools — e não tem como percorrer o quest. O substituto é sair. Quem paga é a aposta de portfólio/distribuição do ecossistema (veredito confirmado por Daniel, 2026-09-18): o custo de nada publicado em EN é zero mensurável hoje, e por isso o piloto prova o mecanismo antes do rollout às outras 13 engines.

A mudança: o pacote ganha chaveamento pt/en — helper `src/lang.js`, campos `_en` nos dados, `STRINGS` nos três apps, `lang` com default `'pt'` nos módulos core, `--lang` nas tools, README EN — com teste de paridade que falha o gate quando falta tradução. Interface: `index.html` (shell do jogo) e o build single-file `sdlc-quest.html`. Design: `.design/engines-bilingual-pt-en.md`.

16 criteria in 7 slices · 4 one-way doors · 0 open.

## Criteria

### Mecanismo de idioma (default pt byte-estável)

1. Dado `localStorage` sem `sdlc-quest:lang`, quando `index.html` carrega, então o jogo renderiza em pt-BR e `document.documentElement.lang` vale `pt-BR`.
2. Quando o jogador alterna o idioma para EN pelo controle do HUD, então o chrome visível renderiza em inglês, `document.documentElement.lang` vira `en` e `localStorage['sdlc-quest:lang']` vale `'en'` após recarregar a página.
3. Dado progresso salvo em pt-BR (missão `plan` completa, XP > 0), quando o idioma muda para EN e volta para pt-BR, então o valor de `localStorage` sob `C.key` (`'sdlc-quest-save-v1'`, `src/core.js:7`) é byte-idêntico ao anterior e `C.stats(state,D).xp` mantém o mesmo número.
4. Se o runtime encontra um campo exibível sem `_en` enquanto o idioma é EN, então renderiza o texto pt-BR do campo — nunca a chave crua, nunca vazio.
5. Sempre, com `sdlc-quest:lang` ausente, `npm run gate` termina com exit 0 executando a cadeia completa sem nenhuma asserção PT alterada — os testes node (`audit.test.cjs` casa `/Promessa absoluta/`, `/Backup muito grande/`) e as journeys Python (`playtest.py` espera `'Orçamento esgotado'`, `'Modo temporário'`, `'NÃO demonstrada'`) passam como hoje.

### Paridade anti-drift

6. Quando um campo exibível perde o `_en` (ex.: `brief_en` removido de `missions[0]`), então `node --test tests/i18n-parity.test.cjs` falha com mensagem contendo o `id` do registro e o nome do campo faltante.
7. Sempre, o teste de paridade caminha os registros exibíveis de `src/data.js` (`missions`, `tasks`, `options`, `primers`, `glossary`, `sources`) e `src/tlc-data.js`, com a lista de exclusões declarada como literal no topo do teste (`id`, `url`, `color`, `glyph`, `artifact`, `answer`, `type`, `boss`, `lines`, `budget`, `tag`, `version`, `checkedAt`, `install`, `flow`, `license`, `code`, `axis`, `skill`, `source`).

### Conteúdo didático em EN

8. Dado idioma EN, quando o diálogo da missão `plan` abre, então o brief exibido é exatamente o conteúdo de `missions[0].brief_en` e cada opção da tarefa `intent` exibe `label_en`/`text_en`.

### Chrome e feedback bilíngues

9. Dado idioma EN, então todo o chrome renderiza em inglês: topbar e diálogos de `index.html`, templates de `app.js`/`tlc-app.js`/`harness-app.js`, `#save-status`, `noscript` e aria-labels — e o `sdlc-quest.html` reconstruído por `npm run build` contém as duas línguas (funciona offline em `file://`).
10. Dado idioma EN, quando o jogador verifica uma resposta errada (seleção incluindo `promise` na tarefa `intent`), então o feedback em `#feedback-slot` vem em inglês produzido pelos módulos core com `lang='en'` — e os testes node existentes continuam verdes sem edição nenhuma (default `'pt'`).

### Tools bilíngues

11. Quando `--lang en` é passado a `tools/quest-gate.cjs`, `tools/check-package.cjs`, `tools/test.cjs` e `tools/serve.cjs`, então as mensagens de console saem em inglês; `--lang xx` (valor inválido) é rejeitado com exit 64 e a mensagem `Argumento não suportado` no padrão existente do `parseArgs`; os exit codes do gate permanecem o contrato atual (0 ok, 1 falha, 2 `--require-release`).

### Docs, manifest e contrato offline

12. Quando o visitante abre `README.md`, então o corpo está em inglês com linha inicial "Leia em português" cujo link resolve para `README.pt-BR.md` contendo o README pt-BR atual integral.
13. Quando o visitante abre `TLC-GUIDE.md` e `HARNESS-GUIDE.md`, então cada um está integralmente em inglês — mesma sequência de títulos/seções da versão pt-BR atual — com linha inicial apontando para `TLC-GUIDE.pt-BR.md`/`HARNESS-GUIDE.pt-BR.md`, que contêm o texto pt-BR atual integral (decidido por Daniel, 2026-09-18: traduções integrais).
14. Depois das edições, quando `node tools/check-package.cjs` roda, então exit 0 com zero entradas `(alterado)`/`(ausente)` e o `SHA256SUMS.txt` lista os arquivos novos (`src/lang.js`, `tests/i18n-parity.test.cjs`, `tests/i18n-browser.py`, `README.pt-BR.md`, `TLC-GUIDE.pt-BR.md`, `HARNESS-GUIDE.pt-BR.md`).
15. Sempre, `package-lock.json` permanece sem dependências declaradas e nenhum `<script src>`/`<link>` externo ao pacote é adicionado — o contrato local-complete (zero `npm install`) vale para o mecanismo inteiro.

### Jornada EN no gate

16. Quando `npm run gate` roda, então a etapa nova `i18n` executa `tests/i18n-browser.py` em desktop: seta `sdlc-quest:lang='en'`, abre a missão `plan`, verifica string EN no diálogo, responde errado e vê feedback EN, completa a tarefa `intent` — com status `passed` no receipt `evidence-v1.3/runs/<id>/run.json` e o gate terminando exit 0.

## Out of scope

- Rollout às outras 13 engines — a ordem e a forma por engine decidem na revisão pós-piloto (design, Success).
- Bilínguização de `curriculum/` e `learner/` — substrato compartilhado na raiz, outra descoberta.
- Prompts dos agentes tutores — RFC aberta no design.
- Auto-detecção por `navigator.language` — rejeitada no design (determinismo para journeys).

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen shell do quest (`index.html`) | first-run/default | 1 |
| screen shell do quest | troca de idioma mid-run | 2, 3 |
| screen shell do quest | string sem tradução (fallback) | 4 |
| screen shell do quest | error state (storage indisponível) | existing - `storageOK`/`'Modo temporário'` em `app.js:8-11`; a variante EN entra no mesmo `STRINGS` do critério 9 |
| screen shell do quest | destructive action confirma (reset de campanha) | existing - `#h-confirm-reset` existente; cópia bilíngue via critério 9 |
| screen shell do quest | unauthorised | n/a - pacote local, sem autenticação |
| command `tools/quest-gate.cjs` | flags, defaults, exit codes | 11 |
| command `tools/quest-gate.cjs` | o que imprime ao falhar no meio | existing - cadeia grava `<step>.log` e receipt incremental; inalterada |
| command `tools/check-package.cjs`/`serve.cjs`/`test.cjs` | saída e flags | 11 |
| document `README.md`/`README.pt-BR.md` | estrutura, next action | 12 |
| document `TLC-GUIDE.md`/`HARNESS-GUIDE.md` (+ espelhos `.pt-BR.md`) | estrutura, tom, next action | 13 |
| document `LEIA-ME-PRIMEIRO.txt` | permanece pt-BR | existing - decisão do design (first-run do aprendiz PT) |
| collection campos `_en` + `STRINGS` | critério de agrupamento, nomes, duplicatas, exceção | 6, 7 |

## Swept

- validation: 6, 7, 11
- failure modes: 4 + existing - degradação de storage já tratada em `app.js`
- idempotency and retry: 3 - alternar o idioma repetidamente não reescreve progresso (mesma chave de save, re-render only)
- authorization: existing - pacote offline sem auth; allowlist de host do `serve.cjs` (`127.0.0.1`) inalterada
- concurrency and ordering: n/a - localStorage síncrono, aba única; chave de idioma independente da chave de save
- data lifecycle: 3 - nada migra; `sdlc-quest:lang` persiste sem expiração; backup (`makeBackup`) existente e congelado sem campo de idioma
- external-dependency failure: 15 - o contrato é offline; zero dependências e zero rede são o guard
- state transitions: 1, 2, 3
- observability: 6 - a falha de paridade nomeia registro e campo; 16 - etapa `i18n` visível no receipt

## Impact

| Front | What changes |
|---|---|
| domain | new term: `QuestLang` (`src/lang.js`) - helper de idioma (`getLang`/`setLang`/`t`), global ao lado de `QuestData`/`QuestTLCData` |
| domain | new term: `STRINGS` - dicionário `{pt, en}` por módulo de UI; vive em `app.js`, `tlc-app.js`, `harness-app.js` e no chrome estático de `index.html` |
| domain | new term: sufixo `_en` - convenção bilíngue de campos exibíveis nos registros de `data.js`/`tlc-data.js` |
| domain | existing term: campo `en` das missões significava rótulo curto decorativo (`en:'PLAN'`), passa a `tag` - quem depende hoje: `src/app.js` nas 5 referências `mission.en` (stage-nav, dialog-top ×2, export do playbook, aba method, aba artefatos) |
| domain | new term: `--lang pt\|en` - flag das 4 tools |
| stored data | nothing to migrate - `'sdlc-quest-save-v1'` intocado; nova chave `'sdlc-quest:lang'` independente; formato de backup sem alteração |

## Decided

| Decision | Shape | Alternative rejected |
|---|---|---|
| Convenção bilíngue de dados | sufixo `_en` em todo campo exibível; exclusões como literal no topo de `tests/i18n-parity.test.cjs` (lista do critério 7); decorativo `en` renomeado `tag` | catálogos JSON por locale + runtime compartilhado — vencedor só com ≥2 engines de stacks diferentes no mesmo período; viola o local-complete deste pacote |
| Persistência da preferência | `localStorage['sdlc-quest:lang']` com valores `'pt'\|'en'`, ausência = pt | `navigator.language` — não determinístico para journeys e testes |
| Contrato dos módulos core | funções user-facing (`validate`, `stepIncident`, `importBackup`, `complete`) aceitam `lang` opcional, default `'pt'`; testes node e journeys Python seguem verdes sem edição | códigos de erro mapeados no app — quebraria os regexes dos testes contra `message` e duplicaria a tabela |
| Jornada EN no gate | etapa `i18n` = `tests/i18n-browser.py` desktop-only na cadeia do `quest-gate.cjs` (receipt passa de 8 para 9 steps) | desktop+mobile — dobra o custo do gate sobre a mesma superfície de strings |

## Surface

| Route | In | Out | Status | Criteria |
|---|---|---|---|---|
| `node tools/quest-gate.cjs [--require-release] [--lang pt\|en]` | flags | receipt `run.json` + console | 0, 1, 2, 64 | 11, 16 |
| `node tools/check-package.cjs [--lang pt\|en]` | flag | contagem + veredito | 0, 1 | 11, 14 |
| `node tools/test.cjs [--lang pt\|en]` | flag | saída `node --test` | 0, 1 | 11 |
| `node tools/serve.cjs [--lang pt\|en]` | flag | banner + servidor loopback | 0 | 11 |

## Sources

- `.design/engines-bilingual-pt-en.md` - **binding para a interface**: mecanismo, convenção `_en`, chave `sdlc-quest:lang`, padrão de paridade, política de docs, boundary (emendado pelo tlc-plan em 4 pontos: mensagens dos cores, manifest, harness, jornada EN).
- `tools/build.cjs` - `sdlc-quest.html` é gerado a partir de `index.html` + `src/*` (o trabalho não edita o single-file).
- `src/core.js:7` - `C.key='sdlc-quest-save-v1'`; mensagens PT hardcoded em `validate`/`stepIncident`/`importBackup`.
- `tests/audit.test.cjs`, `tests/golden.test.cjs` - regexes PT contra mensagens do core; validação por IDs de resposta.
- `tools/quest-gate.cjs` - cadeia de 8 steps, `validateContract` (`QUEST-013`, 10 critérios H01-H10), snapshot walk sobre `src`/`tests`/`tools`/`docs/harness`/`index.html`/`package.json`/`requirements-dev.txt`.
- `tools/check-package.cjs` - verifica `SHA256SUMS.txt`; nada no repo o regenera.
- `tests/playtest.py` - asserta `'Orçamento esgotado'`, `'Modo temporário'`, `'NÃO demonstrada'`, `'Não certifica'` no DOM.
- Entrevista 2026-09-18 (questionário): driver portfólio, escopo tudo, piloto sdlc-quest — `user delegated` nos defaults de escopo.

This task is the record of decision. If a linked document diverges, ask before building.

## Unresolved

| # | Kind | Question | Until answered |
|---|---|---|---|
| 1 |  | None |  |
