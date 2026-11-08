<!-- issue: AID-3497 | key: matriz-competencias-32 | doc_id: c1b815c1-5f14-483b-8824-21e26c713421 | updated: 2026-09-30 18:33:10.282+00 -->

# Matriz de competências por lição l01–l32 — r3 (final: 32 [D] · 0 [P])

(AID-3497)

# Matriz de competências por lição — l01–l32 (r3)

Produtor: Curriculum Content Engineer. Revisão CD concluída (approve `65db9a9a`) e validação CPE concluída (approve `456c17d9`) sobre a r2 `7cf9e940`; esta r3 incorpora mecanicamente o resultado decidido — o CCE não decide conteúdo.

**Delta r3 (revisão final — incorporação mecânica do resultado decidido):** base = r2 `7cf9e940-0c29-4299-8929-8ed59849a76d` + decisão curricular CD `65db9a9a` (15/15 linhas [P] aprovadas individualmente; head exato revisado: r2 `7cf9e940`) + parecer final CPE `456c17d9` (approved, validação de consistência do resultado por linha). Muda apenas: (a) as 15 linhas [P] de §3 passam a **[D]** com proveniência da decisão CD; (b) coluna "Decisão CD" de §6 preenchida com os valores aprovados; (c) §4/§5 atualizados para o estado final **32 [D] · 0 [P]**, com divergências l21/l22 marcadas como resolvidas (alternativas preservadas como histórico); (d) removido o fragmento duplicado de cabeçalho na linha introdutória do §3 (erratum não bloqueante do parecer CD `65db9a9a` §4). Nenhuma decisão semântica nova, nenhum valor P/S alterado além dos aprovados, citações e glossário @ `579ce995…` inalterados.

**Delta r2 (responde à clarificação do usuário `eebefd83`):** a r1 teve qualidade documental aprovada (CD `bcac833f`, CPE `864cee42`), mas ambos os pareceres deixaram as 15 linhas [P] para um “canal próprio” indefinido — premissa rejeitada pela clarificação: a decisão curricular por linha [P] acontece **nesta issue/entregável** (§6), papel responsável: Content Designer. Sem novo canal/tarefa. As 32 linhas, citações @H e estados [D]/[P] da r1 permanecem inalterados; única correção de conteúdo: errata l12 (matrix:124→:123).
Escopo: entregável documental de AID-3497. Sem serialização YAML/runtime, sem atribuição ao learner, sem novo competence ID (só IDs do glossário vigente), sem touch em branches/worktrees congeladas — documento vive somente nesta issue.

## 1. Fontes canônicas fixadas (caminho + SHA completo)

Abreviação: **@H** = `579ce995baa7aa28084127b15a9886103ad68a44` (= `origin/aid3453/unify-school`, head **atual** do PR #610; contém a r2.1 ratificada).

| O quê | Caminho @H | Papel |
| --- | --- | --- |
| Glossário de competências (único, vale para as 32 linhas) | `intent/AID-3453-unify-school/spec.md:7–21` @H | R1 define notação P/S + IDs estáveis; R2 define F1 entender IA · F2 uso seguro · F3 prompt/contexto · F4 verificação · D1 fundamentos/harness · D2 intenção/spec/plano · D3 construção · D4 teste/debug/review/manutenção · D5 produto IA/evals · D6 agentes/tools/skills · D7 capstone |
| 32 lições canônicas | `curriculum/ai-literacy/modules/01..08/*.yaml` @H | objetivo observável citado por arquivo:linha em cada linha da matriz |
| Decisão r2.1 (nível família/lição) | `intent/AID-3453-unify-school/curriculum-matrix.md:98–103` e `:105–111` @H; erratas §11 `:226–235` @H | baseline ratificada (CD `d6ab6ded`, approved, sobre 5024f9a4) |

**Reconciliação r2.1 ↔ HEAD atual:** r2.1 foi ratificada em `5024f9a4` (árvore idêntica ao então head `8be20045` do PR #610). Diff `5024f9a4..579ce995baa7aa28084127b15a9886103ad68a44` restrito a `curriculum/ai-literacy/` = apenas bumps de versão (`catalog.yaml` contentVersion 2026-09-10.2→2026-09-30.1; `l16` v3→v4; `l27` v2→v3; `l28` v2→v3) — **nenhum `objective` nem glossário alterados** (verificado por `git diff` nesta sessão). `main` (`1975e2c7…`) NÃO contém o glossário nem as correções r2.1 — não é a fonte vigente desta decisão e não é citado como atual.

## 2. Regra de estado (aplicada igualmente às 32 linhas)

- **[D] ratificado**: a primária coincide com decisão explícita da r2.1 (por lição, ou linha de grupo de competência única, matrix:98–103) re-confirmada pela re-derivação do `objective` da própria lição; e o `supporting`, quando existe, é derivado do próprio objetivo **e** já pertence ao conjunto direcional ratificado para o grupo (mod-05: D3/D4; mod 06–08: F2/F4; mod 01–03: sem S).
- **[P] proposta/divergência**: qualquer elemento sem ratificação por lição — S novo, S retirado do conjunto direcional do grupo, ou primária divergente da r2.1. Alternativa e razão preservadas; divergência não é serializável e não vira default.

Notação: **P** = primária única (spec R1); **S** = apoio (lista; `—` = vazio).

## 3. Matriz — 32 linhas

Glossário para todas as linhas: `spec.md:7–21` @H (versão única por SHA; não há glossário por lição).

| Lição | Objetivo observável (fonte @H) | P | S | Estado | Rationale |
| --- | --- | --- | --- | --- | --- |
| l01 | `01-ai-sem-misterio/l01-sua-primeira-conversa-com-uma-ia.yaml:7` | F1 | — | **[D]** | Primeira conversa + interpretar resposta como rascunho = modelo mental fundamental; nenhum ato de verificação executado. Confirma grupo r2.1:98. |
| l02 | `01-ai-sem-misterio/l02-ia-nao-e-fonte-de-verdade.yaml:7` | F1 | F4 | **[D]** | P F1 confirmado (limitação da IA como fundamento, r2.1:98). Objetivo exige "reconhecer que precisa ser verificada" → **S F4 proposto** (grupo mod-01 não fixou S). Alternativa preservada: P F4 — rejeitada porque a primária-F4 já é coberta por l08–l11 e l02 é introdutória. **Ratificado [D] pela decisão CD `65db9a9a` (approve S F4).** |
| l03 | `01-ai-sem-misterio/l03-o-que-a-ia-faz-bem.yaml:7` | F1 | — | **[D]** | Distinguir onde IA ajuda/falha = núcleo de F1. r2.1:98. |
| l04 | `02-pedir-bem/l04-de-um-objetivo-claro.yaml:7` | F3 | — | **[D]** | Reescrever pedido vago em objetivo concreto = craft de prompt; "verificável" qualifica o objetivo do pedido, não é ato de F4. r2.1:99. |
| l05 | `02-pedir-bem/l05-de-contexto-para-obter-resposta-util.yaml:7` | F3 | — | **[D]** | Campos estruturados de objetivo/contexto/público/formato = F3. r2.1:99. |
| l06 | `02-pedir-bem/l06-defina-publico-tom-e-formato.yaml:7` | F3 | — | **[D]** | Ajuste de público/tom/formato = F3. r2.1:99. |
| l07 | `02-pedir-bem/l07-melhore-a-resposta-em-etapas.yaml:7` | F3 | — | **[D]** | Iterar com pedidos de ajuste específicos = F3; a avaliação comparativa é pré-requisito do mod-03, não apoio novo. r2.1:99. |
| l08 | `03-avaliar-e-verificar/l08-a-primeira-resposta-nao-e-a-melhor.yaml:7` | F4 | — | **[D]** | Comparar com critério explícito = F4. r2.1:100. |
| l09 | `03-avaliar-e-verificar/l09-como-reconhecer-resposta-inventada.yaml:7` | F4 | — | **[D]** | Identificar sinais de alucinação = F4. r2.1:100. |
| l10 | `03-avaliar-e-verificar/l10-quando-procurar-fontes-externas.yaml:7` | F4 | — | **[D]** | Decidir quando exigir fonte externa = F4. r2.1:100. |
| l11 | `03-avaliar-e-verificar/l11-como-comparar-alternativas.yaml:7` | F4 | — | **[D]** | Explicitar critérios antes de escolher = F4. r2.1:100. |
| l12 | `04-seguranca-e-aplicacao/l12-proteja-suas-informacoes.yaml:7` | F2 | — | **[D]** | P F2 confirmado (classificar sensíveis antes de colar = uso seguro, r2.1:101). **S F4 do grupo retirado**: o objetivo classifica dado de ENTRADA (sensibilidade), não verifica saída da IA. Alternativa preservada: manter S F4 do grupo. Melhorias de privacidade apontadas à l12 na r2.1 (§3, matrix:123 — errata r1 corrigida nesta r2) não mudam primária. **Ratificado [D] pela decisão CD `65db9a9a` (approve S —; retirada ratificada).** |
| l13 | `04-seguranca-e-aplicacao/l13-use-ia-para-tarefa-real.yaml:7` | F2 | F4, F3 | **[D]** | P F2 confirmado ("mantendo o julgamento final" = julgamento humano/uso seguro). Ciclo pedir-avaliar-melhorar explícito no objetivo → S F4 (do grupo) + **S F3 proposto** (novo). Alternativa preservada: P F3 se o board pesar o ciclo como craft de prompt; escolha F2 porque o diferencial é a aplicação segura em tarefa real. **Ratificado [D] pela decisão CD `65db9a9a` (approve S F4 + S F3).** |
| l14 | `04-seguranca-e-aplicacao/l14-desafio-final.yaml:7` | F4 | F3, F2 | **[D]** | **P F4 ratificado por lição** (r2.1:101 "l14: P F4 capstone cotidiano") e confirmado ("avaliar com critérios"). Objetivo enumera o ciclo completo → **S F3 ("pedir com contexto") e S F2 ("proteger dados") derivados agora** (grupo só fixou S F4). **Ratificado [D] pela decisão CD `65db9a9a` (approve S F3 + S F2).** |
| l15 | `05-dev-contexto-e-escolha/l15-quando-usar-ia.yaml:7` | D1 | — | **[D]** | **P D1 ratificado por lição** (r2.1:102) e confirmado (decidir com critério técnico quando IA ajuda = fundamentos dev). **S D3/D4 do grupo retirado**: nenhum ato de construção/teste no objetivo. Alternativa preservada: manter S D3/D4. **Ratificado [D] pela decisão CD `65db9a9a` (approve S —; retirada ratificada).** |
| l16 | `05-dev-contexto-e-escolha/l16-primeiro-codigo-com-assistente.yaml:7` | D3 | D4 | **[D]** | **P D3 ratificado por lição** (r2.1:102) e confirmado (primeiro código com assistente = construção). "Avaliar a resposta com critérios de engenharia" = apoio D4 ∈ conjunto do grupo. Correções r2.1 §11 (c-redact shape/runtime, c-erros) e bump v4 não alteram o objetivo nem o mapeamento. |
| l17 | `05-dev-contexto-e-escolha/l17-integre-api-de-ia.yaml:7` | D5 | D3 | **[D]** | Normalização r2.1 explícita (matrix:108–109): "Integre API de IA" → **D5**, CD-approved. Contra o glossário: conectar endpoint de API de IA em projeto real = construir produto com IA (D5 "produto IA/evals") ✓. "Tratar erros e decidir cliente/servidor" = apoio D3 (construção robusta) ∈ grupo. |
| l21 | `05-dev-contexto-e-escolha/l21-peca-testes-que-valham-a-pena.yaml:7` | D4 | D3 | **[D]** | **DIVERGÊNCIA DE PRIMÁRIA**: r2.1:102 fixa D3. Re-derivação: "montar o pedido de testes com framework, comportamento-alvo e caso de borda" = craft de TESTE (D4 "teste/debug/review"), e "esperar que a primeira resposta deixe bordas de fora" = leitura crítica de testes (D4). S D3 proposto (testes são código escrito na construção). **Alternativa preservada: D3** (defensável se o foco for o código de teste produzido); CD decide. **Ratificado [D] pela decisão CD `65db9a9a` (approve primária D4 + S D3 — divergência da r2.1 ratificada; alternativa D3 preservada em §4 como divergência resolvida).** |
| l22 | `05-dev-contexto-e-escolha/l22-revise-o-codigo-sugerido.yaml:7` | D4 | — | **[D]** | **DIVERGÊNCIA DE PRIMÁRIA**: r2.1:102 fixa D3. Re-derivação: "aplicar critérios objetivos de engenharia, separar aceita/recusa com motivo, revisar comportamento antes de estilo" = REVIEW (D4). **Alternativa preservada: D3**; S — proposto (nenhum ato secundário distinto). **Ratificado [D] pela decisão CD `65db9a9a` (approve primária D4 + S — — divergência da r2.1 ratificada; alternativa D3 preservada em §4 como divergência resolvida).** |
| l23 | `05-dev-contexto-e-escolha/l23-o-que-aceitar-limites-do-assistente.yaml:7` | D4 | — | **[D]** | **P D4 ratificado por lição** (r2.1:102) e confirmado (decidir aceitar/revisar a fundo/caminho convencional = review/julgamento). **S do grupo retirado** (D4 já é a primária; nenhum ato de construção no objetivo). Alternativa preservada: S D3 ("o que exige caminho convencional"). **Ratificado [D] pela decisão CD `65db9a9a` (approve S —; retirada ratificada).** |
| l27 | `05-dev-contexto-e-escolha/l27-debug-com-assistente-reproduza-antes-de-perguntar.yaml:7` | D4 | D3 | **[D]** | **P D4 ratificado por lição** (r2.1:102) e confirmado (reproduzir deterministicamente antes de perguntar = disciplina de debug). "Aplicar a correção e rodar os testes, incluindo o caso mínimo" = apoio D3 ∈ grupo. Correção de linguagem §11 (neutra) não altera objetivo. |
| l28 | `05-dev-contexto-e-escolha/l28-refatore-com-assistente-sem-quebrar-comportamento.yaml:7` | D4 | D3 | **[D]** | **P D4 ratificado por lição** (r2.1:102) e confirmado (refatorar sem quebrar comportamento = manutenção). Refatorar em passos pequenos e verificáveis com assistente = apoio D3 ∈ grupo. §11 (prova limitada à cobertura) não altera objetivo. |
| l29 | `05-dev-contexto-e-escolha/l29-avalie-as-dependencias-sugeridas.yaml:7` | D3 | D4 | **[D]** | Normalização r2.1 explícita (matrix:108–110): "Avalie as dependências sugeridas" → **D3**, CD-approved. Contra o glossário: decidir adicionar biblioteca ao projeto = decisão de construção ✓. "Verificar manutenção, licença, segurança e alternativa nativa" = review de artefato de terceiros = apoio D4 ∈ grupo. |
| l18 | `06-rotina-com-ia/l18-biblioteca-de-pedidos.yaml:7` | F3 | — | **[D]** | **P F3 ratificado por lição** (r2.1:103) e confirmado (transformar pedido bem-sucedido em modelo reutilizável = prompt). **S F2/F4 do grupo retirado**: nenhum ato de segurança/verificação no objetivo. Alternativa preservada: manter S do grupo. **Ratificado [D] pela decisão CD `65db9a9a` (approve S —; retirada ratificada).** |
| l19 | `06-rotina-com-ia/l19-conversas-longas.yaml:8` | F3 | — | **[D]** | **P F3 ratificado** (r2.1:103) e confirmado (identificar contexto perdido + correção mínima no pedido = gestão de contexto/prompt). S do grupo retirado. Alternativa preservada. **Ratificado [D] pela decisão CD `65db9a9a` (approve S —; retirada ratificada).** |
| l20 | `06-rotina-com-ia/l20-numeros-e-fatos.yaml:8` | F4 | — | **[D]** | Normalização r2.1 explícita (matrix:109–111): "verifique antes de usar" → **F4**, CD-approved; confirmada contra o glossário (marcar afirmações para verificação externa + escolher fonte = verificação; aprofundamento operacional de l09/l10). **S F2 do grupo retirado** ("antes de usar" não é ato de segurança distinto). Alternativa preservada: S F2. **Ratificado [D] pela decisão CD `65db9a9a` (approve S —; retirada ratificada).** |
| l24 | `07-ia-alem-do-texto/l24-anexe-cole-ou-descreva.yaml:7` | F3 | — | **[D]** | **P F3 ratificado** (r2.1:103) e confirmado (escolher anexar/colar/descrever/não enviar + referenciar o anexo no pedido = decisão de contexto no prompt). **S do grupo retirado** ("não enviar" é decisão de contexto; a classificação de segurança é objeto da l25). Alternativa preservada: S F2. **Ratificado [D] pela decisão CD `65db9a9a` (approve S —; retirada ratificada).** |
| l25 | `07-ia-alem-do-texto/l25-anexos-seguros.yaml:7` | F2 | — | **[D]** | **P F2 ratificado por lição** (r2.1:103) e confirmado (classificar conteúdo como seguro/sensível + remover/tampar antes de enviar = uso seguro). **S do grupo retirado** (não há verificação de saída; conferência de extração é a l26). Alternativa preservada: S F4. **Ratificado [D] pela decisão CD `65db9a9a` (approve S —; retirada ratificada).** |
| l26 | `07-ia-alem-do-texto/l26-confira-o-que-a-ia-extraiu.yaml:9` | F4 | — | **[D]** | **P F4 ratificado por lição** (r2.1:103) e confirmado (conferir campos críticos contra o trecho original + corrigir divergências = verificação de saída). **S do grupo retirado**. Alternativa preservada. **Ratificado [D] pela decisão CD `65db9a9a` (approve S —; retirada ratificada).** |
| l30 | `08-rotina-com-ia-ii/l30-rotinas-repetitivas.yaml:8` | F3 | F2 | **[D]** | **P F3 ratificado por lição** (r2.1:103) e confirmado (parametrizar o pedido-padrão da tarefa = prompt). "Repetitiva + estruturada + **baixo risco**" vs "exigem julgamento humano a cada vez" = critério de uso seguro → apoio F2 ∈ conjunto do grupo. |
| l31 | `08-rotina-com-ia-ii/l31-pequenas-automacoes.yaml:8` | F3 | F2 | **[D]** | **P F3 ratificado** (r2.1:103) e confirmado (nomear o que falta no pedido de automação = prompt). "Classificar saídas entre uso direto e checagem obrigatória" = uso seguro → apoio F2 ∈ grupo. |
| l32 | `08-rotina-com-ia-ii/l32-quando-a-automacao-erra.yaml:8` | F4 | F3 | **[D]** | **P F4 ratificado** (r2.1:103) e confirmado (detectar degradação de saída coerente-porém-errada = verificação). "Aplicar a correção mínima no pedido (só o dado que mudou) e repor o contexto perdido" = **S F3 proposto** (novo; fora do conjunto F2/F4 do grupo). Alternativa preservada: S — / S F2. **Ratificado [D] pela decisão CD `65db9a9a` (approve S F3).** |

## 4. Divergências e propostas preservadas (não serializáveis; resolvidas pela decisão CD `65db9a9a`)

1. **l21 — divergência de primária (única com l22):** r2.1 D3 vs proposta **D4**. Motivo: o observável é o pedido de testes e a expectativa de lacunas, não a construção da feature. Alternativa D3 preservada **como histórico de divergência resolvida**: decisão CD `65db9a9a` ratificou primária D4 + S D3.
2. **l22 — divergência de primária:** r2.1 D3 vs proposta **D4** (revisar comportamento antes de estilo = review). Alternativa D3 preservada **como histórico de divergência resolvida**: decisão CD `65db9a9a` ratificou primária D4 + S —.
3. **S retirados de conjuntos direcionais de grupo** (l12, l15, l18–l20, l23–l26): cada retirada tem alternativa "manter S do grupo" preservada na própria linha; todas as retiradas ratificadas pela decisão CD `65db9a9a` (approve S — por linha).
4. **S novos propostos:** l02 (F4), l13 (F3), l14 (F3+F2), l21 (D3), l32 (F3) — todos aprovados pela decisão CD `65db9a9a`.
5. **l17/l29/l20 contra o mesmo glossário @H:** re-checadas explicitamente (§3) — mantêm D5/D3/F4 conforme normalização r2.1 CD-approved; nenhum ID inventado, nenhum significado divergente usado.

## 5. Aceite (auto-verificação do produtor)

- Exatamente **32 linhas, IDs únicos l01–l32, cobertura completa** (8 módulos × ids conferidos nos arquivos @H). ✔
- Toda linha tem: fonte arquivo:linha @H, glossário §1 (SHA completo), P, S[], rationale, estado. ✔
- Nenhuma herança automática de família: cada P re-derivado do `objective` da própria lição; grupos citados só como baseline ratificado. ✔
- 32 linhas [D] · 0 [P]: 17 ratificações derivacionais (r2.1 + re-derivação) + 15 decisões curriculares do CD (`65db9a9a`, 15/15 approve; 2 divergências de primária l21/l22 ratificadas como D4, alternativas preservadas em §4); consistência do resultado validada pelo CPE (`456c17d9`). ✔
- Sem YAML/runtime, sem learner, sem novo ID, sem touch em PR611@ea97c89d / PR612@d853e4f7 / branch de entrada estática / worktrees aceitas. ✔

**Encerramento (r3):** decisão curricular do Content Designer por linha registrada no comentário `65db9a9a` (15/15 approve sobre a r2 `7cf9e940`) e consistência do resultado por linha validada pelo Curriculum Platform Engineer no comentário `456c17d9` (approved, estágio final); o resultado foi incorporado mecanicamente pelo CCE nesta revisão final. Ambos os estágios concluídos; estado final 32 [D] · 0 [P].

## 6. Registro de decisão curricular por linha [P] (nesta issue — sem canal próprio; decidido pelo CD, validado pelo CPE, incorporado nesta r3)

Papel responsável pela decisão: **Content Designer** (estágio de revisão), conforme clarificação do usuário (`eebefd83`): a decisão curricular por linha faz parte **deste** entregável; não abre outro canal/tarefa. Para cada linha abaixo: registrar **approve** ou **reject** da proposta com rationale ancorado no objetivo citado e no glossário; **ou** identificar precisamente a evidência/decisão ainda ausente e o papel responsável por supri-la; linha sem decisão com suporte **permanece [P]**. Concordância geral ou aceite do documento não ratifica linha nenhuma. *(Regra cumprida: ver coluna "Decisão CD" e comentário `65db9a9a`.)*

Âncoras do glossário @H (`intent/AID-3453-unify-school/spec.md`): R1 P/S + IDs estáveis = `:7–10`; F1–F4 = `:12–13`; D1–D7 = `:14–16`. Objetivo por lição = coluna §3 (arquivo:linha @ `579ce995…`).

| Lição | Objeto da decisão (proposta CCE) | Alternativa preservada | Decisão CD |
| --- | --- | --- | --- |
| l02 | Aprovar **S F4** — "reconhecer que precisa ser verificada" (l02:7) | S — (mod-01 sem S na r2.1) | **approve S F4** — CD `65db9a9a` |
| l12 | Ratificar **S —** — classificar dado de ENTRADA ≠ verificar saída (l12:7) | manter S F4 do grupo | **approve S —** (ratifica retirada) — CD `65db9a9a` |
| l13 | Aprovar **S F4 + S F3** — ciclo pedir-avaliar-melhorar no objetivo (l13:7) | sem S F3; ou P F3 (ciclo como craft de prompt) | **approve S F4 + S F3** — CD `65db9a9a` |
| l14 | Aprovar **S F3 + S F2** — objetivo enumera o ciclo completo (l14:7) | S F4 do grupo apenas | **approve S F3 + S F2** — CD `65db9a9a` |
| l15 | Ratificar **S —** — nenhum ato de construção/teste no objetivo (l15:7) | manter S D3/D4 do grupo | **approve S —** (ratifica retirada) — CD `65db9a9a` |
| l18 | Ratificar **S —** — nenhum ato de segurança/verificação no objetivo (l18:7) | manter S F2/F4 do grupo | **approve S —** (ratifica retirada) — CD `65db9a9a` |
| l19 | Ratificar **S —** (l19:8) | manter S do grupo | **approve S —** (ratifica retirada) — CD `65db9a9a` |
| l20 | Ratificar **S —** — "antes de usar" não é ato de segurança distinto (l20:8; P F4 = normalização r2.1 já CD-approved, fora desta decisão) | manter S F2 | **approve S —** (ratifica retirada) — CD `65db9a9a` |
| l21 | Ratificar primária **D4** + S D3 — craft de teste (l21:7); **divergência da r2.1** | D3 (r2.1:102) — divergência resolvida | **approve primária D4 + S D3** (divergência da r2.1 ratificada) — CD `65db9a9a` |
| l22 | Ratificar primária **D4** + S — — review (l22:7); **divergência da r2.1** | D3 (r2.1:102) — divergência resolvida | **approve primária D4 + S —** (divergência da r2.1 ratificada) — CD `65db9a9a` |
| l23 | Ratificar **S —** — D4 já é a primária (l23:7) | S D3 ("o que exige caminho convencional") | **approve S —** (ratifica retirada) — CD `65db9a9a` |
| l24 | Ratificar **S —** — "não enviar" é decisão de contexto (l24:7) | S F2 | **approve S —** (ratifica retirada) — CD `65db9a9a` |
| l25 | Ratificar **S —** — sem verificação de saída (l25:7) | S F4 | **approve S —** (ratifica retirada) — CD `65db9a9a` |
| l26 | Ratificar **S —** (l26:9) | manter S do grupo | **approve S —** (ratifica retirada) — CD `65db9a9a` |
| l32 | Aprovar **S F3** — correção mínima no pedido + repor contexto (l32:8) | S — ou S F2 | **approve S F3** — CD `65db9a9a` |

**Status (r3):** as 15 decisões foram registradas pelo Content Designer no comentário `65db9a9a` (estágio review, head exato r2 `7cf9e940`) e a consistência do resultado por linha foi validada pelo Curriculum Platform Engineer no comentário `456c17d9` (estágio approval). O CCE apenas incorporou o decidido nesta r3 — nenhuma decisão de conteúdo foi tomada pelo produtor.

Divisão de papéis: **CD** decide conteúdo por linha; **CPE** valida consistência com schema/glossário (não decide conteúdo); **CCE** produz e incorpora — não ratifica a própria proposta.
