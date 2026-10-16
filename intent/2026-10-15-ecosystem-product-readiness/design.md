# Prontidão dos 14 engines para o beta/piloto

> Próxima etapa: **sdlc-plan**, usando este arquivo explicitamente como fonte; a skill está instalada como plugin global.
> As decisões abaixo registram a proposta concreta para planejamento. Status: **draft técnico**. O recorte foi confirmado; não há plano de implementação aceito nesta discovery.

## Situation

- Project: in active construction — beta/piloto, conforme Daniel em 2026-10-15.
- Decision: objetivo de discovery committed by Daniel, 2026-10-15, no pedido e nas quatro respostas: todos os engines, uso declarado, main atual, beta/piloto. A confirmação cobre esse objetivo e recorte; não aprova código, publicação, merge ou cada escolha técnica deste documento.
- Baseline: `main@f98e7fa32deac836addc348e185e8788fd197627`, também confirmado na API remota durante a conclusão. Branch de trabalho: `codex/product-readiness-discovery-20261015`.
- In flight: [PR #657](https://github.com/dandpb/aidevschool/pull/657), head `817b9872b2b966314794540472860a6287c4737c`, propõe exigir recibo independente para jogos; [PR #656](https://github.com/dandpb/aidevschool/pull/656), head `b29631ee366954803d59691b646c10f0779082ce`, propõe verificação l02 v4 por atividade. Ambos estão abertos e fora da baseline.
- At stake: declarar maestria sem verificação ou anunciar uma jornada cuja evidência não corresponde ao código oferecido. Um relatório é reversível; promover estado canônico incorreto ou reescrever histórico exige cautela maior. Não foram medidos usuários afetados, perda financeira ou tráfego de produção.

## Problem

O fundador quer oferecer o ecossistema em beta e precisa distinguir os bloqueios reais das partes ainda não verificadas. Hoje, um registro sintético de jogo sem recibo independente pode obter uma decisão que permite `mastered`; o verificador de Literacy recusa a versão atual da lição l02; seis claims publicadas perderam validade pelo fingerprint da fonte. Isso impede usar a aparência de conclusão ou um teste de produtor verde como resposta à pergunta “posso oferecer esta experiência?”.

Há também um problema de construção: o inventário formal representa seis dos quatorze engines. Os demais têm funções diferentes — tutor de chat, núcleo de tutoria, orquestrador, dashboard, entrada operacional ou pacote local — e não foram requalificados nesta rodada. Sem completar essa prova, uma afirmação de prontidão de todos seria maior que a evidência disponível. O custo observável é a qualificação pendente de oito engines e a renovação de seis claims, além dos dois defeitos demonstrados; não é uma estimativa de oito produtos quebrados.

## Evidence

| Evidência | Resultado na baseline | O que estabelece |
|---|---|---|
| [Probe do gate](evidence/mastery-result.json), [script](evidence/mastery_without_verifier.py) | `passed=true`, `gate_outcome=pass_first_try`, transição pura para `mastered`, sem recibo independente | Falha de integridade local. Não houve jogo real, escrita do estado temporário ou alteração do aprendiz canônico. |
| [Probe de Literacy](evidence/literacy-result.json), [script](evidence/literacy_version.mjs) | Mesmo registro a1: v3 `PASS`, v4 `FAIL` por identidade | Incompatibilidade entre o contrato atual de conteúdo/produção e o verificador fonte. O deployment remoto não foi sondado. |
| [Check atual](evidence/readiness-check.json) | `check --require-current`, exit 1, seis `STALE-WINDOW` | Claims não correntes por fingerprint, mesmo com prazo de revalidação registrado em outubro. |
| [CI main 38792377959](https://github.com/dandpb/aidevschool/actions/runs/38792377959), [excerto](evidence/main-ci-stale.txt) | A lane de claims falhou pelos mesmos seis casos; jobs produtores passaram | A divergência é reproduzida pelo gate de main. CI de produtor não renova claim. |
| [Inventário formal](../../docs/product-readiness/inventory.yaml), árvore `engines/` | 9 casos de uso, 6 owners, 14 engines excluindo `shared` | Oito engines fora desse inventário; não comprova defeito neles. |
| [Snapshots e limites da coleta](evidence/manifest.json) | Fonte, hashes, comandos e PRs pinados | Permite repetir o diagnóstico sem confundir fonte, patch proposto e runtime remoto. |

Os seis casos stale são `dojotoday-daily-guidance`, `literacy-standalone-corridor-mod01-03`, `literacy-standalone-first-lesson`, `os-literacy-guided-mission`, `os-returning-learner` e `os-voxel-guided-missions`.

Ainda não se conhece a taxa de sucesso de uma execução atual de todas as jornadas dos quatorze engines. Para medi-la, são necessários os runtimes/harnesses declarados, casos de recuperação e observação independente com fonte identificada. Nenhuma contagem de arquivos, testes unitários ou PRs substitui essa coleta.

## Journey

A sequência é entrada funcional → fluxo principal → resultado fiel → recuperação/retomada apropriada → próxima ação e limites claros. Daniel escolheu avaliar cada engine no uso declarado. As sequências e estados abaixo vêm dos contratos atuais e precisam ser congelados como casos antes da execução; não são novos requisitos de interface.

| Engine | Uso e sequência declarados | Situação de prova nesta discovery |
|---|---|---|
| `aiDevschoolMvp` | Instalar SKILL no chat → tentativa no percurso de 24 conceitos → gates G1–G4 → ledger/revisão próprios | Fora do inventário formal; execução real no harness não requalificada. |
| `codexDojo` | Abrir dashboard local → ler projeções → identificar próxima ação | Fora do inventário formal; leitura sem alterar o aprendiz precisa de observação. |
| `codexdojo-os-prototype` | Onboarding → trilha → missão hospedada → resultado/retorno | 3 casos stale; retomada e indisponibilidade do host entram na prova. |
| `dojoToday` | Ler revisões/unidade ativa → seguir próxima ação | 1 caso stale; a projeção é somente leitura. |
| `literacyDojo` | Microlição → tentativa/feedback/retry → evidência/verificação quando exigida → retomada local | 2 casos stale; l02 v4 recusada pelo verificador fonte. |
| `miniMaxEvolutionEngine` | Status → ciclo supervisionado de cinco fases → produtor e verificador distintos → artefatos | Fora do inventário formal. Autonomia declarada é limitada a `spec → spec-done`; não prometer cinco fases autônomas. |
| `miniTown` | Abrir simulação → explorar → sair | Caso formal experimental; não promete persistência, lição ou maestria. |
| `minimaxDojo` | Bootstrap do protocolo → tentativa → tutoria → gate | Fora do inventário formal; suíte do núcleo não comprova uso real na plataforma de agentes declarada. |
| `openclaw` | Preview → fases explícitas por checklist de artefatos → inspeção de pipeline/gate | Fora do inventário formal. Contrato é simulate-grade, sem chamadas de IA nem prova empírica de maestria. |
| `pixelDojo` | Experiência/jogo declarado → encontro → evidência bruta → entrega ao verificador | 1 caso formal para PixelQuest. Qualificar as experiências atualmente oferecidas, sem inferir cobertura integral por um único encontro. |
| `school-entry` | Operador configura/libera → checagem de entrada → recomendação → lançamento | Fora do inventário formal; catálogo inicialmente desabilitado é esperado. Checker de entrada não comprova a jornada completa do destino. |
| `sdlc-quest` | Abrir pacote local → `npm start` → missão → salvar/retomar conforme contrato | Fora do inventário formal; gate local não comprova a jornada de quem recebeu o pacote. |
| `voxelDojo` | Jogo suportado → interação/loop → evidência → verificação independente | 1 caso formal; expandir a prova a todas as variantes/jogos declarados no catálogo oferecido. |
| `zai-duolingo-like` | Setup local → perfil/lição → progresso e revisão próprios; chat quando configurado | Fora do inventário formal; usar banco isolado de E2E. Não converter progresso do jogo em maestria canônica. |

Estados a cobrir em cada promessa aplicável:

- Primeira entrada/vazio: instalação e pré-requisitos documentados; o usuário entende como começar. Estado desabilitado do operador não aparece como engine liberado.
- Tentativa incorreta/retry: feedback e repetição preservam o histórico permitido; resultado local mantém sua semântica real.
- Retorno parcial ou armazenamento indisponível: recuperar o que o contrato persiste, ou explicar o reinício quando a ferramenta não persiste. Não inventar continuidade para uma superfície somente leitura ou exploratória.
- Verificador indisponível, recibo ausente/rejeitado: manter evidência e caminho de retry/saída; não promover maestria. A correção do gate responde ao caso sem recibo; os contratos de cada host respondem à interface.
- Evidência stale: retirar a confiança na claim corrente e requalificar; o gate existente já recusa a claim em main.
- Acesso de operador não autorizado: a fronteira existente de `school-entry` precisa ser demonstrada. Não abrir release global para contornar a prova.
- Provider de IA ausente/timeout: documentar pré-requisito e comportamento real. Um fallback determinístico comprova apenas o caminho de fallback.
- Abandono/interrupção de runner: retomada ou encerramento explícito dentro do contrato atual, preservando leases, artefatos e gates. No MME, não redisparar automaticamente um trabalho interrompido.

Um estado pode ser inaplicável somente com justificativa ligada à fonte da promessa. A qualificação não reduz a promessa para esconder uma falha encontrada.

## Verdict

already committed — see Situation. Confirmed by Daniel, 2026-10-15.

A confirmação registra o objetivo e recorte da discovery. A recomendação técnica é concluir os dois reparos já em andamento, qualificar os quatorze engines e renovar as claims afetadas, antes de afirmar prontidão do conjunto. Esta proposta ainda precisa se tornar um plano aceito antes de implementação.

Cheaper paths considered: oferecer apenas as jornadas já inventariadas reduziria a coleta, mas não atende ao escopo de todos os engines escolhido por Daniel; aceitar apenas builds/testes de produtor não responde aos dois contraexemplos nem à política de claims atual. Um inventário documentado sem execução é um diagnóstico útil, mas não encerra a prontidão.

## Success

- Worked if: antes de oferecer o conjunto no piloto, 14/14 engines têm qualificação independente `pass` no uso declarado e em todas as variantes oferecidas; zero bloqueio crítico/alto aberto nesse escopo; claims publicadas válidas para a fonte/ambiente oferecidos. Um único `blocked` ou `unverified` impede afirmar prontidão de todos.
- Early signal: os dois contraexemplos passam a produzir a decisão correta, com controle positivo e histórico preservado; cada engine tem contrato e pré-requisitos identificados. Se só houver testes de produtor ou provas de outra fonte, o trabalho ainda não convergiu.
- Review: após cada bloco de reparo e antes da oferta do piloto, verificador independente examina fonte, casos e provas; Daniel avalia o resultado observado no piloto. A discovery não substitui esse aceite.
- Medida: contagem de engines/variantes comprovados, bloqueios abertos e claims correntes. Não foi definido prazo de calendário nem observado uso regular; não há base para prometer taxa de adoção, SLA público ou dias de engenharia.

## Boundary

In: os quatorze engines da main, entrada/fluxo principal/recuperação/limites de seu uso atual; dependências compartilhadas realmente atravessadas; integridade de evidência/maestria; execução em ambientes isolados; manutenção das claims existentes após os reparos.

Out: transformar ferramentas locais em SaaS; unificar identidade/progresso de Zai, MVP e aprendiz canônico; refatoração de domínios sem falha observável; ampliar autonomia do MME; backend ou plataforma nova de readiness; legal/comercial GA; tratar PRs/RCs como produto lançado. O defeito mobile de [PR #662](https://github.com/dandpb/aidevschool/pull/662) pertence ao RC de prática guiada: `src/styles/practice.css` não existe nesta main. Reavaliá-lo quando esse RC entrar no candidato oferecido, sem contá-lo como bug reproduzido da baseline.

## Prior art

- `docs/product-readiness/policy.yaml` e assessments existentes: reutilizar tiers, severidades e autoridade de grant, em vez de criar outro emissor de `customer-ready`.
- `docs/product-readiness/readiness-refresh-plan.md` e ferramentas de claims: reutilizar o vínculo de fonte e o fluxo de revalidação; um novo relatório de ecossistema não substitui assessment independente.
- Casos de jornada existentes em LiteracyDojo e CodexDojo OS: reutilizar cenários de retry, retorno e verificação indisponível; guardar capturas/trace no engine ou CI e reter referências/digests na prova durável. Resultado de produtor sem observação adequada não vira prova semântica.

## Shape

Usar a infraestrutura atual para os reparos e grants, acrescentando uma qualificação datada do ecossistema que respeita os papéis dos engines. O custo delimitado é revisar/concluir dois PRs existentes, produzir quatorze pacotes de qualificação com os casos/variantes de cada promessa e renovar pelo menos as seis claims hoje inválidas. A quantidade de casos depende dos catálogos declarados; não se reduz a quatorze happy paths.

### Adds

- `docs/product-readiness/assessments/2026-10-15-ecosystem-beta-readiness.md`: relatório humano com matriz dos quatorze engines, promessas, resultado, bloqueios, limites e referências. O nome identifica a iniciativa; datas reais de observação ficam em cada prova. Este Markdown é informativo e não concede `ReadinessTier`.
- `docs/product-readiness/evidence/observations/2026-10-15-ecosystem-beta-readiness/engine-qualification.json`: pacote informativo com `schemaVersion: 1`, `scope: "declared-use-beta"` e `engines`. Cada item tem `engineId`, `declaredUse`, `entry`, `runtime`, `sourceCommit`, `sourceFingerprint`, `observedAt`, `producerContext`, `verifierContext`, `cases`, `evidenceRefs`, `limitations`, `linkedUseCases` e `status`.
- `cases` registra os estados/variantes da promessa e os resultados observados. `status` do engine é `pass`, `blocked` ou `unverified`: falha comprovada obrigatória produz `blocked`; prova obrigatória ausente produz `unverified`; `pass` exige todos os casos obrigatórios comprovados. Inaplicabilidade exige justificativa com fonte. `evidenceRefs` inclui caminho/URL retido e digest do artefato; identidades de contexto distintas comprovam separação de produtor/verificador.
- Scripts de observação reexecutáveis necessários às lacunas de runtime ficam ao lado das observações. Capturas, vídeos e traces gerados permanecem no `test-results/` do engine ou em artefatos CI retidos; não adicionar output de build/dependências ao controle de versão.

Esses artefatos são trabalho futuro da entrega proposta. A evidência desta discovery está apenas em `intent/2026-10-15-ecosystem-product-readiness/evidence/` e não contém quatorze qualificações aprovadas.

### Changes

- `learner/gate/canonical_gate.py` e `learner/gate/evidence_io.py`: concluir a mudança proposta no #657 com revisão do head integrado. Exigir recibo independente válido e vinculado para novas promoções de jogo, preservar evidência multirregistro legítima e histórico. O PR também toca testes e baseline de complexidade; esta discovery não aprova essas alterações nem autoriza overrides de hooks.
- `learner/gate/netlify-functions/literacy-verify.mjs`: concluir o #656 com contrato l02 v4 por atividade a1/a2/a3 e recomputação independente de resposta; incluir testes de identidade/adulteração e documentação já tocados pelo PR. Provar o endpoint publicado se o piloto depender dele.
- `docs/product-readiness/assessments/*.yaml`, `evidence/results.ndjson` e projeções: acrescentar novos fatos/decisões pelo fluxo existente depois das provas, sem editar assessments históricos para fazê-los parecer correntes. Reavaliar também qualquer claim adicional invalidada pelo diff final.
- Manuais do engine e guias do piloto afetados: corrigir instruções contraditas pela observação, cobrindo os estados acima. Não inventar redesign antes de descobrir falha concreta de jornada.
- `engines/codexDojo/ecosystem/MANIFEST.md`: atualizar junto dos reparos quando mudarem gate, contrato de evidência ou cobertura de entregáveis, conforme a regra do repositório.

### Leaves

- `policy.yaml`, tiers e autoridade dos grants atuais; não conceder `customer-ready` a ferramentas locais por meio do novo JSON informativo.
- `learner/` e `curriculum/` como fonte compartilhada, progresso local separado de maestria e verificação independente.
- MME supervisionado, OpenClaw simulate-grade, miniTown experimental e contratos locais próprios de MVP/Zai.
- RCs ainda abertos, arquitetura de domínios, serviços de identidade, autonomia adicional e infraestrutura pública fora deste recorte.

Uma política automática nova que qualifique os quatorze engines em toda release só passa a ser a melhor opção se houver compromisso de releases contínuas sem qualificação operacional por rodada; o pacote datado não sustenta essa promessa sozinho, e a mudança de autoridade exigiria RFC antes de implementação.

## Roadmap

| Block | Delivers | Clarity |
|---|---|---|
| B1 — Congelar as promessas e ambientes | Matriz dos 14 engines, variantes oferecidas, casos obrigatórios, responsáveis operacionais e pré-requisitos, ligada à fonte. Sem alterar promessas para absorver defeitos. | clear |
| B2 — Integridade do gate de jogos | #657 integrado/revisado; caso sem recibo inelegível, positivo válido e evidência multirregistro preservados; nenhum histórico canônico reescrito. | clear |
| B3 — Contrato de Literacy v4 | #656 integrado/revisado; a1/a2/a3 corretos aceitos, adulteração recusada; fonte e deployment identificados separadamente. | clear |
| B4 — Qualificar aplicações e ferramentas executáveis | Provas de entrada, fluxo principal, recuperação e limites para dashboards, apps, jogos, pacote local e runner de checklist; todas as variantes oferecidas incluídas. | clear |
| B5 — Qualificar uso real no harness de chat/agentes | Resultado da pergunta em `Needs a spike` para MVP, minimaxDojo e MME; prova atribuível ou pré-requisito explicitamente ausente. | spike |
| B6 — Renovar claims afetadas | Fatos e assessments independentes no candidato estabilizado; pelo menos os seis stales tratados e lane de claims corrente em main. | clear |
| B7 — Consolidar e aceitar a oferta do piloto | Relatório com 14 resultados, sem esconder `blocked`/`unverified`, revisão independente e decisão de Daniel sobre o conjunto observado. | clear |

B1 precede a coleta. B2/B3 reutilizam o trabalho existente e precedem as provas dependentes de seus contratos. B4 e B5 alimentam B6/B7. Um bloqueio encontrado durante a qualificação volta como intent específico; sua correção não é silenciosamente incluída neste diagnóstico. Fonte, head dos PRs e claims devem ser conferidos novamente ao iniciar cada bloco.

## Decisions

| Decision | Choice | Why this | Alternative, and what would make it win | Reversibility |
|---|---|---|---|---|
| Baseline | `main@f98e7fa32deac836addc348e185e8788fd197627`; nova rodada registra novo `sourceCommit` e fingerprint dos caminhos relevantes | Escolha de Daniel; impede promover correção aberta a verdade lançada | Candidato RC se Daniel mudar explicitamente o alvo | reversible |
| Universo | Os 14 `engineId` da tabela Journey; `shared` e `factory` entram como dependências atravessadas | Escopo escolhido sem inflar contagem com bibliotecas | Subconjunto público apenas se o escopo do piloto for reduzido pelo dono | reversible |
| Semântica | `scope: "declared-use-beta"`; papéis e limites atuais preservados | Chat, exploração e runner têm promessas distintas | Novo produto/uso exige intent próprio antes de redefinir sucesso | costly se houver migração de estado |
| Reutilização | B2 usa #657; B3 usa #656; revalidar head/diff/CI e revisão independente antes de concluir | Evita implementações concorrentes das mesmas falhas | Reparos novos somente se esses patches forem inadequados após revisão | reversible |
| Prova de integridade | Sem recibo válido e vinculado, nenhuma nova promoção de jogo a `mastered`; l02 v4 recomputada por atividade | Responde aos dois contraexemplos | Aceitar declaração do produtor contradiz a regra canônica | costly se contaminar histórico |
| Registro dos 14 engines | `engine-qualification.json` com os campos de Adds; `status ∈ {pass, blocked, unverified}` | Expõe ausências sem fabricar falhas ou grants | Perfis canônicos/CI para todos se releases contínuas exigirem autoridade automática | reversible |
| Cobertura de casos | Todas as variantes atualmente oferecidas; estado inaplicável exige fonte/justificativa | Um caso de um jogo não prova o catálogo inteiro | Amostragem só com promessa explicitamente mais restrita aceita pelo dono | reversible |
| Fonte da claim | Assessments e fatos existentes, acrescentados pelo fluxo atual; novo Markdown/JSON não concede tier | Preserva autoridade e história | Nova política só após RFC sobre autoridade/compatibilidade | costly |
| Ambiente | Diretórios/DBs/perfis de teste isolados; harness/provider/deployment/version registrados; contexts de produtor/verificador distintos | Permite prova sem alterar o aprendiz real | Dados reais exigiriam necessidade demonstrada e autorização específica | costly quando toca dados reais |
| Encerramento | 14/14 `pass`, zero bloqueio crítico/alto no escopo e claims correntes antes da afirmação global | Resultado verificável compatível com a escolha de todos os engines | Ofertar um subconjunto exige nova delimitação explícita; não encerrar como “todos prontos” | reversible |

## Needs a spike

1. **B5 — Os contratos de `aiDevschoolMvp`, `minimaxDojo` e `miniMaxEvolutionEngine` funcionam no harness realmente declarado?** Executar uma tentativa/ciclo representativo e um caso de erro/interrupção/retomada por promessa, com conteúdo temporário, versão do harness identificada e verificador independente. No MME, observar o ciclo supervisionado e apenas a autonomia `spec → spec-done` que for oferecida; não implementar autonomia nova. Se funcionar, incorporar as provas à qualificação; se falhar, abrir intent de defeito; se faltar plataforma/acesso, manter `unverified` e registrar o pré-requisito. O spike termina quando esses casos têm resultado atribuível ou um pré-requisito externo reproduzivelmente ausente, sem reescrever o engine para fazer o experimento passar. Fixtures do núcleo não encerram essa pergunta de runtime.

## Sources

- Respostas de Daniel nesta conversa, 2026-10-15 — escopo dos 14 engines, uso declarado, main atual e beta/piloto. Não há aceite de plano de implementação.
- [Manifesto da coleta e comandos](evidence/manifest.json), [situação](evidence/situation.json), [warnings](evidence/findings.json) — fonte pinada, limites e evidência retida desta discovery.
- [Política](../../docs/product-readiness/policy.yaml), [inventário](../../docs/product-readiness/inventory.yaml), [refresh plan](../../docs/product-readiness/readiness-refresh-plan.md), [CLI](../../docs/product-readiness/tools/cli.py), [workflow](../../.github/workflows/ci.yml) — autoridade, casos e critério corrente de claims.
- [CONTEXT-MAP](../../CONTEXT-MAP.md), [handbook](../../docs/handbook/README.md) — fronteiras, MVP e aprendiz canônico. Confirmar caminhos e semântica ao planejar.
- Os treze READMEs de engine e `engines/zai-duolingo-like/QWEN.md` listados individualmente no manifesto, mais contratos/AGENTS e catálogos locais — promessas sintetizadas na tabela Journey. A próxima etapa precisa ligar cada caso à seção exata que oferece a variante.
- [Gate](../../learner/gate/canonical_gate.py), [verificador Literacy](../../learner/gate/netlify-functions/literacy-verify.mjs), [produtor](../../engines/literacyDojo/src/domain/evidence.ts), [lição v4](../../curriculum/ai-literacy/modules/01-ai-sem-misterio/l02-ia-nao-e-fonte-de-verdade.yaml) — dois contraexemplos locais; não prova de deployment remoto.
- [PR #657](https://github.com/dandpb/aidevschool/pull/657), [PR #656](https://github.com/dandpb/aidevschool/pull/656), [PR #662](https://github.com/dandpb/aidevschool/pull/662) — reparos existentes e limite de aplicação do RC. Estado e head registrados no manifesto; nenhuma aprovação desses patches foi emitida aqui.
- [Intent home](../README.md) — a cadeia local vive em `intent/<change-id>/`. Adaptação de placement: a skill pede `bash ../scripts/sdlc-artifacts.sh --place <branch> design <slug>`, mas o único helper encontrado pertence ao workspace Heropa/VLab e deriva caminhos para `heropa-docs/specs/`, fora deste repositório. Este documento usa a casa canônica do AiDevSchool; nenhum arquivo desse outro projeto foi alterado. Na próxima etapa, fornecer explicitamente este caminho como fonte.
