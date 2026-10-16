# pg-d01 — Prática guiada: debug com assistente, reproduza antes de perguntar

**Trilha:** Dev (jornada por competências, AID-3453) · **Competência primária:** D4
(teste/debug/review/manutenção) · **Apoio:** D3 (construção)
**Lição-âncora:** `l27` — Debug com assistente: reproduza antes de perguntar
(`curriculum/ai-literacy/modules/05-dev-contexto-e-escolha/l27-debug-com-assistente-reproduza-antes-de-perguntar.yaml`,
blob `6c9cc6b015d2`, base `d9dbdd5c504e`)
**Pré-requisitos:** l16 (primeiro código com assistente) e l21 (peça testes
que valem a pena); ou experiência equivalente com pedidos de código e testes.
**Duração alvo:** 25–40 min (uma sessão, cadência da escola).

## Objetivo observável

Diante do bug report de `insumos/bugreport.md`, executar o ciclo completo —
reprodução manual → teste de regressão vermelho → correção mínima na causa
raiz → suíte verde → revisão do diff — usando um assistente de IA em cada
passo **sem terceirizar a prova**: quem roda os comandos e lê as saídas é
você. Ao fim, o pedido de diagnóstico que você montar precisa conter o erro
reproduzido, o caso mínimo e o esperado-vs-observado.

## O ciclo guiado (exemplo → tentativa → feedback → retry → takeaway)

### 1. Exemplo trabalhado (≈ 8 min)

Leia `exemplo-trabalhado.md` (caso `tempo`, fonte real do repo, com saídas
reais citadas). Não pule: a sua tentativa usa a mesma disciplina num
problema de natureza diferente (fronteira de comparação em vez de regex).

### 2. Tentativa (≈ 20 min)

Com a fixture em `insumos/fixture/` (`notas.py`, `testes.py`, sem rede e
sem conta), faça **nesta ordem**:

1. **Reproduza manualmente** o cenário exato do report e registre a saída
   real (comando + exit code).
2. **Confirme que a suíte atual está verde** com o bug presente — isso
   prova que o bug é latente, não monitorado.
3. Escreva o **pedido de diagnóstico** para o seu assistente nos moldes da
   lição l27: contexto (arquivo + regra de `insumos/REGRA.md`), reprodução
   com saída real, caso mínimo isolado, esperado-vs-observado, e o que você
   quer (correção mínima na causa raiz com chamadores checados — não um
   patch de sintoma).
4. **Antes de aplicar** qualquer correção sugerida: escreva o teste de
   regressão que falha (vermelho) citando o bug; confirme que ele falha
   **pelo motivo certo**.
5. Aplique a correção mínima; rode a suíte inteira + o teste novo (verde);
  reproduza o cenário do report (agora correto).
6. Revise o diff: cada linha é necessária para a correção ou para o teste?

Guarde: o pedido de diagnóstico (texto), os comandos e saídas de cada passo,
e o diff final.

### 3. Feedback (rúbrica)

Avalie sua entrega contra `rubrica-v1.md` (6 critérios objetivos, com
pergunta de verificação por critério). Se houver revisor disponível, peça
leitura com a mesma rúbrica; a rúbrica é o contrato — não gosto.

### 4. Retry (se algum critério não passar)

Refazer **apenas** o passo do critério reprovado, não a prática inteira:
exemplo — se `c-vermelho` falhou (teste novo já passava antes do fix),
insira uma verificação de que o teste falha contra a fixture original
(rode o teste contra `insumos/fixture/notas.py` sem o fix — saída real
esperada na solução). Retry é parte do método, não punição.

### 5. Takeaway (≈ 5 min)

Responda em duas frases: (a) por que a suíte verde **não** provava ausência
de bug aqui; (b) qual parte do seu pedido de diagnóstico reduziu o risco de
o assistente "corrigir" o problema errado. Arquive as respostas junto com
o diff — é o seu recibo da prática.

## Limites explícitos

- Nenhum passo exige rede, conta, chave ou segredo; a fixture é local e
  determinística.
- A assistente pode sugerir; **decidir** o que é causa raiz e o que é
  sintoma é responsabilidade sua (lição l23).
- Esta prática não afirma transferência comprovada nem mede resultado de
  alunos; é prática guiada da competência D4 no nível da unidade.
- Solução separada em `guia-de-correcao/` — consulte **após** a tentativa.
