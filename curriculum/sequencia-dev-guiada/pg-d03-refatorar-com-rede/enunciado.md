# pg-d03 — Prática guiada: refatoração com rede de segurança (comportamento é o contrato)

**Trilha:** Dev (jornada por competências, AID-3453) · **Unidade:** U07
(SEQUENCIA.md §2) · **Competência primária:** D4
(teste/debug/review/manutenção)
**Âncoras:** lição `l28` — "Refatore com assistente sem quebrar
comportamento" (`curriculum/ai-literacy/modules/05-dev-contexto-e-escolha/l28-refatore-com-assistente-sem-quebrar-comportamento.yaml`,
blob `386c27fe1a6b`) + workflow testado `03-refatorar-seguro`
(`dev-workflow-claude/workflows/03-refatorar-seguro/RESULTADO.md`, blob
`93087764ac38`). **Pré-requisitos:** l21 (U04, pedir testes) e pg-d01
(U06, reprodução antes do diagnóstico) ou equivalentes.
**Duração alvo:** 25–40 min (uma sessão, cadência da escola).

## Objetivo observável

Dado o pedido de refatoração fixo de `insumos/PEDIDO.md` (com a proposta
anexa do assistente) sobre a fixture `insumos/fixture/pedidos.py`, **executar
o ciclo de refatoração com rede de segurança** tal que:

- **(a)** antes de tocar no código: baseline da suíte existente registrado
  E teste(s) de **caracterização** escrito(s) para pelo menos um observável
  do `CONTRATO.md` que a suíte não cobre — verde sobre o código original;
- **(b)** a proposta do assistente é **julgada com evidência**: aplicada (ou
  lida com precisão de diff), mostra passar na suíte existente E violar o
  contrato no seu teste de caracterização — o contraexemplo observado;
- **(c)** a refatoração final é feita em ≥2 passos pequenos e nomeados,
  suíte + caracterização verde após **cada** passo, vermelho ⇒ passo
  revertido (não "consertar pra frente"), diff final confinado ao objetivo.

A regra da casa que esta prática instala (l28): **suíte verde é pré-condição
necessária, não prova de ausência de regressão — a suíte só enxerga o que
ela cobre.** Ninguém aqui vai dizer "está verde, então não quebrou nada";
você vai provar que a rede enxerga o comportamento que importa.

## O ciclo guiado (exemplo → tentativa → feedback → retry → takeaway)

### 1. Exemplo trabalhado (≈ 8 min)

Leia `exemplo-trabalhado.md` — o caso real do workflow `03-refatorar-seguro`
do repo (CLI `tempo`, Node puro), com baseline 4/4, plano declarado com
"o que NÃO muda", 2 passos com suíte no meio e diff final provando que
`test/` não mudou. Não pule: a sua tentativa aplica a mesma disciplina a um
caso onde **a suíte existente não cobre todo o contrato** — o exemplo não
te dá a resposta, te dá o método.

### 2. Tentativa (≈ 20 min)

Com `PEDIDO.md`, `CONTRATO.md`, `proposta-refatoracao.md` e a fixture em
`insumos/fixture/`, faça **nesta ordem**:

1. **Baseline verde (pré-condição)**: `PYTHONPATH=insumos/fixture python3
   insumos/fixture/testes.py` — registre comando e saída. Suíte vermelha ⇒
   pare: refatoração sobre base vermelha é proibida (wf 03, regra 1).
2. **Mapeie a cobertura contra o contrato**: leia o `CONTRATO.md` e a
   suíte e responda: quais cláusulas (C1–C5) a suíte **não** enxerga?
   Dica honesta: misture dois problemas no mesmo pedido e olhe a trilha
   `AUDITORIA` de um pedido que falha validação.
3. **Escreva o teste de caracterização que falta** (arquivo NOVO, sem
   editar `testes.py`): cubra ≥1 observável descoberto no passo 2. Rode-o
   contra o original: tem que estar **verde** — caracterização descreve o
   comportamento atual, não o desejado.
4. **Julgue a proposta com evidência**: aplique a proposta do assistente
   numa cópia (ou use o diff do código dela) e rode: (i) a suíte
   existente — anote o resultado; (ii) o seu teste de caracterização —
   anote o resultado e a mensagem exata. Suíte verde + caracterização
   vermelha = **mudança silenciosa de comportamento**: a proposta passa
   exatamente onde a rede tem buraco. Registre qual cláusula do contrato
   foi violada e decida: rejeitar/retrabalhar — com motivo citado, não
   com "não gostei".
5. **Refatore você, em passos pequenos**: ≥2 passos nomeados (ex.:
   "extrair validação preservando prioridade", "extrair formatação"),
   suíte + caracterização após **cada** passo. Vermelho ⇒ reverte o passo
   e faz diferente — não conserta pra frente.
6. **Diff final e smoke**: confirme que `testes.py` não foi editado, que o
   diff toca só o necessário para o objetivo do pedido, e rode um caso
   observável ponta a ponta (`python3 -c` chamando `fechar_pedido`).

Guarde: registros do baseline, da caracterização verde, do contraexemplo da
proposta (com as duas saídas: suíte E caracterização), dos passos com
verde no meio, e do diff final — é o seu recibo da prática.

### 3. Feedback (rúbrica)

Avalie sua entrega contra `rubrica-v1.md` (7 critérios objetivos com
pergunta de verificação executável por critério). Se houver revisor
disponível, peça leitura com a mesma rúbrica. A rúbrica é o contrato, não
gosto.

### 4. Retry (se algum critério não passar)

Refazer **apenas** o critério reprovado, não a prática inteira: exemplo —
se `c3-armadilha-executada` falhou (você aceitou a proposta sem rodar a
caracterização contra ela), aplique-a numa cópia agora, capture as duas
saídas e re-avalie só esse critério. Retry é parte do método, não punição.

### 5. Takeaway (≈ 5 min)

Responda em duas frases: (a) por que "a suíte ficou verde" **não** provou
que a proposta do assistente preservava o comportamento — e o que provou;
(b) qual parte da rede (baseline / caracterização / passos pequenos /
diff) mais protegeu a sua entrega de virar regressão silenciosa. Arquive
junto com o recibo.

## Limites explícitos

- Nenhum passo exige rede, conta, chave, segredo, framework ou ferramenta
  paga: Python 3 padrão (stdlib) resolve tudo, offline.
- Esta prática avalia o **processo de refatorar com rede de segurança**,
  não a elegância do resultado nem velocidade; não há bug a consertar na
  fixture (isso foi pg-d01) — há um **contrato a preservar**.
- A fixture é fictícia e determinística (cantina); nenhum dado de aluno,
  `learner/`, runtime, engine, lição, módulo ou gate é criado/alterado.
- Não confunda com tp-d01 (transferência: avaliar sugestão em fixture
  inédita): aqui você **executa** o ciclo completo de refatoração.
- Solução e vereditos de referência ficam em `guia-de-correcao/` —
  consulte **após** a tentativa (o guia não é referenciado por nenhum
  passo acima de propósito).
