# pg-d05 — Prática guiada: delegação controlada (você é o controlador)

**Trilha:** Dev (jornada por competências, AID-3453) · **Unidade:** U10
(SEQUENCIA.md §2 — "Execução guiada e agentes") · **Competência
primária:** D6 (agentes/tools/skills) com D2 (intenção/spec/plano)
**Âncoras:** curso-simples **M6–M8**
(`docs/curso-simples/index.html`, blob `2bcf99fbd831`) + workflows
testados `04-revisar-mudancas` (blob `4154bcf80d11`), `07-investigar-erro`
(blob `736a5b267229`) e `11-aprender-com-a-sessao` (blob `345cf0576bdc`) +
workflow_lab ciclos 07–08 (blobs `bd2a4cfdb5eb`/`72c30aa71c38`), todos na
base `e01d9d42`. **Pré-requisitos:** pg-d03 (U07, refatoração com rede de
segurança) ou equivalentes. **Duração alvo:** 25–40 min (uma sessão).

## Objetivo observável

Você delegou a **fatia 2** do `insumos/PLANO-APROVADO.md` (extração da
validação de `emprestar`) a um agente produtor. A entrega dele chegou
(`insumos/delegacao-r1/`). Dado o plano aprovado, o `CONTRATO.md` e a
fixture, **executar o ciclo de delegação controlada** tal que:

- **(a)** a rodada **r1 é rejeitada com evidência mecânica**: diff fora
  do escopo do plano (arquivo proibido + arquivo fora da allowlist)
  identificado pelo verificador de escopo — não "no olho";
- **(b)** a alegação do produtor ("suíte 6/6 verde, nada fora do
  escopo") é **decomposta em evidência própria**: você re-executa tudo,
  descobre QUEM tornou a suíte verde (um teste editado) e o que a
  alegação omitiu (o aceite V3 congelado, que diverge);
- **(c)** o veredito de rejeição cita as cláusulas do plano/contrato
  violadas e define o retrabalho — e a rodada **r2 é aceita somente**
  com escopo ok + suíte verde com `testes.py` byte-idêntico + V3 igual
  ao congelado, tudo registrado em recibo próprio;
- **(d)** a sessão vira **skill reutilizável** (gatilho + passos +
  armadilha real), com a checagem mecânica validada nos dois sentidos
  (falha com r1, passa com r2).

A regra da casa que esta prática instala (curso-simples M7): **produtor
≠ verificador — o verificador começa do contrato e dos artefatos, nunca
da narrativa de quem produziu.** E a sua base (wf 04): suíte verde não
é aprovação; achado grave precisa de prova executável.

## O ciclo guiado (exemplo → tentativa → feedback → retry → takeaway)

### 1. Exemplo trabalhado (≈ 8 min)

Leia `exemplo-trabalhado.md` — o caso real do workflow
`04-revisar-mudancas` do repo: proposta com suíte 5/5 verde que ainda
devolvia `"NaNm"` para lista vazia; revisão por lentes com **prova
executável** e veredito PEDIR MUDANÇAS; mais o par produtor/verificador
do M7 e a política estreita fail-closed do ciclo 07. Não pule: na sua
tentativa a alegação do produtor é **parcialmente verdadeira** (a suíte
realmente fica verde) — a mentira está no que ela omite.

### 2. Tentativa (≈ 20 min)

Com `PLANO-APROVADO.md`, `CONTRATO.md`, `insumos/delegacao-r1/` e a
fixture, faça **nesta ordem**:

1. **Contrato primeiro, diff depois** (M7/wf 07): leia o plano e o
   `CONTRATO.md` ANTES de abrir o diff do produtor. Registre no seu
   recibo: allowlist da fatia 2, proibições (E2.1–E2.4) e validações
   V1–V3. Verificador que começa pelo diff herda o viés do produtor.
2. **Escopo mecanicamente**: rode
   `python3 insumos/verifica_delegacao.py escopo insumos/delegacao-r1/diff-r1.patch`
   — registre veredito e as violações citadas (fail-closed; política
   estreita do ciclo 07). Um diff pode ser lido "no olho" e parecer
   razoável — a política não opina, ela delimita.
3. **Alegação → evidência própria**: aplique a r1 numa cópia da fixture
   (`git apply insumos/delegacao-r1/diff-r1.patch` a partir do diretório
   do pacote, sobre uma árvore limpa) e re-execute você mesmo:
   (i) V1 — a suíte fica verde mesmo? (ii) `sha256sum
   insumos/fixture/testes.py` — igual ao `MANIFEST.md`? (iii) V3 — a
   saída é igual ao bloco congelado do plano? Registre comando, exit e
   saída de cada um. Desfaça a aplicação (restaure a fixture) antes de
   continuar.
4. **Veredito de rejeição com retrabalho**: escreva qual cláusula foi
   violada por cada achado (E1 escopo, E2.1 suíte editada, C2 mensagens,
   V3 divergente) e o que o produtor deve reentregar. "Alegação sem
   evidência" e "escopo estourado" são motivos; "não gostei" não é.
5. **Julgue a reentrega r2** (`insumos/delegacao-r2/`): escopo → V1 com
   sha256 de `testes.py` idêntico → V2 (teste novo verde) → V3 igual ao
   congelado. Tudo registrado em recibo próprio (formato do
   `verifica_delegacao.py evidencia`: seções V1/V2/V3 com `comando:`,
   `exit: 0` e saída colada). Só então ACEITE.
6. **Extraia a skill da sessão**: escreva `skill-verificar-delegacao.md`
   no seu espaço de trabalho (gatilho + passos + a armadilha real que
   você pagou nesta sessão; formato M8/wf 11). Valide a checagem nos
   dois sentidos: `escopo` com r1 (deve REPROVAR) e com r2 (deve
   APROVAR) — checagem que nunca foi vista falhando não conta (wf 11,
   passo 5).

Guarde o recibo (preparação, r1: escopo+V1+sha256+V3, veredito com
cláusulas, retrabalho pedido; r2: escopo+V1+sha256+V2+V3+aceite) — é a
evidência da prática.

### 3. Feedback (rúbrica)

Avalie seu recibo contra `rubrica-v1.md` (7 critérios objetivos com
pergunta de verificação executável por critério). Se houver revisor
disponível, peça leitura com a mesma rúbrica — o revisor reproduz seus
comandos, não lê sua conclusão.

### 4. Retry (se algum critério não passar)

Refazer **apenas** o critério reprovado: exemplo — se `c3-evidencia-
propria` falhou (você acreditou na saída colada pelo produtor), aplique
a r1 agora, capture V1/sha256/V3 com seus próprios comandos e re-avalie
só esse critério. Retry é parte do método, não punição.

### 5. Takeaway (≈ 5 min)

Responda em duas frases: (a) por que "suíte 6/6 verde, colada pelo
produtor" **não** provou que a r1 preservava o comportamento — e o que
provou o contrário; (b) qual peça do controle (política de escopo /
re-execução independente / aceite congelado / recibo) mais protegeu você
de aceitar a r1. Arquive junto com o recibo e a skill.

## Limites explícitos

- Nenhum passo exige rede, conta, chave, segredo, framework ou ferramenta
  paga: Python 3 padrão + git local resolvem tudo, offline.
- Esta prática avalia o **processo de controlar uma delegação**, não o
  código da fixture: você não implementa a fatia 2 — você julga quem
  implementou. (Implementar com rede de segurança foi pg-d03.)
- A fixture e o produtor são fictícios e determinísticos; nenhum dado de
  aluno, `learner/`, runtime, engine, lição, módulo ou gate é criado ou
  alterado; `minimumScore`, catálogo e bindings não são tocados.
- Não confunda com U09 (context engineering): aqui o contrato fixo JÁ
  vem aprovado no pacote — a prática começa na delegação, não na
  autoria do plano.
- Solução, vereditos e recibos de referência ficam em
  `guia-de-correcao/` — consulte **após** a tentativa (nenhum passo
  acima o referencia, de propósito).
