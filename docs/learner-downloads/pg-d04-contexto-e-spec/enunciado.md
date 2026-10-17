# pg-d04 — Prática guiada: pacote de contexto + PRD/SPEC de tarefa pequena

**Trilha:** Dev (jornada por competências, AID-3453) · **Unidade:** U09
(SEQUENCIA.md §2) · **Competência primária:** D2 (intenção/spec/plano) ·
**Apoio:** D3 (construção)
**Âncoras:** curso-simples M4 (Context Engineering §4.1–4.4) e M5 (PRD e
Specs §5.1–5.4) — `docs/curso-simples/index.html`, blob `2bcf99fbd831`;
exemplo real completo `docs/curso-simples/workflow-exemplo/` (`CONTEXTO.md`
blob `9fbc21127ea2`, `PRD.md` blob `2b4deb2764fe`, `SPEC.md` blob
`1d5c696c3bb2`); gates de plano completo `docs/curso/workflow_lab/fixtures/`
(`05-cycle-05.json` blob `dee137438663`, `06-cycle-06.json` blob
`90df4afde0c3`).
**Pré-requisitos:** U03 (pg-d02 — pedido de 5 campos) ou equivalente.
**Duração alvo:** 25–40 min (uma sessão, cadência da escola).

## Objetivo observável

Dado o pedido real (fictício) de `insumos/PEDIDO.md` — o e-mail da Bia sobre
o planejador `rodadia` — e o inventário neutro `insumos/inventario-repo.txt`,
produzir **três documentos** (`CONTEXTO.md`, `PRD.md`, `SPEC.md`) tal que:

- **(a)** o CONTEXTO declare, em duas tabelas (incluído/excluído), **cada
  linha com justificativa**, o menor conjunto de arquivos e regras que torna
  a tarefa inequívoca (M4 §4.1–4.2) — sem ruído (dependências, builds,
  lockfiles, logs sem recorte, segredos, views geradas) e sem omitir o
  indispensável;
- **(b)** o PRD transforme a necessidade em **uma tarefa de até 30 min**
  (limite explícito no documento), com Fora de escopo nomeando **pelo menos
  dois** dos extras que o pedido embute (M5 §5.1: "o campo mais
  subestimado");
- **(c)** o SPEC feche as decisões antes do build: interface exata, os três
  casos de borda fixados abaixo **decididos** (B1/B2/B3), arquivos
  permitidos (allowlist), não-metas e estratégia de teste — cada critério de
  aceite do PRD é um teste em linguagem humana, **pelo menos um citando
  comando executável** (M5 §5.2–5.3: "se você não consegue imaginar o teste,
  o critério ainda está vago").

## Os três casos de borda (fixados; decididos pelo seu SPEC)

- **B1** — ciclo em `depends_on` (`a` espera `b`; `b` espera `a`): ordena,
  ignora ou erro? Com que mensagem/código?
- **B2** — tarefa citando dependência que não existe na lista
  (`depends_on: ["deploy"]` sem `deploy`): ignora, dropa ou erro?
- **B3** — lista de tarefas vazia: plano vazio ou erro?

Um SPEC que não decide B1/B2/B3 deixou decisões para o modelo tomar por você
(M5 §5.2: "se a spec ainda deixa o agente escolher uma decisão importante,
ela não está pronta"). Os gates do workflow_lab (ciclo 05: "referências
válidas e DAG"; ciclo 06: "fonte e destino válidos") são o precedente real
dessa disciplina no repo.

## O ciclo guiado (exemplo → tentativa → feedback → retry → takeaway)

### 1. Exemplo trabalhado (≈ 8 min)

Leia `exemplo-trabalhado.md` (fontes reais do repo: o CONTEXTO/PRD/SPEC do
workflow-exemplo e os fixtures 05/06 do workflow_lab, com saídas reais
executadas). Não pule: a sua tentativa aplica a mesma disciplina a um pedido
novo.

### 2. Tentativa (≈ 20 min)

Com o pedido em `insumos/PEDIDO.md` e o inventário em
`insumos/inventario-repo.txt` (não use outro repositório — o caminho avaliado
é este), faça **nesta ordem**:

1. **Disseque o pedido**: circule no e-mail da Bia (i) as entregas embutidas
   (são cinco — conte-as) e (ii) as decisões que ficaram implícitas (B1/B2/B3
   + "não quebrar nada" + "rodar bonito no Windows"). Registre as contagens.
2. **Classifique o inventário**: para cada caminho do inventário, decide
   entra/não entra **e por quê** (checklist M4 §4.2: incluir ① regras
   permanentes ② PRD e spec ③ arquivos diretamente relacionados ④ testes e
   contratos existentes ⑤ recortes que explicam o problema; excluir build,
   dependências, logs sem recorte, segredos, sem relação, views geradas).
3. **Escreva `CONTEXTO.md`** com duas tabelas — Incluído/Excluído, cada
   linha com o porquê (M4 §4.4: "se você não consegue justificar por que um
   arquivo entra, ele não entra"). Cite os caminhos **como aparecem no
   inventário**.
4. **Escreva `PRD.md`** no formato mínimo do M5 §5.1 (Problema, Usuário,
   Objetivo, Escopo, Fora de escopo, Critérios de aceite, Riscos), com o
   **limite de 30 min declarado** e o Fora de escopo cortando ≥2 extras do
   pedido. Lembre: "pedidos com múltiplos 'e também' produzem entregas
   medíocres" (M5 §5.1).
5. **Escreva `SPEC.md`** fechada (M5 §5.2): interface com assinatura exata,
   ≥3 casos de borda numerados decidindo B1/B2/B3, arquivos permitidos
   (allowlist), estratégia de teste, ordem de implementação e não-metas.
6. **Auto-check mecânico**: `python3 insumos/verifica_contexto_spec.py
   <dir-da-sua-entrega>` — `veredito: met` antes de pedir feedback. O
   verificador checa o piso de formato (tabelas com justificativa, caminhos
   que resolvem no inventário, ruído banido, seções do PRD, limite 30 min,
   aceite executável, SPEC fechada) — a rúbrica revisa substância acima dele.

Guarde: as contagens do passo 1, a classificação do passo 2, os três
documentos e a saída do verificador — é o seu recibo da prática.

### 3. Feedback (rúbrica)

Avalie sua entrega contra `rubrica-v1.md` (7 critérios objetivos, com
pergunta de verificação executável por critério). Se houver revisor
disponível, peça leitura com a mesma rúbrica — incluindo os vereditos B1/B2/B3
dele contra o seu SPEC. A rúbrica é o contrato, não gosto.

### 4. Retry (se algum critério não passar)

Refazer **apenas** o critério reprovado, não a prática inteira: exemplo — se
`c5-aceite-verificavel` falhou (critério vago), reescreva só os critérios de
aceite como testes em linguagem humana com comando e resultado esperado, e
re-avalie só esse critério. Retry é parte do método, não punição.

### 5. Takeaway (≈ 5 min)

Responda em duas frases: (a) qual das cinco entregas embutidas você manteve
e por que ela sozinha cabe em 30 min; (b) qual linha do seu CONTEXTO mais
protegeu a entrega de virar cinco medíocres — a inclusão de um contrato ou a
exclusão de uma view gerada? Arquive junto com o recibo.

## Limites explícitos

- Nenhum passo exige rede, conta, chave ou segredo; o repo `rodadia` é
  **fictício** — só o PEDIDO e o inventário são dados, e todo caminho citado
  deve resolver no inventário.
- Esta prática avalia os **documentos** (CONTEXTO/PRD/SPEC), não a
  implementação: você não precisa implementar a ordenação; precisa escrever
  o pacote que a tornaria inequívoca. A "solução que extrapola SPEC" é um
  risco **avaliado na borda**: seu allowlist de arquivos permitidos e suas
  não-metas são o que o impediria.
- Não avalia elegância, velocidade nem resultado de alunos; não cria/altera
  lição, módulo, engine, runtime, progresso ou gates; não duplica pg-d02
  (U03: pedido de 5 campos — aqui nasce o pacote completo de contexto e o
  PRD/SPEC de uma feature nova), pg-d01/pg-d03 (debug/refatoração), tp-d01
  (transferência) nem a fatia de app AID-3527/3643.
- Solução separada em `guia-de-correcao/` — consulte **após** a tentativa.
