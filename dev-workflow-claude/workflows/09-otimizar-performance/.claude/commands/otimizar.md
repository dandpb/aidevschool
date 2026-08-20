---
description: Otimização guiada por benchmark — mede antes, otimiza, mede depois; sem ganho comprovado, reverte
---

Otimize o alvo indicado em `$ARGUMENTS` (função, módulo ou sintoma de lentidão). Se estiver vazio, pergunte qual código otimizar antes de qualquer coisa.

**Regra de ouro: nenhuma otimização sem medição.** Nunca altere código "porque parece mais rápido". Siga os passos na ordem, sem pular nenhum:

1. **Escreva um benchmark reproduzível** para o alvo, se ainda não existir (ex.: `bench/<alvo>.bench.js`):
   - use `node:perf_hooks` (`performance.now()`) — sem dependências externas;
   - dados de entrada **determinísticos** (seed fixa ou fixture) e **N fixo** declarado no output;
   - **no mínimo 5 rodadas** da operação medida; reporte todas as medições e a **mediana** (não a média — a mediana resiste a outliers de GC/JIT);
   - imprima também um resultado funcional (ex.: tamanho do retorno) para evidenciar que as versões comparadas computam a mesma coisa.

2. **Meça e registre o ANTES.** Rode o benchmark e guarde a saída crua (cole no chat/relatório). Rode também a suíte de testes para confirmar que parte de um estado verde. Se o alvo não tem teste de comportamento, escreva um antes de mexer.

3. **Formule a hipótese do gargalo em UMA frase.** Ex.: "o custo dominante é a comparação de todos os pares (O(n²)); um índice por chave elimina o loop interno". Sem hipótese clara, não otimize — meça mais (profiler, contadores) até ter uma.

4. **Otimize APENAS o gargalo hipotetizado.** Mudança cirúrgica: não refatore ao redor, não "aproveite para melhorar" outras coisas, não mude comportamento observável (mesmas entradas → mesmas saídas, mesma ordem, mesmos erros).

5. **Meça o DEPOIS nas mesmas condições.** Mesmo benchmark, mesmo N, mesmo número de rodadas, mesma máquina. Compare mediana com mediana e confira que o resultado funcional impresso é idêntico ao do ANTES.

6. **Rode a suíte de testes completa.** Só declare a otimização válida com a suíte 100% verde.

7. **Decida com base nos números:**
   - **Ganho relevante** (regra prática: mediana melhora ≥ 20% ou muda a classe de complexidade) e suíte verde → mantenha e registre antes/depois no commit/relatório.
   - **Melhora irrelevante, piora ou empate estatístico** → **reverta a mudança** (`git checkout`/desfazer) e documente a tentativa com os números, para ninguém repetir o mesmo beco sem saída.

Ao final, apresente: hipótese, números ANTES e DEPOIS (medianas + rodadas + N), veredicto (mantido ou revertido) e a saída da suíte de testes.
