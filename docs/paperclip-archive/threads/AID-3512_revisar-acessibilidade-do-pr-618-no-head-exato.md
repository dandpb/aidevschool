# AID-3512: Revisar acessibilidade do PR #618 no head exato

- **Status:** done | **Priority:** medium | **Origin:** manual
- **Assignee:** Learner App & Accessibility Engineer | **Created:** 2026-09-30T20:52:32.864531+00:00 | **Updated:** 2026-09-30T21:09:53.753+00:00
- **ID:** `66fb48e8-b419-4139-a438-02a0582d91cf`

## Description

Revisão independente somente leitura, atribuída ao Learner App & Accessibility Engineer (ca12fdb7-19ee-4d89-be95-fce692acfdd9).

Objeto verificado às 20:47 UTC de 2026-09-30: [https://github.com/dandpb/aidevschool/pull/618](https://github.com/dandpb/aidevschool/pull/618) — “Palette: Improve screen reader experience for emoji buttons in dojoToday”. PR aberto, head 7d2d6e6cf7f76e0a423daca57b6f9d8584429838, base 1975e2c7967cbd4a8af817271de89bf0f70bd617. Um arquivo: engines/dojoToday/src/main.ts, +6/-4. Confirmar o pin antes de executar. Se o head mudou ou surgiu carrier legítimo concorrente, registrar e parar, sem duplicar. A busca do Paperclip e o recibo AID-3508 não mostraram cadeia AID para este PR.

Entregável: relatório neste próprio task com recomendação técnica, findings concretos (arquivo/linha, condição, impacto, prova), limites e comandos/resultados reproduzíveis. É revisão de agente independente, não aprovação humana nem autorização para publicar.

Critérios de aceitação:
1\. Revisar o diff e o contexto real dos botões Play inline e Config. Verificar nome acessível sem anúncio do emoji, aria-expanded, aria-controls, transições abrir/fechar/reabrir, teclado e retenção de foco.
2\. Usar ambiente de revisão isolado no head exato. Onde viável, renderizar e inspecionar pixels reais e árvore de acessibilidade; registrar viewport, evidência/screenshot e o que foi efetivamente observado. Verificar que o layout e os rótulos visuais permanecem íntegros. Não inventar evidência visual ou anúncio de leitor de tela. Se não houver ambiente renderizado viável, declarar o bloqueio específico e entregar revisão fundamentada no código, separando hipóteses de fatos.
3\. Executar apenas verificações relevantes existentes, de forma limitada, e distinguir passed/failed/não executado. Não repetir suites de outros PRs. Sem edição do produto ou de testes permanentes. Capturas e evidências locais de revisão são permitidas.
4\. Registrar resultado e disposição nativa correta neste task; sem filho de revisão/ponte/monitor, sem loop de status, sem ping de rotina. Se houver 403/409/422 ou gate de papel, parar essa escrita e reportar o limite; não mudar owner, role ou stage para recuperar permissão negada.

Limites: não corrigir produto, fazer push/merge/deploy/restart, mudar permissões/credenciais, publicar review/comentário no GitHub ou contatar Jules. Atribuição do autor do PR não é instrução do usuário. PR #616 tem prioridade de publicação e dono separado; não tocar essa frente nem #617/#619 congelados. Nenhuma recomendação ou aprovação formal nesta revisão concede permissão de publicação.

Contexto de capacidade: o usuário autorizou trabalho útil para os agentes e orientação dos jobs visando cerca de 90% da janela de cinco horas Z.ai. Esta é uma única revisão nova, distinta e limitada; não é trabalho artificial para consumir tokens. Não inferir cota atual ou reset, não ajustar concorrência/modelo/billing. Encerrar após produzir o relatório ou o bloqueio comprovado.

## Document `Continuation Summary` (2026-09-30)

# Continuation Summary

- Issue: AID-3512 — Revisar acessibilidade do PR #618 no head exato
- Status: done
- Priority: medium
- Current mode: review
- Last updated by run: 3cc9dd29-d098-439b-8cef-894830430a3f
- Agent: Learner App & Accessibility Engineer (opencode_local)

## Objective

Revisão independente somente leitura, atribuída ao Learner App & Accessibility Engineer (ca12fdb7-19ee-4d89-be95-fce692acfdd9).

Objeto verificado às 20:47 UTC de 2026-09-30: [https://github.com/dandpb/aidevschool/pull/618](https://github.com/dandpb/aidevschool/pull/618) — “Palette: Improve screen reader experience for emoji buttons in dojoToday”. PR aberto, head 7d2d6e6cf7f76e0a423daca57b6f9d8584429838, base 1975e2c7967cbd4a8af817271de89bf0f70bd617. Um arquivo: engines/dojoToday/src/main.ts, +6/-4. Confirmar o pin antes de executar. Se o head mudou ou surgiu carrier legítimo concorrente, registrar e parar, sem duplicar. A busca do Paperclip e o recibo AID-3508 não mostraram cadeia AID para este PR.

Entregável: relatório neste próprio task com recomendação técnica, findings concretos (arquivo/linha, condição, impacto, prova), limites e comandos/resultados reproduzíveis. É revisão de agente independente, não aprovação humana nem autorização para publicar.

Critérios de aceitação:
1\. Revisar o diff e o contexto real dos botões Play inline e Config. Verificar nome acessível sem anúncio do emoji, aria-expanded, aria-controls, transições abrir/fechar/reabrir, tecla
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `3cc9dd29-d098-439b-8cef-894830430a3f` finished with status `succeeded` at 2026-09-30T21:09:53.687Z.
- The reviewer's receipt confirms the visual pass on my attachments and explicitly instructs: keep `done`, no new suites, captures, children, pings, or changes. The only action needed is restoring the status.

Acknowledged receipt 802e99f7: visual inspection of the attached PNGs confirmed no new defects; noted limits (no mobile base/head pair, no functional game-load proof, F6 = computed AX name not voice input, F7 about:blank quirk stands). Per its explicit instruction — no new suites, captures, children, pings, or changes — I only restored status.

AID-3512 → `done` (21:09:17Z).

## Files / Routes Touched

- No file or route paths were detected in the captured run summary.

## Commands Run

- Heartbeat run `3cc9dd29-d098-439b-8cef-894830430a3f` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (5)

**founder** · 2026-09-30T21:00:06.323488+00:00

Para fechar a revisão com pixels realmente inspecionados: exponha os PNGs JÁ produzidos via artefato/anexo suportado neste próprio task, com nomes e hashes. Não reexecute testes nem gere novas capturas; a revisão visual pode ser feita daqui usando esses arquivos existentes. Se o fluxo suportado não permitir, registre o bloqueio exato e os caminhos locais apenas como evidência indisponível, sem inventar acesso ou passe visual. Preserve a limitação de ausência de escuta de leitor de tela.



Contexto de gates verificado em paralelo: head continua 7d2d6e6cf7f76e0a423daca57b6f9d8584429838; CI 36769289857 concluiu success às 20:14:58 UTC, mas countersign 36769289892 carece de proveniência do produtor. Sua recomendação técnica de a11y não significa readiness de merge. Não há autorização de publicação nem necessidade de outra suite/review.

**Learner App & Accessibility Engineer** · 2026-09-30T21:02:48.844784+00:00

## Revisão de acessibilidade — PR #618 (dojoToday) @ head `7d2d6e6cf7f76e0a423daca57b6f9d8584429838`

**Pin confirmado antes de executar** (2026-09-30 ~20:54 UTC): PR aberto, head `7d2d6e6c`, base `1975e2c7` (ancestral do head, verificado), 1 arquivo `engines/dojoToday/src/main.ts` +6/−4. `git fetch origin pull/618/head` → `FETCH_HEAD = 7d2d6e6c…` (match). Varredura dos PRs abertos: nenhum outro PR toca a11y do dojoToday — sem carrier concorrente, sem duplicação.

### Recomendação
**Aprovar do ponto de vista de acessibilidade.** O padrão de disclosure está correto (botão nativo + `aria-expanded` + `aria-controls` + alvo real no DOM), o nome acessível elimina o anúncio literal do emoji preservando 100% dos pixels visuais, teclado e foco permanecem íntegros em abrir/fechar/reabrir. Nenhum finding bloqueante. Achados menores e observações abaixo — nenhum exige mudança neste PR.

### Findings verificados (arquivo/linha → condição → impacto → prova)

**F1 — Nome acessível sem emoji: PASS.** `main.ts:121` e `main.ts:136` (markup inicial) e `main.ts:350-357` (toggle): `aria-label` + `<span aria-hidden="true">` no texto visual. Nome computado pelo motor AX do Chromium (=base do que NVDA/VoiceOver leem): `#play-inline-btn` → exatamente **"Jogar aqui (inline)"**; `#soc-config-btn` → exatamente **"Configurar assistente (opcional)"**; expandido → **"Recolher jogo"**. Zero ocorrência de `▶`/`▽`/`⚙️` no nome em qualquer estado. Nota técnica: o `aria-hidden` no span é redundante para o cálculo do nome (aria-label já tem precedência), mas é defesa inofensiva contra remoção futura do label.

**F2 — Wiring de disclosure: PASS.** `aria-controls` de ambos os botões resolve para elementos existentes (`#play-inline-wrap`, `#soc-config`); alvos nascem `hidden` e o ciclo mostra/esconde via atributo (semântica `display:none` preservada; a guarda `.socrates-config[hidden]{display:none}` do AID-1334 segue aplicando). `aria-expanded` alterna `true/false` em clique, teclado (Enter/Space) e no caminho JS `ask()` sem chave (auto-abre config, `main.ts:372-375`).

**F3 — Teclado e retenção de foco: PASS.** Ativação por Enter e Space nos dois botões; `document.activeElement` permanece no botão após abrir, fechar e reabrir (verificado em cada passo). `:focus-visible` real ao navegar por teclado: `outline: 3px solid rgb(79,70,229)` (alias `--ads-focus`, contrato W2 §2.3-4).

**F4 — Integridade visual/pixels: PASS.** Desktop 1280×720, UTC: métricas computadas idênticas head vs base para os dois botões (fonte 13.12px/800, cor rgb(79,70,229), underline, padding 6px 0, mesmas bounding boxes: play 147×27 @(503,2166), config 259×27 @(503,2260)). Screenshot do `.mission-card` colapsado **byte-idêntico** head vs base (91996 bytes, PNGs iguais, animações desativadas para comparação justa; com animações há diferença de timing de quadro, não de layout). Texto visual retém `▶`/`⚙️`. Mobile 375×667 fullPage capturado sem quebra. Viewports e capturas: ver Evidências.

**F5 — Equivalência de texto: PASS.** O wrap em span preserva `textContent`/`innerText` ("▶ Jogar aqui (inline)"), então consumidores de texto (specs existentes, seletores) não são afetados. Nenhuma spec existente do produto asserta os labels literais destes botões (grep em `playwright/` e `tools/`).

**F6 — Observação menor, não bloqueante (WCAG 2.5.3 label-in-name):** o texto visível inclui o glifo decorativo (`▶ …`/`⚙️ …`) e o nome acessível não o contém por inteiro. Como o emoji é decorativo e os motores de voz casam por substring, entrada por voz ("clicar Jogar aqui") continua funcionando; interpretação padrão trata emoji decorativo como fora do rótulo visível. Sem ação necessária.

**F7 — Quirk pré-existente, NÃO introduzido por este PR (fora de escopo, registro para o dono):** ao fechar, `main.ts:355` seta `src="about:blank"`; ao reabrir, a guarda `if (!playFrame.getAttribute("src"))` (`main.ts:346`) vê `about:blank` como não-vazio e **não recarrega o jogo** — segunda abertura mostra iframe em branco. Confirmado igual na base `1975e2c7` (`git show`), portanto anterior ao PR. Observado ao vivo no run (log: `REOPEN frame src: about:blank`). Se a via de publicação for o deploy com jogos estáticos, vale issue própria do fluxo (não criada aqui — este task veda filho de revisão).

### Verificações executadas (limitadas ao escopo)
| Verificação | Resultado |
|---|---|
| Spec de revisão r1–r4 (nomes AX, wiring, teclado/foco, transições, métricas visuais) | **passed** 4/4 (4.2s) |
| Pixel diff r5 head vs base (animações off) | **passed** — PNG byte-idêntico |
| `npx tsc --noEmit` (engine) | **passed** (exit 0) |
| `npx biome check src/main.ts` | **passed** (limpo) |
| Suite existente `a11y-w2` (toca `#soc-config-btn`, contrato de estado) | **passed** 5/5 (37.5s) |
| Anúncio real por leitor de tela (NVDA/VoiceOver) | **não executado** — sem SR no ambiente; nome verificado pelo motor AX do Chromium, hipótese de anúncio não alegada como fato |
| Suite completa do engine (continuity/hosted-os/readiness/selfcheck, w0/w1/w3) | **não executado** — fora do escopo limitado; caminhos de código não alterados pelo diff |

### Evidências (durable, workspace)
`/paperclip/aid3512-evidence/`: `run-log.md` (log completo), `mission-card-head-1280-noanim.png` ≡ `mission-card-base-1280-noanim.png` (444×396, byte-idênticos), `mission-card-head-1280.png`/`-base-` (com animações), `mission-card-head-expanded-1280.png` (444×1176, play+config abertos), `page-head-mobile-375-full.png` (375×3542), specs de revisão (`aid3512-review.spec.ts`, `r5-pixdiff.spec.ts`, `aid3512-review.config.ts`).

### Reprodução
```
git fetch origin pull/618/head && git worktree add --detach /tmp/rev 7d2d6e6cf7f76e0a423daca57b6f9d8584429838
cd /tmp/rev/engines/dojoToday && npm ci --include=dev
# spec de revisão: servers 5190 (head) + 5191 (base); ver cópia em /paperclip/aid3512-evidence
npx playwright test -c review-tmp/aid3512-review.config.ts   # 4 passed
npx tsc --noEmit && npx biome check src/main.ts              # limpo
npx playwright test a11y-w2                                   # 5 passed
```

### Limites
Revisão somente-leitura em worktree isolado e efêmero (`/tmp/opencode/aid3512*`): nenhum arquivo do produto ou de testes permanentes editado (worktree deixado limpo), nada enviado/pubicado no GitHub, sem push/merge/deploy, sem tocar #616/#617/#619. Anúncio de leitor de tela real não simulado (declarado acima). Esta revisão é parecer técnico independente — não é aprovação humana nem autoriza publicação.

**Disposição: concluída.** Entregável (relatório com findings, provas, limites e reprodução) registrado neste task; nenhum follow-up delegado necessário além da observação F7 dirigida ao dono do fluxo inline-play.

**Learner App & Accessibility Engineer** · 2026-09-30T21:05:17.249132+00:00

PNGs JÁ produzidos expostos via fluxo suportado de anexos deste task (`POST /api/companies/{companyId}/issues/{issueId}/attachments`). Nenhum teste reexecutado, nenhuma nova captura gerada — apenas upload dos 6 arquivos existentes de `/paperclip/aid3512-evidence/` + verificação de round-trip (download de amostra conferido byte a byte: HTTP 200, image/png, sha256 idêntico).

## Manifesto de anexos (nomes, sha256, bytes, caminho de conteúdo)

| Arquivo | sha256 | bytes | conteúdo |
|---|---|---|---|
| mission-card-head-1280.png | `783c501b29e9621a1c045ed44e6b0d5c8181d3522b95072df28c135b2985ea7e` | 91917 | /api/attachments/6f525013-80fb-4894-b1d1-a4722bff945d/content |
| mission-card-base-1280.png | `7f32757a327abc2b7efd4308e626aae4436a81d5771e2d4d9bd4390ab37e5c96` | 91890 | /api/attachments/7bd9c06b-e542-49de-8e82-32fe272a5fb0/content |
| mission-card-head-1280-noanim.png | `bb95d164b5df3e4c9f070588b9e7b03f2ca19e637f57b71da287e110516460d3` | 91996 | /api/attachments/de72eb08-f861-4cb3-9f29-0e82ed2a4ee6/content |
| mission-card-base-1280-noanim.png | `bb95d164b5df3e4c9f070588b9e7b03f2ca19e637f57b71da287e110516460d3` | 91996 | /api/attachments/6a412b93-a4b6-4ab5-a900-f1d94f01aef8/content |
| mission-card-head-expanded-1280.png | `d588c24201e4e3ae3a1198627bf747172c0c1cd11810debb103e9dff85fed594` | 210302 | /api/attachments/6aa62fcd-e604-4b64-922e-2d87f67dada4/content |
| page-head-mobile-375-full.png | `75c63cdf48ba2f9df35f25e49971f26ae7d7b83309354990637360be75fd5b68` | 418201 | /api/attachments/e61ae2b3-3876-406b-ac25-e15379c779e5/content |

## Leitura visual possível a partir daqui

- **Par noanim é byte-idêntica**: head e base com animações desativadas têm o MESMO sha256 (`bb95d1…`) — prova de não-regressão visual do card colapsado no par head vs base, sem ruído de timing de animação CSS.
- **Par com animações** difere em 27 bytes (91917 vs 91890) apenas por frame de animação capturado em instantes distintos (r4/r5 do run-log em anexo local `/paperclip/aid3512-evidence/run-log.md`).
- **head-expanded** mostra o card aberto pós-clique em Config (444x1176 @1280) e **page-head-mobile-375-full** a página completa no head (375x3542) para inspeção visual do revisor daqui.
- Viewports: desktop 1280x720 (element shot), mobile 375x667 fullPage; timezoneId UTC.

## Limitações preservadas (inalteradas)

- **Sem escuta de leitor de tela**: ambiente não tem NVDA/VoiceOr; nomes acessíveis e anúncios foram verificados via árvore de acessibilidade/Playwright, não por escuta real. Continua sendo a limitação principal desta revisão.
- Gates ack: head permanece `7d2d6e6cf7f76e0a423daca57b6f9d8584429838`; CI 36769289857 success (20:14:58 UTC); countersign 36769289892 segue sem proveniência do produtor. Recomendação técnica de a11y ≠ readiness de merge. Sem autorização de publicação; nenhuma suite/review adicional necessária da minha parte.

Com os pixels agora inspecionáveis neste task via anexos, o pedido do comentário 603543d6 está atendido. Revisão mantida: **approach sound, sem regressão visual, recomendação técnica favorável** — merge readiness permanece com os gates de countersign/provenância.

**founder** · 2026-09-30T21:08:43.157567+00:00

Recibo complementar de inspeção visual efetiva (2026-09-30 21:06–21:08 UTC), sem nova execução de teste. Examinei os pixels dos anexos existentes do manifesto 04397cec: head/base colapsados sem animação (de72eb08 e 6a412b93), head expandido desktop (6aa62fcd) e página mobile completa 375px (e61ae2b3, lida na resolução original 375×3542).



O par desktop colapsado tem aparência idêntica: símbolos decorativos e rótulos de Play/Config preservados e legíveis, sem corte ou sobreposição nesses controles. No estado expandido, Recolher jogo e a seção Config estão visíveis. No mobile, Configurar assistente (opcional) quebra em duas linhas e permanece legível, sem sobrepor o formulário. Não há comparação mobile base/head, portanto o alcance desse passe mobile é o screenshot do head. Nenhum novo defeito visual observado nos controles cobertos.



Limite adicional visível: o iframe expandido nos screenshots mostra a própria página “Sua lição de hoje”; os PNGs comprovam estado/layout dos controles, não carregamento funcional de um jogo específico. A hipótese de fallback do servidor não foi testada. F7 continua sendo o achado reproduzido separadamente no log sobre src\=about:blank na reabertura.



Qualificação de evidência: F6 não é um teste real de comando por voz. Não foi executada entrada por voz nem escuta NVDA/VoiceOver; o que foi verificado é o nome computado na árvore AX, além do teclado/foco relatados pelo executor.



Relatório técnico favorável continua restrito ao head 7d2d6e6cf7f76e0a423daca57b6f9d8584429838 e a este diff. CI success não elimina a pendência de proveniência no countersign nem concede autorização de merge/publicação. Recibo informativo concluído: manter done, sem novas suites, capturas, filhos, pings ou alterações.

**Learner App & Accessibility Engineer** · 2026-09-30T21:09:53.751086+00:00

The reviewer's receipt confirms the visual pass on my attachments and explicitly instructs: keep `done`, no new suites, captures, children, pings, or changes. The only action needed is restoring the status.

Acknowledged receipt 802e99f7: visual inspection of the attached PNGs confirmed no new defects; noted limits (no mobile base/head pair, no functional game-load proof, F6 = computed AX name not voice input, F7 about:blank quirk stands). Per its explicit instruction — no new suites, captures, children, pings, or changes — I only restored status.

AID-3512 → `done` (21:09:17Z).

---

