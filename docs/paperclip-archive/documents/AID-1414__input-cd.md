<!-- issue: AID-1414 | key: input-cd | doc_id: 8d4967ed-cd39-4612-bb86-359a9c77b69f | updated: 2026-09-11 17:24:55.75+00 -->

# Input CD — countersign copy R1 (7 tipos) + leitura game-02 (Q1–Q3) → spec F1 rev 31c7fba2

(AID-1414)

# Input CD — AID-1414 → spec F1 (AID-1221) rev `31c7fba2` §5

**Veículo:** child issue AID-1414 (criada pelo System Designer). **Autor:** Content Designer (f2b1e95d). Respondido contra a spec **rev `31c7fba2`** (doc `spec` na AID-1221), com verificação first-hand no clone read-only do main `32545321`.
**Fronteira respeitada:** nada aqui edita `curriculum/` nem produz conteúdo — é countersign de copy (R1), leitura de conteúdo (R4/P-B) e declaração de fronteira (§5.3). Incorporação na porta de revisão R5 (D-1412-1 §2.2); copy não reabre gate.

## Q1 — Frases first-touch (R1): mapa countersignado dos 7 tipos

A spec registra default apenas para `output_comparison`; o mapa abaixo **é** o default faltante + countersign do exemplo. Verificado contra o contrato (`docs/design/ai-literacy/content-contract.md`, tabela de tipos), o `ActivityRenderer` e todo o catálogo atual — todos os 7 tipos ocorrem como 1ª atividade (choice ×12, prompt_builder ×6, safety_classification ×4, output_comparison ×3, sort ×3, missing_context ×2, rubric_review ×2), então o mapa inteiro é exercitado.

| Tipo | Frase countersignada |
| --- | --- |
| `choice` | "Você vai escolher as suas respostas entre opções prontas — só clicar, nada de digitar." |
| `sort` | "Você vai colocar as partes na ordem certa com as setas — nada de digitar." |
| `missing_context` | "Você vai ler um pedido que saiu torto e marcar o que estava faltando — só marcar, nada de digitar." |
| `safety_classification` | "Você vai classificar cada item em duas categorias — só clicar, nada de digitar." |
| `prompt_builder` | "Você vai montar um pedido preenchendo campos curtos — escrever pouco e direto, sem texto longo." |
| `output_comparison` | "Você vai comparar duas respostas da IA e marcar os motivos — nada de digitar." *(default da spec, countersignado sem mudança)* |
| `rubric_review` | "Você vai avaliar uma resposta critério por critério — só marcar, nada de digitar." |

Rationale e guards de drift (por que estas redações):

1. **`choice` em número-neutro.** O catálogo mistura single-select (l01-a1) e `multiSelect: true` (l03-a1, l05-a2, l10-a1…); "escolha a resposta" (singular) driftaria no multi.
2. **`safety_classification` sem nomear as categorias.** Os rótulos são conteúdo por lição e variam: "Seguro para compartilhar"/"Sensível — não compartilhar" (l12), "Pode ir para a IA"/"Fica de fora" (l14), "Seguro (pode ir ao cliente)"/"Sensível (só no backend)" (l17), "Cópia com revisão leve"/"Revisão profunda obrigatória" (l23). Frase type-gênerica ("duas categorias") não drifta; os rótulos reais aparecem na própria atividade.
3. **`sort` = "partes" + "setas".** Itens não são sempre passos ("Ordene o ciclo…", l01-a2) e o `SortView` reordena com botões ↑/↓ (`components/SortView.tsx:50-69`), não drag-and-drop — a frase espelha a affordance real.
4. **`prompt_builder` sem "nada de digitar".** É o único tipo com produção de texto obrigatória (campos com `minLength`/`mustIncludeAny`). "Escrever pouco e direto" preserva o efeito da R1 (baixar o custo percebido do 1º toque) sem prometer o que a atividade não cumpre — honestidade de esforço, como o padrão pede.
5. **`output_comparison` = "duas".** Verdade em 100% das ocorrências atuais (l02/l08/l26/l28… todas com 2 outputs); o contrato permite ≥2 — se um dia houver 3, a frase drifta. Guard: o fixture por tipo da spec §6 deve cobrir `output_comparison` com `len(outputs)==2` explícito.
6. **`rubric_review` sem "da IA".** `responseText` pode ser resposta de IA ou de pessoa (contrato: "revisa uma resposta"); type-gênerico evita drift.

Notas de colocação (aditivas, para o plan do FPE — sem mudar R1):

- **Lead-in estático:** recomendo o presentation layer renderizar um prefixo fixo (ex.: "Primeiro passo:") antes da frase do tipo, mantendo o mapa `type→frase` verbo-inicial puro — fixture estável e leitura natural na intro (card "Pedido da Vila Lume" → frase → CTA "Começar missão", `LessonScreen.tsx:295-343`).
- **Modo revisão:** a intro de revisão ("Hora de revisar") herda a mesma frase sem variante — funciona como está.
- **Coerência com R2:** o framing default do índice 0 ("tente com o que você sabe; se travar, peça uma dica") ecoa a copy existente do MentorGuide da intro ("Tente com o que você já sabe. Se travar, peça uma dica — ela ajuda sem entregar a resposta", `LessonScreen.tsx:328`) — mesma voz, sem conflito. Countersign informal: manter "se travar, peça uma dica" idêntico nos dois pontos.

## Q2 — game-02-warehouse (R4/P-B): o entry NÃO comunica a 1ª ação no caminho hospedado

Verificado first-hand (main `32545321`):

| Fato | Fonte |
| --- | --- |
| Missão hospedada no OS **auto-inicia**: o callback de launch chama `game.start()` se a fase é `"briefing"` — a fase de briefing não é exibida no caminho hospedado | `engines/voxelDojo/game-02-warehouse/src/main.ts:42-44` |
| 1ª ação real = clique numa prateleira: "Caixa 1 de 12: {chave} — clique na prateleira para a qual a chave faz hash" | `game/scene/hud.ts:55-57` |
| Conteúdo do briefing (standalone; lesson+passRule permanecem no HUD durante o jogo): "Uma caixa sempre cai na prateleira para a qual sua chave faz hash. Mesma chave ⇒ mesma prateleira." + "Acerte a prateleira de ≥80% das caixas que chegam." | `game/sim/levels.ts:43-55`; `hud.ts:31-39` |
| Brief pré-entry no OS (mapa): "12 min · Comparar mapas e dicionários sob carga concorrente e persistência simples." | `engines/codexdojo-os-prototype/src/data/missions.ts:826-847`; `src/journey/MapScreen.tsx:87` |
| Zero affordance de dica no jogo (nenhum "dica"/hint em src; `getTruth` serve só ao smoke test) | `game/controller.ts:250-253` |

**Resposta direta:** não — no caminho hospedado (a porta que o aprendiz dev usa), o que conta como primeira ação **não é comunicado antes de acontecer**: o "Começar missão" do OS cai direto na Caixa 1 com instrução em jargão ("a chave faz hash"). No standalone o briefing existe, mas comunica a **regra** (lesson + passRule), não uma demonstração da 1ª ação — não há modeling entre a regra de 1 linha e a aplicação imediata.

**Fricção de conteúdo conhecida (hipóteses de conteúdo, consistentes com P-B n=1 — para testar, não para agir):**

1. **Gap de expectativa no brief do OS:** o objective promete "comparar mapas e dicionários sob carga concorrente e persistência simples"; a 1ª ação é prever prateleira por hash. Nem "comparar", nem "carga concorrente", nem "persistência" descrevem o 1º minuto (L1 não tem concorrência) — quem lê o brief não consegue prever o que vai fazer.
2. **Salto de vocabulário:** "fazer hash" como verbo assume que chave→hash→prateleira já é conhecimento ativo; a lesson line afirma a regra, não a ensina.
3. **Sem rede de segurança:** diferentemente da literacy (3 dicas + "Pedir dica"), o WAREHOUSE não tem caminho de apoio interno — se o conceito não aterra na 1ª caixa, resta errar ou sair.

**Sondas oferecidas ao roteiro O1 dev (AID-641):** (i) pré-start, vendo o card no mapa: "O que você acha que vai fazer nesta missão?" (testa 1); (ii) 1ª caixa na tela: "Com suas palavras: o que o pedido está pedindo? Qual botão você clicaria?" (testa 2); (iii) se >30s sem clique: "O que está faltando para você decidir?" (testa 3).

**Candidatos de conteúdo para a emenda data-gated** (só se o disparador ≥3 starts/0 submissões acender; ordem apresentação-primeiro): (a) linha first-touch no meta da missão WAREHOUSE no OS espelhando o padrão R1 (ex.: "Você vai prever em qual prateleira cada caixa cai — só cliques, nada de digitar"); (b) caixa-demo trabalhada antes da 1ª predição pontuada; (c) rewording plain-language da linha de status L1. Nada disso agora — R4 mantém o jogo byte-idêntico.

## Q3 — Declaração de fronteira: CONFIRMADO

Ordem/tipo da 1ª atividade é currículo canônico; esta spec não o muda (R7). Se a refutação de P-A apontar "carga do tipo 1º" ("saiu na 1ª atividade" com dwell `1-5min` dominante), o encaminhamento é escalar ao curriculum ownership: **child issue nova, owner CD, gate board** — emenda ao contrato/catálogo só via board, com o dado refutador anexado (célula `briefExposure` + dwell). Como CD, assumo a autoria dessa child quando o sinal chegar; não a abro antes do dado.

## Veredito

Nenhuma divergência estrutural com a spec rev `31c7fba2`: R1 ganha o mapa completo countersignado (com os guards de drift que a §6 já previa); R4/P-B ganha a leitura de conteúdo — o fato novo é que **o caminho hospedado pula o briefing** (auto-start no launch), o que torna as sondas O1 dev acima diretamente acionáveis; Q3 confirmado com roteiro de escala. A spec está prata para o gate do owner com estes refinements incorporados na porta R5.

Input entregue via AID-1414 (colaboração obrigatória D-1412-1 §2.1). Nada de código ou currículo tocado; gates permanecem com o lead (System Designer) e o owner.
