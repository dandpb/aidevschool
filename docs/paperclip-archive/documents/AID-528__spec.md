<!-- issue: AID-528 | key: spec | doc_id: de66c3ea-2953-4373-824e-8f75f5af901c | updated: 2026-09-02 03:15:25.195+00 -->

# AID-528 — Spec rev 3 (decisão CEO AID-576/A → O2): onda ia_pratica mod-07 l24–l26 — IA além do texto (multimodal) — ressurreição re-id da rev 8efcccd3, baseline re-gated @45a01a49

(AID-528)

# AID-528 — Spec rev 3 (decisão CEO AID-576/A → O2): onda ia_pratica mod-07 l24–l26 — "IA além do texto" (multimodal)

**Status:** SPEC REV 3 PUBLICADO — somente leitura + documento (nenhuma escrita canônica; nenhum id `l24+` criado em arquivo; nenhum commit/branch/PR). ORDEM CEO AID-576/A → issue AID-577 (System Designer, 2026-09-02). Decisão do fundador/CEO registrada: **O2 — novo módulo `ia_pratica` mod-07 multimodal, lições l24–l26** (supersede a confirmação pending `d048197e` da AID-558; ver header da AID-577).
**Owner:** System Designer (bb7b8143).
**Relação com as revisões anteriores:** rev 1 `8efcccd3` (candidato (b) multimodal, l21–l23 contra o mapa pré-onda-dev) é a **base integral** desta rev 3 — ressurreição mecânica com os re-ids da rev 2 §7 + consulta CD AID-559; rev 2 `787cebef` (onda dev l21–l23) **pousada** (main `45a01a49`, 23/23 `ready`). O switch b→a e os briefs do fallback (a) da rev 1 §4/§5 ficam **fechados** (decisão O2 registrada; §4 desta rev).
**Inputs publicados (todos `done`):** case UX AID-524 (doc `case` rev `786e39fc` — recomendação (b) + riscos R1–R6 + envelope §6); readiness CD AID-525 (doc `readiness` rev `60e381e1` — template §2, checklist §3, estimativas §4); custo por candidato AID-526 (b ≈6–7h/onda); proposta AID-558 (doc `proposal` rev 2 — §2.O2 e re-ids); consulta CD AID-559 (comentário `338809a4` — ressurreição 15–30 min; **briefs §2/§5 da rev 1 confirmados first-hand sem mudança**; schema aceita l24–l26; prereqs [l18]/[l12]/[l20] intactos); QA GO da onda anterior AID-553; ORDEM CEO AID-576/A.
**Baseline lida e citada (re-gate do checklist de leitura, first-hand via `git show`/`git grep`/parse, workspace intocado):** `origin/main` @ `45a01a49` (pós-merge PR #232) — `curriculum/ai-literacy/catalog.yaml` (`contentVersion "2026-09-01.1"`, **23/23 `ready`, 0 `planned`**, módulos mod-01…mod-06; header "17 lições públicas… e 6 lições da trilha Dev"); `docs/design/ai-literacy/content-contract.md` (`vigentes l01..l23`; `moduleId mod-01..mod-06`; "(23 após a onda l21–l23)" ×2; regra 7: "próximo livre após `l23`: `l24`"); `curriculum/ai-literacy/schemas/lesson.schema.json` (id description "l01..l23 vigentes"; `pattern "^l[0-9]{2}$"` aceita l24–l26; `estimatedMinutes.enum [3,4,5]`); `engines/codexdojo-os-prototype/config/mission-bindings.yaml` (**30 missões**; `ai-pratica` chapterOrder **1–17 contíguo** ⇒ ch 18/19/20 livres; `dev` 1–13 contíguo; `tracks[*].contentVersion "2026-09-01.1"`; entradas recomendadas `l02`/`game-02-warehouse`); `learner/substrate/mission_catalog_rules.py` (contiguidade 1..N por trilha, prereq mesmo-track resolúvel/acyclico, entrada sem prereq); âncoras canônicas `l18`/`l12`/`l20` `ready` no catálogo; `rubric_review` **provado 3× em produção** (l09-a1, l16-a2, l22-a1).

---

## 0. Sumário executivo

- **O que este spec entrega:** especificação executável da onda mod-07 `l24–l26` (trilha `ia_pratica`, 3 lições × 4 min) com tema **(b) multimodal — "IA além do texto"** (fecha a lacuna learner-needs: o catálogo promete documentos/imagens no pedido desde l03 — `l03-…yaml:23` — e nenhuma lição l01–l23 ensina a executar) e estende `proteger` para anexos (exposição ativa hoje sem treino).
- **Como ler:** §2 é a especificação das 3 lições no padrão AID-414 §2; §3 é o texto literal da emenda T0 board-gated; §4 registra o fechamento do switch b→a; §5 mapeia R1–R6 para campos; §6 é o pipeline de portas; §7–§8 verificação e decisões reservadas.
- **Autoria final:** cabe ao Content Designer com o template/checklist do readiness AID-525 (§2/§3), incorporado por referência — §2 define conteúdo spec-grade (cenários, checks, rubricas), não YAML final.
- **Re-ids aplicados sobre a rev 1 `8efcccd3`** (lista mecânica da proposta AID-558 §2.O2 / CD AID-559, executada nesta rev): ids `l21–l23`→`l24–l26` (entradas, activity ids `lNN-aM`, rubricas `lNN-rubric`, `unitId`, fallbacks); "vigentes `l01..l23`"→"`l01..l26`" (contrato + schema); "(23 após a onda l21–l23)"→"(26 após a onda l24–l26)" (contrato ×2); regra 7 com bump duplo: "próximo livre após `l23`: `l24`"→"após `l26`: `l27`"; header do catálogo "17 públicas + 6 Dev"→"20 públicas + 6 Dev"; frase de jornadas preserva mod-05/dev com as 6 lições pousadas (lista literal do main) e adiciona mod-07; nota defasada sobre `rubric_review` corrigida (§2.3); baseline e contagens re-gated para `45a01a49` (mapa 30→33, catálogo 23→26, módulos →mod-07). **Nenhum outro conteúdo de autoria mudou** (CD AID-559 confirmou first-hand que nada muda nos briefs).

## 1. Decisões de design (evidência → decisão)

### 1.1 Colocação: módulo novo `mod-07` em `ia_pratica`
Herdando o precedente AID-414 §1.4 (l18–l20 → mod-06 próprio): módulos existentes têm `skillIds` fechados e aprendizes com progresso; lições novas em módulo "fechado" degradam o mapa. `mod-07` novo (`order: 7`, `journey: ia_pratica`, `skillIds: [pedir, avaliar, proteger, aplicar]` — zero skill nova) dá superfície coerente nos dois consumers (mapa do standalone `literacyDojo`, que filtra `ia_pratica`, e trilha `ai-pratica` do OS). Trade-off aceito e conhecido: o standalone exibe o 7º módulo público "em breve" até os arquivos existirem (`planned`/`hasContent: false` já contratado — zero mudança de runtime na emenda).

### 1.2 Candidato (b) settled pela decisão CEO (switch fechado)
Primária = (b), pela recomendação evidence-backed da UX (lacuna com promessa interna não cumprida desde l03; exposição de segurança ativa — anexos migram para onde os dados estão; reforço de l18/l19/l20; fit determinístico sem emenda de formato). A decisão AID-576/A registra **O2** e autoriza o pipeline T0→T3; o fallback (a) "Rotina com IA II" (draft AID-447) deixa de ser switch vivo (§4).

### 1.3 Ordem das lições: envelope UX adotado; divergência com skeleton CD divulgada
O case UX (§6) ordena por fluxo de trabalho real: **l24 decidir modalidade → l25 segurança do anexo → l26 conferir extração**. O skeleton CD (readiness §5.(b)) ordenava extração antes de privacidade. Adoto o envelope UX (workflow-faithful: decide-se *como/se* anexar antes de *conferir o que saiu*; segurança no meio, onde vive no fluxo real) e realoco os briefs CD conforme §2. Ids alocados em ordem de produção/mapa (precedente AID-414 §1.3 / rev 2 §1.3): l24=modalidade, l25=segurança, l26=conferência.

**Pré-requisitos (âncoras canônicas, não sequenciais — padrão mod-06/mod-05; re-verificados `ready` no main `45a01a49`):** `l24 [l18]` (a rotina semanal da l18 vive em documentos — ponte direta do case §2.2; l05 já transitivo por l14), `l25 [l12]` (reforço espaçado de `proteger` — estende a regra do colar para anexos), `l26 [l20]` (conferência estende os sinais de verificação de l20). Propriedade estrutural: **todos os prereqs são canônicos pré-existentes ⇒ T1–T3 totalmente paralelizáveis pós-T0** (sem dependência intra-onda no mission catalog).

**Onda mínima viável (se capacidade/QA apertar): `l24+l25`** — obrigatoriamente um **prefixo** do chapterOrder: a regra de contiguidade do `mission_catalog_rules` impede pular l25 e produzir l26 (ordens vinculadas 18+20 não-contíguas falham o gate). Trade-off divulgado: cortar l26 deixa a promessa da l03 fechada só até a metade (modalidade+segurança sem conferência) e mitiga R2 apenas parcialmente (l20 permanece o mitigador ativo); realocar l26 à onda seguinte é preferível a re-alocar chapterOrder na emenda.

## 2. Especificação final l24–l26 (candidato b — tema "IA além do texto")

Convenções (todas herdadas do contrato vigente, sem exceções — AID-414 §2 / readiness §2.3): 7 tipos contratados; `id` estável `lNN-aM`; `evaluation.strategy: deterministic`; `feedback.onFailure` **e** `onSuccess` (+ `perCheck`); `hints` 1–3 progressivas; `storage.policy: structured_only`; `evidence: {verifierRequired: true, completionClaim: lesson_completed, includesFreeText: false}`; `review.intervalsDays: [1,7,21]`; `completion.minimumScore: 0.75` com todas as atividades em `requiredActivityIds`; rubrica `lNN-rubric` com 3 critérios weight 1; `version: 1`; conteúdo pt-BR, linguagem simples; checks referenciam apenas ids de `data`; `mustIncludeAny` cobre variantes PT (com/sem acento). Vendor-neutral por contrato (R4): nenhuma lição cita produto/ferramenta específica de IA. Anti-R5: zero vocabulário técnico novo — só as skills existentes e palavras cotidianas (anexar/colar/descrever). Anti-R1: toda atividade que mencione "anexar" usa cenário com trecho concreto e copy honesta ("na sua ferramenta real você anexaria o arquivo; aqui você decide por controles rotulados").

### 2.1 `l24` — "Anexe, cole ou descreva"
- **moduleId:** mod-07 · **estimatedMinutes:** 4 · **skillIds:** [pedir, avaliar] · **prerequisites:** [l18] · **status inicial:** `planned` (emenda) → `ready` com arquivo (T1)
- **Objetivo (observável):** diante de uma tarefa que depende de um documento ou imagem, escolher entre anexar o arquivo, colar um trecho, descrever de memória ou não enviar — e escrever o pedido referenciando o que o anexo contém.
- **Atividades (3):**
  - `l24-a1` `choice` `multiSelect: true` — "Em quais situações ANEXAR o arquivo original funciona melhor que descrever ou colar?" 5 opções: (a) foto do quadro branco com o plano do trimestre [**correta** — conteúdo visual, anexar]; (b) PDF de contrato de 30 páginas para localizar a cláusula de multa [**correta** — conteúdo longo, anexar]; (c) ideia de e-mail que está na sua cabeça [✗ — não há arquivo: descrever]; (d) frase de abertura de um site público [✗ — trecho curto: colar]; (e) planilha com CPF e salário de funcionários [✗ — sensível: não enviar (regra l12)]. Evaluation: `correctOptionIds: [a, b]`. Feedback `onFailure` nomeia a regra (anexar ganha com conteúdo longo/visual E não sensível; trecho curto → colar; sem arquivo → descrever; sensível → não enviar) + `perCheck` por opção. Hints (3): (1) "o que é longo ou visual demais para digitar?"; (2) "uma opção nem precisa de arquivo"; (3) "uma delas expõe pessoas — não deveria ser enviada de forma alguma". → Cobre o critério observável 3(i) do case UX (anexar×colar×descrever) e semeia R3.
  - `l24-a2` `prompt_builder` — Cenário: você anexou a foto do quadro da reunião e quer o resumo das decisões. `genericPrompt`: "resuma isto". Campos: `tarefa` (o que a IA deve fazer com o anexo; min 8 + `mustIncludeAny` [resumo, resumir, lista, decisões, decisoes]), `referencia` (o que observar/citar do anexo; `mustIncludeAny` [quadro, imagem, foto, anexo, arquivo]), `formato` (forma da saída; `mustIncludeAny` [lista, tópicos, topicos, tabela, texto]). Evaluation: `minLength`/`mustIncludeAny` por campo (padrão l05/l18-a1). Hints (3) no padrão progressivo. → "Pedido que referencia o documento anexado" (case §2.4).
  - `l24-a3` `missing_context` — Cenário: um colega anexou a foto do quadro e escreveu só "o que acha disto?"; a resposta veio genérica. `contextOptions` (5): `tarefa-definida` ✓, `area-do-quadro` ✓ (decisões? cronograma?), `formato-de-saida` ✓ (required); `periodo-da-reuniao` (optional); distratores "nome-do-modelo-de-ia", "uma-ia-mais-recente" (padrão l19-a1). Evaluation: `requiredContextIds: [tarefa-definida, area-do-quadro, formato-de-saida]`, `optionalContextIds: [periodo-da-reuniao]`. Hints (2).
- **Rubrica (`l24-rubric`):** `r-escolhe-a-modalidade` (decide anexar/colar/descrever/não enviar por cenário); `r-referencia-o-anexo` (o pedido cita o anexo e diz o que observar); `r-nomea-o-que-falta` (aponta tarefa/área/formato quando falta instrução).
- **Binding OS:** trackId `ai-pratica`, `chapterOrder: 18`, prereq `[l18]`, `kind: ai-literacy-lesson`, `projectId: 00_ai_in_practice`, `unitId: ai-literacy:l24`, runtime literacyDojo (entrypoint/`VITE_LITERACYDOJO_URL`/protocolVersion "1.0"/contentVersion vigente no merge), evidence `literacy-evidence v1 / verifierRequired: true`, fallback DOM "Decida entre anexar, colar ou descrever um documento e escreva o pedido por controles rotulados."

### 2.2 `l25` — "Anexos seguros: proteja antes de enviar"
- **moduleId:** mod-07 · **estimatedMinutes:** 4 · **skillIds:** [proteger] · **prerequisites:** [l12] · **status inicial:** `planned` → `ready` (T2)
- **Objetivo (observável):** antes de anexar fotos, scans ou PDFs a um pedido, classificar o conteúdo como seguro ou sensível e remover ou tampar o que expõe pessoas.
- **Atividades (3):**
  - `l25-a1` `safety_classification` — labels `{safe: "Seguro para anexar", sensitive: "Sensível — não anexar"}`; 7 itens no padrão l12, todos com **modalidade de anexo** (R3): `i-foto-produto` (foto do novo produto no balcão, sem pessoas — safe), `i-quadro-clientes` (foto do quadro com nomes de clientes e valores — sensitive), `i-cracha` (foto do crachá de um colega com foto, nome e matrícula — sensitive), `i-ata-publica` (PDF da ata já publicada no site da empresa — safe), `i-scan-cpf` (scan do contrato assinado com CPF do cliente — sensitive), `i-print-vagas` (print da página pública de vagas — safe), `i-foto-equipamento` (foto do equipamento quebrado, sem pessoas nem telas — safe). Evaluation: `classification` cobrindo os 7. `onFailure`: "a regra da l12 vale para imagem: se identifica pessoa, abre porta para sistemas ou dinheiro, ou é interna, é sensível — **o formato (foto/scan/PDF) não muda a regra**" + `perCheck` por item. Hints (2).
  - `l25-a2` `choice` — "A foto do quadro da reunião tem nomes de clientes e valores, mas sua tarefa é só organizar as etapas do projeto. O que fazer antes de anexar?" (a) cobrir/tampar nomes e valores na imagem e anexar [**correta**]; (b) anexar como está — a IA "precisa do contexto completo"; (c) digitar nomes e valores no corpo do pedido, em vez de mostrar na imagem. `correctOptionIds: [a]`. `onFailure`: "remova o que a tarefa não usa; transcrever o dado sensível em texto expõe do mesmo jeito". Hints (2). → Protege sem travar o trabalho (não é "nunca use IA").
  - `l25-a3` `missing_context` — Cenário: um colega vai anexar um print da tela do sistema com a lista de clientes para pedir um resumo. "O que falta no plano dele para proteger as pessoas?" `contextOptions` (5): `checar-dados-pessoais-visiveis` ✓, `tampar-antes-de-anexar` ✓ (required); `fonte-publica-alternativa` (optional); distratores "reduzir-a-resolucao-da-foto" e "renomear-o-arquivo" (mitos de proteção — redução/nome não escondem dado). Evaluation: required/optional como listado. Hints (2). → Mata o mito "foto borrada está protegida".
- **Rubrica (`l25-rubric`):** `r-classifica-o-anexo` (aplica a regra de sensibilidade à modalidade anexo); `r-remove-o-que-expoe` (tampa/remove antes de enviar); `r-protege-sem-travar` (mantém a tarefa viável — protege sem desistir da IA).
- **Binding OS:** `chapterOrder: 19`, prereq `[l12]`, `unitId: ai-literacy:l25`, fallback DOM "Classifique anexos como seguro ou sensivel e proteja os dados antes de enviar por controles rotulados."

### 2.3 `l26` — "Confira o que a IA extraiu"
- **moduleId:** mod-07 · **estimatedMinutes:** 4 · **skillIds:** [avaliar, aplicar] · **prerequisites:** [l20] · **status inicial:** `planned` → `ready` (T3)
- **Objetivo (observável):** diante de uma extração feita de um documento anexado, conferir os campos críticos contra o trecho original e corrigir divergências antes de usar a saída.
- **Atividades (3):**
  - `l26-a1` `output_comparison` — Cenário: você anexou a ata da reunião (trecho visível: "orçamento aprovado: R$ 48.500 · prazo: 15 de março · responsável: equipe de suporte") e pediu um resumo para a diretoria. Saída A preserva os três valores e marca "valores conferidos na ata"; saída B resume "orçamento na casa de cinquenta mil", "prazo para meados de março", sem citar origem. Critérios: `c-preserva-valores-exatos`, `c-cita-a-origem`, `c-sem-invencao`. Evaluation: `betterOutputId: A`, `requiredCriterionIds: [c-preserva-valores-exatos, c-sem-invencao]` (padrão l15-a2/l18-a2 com `perCheck`). `onFailure`: "extração que arredonda ou troca números sem marcar a origem não vai para a diretoria". Hints (2). → R2: extração sempre pareada com conferência.
  - `l26-a2` `choice` `multiSelect: true` — "A IA extraiu estes campos da ata. Quais você CONFERE no documento original antes de usar?" 5 opções: valor aprovado de R$ 48.500 ✓, data do prazo (15 de março) ✓, nome do responsável ✓ [**corretas: as 3** — número preciso, data, citação nominal: sinais da l20]; "a ata tem 3 páginas" ✗; "o texto está formal" ✗. `correctOptionIds: [as 3]`. `onFailure` nomeia o sinal (estende l20 para extração de anexo). Hints (2).
  - `l26-a3` `sort` — "Ordene o fluxo do documento anexado até o uso:" 4 itens: (1) conferir se o anexo é seguro e remover o que a tarefa não usa [l25]; (2) anexar e escrever o pedido com tarefa, referência e formato [l24]; (3) comparar cada campo extraído com o trecho original; (4) corrigir a divergência no pedido e só então usar a saída. `expectedOrder` = 1→4. `onFailure`: qual passo veio antes do que. Hints (2). → Fecha o arco do módulo (o mapa mental anexar→pedir→conferir→usar).
- **Rubrica (`l26-rubric`):** `r-confere-campos-criticos` (sabe quais campos exigem conferência pelo sinal); `r-verifica-contra-o-original` (compara contra o trecho, não contra a memória); `r-fecha-o-fluxo-com-correcao` (corrige antes de usar).
- **Binding OS:** `chapterOrder: 20`, prereq `[l20]`, `unitId: ai-literacy:l26`, fallback DOM "Compare a extracao da IA com o documento original e corrija antes de usar por controles rotulados."
- **Nota de escopo (corrigida nesta rev 3 — a rev 1 estava defasada):** a rev 1 §2.3 dizia que `rubric_review` "ainda não tem uso na trilha" (readiness §2.2: primeiro uso com custo médio de tuning). **Falso pós-onda dev:** o tipo foi provado em produção canônica **3×** — l09-a1, l16-a2 e l22-a1 (`git grep rubric_review` no main `45a01a49`), com `expectedVerdicts`/`perCheck` maduros. A decisão da rev 1 permanece correta e agora por razão mais forte: **(b) usa apenas os 6 tipos provados** (choice, prompt_builder, missing_context, safety_classification, output_comparison, sort — mesma distribuição das ondas C1–C3, nenhum tipo dominando), porque o pareamento extração↔conferência de l26-a1/a2/a3 cobre R2 sem estressar o contrato na onda em que o tema já é novo — e `rubric_review` deixa de precisar de "primeiro uso designado": é tipo maduro, candidata natural a qualquer onda futura por fit temático.

**Contagens pós-onda (b):** catálogo **26 lições (20 `ia_pratica` + 6 `dev`)**, módulos mod-01…**mod-07**, mapa **30→33 missões**, chapterOrder **ai-pratica 1–20 contíguo** (dev 1–13 intacto), entrada recomendada `l02` intacta. Diversidade de tipos na onda: choice ×3, prompt_builder/safety_classification/output_comparison/missing_context/sort ×1 cada — mesma distribuição da onda C1–C3 (nenhum tipo dominando).

## 3. Emenda de contrato (texto literal para a issue T0 board-gated)

Candidato (b). Extensão de ids (l24+) e módulo (mod-07) exige emenda via issue aprovada (regra 7; precedentes PR #199 e PR da onda l21–l23). **3 arquivos + 1 bloco de módulo, 0 mudança de comportamento em runtime, 0 migração de estado.** Lições entram `planned` (regra 5); flip `ready` só nas tarefas de produção.

**(A) `docs/design/ai-literacy/content-contract.md`**
1. No bloco `LessonDefinition`: `id: string // estável: lNN — vigentes l01..l23; nunca deriva do título` → `…vigentes l01..l26; nunca deriva do título`; `moduleId: string // mod-01..mod-06` → `// mod-01..mod-07`.
2. Seção Catálogo: "`catalog.yaml` é o índice canônico das lições válidas (23 após a onda l21–l23)." → "…(26 após a onda l24–l26)."; e a frase de jornadas → "`mod-01`…`mod-04`, `mod-06` e `mod-07` pertencem a `ia_pratica` (14 lições dos módulos iniciais + 3 de continuação em `mod-06`: reutilização de pedidos, verificação de números e fatos, conversas longas; + 3 em `mod-07`: documentos e imagens no pedido — quando anexar, anexos seguros, conferir extração) e `mod-05` pertence a `dev` (6 lições publicadas como missões hospedadas da trilha dev do OS — decisão de uso, pedido de código com contexto, integração de API, testes que valem a pena, revisão como engenheiro e limites do assistente — ver `engines/codexdojo-os-prototype/config/mission-bindings.yaml`)." (a parte dev permanece literal como está no main — só a lista `mod-01..mod-04/mod-06` ganha `mod-07` e o parêntese ia_pratica ganha o trecho mod-07).
3. Exports do read model: "(23 após a onda l21–l23)" → "(26 após a onda l24–l26)".
4. Regra 7: "ids alocados sequencialmente (próximo livre após `l23`: `l24`)" → "(próximo livre após `l26`: `l27`)".

**(B) `curriculum/ai-literacy/schemas/lesson.schema.json`**
- `properties.id.description`: "ID estável da lição (l01..l23 vigentes; novos ids só mediante emenda de contrato aprovada). Nunca deriva do título." → "ID estável da lição (l01..l26 vigentes; novos ids só mediante emenda de contrato aprovada). Nunca deriva do título." `pattern "^l[0-9]{2}$"` e `estimatedMinutes.enum [3,4,5]` inalterados (l24–l26 já válidos pelo padrão).

**(C) `curriculum/ai-literacy/catalog.yaml`**
1. Cabeçalho (comentário): "Fonte de verdade do índice: 17 lições públicas de IA na Prática (l01–l14 + onda de continuação l18–l20) e 6 lições da trilha Dev," → "…20 lições públicas de IA na Prática (l01–l14 + ondas de continuação l18–l20 e l24–l26) e 6 lições da trilha Dev,". (O 6 da trilha Dev **não** muda.)
2. Novo módulo (após mod-06, no bloco `modules`):
   ```yaml
     - id: mod-07
       slug: 07-ia-alem-do-texto
       title: "IA além do texto"
       order: 7
       journey: ia_pratica
       skillIds: [pedir, avaliar, proteger, aplicar]
   ```
3. Três entradas de lição `planned` ao final do bloco `lessons` (literais):
   ```yaml
     # Módulo 7 — IA além do texto (onda l24–l26, spec AID-528 rev 3)
     - id: l24
       moduleId: mod-07
       title: "Anexe, cole ou descreva"
       objective: "Diante de uma tarefa que depende de um documento ou imagem, escolher entre anexar o arquivo, colar um trecho, descrever de memória ou não enviar — e escrever o pedido referenciando o que o anexo contém."
       estimatedMinutes: 4
       prerequisites: [l18]
       skillIds: [pedir, avaliar]
       status: planned
     - id: l25
       moduleId: mod-07
       title: "Anexos seguros: proteja antes de enviar"
       objective: "Antes de anexar fotos, scans ou PDFs a um pedido, classificar o conteúdo como seguro ou sensível e remover ou tampar o que expõe pessoas."
       estimatedMinutes: 4
       prerequisites: [l12]
       skillIds: [proteger]
       status: planned
     - id: l26
       moduleId: mod-07
       title: "Confira o que a IA extraiu"
       objective: "Diante de uma extração feita de um documento anexado, conferir os campos críticos contra o trecho original e corrigir divergências antes de usar a saída."
       estimatedMinutes: 4
       prerequisites: [l20]
       skillIds: [avaliar, aplicar]
       status: planned
   ```
4. `contentVersion`: bump `YYYY-MM-DD.N` na data do merge da emenda (vigente `"2026-09-01.1"`).

**(D) `engines/codexdojo-os-prototype/config/mission-bindings.yaml`** (fora da emenda documental; muda só nas tarefas de produção)
- Por tarefa (1 lição): binding `kind: ai-literacy-lesson`, `trackId: ai-pratica`, `chapterOrder` 18/19/20, prereqs canônicos ([l18]/[l12]/[l20]), `runtime.engineId: literacyDojo` + entrypoint `http://127.0.0.1:5178/?hosted=1` + `VITE_LITERACYDOJO_URL` + `protocolVersion "1.0"` + `contentVersion` vigente no merge da tarefa, `evidence: literacy-evidence v1 / verifierRequired: true`, `fallback.kind: dom` (summaries §2); `tracks[ai-pratica].contentVersion` bump no primeiro binding da onda (vigente `"2026-09-01.1"`).

**Inalterado por decisão explícita:** os 7 tipos e suas regras de avaliação; `estimatedMinutes ∈ {3,4,5}`; regras de migração de progresso (ids novos = lições novas; nenhuma lição existente editada); contrato de evidência `literacy-evidence` v1; `mission_catalog_rules.py` (l24–l26 em append satisfazem contiguidade ai-pratica 1–20, prereqs canônicos mesmo-track resolúveis e acíclicos, preservação de identidade, entrada `l02` intacta); skills (nenhuma nova — mod-07 reusa [pedir, avaliar, proteger, aplicar]); nenhum binding existente editado (dev ch 1–13 intacto).

## 4. Switch b→a — FECHADO (registro, sem briefs vivos)

A janela de switch da rev 1 §4 ("até a abertura da issue T0") foi **encerrada pela decisão CEO AID-576/A (O2)**. O fallback (a) "Rotina com IA II" e seus deltas/briefs (rev 1 §4/§5, ids l21–l23 do mapa pré-onda-dev) ficam **preservados apenas como registro histórico** na revisão `8efcccd3` — não são re-id'd para l24–l26 e não são switch vivo desta onda. Se uma janela futura quiser o tema (a), será objeto de spec própria com re-baseline. Desvio da ressurreição "puramente mecânica" divulgado: os §4/§5 da rev 1 não são carregados como texto executável (eram o mecanismo do switch, agora morto); todo o conteúdo de autoria do candidato (b) (rev 1 §2) segue integral e re-id'd.

## 5. Riscos de aprendizagem R1–R6 (case UX §4) → campos deste spec

| # | Risco | Onde vive no spec (b) | Verificação |
| --- | --- | --- | --- |
| R1 | Expectativa de upload real (lição é simulação textual) | Convenções §2 (copy honesta "na sua ferramenta você faria X"; cenários com trechos concretos em `scenario`/`responseText` de toda atividade); instruction/feedback de l24-a1/a2 | Teste moderado 3(iii): 0 abandonos por quebra de expectativa (case §5.3) |
| R2 | Excesso de confiança em extração | l26 inteira: a1 extração↔conferência pareada, a2 campos que exigem verificação (sinais l20), a3 sort com etapa de conferência obrigatória; nota de escopo §2.3 | Teste 3(i) ≥80%; QA confere `requiredCriterionIds` de l26-a1 |
| R3 | Regressão "foto não é texto, logo não é sensível" | l25-a1 (7 itens foto/scan/PDF com PII; `onFailure` "o formato não muda a regra"); l24-a1 opção (e) "não enviar"; l25-a2/a3 (tampar antes; mitos de proteção) | Teste 3(ii) ≥80% classifica anexo com PII como sensível antes de anexar |
| R4 | Envelhecimento vendor/ferramenta | Vendor-neutral por contrato (§2 convenções; padrão do catálogo l01–l23: zero citações de produto de IA) | Checklist item 7 (readiness §3.1) + QA grep de nomes de produto no YAML da onda |
| R5 | Vocabulário novo no primeiro contato | Zero termos novos: skillIds ⊂ {pedir, avaliar, proteger, aplicar}; módulo sem skill nova (§3 inalterado); "anexar/colar/descrever" são cotidianos; títulos ≤8 palavras; hints em linguagem simples | Checklist item 6; QA de leitura; `validate.py`/schema (skills existentes apenas) |

(R6 era condicionante exclusivo do fallback (a) — switch fechado §4; risco não existe no candidato (b).) Confiança no loop tentativa→feedback: feedback determinístico + hints 1–3 + `onFailure` obrigatório já exigidos pelo build (lição AID-448 absorvida no contrato).

## 6. Pipeline de produção, portas e esforço (padrão AID-426/AID-471/AID-531; estrutura herda readiness AID-525)

**Sequência (portas sequenciais):**
1. **T0 — Emenda de contrato (board-gated, regra 7):** texto §3; **gate preservado** — o aceite da ORDEM AID-576/A autoriza o pipeline, e a confirmação do board para a emenda é o card `request_confirmation` na thread da AID-577 (empacotamento delegado ao System Designer pela ordem; idempotência `confirmation:aid577:t0:l24-l26:v1` contra esta rev). Aceite do board → issue T0 para o FPE (texto LITERAL do §3 — não reinterpretar; precedentes PR #199 e emenda l21–l23). **Aceite técnico da T0:** `validate.py` verde; `gen:content` verde; standalone exibe mod-07 "em breve" (`hasContent: false`); zero mudança de comportamento; CI verde.
2. **T1–T3 — Produção** (1 lição = 1 tarefa, FPE; autoria CD com template/checklist readiness §2/§3 — 8 checks/lição antes de entregar draft): arquivo `modules/07-ia-alem-do-texto/lNN-*.yaml` (§2, `version: 1`; slug do arquivo conforme convenção do módulo) + flip `ready` + binding lNN (chapterOrder 18/19/20) + bump `tracks[ai-pratica].contentVersion` no primeiro + testes de fixture + regen de readiness. Aceite (porta FPE): `validate.py`; `gen:content`; read model contém a lição em mod-07; mission catalog verde (contiguidade ai-pratica 1–20 ao fim da onda, prereq canônico preservado, entrada `l02` intacta); missão jogável hosted + fallback DOM; evidência `literacy-evidence` v1 com `verifierRequired: true`; CI verde.
3. **Promoção única** ao fim (nenhum deploy intermediário com lição parcial; padrão C1–C3/onda dev): pins/alias/permalink + rollback owner + precheck estendido à onda (motor hosted das novas lições, contentVersion, mapa 30→33, contagens ia_pratica 20).
4. **QA wave-level independente** (issue da QA Lead ca6a3f95; produtor ≠ verificador; padrão AID-412/AID-444/AID-464/AID-553): GO/NO-GO + re-grant de readiness são propriedade da QA; inclui a11y (teclado/ARIA/`aria-live`/reflow@320 — critério 4 do case) e grep vendor-neutral (R4).
5. **Rastreabilidade:** comentário de landing por tarefa na issue de produção; registro `_work-products/AID-<ordem>/WAVE-PROMOTION-<pin>.md`; desvios do spec divulgados no landing (precedente T0/T1).

**Ordenação e paralelismo:** T0 → (T1 ∥ T2 ∥ T3 — prereqs todos canônicos, §1.3; se paralelizadas, merges em ordem de chapterOrder 18→19→20 para evitar rebases de `contentVersion`) → promoção → QA. Ordem de produção recomendada l24 → l25 → l26 (entrada do módulo fecha a promessa da l03 e destrava o vocabulário de anexo usado pelas demais; l25 reduz o risco de segurança ativo cedo; l26 fecha o arco sobre l20).

**Esforço (readiness §4 + AID-526 + AID-559):** spec rev 3 ≈15–30 min (EXECUTADA nesta rev — ressurreição mecânica + re-gate); CD ≈6–7h (cenários descritivos +10–20% vs a — drafts das 3 lições + revisões pós-validação, 2–3 heartbeats); FPE ~2h wall-clock T0–T3 + promoção (precedente C1–C3/onda dev); QA 1 ciclo. **Onda mínima viável: l24+l25** (prefixo estrutural — contiguidade do chapterOrder; ver §1.3).

## 7. Método de verificação

- **Deste spec (executado):** leitura integral das fontes em `origin/main` @ `45a01a49` via `git show`/`git grep`/parse (workspace intocado — nenhuma escrita); re-gate do checklist de leitura: catálogo 23/23 `ready` 0 `planned` (`contentVersion "2026-09-01.1"`, header 17+6, módulos mod-01–mod-06); contrato (`vigentes l01..l23`, `mod-01..mod-06`, "(23 após a onda l21–l23)" ×2, regra 7 "após `l23`: `l24`"); schema (description `l01..l23`, pattern aceita l24–l26, enum [3,4,5]); bindings parseados (30 missões; `ai-pratica` ch 1–17 **contíguo** ⇒ 18/19/20 livres; `dev` 1–13 contíguo; entradas `l02`/`game-02-warehouse`); âncoras l18/l12/l20 `ready`; `rubric_review` 3× (l09-a1, l16-a2, l22-a1); validade estrutural de l24–l26 contra `lesson.schema.json` e `mission_catalog_rules.py`; re-ids conferidos 1:1 contra a lista mecânica (AID-558 §2.O2 + CD AID-559 + ORDEM AID-577); rev 1 `8efcccd3` difada item a item (nenhum conteúdo de autoria alterado além da nota §2.3 e do fechamento §4, ambos divulgados).
- **Da onda (quando aprovada):** gates do §6 por tarefa + promoção única + QA independente; eficácia pedagógica NÃO é presumida por este spec — teste moderado (case §5.3, critérios 3(i)–(iii)) e funil OP-B (quando ligar) são os instrumentos, propriedade do UX; tripwire de retrabalho do case §5 (conclusão do mod-07 abaixo da mediana OU teste <80%) permanece vigente para l27+.

## 8. Decisões explicitamente reservadas (não tomadas aqui)

1. **Aprovação da emenda T0** — board, via `request_confirmation` na AID-577 (regra 7; texto pronto no §3; a escolha do candidato já foi decidida pela ORDEM AID-576/A — o card confirma a emenda, não reabre O1/O2/O3).
2. **Timing de promoção e GO de QA** — gates de produção/QA (§6), não deste spec.
3. **Eficácia pedagógica e prioridade de l27+** — UX Designer de Aprendizagem com evidência de coorte/funil (coorte n=2 permanece direcional; nada de `mastered`; analytics ≠ evidência).
4. **Candidato da próxima onda** — board/CEO (registrado na proposta AID-558 §3.6: O1 como candidato da próxima janela dev; O3-C1 após funil OP-B com ruling de migração; nenhuma produção começa por estes registros).
