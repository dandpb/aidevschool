# sdlc-quest bilíngue PT/EN (piloto do mecanismo de engines)

Sources:

- `.tasks/sdlc-quest-bilingual-pt-en.md` - a tarefa: 16 critérios, boundary, Unresolved `None`
- `.design/engines-bilingual-pt-en.md` - **binding para a interface**: mecanismo (`src/lang.js`, `STRINGS`, `_en`, `sdlc-quest:lang`), política de docs (EN-primary + espelho `.pt-BR.md`), boundary e Success (visitante completa o quest em EN)
- `engines/AGENTS.md` + `engines/sdlc-quest/README.md` - contratos do pacote: local-complete, zero deps, `npm test`/`npm run gate`
- Baseline 2026-09-18: `npm test` verde (0 fail) em Node v22.23.2, Python 3.12.2

## Out of scope

- Rollout às outras 13 engines - revisão pós-piloto (design, Success)
- `curriculum/` e `learner/` - substrato raiz, outra descoberta
- Prompts dos agentes tutores - RFC aberta no design
- `navigator.language` autodetect - rejeitado no design (determinismo para journeys)

## Landing

Toca o pacote `engines/sdlc-quest/` inteiro: `src/lang.js` novo (helper copiável), `STRINGS` nos três apps de UI, campos `_en` em `data.js`/`tlc-data.js`, `lang` default `'pt'` nos três cores, `--lang` nas 4 tools, docs EN-primary. Reusa o padrão IIFE + `module.exports` existente dos módulos (`data.js:250`) e a enumeração automática de `tests/*.test.cjs` do `tools/test.cjs`.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Convenção bilíngue de dados | sufixo `_en` em todo campo exibível; exclusões como literal no topo do teste de paridade (`id`, `url`, `color`, `glyph`, `artifact`, `answer`, `type`, `boss`, `lines`, `budget`, `tag`, `version`, `checkedAt`, `install`, `flow`, `license`) | catálogos JSON por locale - vencedor só com ≥2 engines simultâneas; viola local-complete |
| Persistência da preferência | `localStorage['sdlc-quest:lang']`, valores `'pt'\|'en'`, ausência = pt | `navigator.language` - não determinístico para journeys |
| Contrato dos módulos core | funções user-facing (`validate`, `stepIncident`, `importBackup`, `complete`) aceitam `lang` opcional, default `'pt'`; testes node e journeys PT seguem verdes sem edição | códigos de erro mapeados no app - quebraria os regexes dos testes contra `message` |
| Cadeia do gate | etapa `i18n` (`tests/i18n-browser.py`, desktop-only) entre `harness-mobile` e o snapshot final; receipt passa de 8 para 9 steps | desktop+mobile - dobra o custo do gate sobre a mesma superfície de strings |

- Nothing else in this change is hard to reverse

## Checks

### S1 - Mecanismo de idioma · index.html, src/lang.js (novo), src/app.js, src/tlc-app.js, src/harness-app.js, tests/i18n-browser.py (novo) · ~130 KB · ~33k

**C1** - Sem `sdlc-quest:lang` salvo, o jogo abre pt-BR com `document.documentElement.lang === 'pt-BR'`
Proof: `python3 tests/i18n-browser.py` - check nomeado `default-pt` PASS (exit 0)

**C2** - Toggle EN no HUD troca o chrome visível para inglês, `document.documentElement.lang` vira `en`, e `'en'` persiste em `localStorage['sdlc-quest:lang']` após recarregar
Proof: `python3 tests/i18n-browser.py` - checks nomeados `toggle-en-chrome` e `lang-persisted-after-reload` PASS

**C3** - Alternar pt→en→pt com progresso salvo não altera o valor byte de `localStorage['sdlc-quest-save-v1']` nem o XP exibido
Proof: `python3 tests/i18n-browser.py` - check nomeado `progress-preserved-through-toggle` PASS

**C4** - Campo exibível sem `_en` em modo EN renderiza o texto pt-BR do campo, nunca chave crua nem vazio
Proof: `node --test tests/i18n.test.cjs` - teste `fallback renders pt-BR when _en is missing` (unit sobre o resolver de `src/lang.js` com registro stub)

**C5** - Default pt é byte-estável: gate verde com nenhuma asserção PT existente alterada
Proof: `npm run gate` exit 0; `git diff --name-only <base>..HEAD -- tests/` mostra só adições (nenhuma modificação em `tests/*.py`, `tests/audit.test.cjs`, `tests/golden.test.cjs`)

### S2 - Paridade anti-drift · tests/i18n.test.cjs, src/data.js, src/tlc-data.js · ~78 KB · ~20k

**C6** - Campo exibível sem `_en` derruba o teste nomeando `id` do registro e o campo
Proof: `node --test tests/i18n.test.cjs` - teste `walker reports record id and missing field` (carrega `data.js`, deleta `missions[0].brief_en`, espera relatório contendo `'plan'` e `'brief_en'`)

**C7** - Walker cobre todos os registros exibíveis com exclusões literais no topo do teste
Proof: `node --test tests/i18n.test.cjs` - testes `walker covers missions/tasks/options/primers/glossary/sources` (fixtures negativos plantados em `glossary`, `primers` e `tlc-data` são reportados) e `walker green on real data` (verde só após S3)

### S3 - Conteúdo didático em EN · src/data.js, src/tlc-data.js · ~74 KB · ~19k

**C8** - Em EN, o diálogo da missão `plan` exibe exatamente `missions[0].brief_en` e cada opção da tarefa `intent` exibe `label_en`/`text_en`
Proof: `python3 tests/i18n-browser.py` - check nomeado `mission-plan-en` PASS (compara o DOM contra `QuestData` injetado na página)
Proof: `node --test tests/i18n.test.cjs` - `walker green on real data` PASS

### S4 - Chrome e feedback bilíngues · app trio, index.html, core trio · ~125 KB · ~31k

**C9** - Em EN todo o chrome renderiza inglês (topbar, diálogos, `#save-status`, `noscript`, aria-labels) e o single-file reconstruído contém as duas línguas
Proof: `python3 tests/i18n-browser.py` - checks nomeados `chrome-en` e `singlefile-both-langs` PASS
Proof: `node tools/build.cjs && grep -c` - `sdlc-quest.html` contém marcador EN e marcador PT das `STRINGS`

**C10** - Em EN, resposta errada (seleção com `promise` em `intent`) produz feedback inglês dos módulos core com `lang='en'`; testes node existentes verdes sem edição
Proof: `python3 tests/i18n-browser.py` - check nomeado `wrong-answer-feedback-en` PASS
Proof: `node --test tests/audit.test.cjs tests/golden.test.cjs` exit 0 com `git diff --quiet` em ambos os arquivos

### S5 - Tools bilíngues · tools/quest-gate.cjs, check-package.cjs, test.cjs, serve.cjs, tests/tools-lang.test.cjs (novo) · ~14 KB · ~4k

**C11** - `--lang en` aceito nas 4 tools com saída EN; `--lang xx` rejeitado com exit 64 e `Argumento não suportado`; exit codes do gate preservados (0/1/2)
Proof: `node --test tests/tools-lang.test.cjs` - testes `--lang en accepted`, `--lang xx rejected exit 64`, `gate exit codes preserved` (spawn síncrono por tool; `serve`/`check-package` testados só no caminho de rejeição e validação de parse, sem servidor)

### S6 - Docs, manifest e contrato offline · README, guias, espelhos, SHA256SUMS.txt, package.json, tests/docs-bilingual.test.cjs (novo) · ~55 KB · ~14k

**C12** - `README.md` EN com linha "Leia em português" resolvendo para `README.pt-BR.md` integral
Proof: `node --test tests/docs-bilingual.test.cjs` - teste `readme en-primary with pt mirror` (link presente, alvo existe, mirror contém as linhas PT atuais - ex. o parágrafo de `tlc-discover` da linha 127 - e contagem de headings igual)

**C13** - `TLC-GUIDE.md`/`HARNESS-GUIDE.md` integrais em EN, mesma sequência de seções, espelhos `.pt-BR.md` com o texto PT atual integral
Proof: `node --test tests/docs-bilingual.test.cjs` - testes `tlc-guide en with pt mirror` e `harness-guide en with pt mirror` (contagem e ordem de headings EN == PT, espelho contém verbatim os headings PT atuais amostrados, arquivo EN contém linha de ligação)

**C14** - Manifest conferido: `check-package` exit 0, zero `(alterado)`/`(ausente)`, novos arquivos listados
Proof: `node tools/check-package.cjs` exit 0 com stdout `arquivos conferidos` e nenhuma entrada `(alterado|ausente)`; `grep -c` em `SHA256SUMS.txt` para `src/lang.js`, `tests/i18n.test.cjs`, `tests/i18n-browser.py`, `tests/tools-lang.test.cjs`, `tests/docs-bilingual.test.cjs`, `README.pt-BR.md`, `TLC-GUIDE.pt-BR.md`, `HARNESS-GUIDE.pt-BR.md`

**C15** - Contrato offline preservado: sem novas dependências, sem recurso externo
Proof: `git diff --quiet package-lock.json`; `rg '<(script src|link)' index.html` retorna só caminhos `src/` locais

### S7 - Jornada EN no gate · tests/i18n-browser.py, tools/quest-gate.cjs · ~10 KB · ~3k

**C16** - Etapa `i18n` na cadeia do gate: journey EN desktop passa e consta no receipt
Proof: `npm run gate` exit 0; receipt `evidence-v1.3/runs/<latest>/run.json` com step `id:'i18n'`, `status:'passed'`, e 9 steps no total

## Swept

- validation: C6, C7, C11
- failure modes: C4 - fallback PT; degradação de storage já existente em `app.js:8-11` (reusada, variante EN nas `STRINGS`)
- idempotency and retry: C3 - toggle repetido não reescreve progresso
- authorization: existing - pacote offline sem auth; allowlist de host do `serve.cjs` inalterada
- concurrency and ordering: n/a - localStorage síncrono, chave de idioma independente da chave de save
- data lifecycle: C3 - nada migra; `'sdlc-quest-save-v1'` intocado; backup sem campo de idioma (existente, congelado)
- external-dependency failure: C15 - offline por contrato, zero deps é o guard
- state transitions: C1, C2, C3
- observability: C6 - falha nomeia registro e campo; C16 - etapa `i18n` no receipt

## Handoff

Loteamento por superfície (cada lote = slices inteiras, leitura estimada bem abaixo do budget de 150k; a fronteira é onde o código lido muda):

- **B1 = S1 + S4** (~155 KB lidos, ~39k): apps de UI + cores. Cria `src/lang.js`, `STRINGS` nos 3 apps, chrome EN, `lang` nos cores, `tests/i18n-browser.py` (criado já neste lote como infra compartilhada - a slice S7 só fecha com a integração no gate em B3) e `tests/i18n.test.cjs` com o teste de fallback (C4). Provas C1-C4, C9-C10 rodáveis; C5 provável verde já aqui (gate sem etapa nova).
- **B2 = S2 + S3** (~78 KB lidos, ~20k; escrita dominante): walker de paridade + tradução integral `_en` de `data.js`/`tlc-data.js`. Fecha C6-C8 e deixa C5/C7 verdes.
- **B3 = S5 + S6 + S7** (~70 KB lidos, ~18k): `--lang` nas tools, docs EN + espelhos, manifest, etapa `i18n` no gate. Fecha C11-C16 e roda o gate final.

Regras para todo agente de build: commite só caminhos de `engines/sdlc-quest/` (nunca `git add -A` - a árvore tem trabalho não-relacionado staged); Conventional Commits em inglês com `Co-Authored-By: Claude Code <noreply@anthropic.com>`; rode `/simplify` no diff pendente antes de cada commit e aplique as recomendações; sem push. Agente de build não despacha sub-agente; o Verificador é despachado pelo orquestrador após o último lote.

### Boundary log

- (a preencher pelos lotes)
