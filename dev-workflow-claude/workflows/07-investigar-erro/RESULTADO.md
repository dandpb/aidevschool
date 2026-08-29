# Workflow 07 — Investigação de causa raiz

## Problema que resolve

Erro confuso → dev sai "consertando" o primeiro suspeito, empilha mudanças sem entender o mecanismo e às vezes só mascara o sintoma — especialmente quando o sintoma aparece **longe** da causa (o número errado sai no painel, o defeito está no cache dois módulos atrás). O `/investigar` separa diagnóstico de correção: força reproduzir o erro exato, testar 3 hipóteses com o experimento mais barato primeiro, e entregar `DIAGNOSTICO.md` + um teste de reprodução mínima que FALHA — o critério de pronto objetivo para o fluxo de correção, que é outro fluxo.

## O comando

`.claude/commands/investigar.md` — slash command permanente e genérico (`/investigar <descrição do erro>`). Codifica 5 passos:

1. Coletar o erro exato + contexto (saída literal, entrada que dispara, frequência) — reproduzir antes de teorizar.
2. Listar exatamente 3 hipóteses específicas e falseáveis, ranqueadas por probabilidade.
3. Testar cada uma com o experimento mais BARATO primeiro (one-liner → isolar variável → instrumentação temporária), colando comando + saída real.
4. Escrever a reprodução mínima como teste que FALHA pelo motivo certo, fora da suíte de regressão.
5. Documentar em `DIAGNOSTICO.md`: sintoma, causa raiz, hipóteses descartadas (com os experimentos), reprodução mínima e correção sugerida SEM implementá-la.

Regra dura do comando: estado final do código = estado inicial + teste de reprodução + diagnóstico. Nada de "só um ajustinho".

## Execução real

Demo: `demo/` (CLI `tempo-relatorios`, Node 22 puro, zero dependências). Bug plantado: `resumoDoProjeto` (`src/sessoes.js`) cacheia o resumo do projeto e devolve **a mesma referência**; `gerarRelatorio` (`src/relatorio.js`) desconta as pausas **mutando** esse objeto. Sintoma aparece longe: o painel (`src/painel.js`) mostra o total encolhendo a cada refresh.

**Passo 1 — erro exato + contexto.** Sintoma reproduzido (determinístico dentro do processo, sempre −1h por refresh):

```
$ node src/painel.js cliente-a 3
[refresh 1] cliente-a: 3 sessões, 6h30m trabalhadas
[refresh 2] cliente-a: 3 sessões, 5h30m trabalhadas
[refresh 3] cliente-a: 3 sessões, 4h30m trabalhadas
```

Contexto agravante: a suíte de regressão passa inteira (cada teste roda em processo novo e chama o relatório uma vez):

```
$ npm test
# tests 6
# pass 6
# fail 0
```

**Passo 2 — 3 hipóteses ranqueadas.**
- H1 (mais provável): desconto de pausas aplicado mais de uma vez sobre estado que vive na memória do processo.
- H2: parse de duração instável ou dados das sessões variando entre leituras.
- H3: acúmulo de erro de ponto flutuante na soma dos minutos.

**Passo 3 — experimentos, do mais barato primeiro.**

E-1 (one-liner; testa H2 e H3 de uma vez): somar as sessões cruas duas vezes e checar se os valores são inteiros:

```
rodada 1: minutos=450 pausas=60 inteiros=true
rodada 2: minutos=450 pausas=60 inteiros=true
```

→ H2 DESCARTADA (somas idênticas entre rodadas) e H3 DESCARTADA (só inteiros; não existe aritmética fracionária).

E-3 (isolar a variável "processo"; testa H1):

```
--- mesmo processo, 2 chamadas:
1a: cliente-a: 3 sessões, 6h30m trabalhadas
2a: cliente-a: 3 sessões, 5h30m trabalhadas
--- processos separados, 1 chamada cada:
proc A: cliente-a: 3 sessões, 6h30m trabalhadas
proc B: cliente-a: 3 sessões, 6h30m trabalhadas
```

→ H1 CONFIRMADA: o estado errado vive no processo, não nos dados.

E-4 (apontar o mecanismo exato):

```
mesma referência entre chamadas? true
minutos antes do relatório : 450
minutos depois do relatório: 390 (objeto do cache foi mutado)
```

→ Causa raiz: `src/sessoes.js:28` devolve a mesma referência do cache; `src/relatorio.js:7` a muta (450 → 390 → 330…).

**Passo 4 — reprodução mínima como teste que falha.** `demo/test/reproducao-bug.test.js` (4 linhas de teste, fora da suíte de regressão). Saída real:

```
$ node --test test/reproducao-bug.test.js
not ok 1 - reprodução mínima: relatório do mesmo projeto é estável entre chamadas
    + actual - expected
    + 'cliente-a: 3 sessões, 5h30m trabalhadas'
    - 'cliente-a: 3 sessões, 6h30m trabalhadas'
# pass 0
# fail 1
```

Falha pelo motivo certo (asserção de igualdade, não erro de setup).

**Passo 5 — diagnóstico documentado.** `demo/DIAGNOSTICO.md` com as 5 seções: sintoma, causa raiz (arquivo:linha + por que o sintoma aparece longe), hipóteses descartadas com os experimentos, reprodução mínima e 2 opções de correção com trade-offs — **nenhuma implementada**: o código de produção terminou idêntico ao início da investigação.

## Como reproduzir

```bash
cd workflows/07-investigar-erro/demo
npm test 2>&1 | grep -E '^# (pass|fail)'          # regressão verde: o bug escapa dela
node src/painel.js cliente-a 3                    # sintoma: total encolhe a cada refresh
if saida=$(node --test test/reproducao-bug.test.js 2>&1); then
  echo "INESPERADO: reprodução mínima passou (bug sumiu?)"; exit 1
fi
echo "$saida" | grep -E '^not ok|actual:|expected:'   # prova: 5h30m != 6h30m
grep -c '^## ' DIAGNOSTICO.md                          # 5 seções do diagnóstico
echo "OK: sintoma reproduzido, reprodução mínima falha como documentado, diagnóstico em DIAGNOSTICO.md"
```

Saída real da execução (termina com exit 0):

```
# pass 6
# fail 0
[refresh 1] cliente-a: 3 sessões, 6h30m trabalhadas
[refresh 2] cliente-a: 3 sessões, 5h30m trabalhadas
[refresh 3] cliente-a: 3 sessões, 4h30m trabalhadas
not ok 1 - reprodução mínima: relatório do mesmo projeto é estável entre chamadas
  expected: 'cliente-a: 3 sessões, 6h30m trabalhadas'
  actual: 'cliente-a: 3 sessões, 5h30m trabalhadas'
5
OK: sintoma reproduzido, reprodução mínima falha como documentado, diagnóstico em DIAGNOSTICO.md
```

## Valor para o dev

- **Corrige a causa, não o sintoma:** as 3 hipóteses falseáveis + experimento mais barato primeiro impedem o "conserta o primeiro suspeito" — aqui, 2 hipóteses caíram com um único one-liner antes de qualquer mudança de código.
- **Critério de pronto objetivo para a correção:** o teste de reprodução mínima que falha hoje é a definição executável de "consertado" amanhã — e vira regressão permanente de graça.
- **Conhecimento que sobrevive à sessão:** `DIAGNOSTICO.md` registra também o que NÃO era o problema (e como foi descartado), poupando a próxima investigação de refazer os mesmos experimentos.
