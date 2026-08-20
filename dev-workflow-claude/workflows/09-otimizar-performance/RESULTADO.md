# Workflow 09 — Otimização guiada por benchmark

## Problema que resolve

"Otimização" sem medição é aposta: o dev troca código legível por código "rápido" sem saber se havia gargalo, sem provar ganho e às vezes quebrando comportamento. O comando `/otimizar` proíbe isso: benchmark reproduzível **antes**, hipótese do gargalo em uma frase, mudança cirúrgica, benchmark **depois** nas mesmas condições e suíte de testes verde. Sem ganho comprovado, a mudança é revertida e a tentativa fica documentada.

## O comando

`.claude/commands/otimizar.md` — slash command genérico (`/otimizar <alvo>`), reutilizável em qualquer projeto. Codifica 7 passos obrigatórios:

1. Benchmark reproduzível (`node:perf_hooks`, dados determinísticos, N fixo, ≥5 rodadas, mediana);
2. Medir e registrar o ANTES (com suíte verde de partida);
3. Hipótese do gargalo em UMA frase;
4. Otimizar apenas o gargalo hipotetizado, sem mudar comportamento observável;
5. Medir o DEPOIS nas mesmas condições (mesmo N, mesmas rodadas);
6. Suíte de testes 100% verde;
7. Ganho relevante → manter e registrar; irrelevante ou piora → reverter e documentar.

## Execução real

Demo: `demo/` (cópia do projeto `tempo`, CLI de time tracking, Node 22 puro, zero dependências). Alvo: `encontrarDuplicadas(registros)` em `src/duplicadas.js` — encontra registros de tempo duplicados (mesmo projeto + mesma duração) comparando todos os pares, O(n²), sobre 20.000 registros gerados deterministicamente (LCG com seed 42).

**Passo 1 — Benchmark reproduzível.** Criado `bench/duplicadas.bench.js`: `performance.now()` de `node:perf_hooks`, N=20000 fixo, 5 rodadas, imprime todas as medições, a mediana e o tamanho do resultado (prova funcional de que as versões computam a mesma coisa).

**Passo 2 — ANTES.** Suíte verde de partida (7 testes, incluindo os 3 de comportamento de `encontrarDuplicadas`):

```
# tests 7
# suites 0
# pass 7
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 93.961167
```

Benchmark da versão O(n²) (saída crua):

```
benchmark: encontrarDuplicadas | N=20000 | rodadas=5
tempos ordenados (ms): 318.7, 320.6, 326.6, 329.1, 334.7
mediana: 326.6 ms
duplicadas encontradas: 1799
```

**Passo 3 — Hipótese.** O custo dominante é o loop duplo que compara todos os pares de registros (O(n²) ≈ 200M comparações para N=20k); um índice de contagem por chave `projeto+duração` (Map) elimina o loop interno e leva a função a O(n).

**Passo 4 — Otimização cirúrgica.** Reescrita apenas de `encontrarDuplicadas`: uma passada conta ocorrências por chave num `Map` (chave `projeto` + separador U+0000 + `duracao`), segunda passada coleta a primeira ocorrência de cada chave com contagem > 1 — preservando o contrato (primeira ocorrência, uma vez só, ordem de entrada). Nada mais foi tocado.

**Passo 5 — DEPOIS (mesmas condições: mesmo benchmark, N=20000, 5 rodadas, mesma máquina).** Saída crua:

```
benchmark: encontrarDuplicadas | N=20000 | rodadas=5
tempos ordenados (ms): 6.3, 6.7, 7.3, 8.3, 9.2
mediana: 7.3 ms
duplicadas encontradas: 1799
```

Mesmas 1799 duplicadas do ANTES — resultado funcional idêntico.

**Passo 6 — Suíte verde depois.** Saída crua:

```
# tests 7
# suites 0
# pass 7
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 91.83825
```

**Passo 7 — Veredicto.** Mediana 326.6 ms → 7.3 ms (**~45× mais rápido**, mudança de classe O(n²) → O(n)), suíte verde: mudança **mantida**. O estado atual de `demo/` é a versão otimizada; a versão O(n²) do ANTES está preservada neste relatório.

## Como reproduzir

```bash
cd workflows/09-otimizar-performance/demo \
  && npm test \
  && node bench/duplicadas.bench.js
```

Sai com código 0: os 7 testes passam e o benchmark imprime mediana de um dígito de ms (versão otimizada) com as mesmas 1799 duplicadas do ANTES. Verificado nesta execução: `mediana: 7.6 ms`, `pass 7 / fail 0`, `exit=0`.

## Valor para o dev

- **Fim da otimização por vibe:** todo ganho é um número (mediana de ≥5 rodadas, mesmo N), não uma impressão — e piora/empate obriga revert documentado.
- **Comportamento protegido:** a suíte verde antes e depois garante que "mais rápido" nunca vira "sutilmente errado" (mesma saída funcional impressa pelo benchmark).
- **Conhecimento acumulado:** hipótese + números antes/depois ficam registrados, então o time sabe o que já foi tentado e quanto cada mudança realmente rendeu.
