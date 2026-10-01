# pg-d02 — Prática guiada: o pedido estruturado de 5 campos

**Trilha:** Dev (jornada por competências, AID-3453) · **Unidade:** U03
(SEQUENCIA.md §2) · **Competência primária:** D3 (construção) · **Apoio:**
D2 (intenção/spec/plano)
**Âncoras:** curso-simples M3 — Prompt Engineering §3.1–3.4
(`docs/curso-simples/index.html`, blob `2bcf99fbd831`) com exemplo
executável `docs/curso-simples/workflow-exemplo/` (`release_notes.py`, blob
`8bbe0fdffcf5`, 22 testes); lição-âncora de pré-req: `l16` (U02).
**Pré-requisitos:** l16 (pedido de código com contexto) ou equivalente.
**Duração alvo:** 25–40 min (uma sessão, cadência da escola).

## Objetivo observável

Dado o pedido real de `insumos/pedido-original.md` (caso-modelo do
workflow-exemplo), **reescrever o pedido nos cinco campos** CONTEXTO /
OBJETIVO / RESTRIÇÕES / ACEITE / NÃO-META, tal que:

- **(a)** o ACEITE seja verificável por comando executável local (offline);
- **(b)** a NÃO-META exclua explicitamente ao menos um escopo plausível
  adjacente que está de fato embutido no pedido original;
- **(c)** um revisor independente consiga dizer, para os dois casos de borda
  B1/B2 (abaixo), se estão dentro ou fora do pedido — **sem perguntar a você**.

## Os dois casos de borda (fixados; decididos pelo seu pedido)

- **B1** — Com o filtro de tipos ativo (ex.: só `feat` e `fix`), o que
  acontece com um commit `docs:` que está no arquivo de entrada?
- **B2** — Com o filtro ativo, um commit selecionado que é breaking
  (`feat!: …` ou com `BREAKING CHANGE:` no corpo) aparece na seção
  ⚠️ Breaking changes, ou o filtro a suprime?

Um pedido que não decide B1/B2 deixou decisões para o modelo tomar por você
(M3 §3.1: "cada campo omitido vira uma decisão que o modelo toma pelo
caminho estatisticamente comum").

## O ciclo guiado (exemplo → tentativa → feedback → retry → takeaway)

### 1. Exemplo trabalhado (≈ 8 min)

Leia `exemplo-trabalhado.md` (fontes reais do repo: M3 §3.1–3.2 e o
PRD/SPEC do próprio workflow-exemplo, com saídas reais executadas). Não
pule: a sua tentativa aplica a mesma disciplina a um pedido novo.

### 2. Tentativa (≈ 20 min)

Com o pedido original em `insumos/pedido-original.md` e a amostra fixa
`insumos/meus_commits.json` (não use outro repositório — o caminho avaliado
é este), faça **nesta ordem**:

1. **Evidência antes do pedido**: rode o CLI atual sobre a amostra e
   registre a saída real (comando + exit code + contagem de seções).
2. **Contrato existente**: leia `PRD.md` e `SPEC.md` do workflow-exemplo
   (caminhos no exemplo trabalhado) e anote ≥2 restrições que qualquer
   mudança precisa respeitar (ex.: "nenhum commit descartado
   silenciosamente").
3. **Disseque o original**: circule no pedido do Rafa (i) as entregas
   embutidas (são mais de uma) e (ii) as decisões que ficaram implícitas
   (quais tipos? e os não escolhidos? e o breaking? como se invoca o
   filtro?). Conte-as — é o exercício de M3 §3.4.
4. **Escreva o pedido reescrito** nos 5 campos, decidindo explicitamente
   B1 e B2. Template (M3 §3.1):

   ```text
   CONTEXTO:    onde mexer — caminhos de arquivo, não descrições
   OBJETIVO:    um resultado observável (um só)
   RESTRIÇÕES:  o que não pode mudar; limites (sem lib nova, não tocar em X)
   ACEITE:      o comando que prova que ficou pronto (+ saída esperada)
   NÃO-META:    o que fica de fora desta entrega
   ```

5. **Execute o seu ACEITE hoje** (árvore atual, sem a mudança): registre a
   saída real. O comando precisa rodar offline e falhar/estar incompleto
   **pelo motivo certo** — o trabalho ainda não foi feito. ACEITE que já
   passa hoje não decide nada.
6. **Auto-check mecânico**: `python3 insumos/verifica_pedido.py
   <seu-pedido>.md` e `python3 insumos/verifica_pedido.py --caminhos
   <seu-pedido>.md` — ambos `veredito: met` antes de pedir feedback.

Guarde: o pedido reescrito, as contagens do passo 3, e os comandos+saídas
dos passos 1 e 5 — é o seu recibo da prática.

### 3. Feedback (rúbrica)

Avalie sua entrega contra `rubrica-v1.md` (7 critérios objetivos, com
pergunta de verificação executável por critério). Se houver revisor
disponível, peça leitura com a mesma rúbrica — incluindo os vereditos
B1/B2 dele contra o seu pedido. A rúbrica é o contrato, não gosto.

### 4. Retry (se algum critério não passar)

Refazer **apenas** o campo/critério reprovado, não a prática inteira:
exemplo — se `c7-casos-borda` falhou (revisor precisou perguntar), acrescente
ao RESTRIÇÕES ou OBJETIVO a frase que decide B1/B2 e re-avalie só esse
critério. Retry é parte do método, não punição.

### 5. Takeaway (≈ 5 min)

Responda em duas frases: (a) qual decisão implícita do pedido original era
a mais perigosa e por quê; (b) qual campo (ACEITE ou NÃO-META) mais protegeu
a sua entrega de virar duas entregas medíocres. Arquive junto com o recibo.

## Limites explícitos

- Nenhum passo exige rede, conta, chave ou segredo; a amostra é local e
  determinística. A amostra `insumos/meus_commits.json` deriva de
  `demo_commits.json` (blob `8a0d39ce99e1`): hashes e subjects reais, com
  2 entradas adaptadas — `35db5c8` (breaking por `!` e por footer) e
  `96c4d9d` (tipo `ci:`→`fix(ci):`, sufixo `(#119)` removido; segundo
  `fix` da amostra, fecha a aritmética "filtro: feat,fix — 5 commits não
  exibidos"). Opcional (não avaliado): repetir com `meus_commits.json`
  do **seu** repositório (ROADMAP Fase 0) — o caminho avaliado não
  depende dele.
- Esta prática avalia o **pedido**, não a implementação: você não precisa
  implementar o filtro; precisa escrever o pedido que o tornaria
  inequívoco.
- Não avalia elegância, velocidade nem resultado de alunos; não cria/altera
  lição, módulo, engine, runtime, progresso ou gates; não duplica pg-d01
  (ciclo de debug), tp-d01 (transferência) nem AID-3527 (app do pg-d01).
- Solução separada em `guia-de-correcao/` — consulte **após** a tentativa.
