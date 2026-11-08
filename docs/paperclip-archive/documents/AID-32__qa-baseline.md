<!-- issue: AID-32 | key: qa-baseline | doc_id: bfe92e5f-8fcc-4d64-b0c9-d4e7ce5c3bc7 | updated: 2026-08-21 20:07:32.623+00 -->

# AID-32 — Baseline de QA e plano de teste de release

(AID-32)

# AID-32 — Baseline de QA e plano de teste de release

Data: 2026-08-21 UTC  
QA independente: `ca6a3f95-8572-43f4-822a-6b40b9bdb63b`  
Commit observado: `dac40786ecabaf36eafbc22b2a1584f1809765e6`  
Ambiente: Linux, Node `v24.18.0`, npm `11.17.0`, Python `3.13.5`; `NODE_ENV=production` no runner.

## Disposição da baseline

**Não pronta para release (Sev-2).** Integridade das projeções está limpa no estado observado e o host passa lint (com 26 avisos), 208 testes e build quando executado sem a variável de produção do runner. O LiteracyDojo passa validação de 17 lições, lint e 76 testes, mas seu comando oficial de geração falha por caminho Python absoluto e o build direto falha por tipos Node ausentes. Smoke/E2E não pôde ser executado por dependências de browser ausentes; o smoke integrado do host também requer `pnpm`, indisponível no runner.

Esta não é uma baseline imutável de RC: o repositório compartilhado estava com alterações concorrentes de AID-29/AID-33 em projeções, CI e documentação. A classificação final da AID-28 ainda não estava publicada.

## Evidência executável

| Área | Comando | Resultado |
| --- | --- | --- |
| Projeções | `python3 -m learner.substrate --check` | PASS — projeções sincronizadas |
| Host lint | `env -u NODE_ENV npm run lint` | PASS com 26 avisos CSS |
| Host unit/integration | `env -u NODE_ENV npm run test` | PASS — 42 arquivos, 208 testes |
| Host build | `env -u NODE_ENV npm run build` | PASS — Vite, 1843 módulos |
| Literacy conteúdo | `python3 curriculum/ai-literacy/tools/validate.py --compile engines/literacyDojo/src/data/generated` | PASS — 17 lições ready |
| Literacy lint | `env -u NODE_ENV npm run lint` | PASS — 58 arquivos |
| Literacy unit/integration | `env -u NODE_ENV npx vitest run` | PASS — 9 arquivos, 76 testes |
| Literacy build | `env -u NODE_ENV npx tsc -b` | FAIL produto — TS2580 em `playwright.config.ts:23`, `process` sem tipos Node (AID-37) |
| Literacy comandos oficiais | `env -u NODE_ENV npm test` | FAIL produto/portabilidade — `/usr/local/bin/python3: not found` (AID-38) |
| Host smoke | `env -u NODE_ENV npm run test:smoke` | BLOCKED infra — `pnpm: not found` ao iniciar dashboard integrado |
| Literacy E2E direto | `env -u NODE_ENV npx playwright test` | BLOCKED infra — seis casos não iniciaram: bibliotecas Chromium do host ausentes |

Nota de triagem: executar testes do host mantendo `NODE_ENV=production` produz 30 falhas `React.act is not a function` e três suites `No such built-in module: node:`; repetir com a variável removida passa 208/208. Isso é configuração do runner, não evidência de regressão funcional.

## Registro de defeitos

- AID-37 — Sev-2: build do LiteracyDojo falha por ausência de `@types/node`.
- AID-38 — Sev-2: scripts oficiais fixam `/usr/local/bin/python3` e abortam neste ambiente.
- Infraestrutura — browser smoke/E2E não executável até instalar `pnpm` e dependências de sistema do Playwright. Não classificado como bug do produto.

## Charters de risco para o RC

### C1 — Entrada canônica e duas audiências (Sev-1)

Provar, em URL pública e commit identificados, landing → escolha `IA na Prática`/desenvolvedor → primeira atividade → conclusão → retorno. Verificar deep links, refresh, back/forward, 404 e handoff host/Literacy. Falha que impeça qualquer audiência ou exponha rota ambígua é Sev-1/2.

### C2 — Integridade e limite de evidência (Sev-1)

Executar substrate `--check`; completar e falhar atividades; inspecionar armazenamento e eventos. O produtor pode gravar `completed`, nunca `mastered`; evidência deve manter `verifierRequired: true` e excluir resposta/texto livre. Qualquer falsa maestria ou gravação canônica pelo browser é Sev-1.

### C3 — Persistência local e recuperação (Sev-2)

Cobrir reload, fechar/reabrir, offline após primeira visita, storage indisponível/corrompido/cheio, falha de gravação e retry. Confirmar retomada local e aviso explícito de que não há sincronização entre dispositivos; nunca perder progresso silenciosamente.

### C4 — Acessibilidade e movimento (Sev-2)

Teclado completo, ordem/foco visível, nomes acessíveis, headings/landmarks, zoom 200%, contraste, anúncios de erro/resultado e `prefers-reduced-motion`. Executar axe como apoio, mais inspeção manual; zero violações críticas/sérias no caminho de release.

### C5 — Browser e mobile (Sev-2)

Desktop Chromium/Firefox/WebKit atuais; mobile 360x800 e 390x844 em Chromium/WebKit. Verificar ausência de overflow, alvos, teclado virtual, orientação, iframes/handoffs e retorno. Safari/iOS real permanece limitação se não houver dispositivo.

### C6 — Analytics e privacidade (Sev-1)

Capturar rede/eventos para landing, seleção de trilha, início/conclusão e retorno. Validar exatamente uma emissão, consentimento/política aplicável, ausência de resposta, texto livre e estado `mastered`; falha de analytics não pode bloquear aprendizagem.

### C7 — Erros, deploy e rollback (Sev-1)

Induzir engine indisponível, asset/API 404, offline e cache antigo. Verificar mensagem acionável, retry/saída segura e nenhum estado falso. Vincular URL, SHA, timestamp e smoke; executar rollback documentado e repetir smoke no artefato restaurado.

### C8 — Operação e comunicação (Sev-2)

Confirmar known limitations, feedback/suporte, dono da release e escopo sem prometer catálogo não integrado. Texto deve diferenciar local completion de independent mastery.

## Gate de release executável

1. Checkout limpo do SHA candidato; registrar versões e URL.
2. `python3 -m learner.substrate --check` deve passar sem diff.
3. Host: install lockfile, lint, test, build e smoke; zero falha.
4. Literacy: validação/generation, lint, test, build e E2E; zero falha.
5. CI do SHA deve conter e exigir os gates acima e shared Python core.
6. Executar C1–C8; anexar traces/screenshots/console/network sem dados sensíveis.
7. Produção: smoke C1 nos dois caminhos, persistência/retorno, analytics e recuperação.
8. Zero Sev-1/Sev-2 aberto; exceção inferior somente com aceite CEO no release record.

## Casos mínimos de smoke do RC

- `SMK-01`: URL raiz abre a entrada canônica, sem setup técnico.
- `SMK-02`: não técnico seleciona IA na Prática, conclui primeira lição, recarrega e retoma.
- `SMK-03`: desenvolvedor seleciona a primeira missão verificada, conclui e retorna ao mapa.
- `SMK-04`: resposta errada gera feedback/dica e evidência sem persistir resposta.
- `SMK-05`: conclusão local não altera `mastered` nem fonte canônica.
- `SMK-06`: engine indisponível exibe fallback e retorno, sem tela vazia.
- `SMK-07`: viewport 360x800 e teclado completam escolha e primeira atividade.
- `SMK-08`: reduced motion elimina animação não essencial; foco permanece visível.
- `SMK-09`: eventos de ativação/retorno aparecem uma vez e não contêm respostas/texto livre.
- `SMK-10`: release record corresponde a URL/SHA; rollback documentado é praticável.

## Limitações explícitas

- Sem URL/artefato de staging ou produção e sem SHA candidato imutável.
- AID-28 (classificação), AID-30 (jornada) e AID-31 (contrato visual) ainda em andamento; casos deverão ser parametrizados pelos artefatos finais.
- Browser E2E não executado neste host por dependências de sistema; sem evidência de Firefox/WebKit, mobile real, axe, analytics, deploy ou rollback.
- Auditoria de dependências não triada: `npm ci` reportou vulnerabilidades no grafo instalado; exige avaliação separada antes do go/no-go.
