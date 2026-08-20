---
description: Investiga a causa raiz de um erro — o entregável é o DIAGNOSTICO.md com reprodução mínima, não a correção
---

Investigue a causa raiz do seguinte problema: $ARGUMENTS

Você é um investigador, não um consertador. **O diagnóstico é o entregável; a correção é outro fluxo.** Não altere código de produção durante a investigação — apenas leia, execute experimentos e escreva o teste de reprodução mínima.

## Passos

1. **Colete o erro exato e o contexto.** Reproduza o sintoma você mesmo antes de teorizar: rode o comando/fluxo que falha e capture a saída literal (stack trace, mensagem, valores errados). Registre também: qual entrada dispara o problema, com que frequência (sempre? só na 2ª chamada? intermitente?) e desde quando (último commit bom, se houver). Se não conseguir reproduzir, pare e peça ao usuário os dados que faltam — não investigue por adivinhação.

2. **Liste exatamente 3 hipóteses, ranqueadas por probabilidade.** Cada hipótese deve ser específica e falseável ("o parser retorna valor errado para entrada X"), nunca vaga ("algo no estado"). Para cada uma, anote qual experimento a confirmaria ou descartaria e quanto custa rodá-lo.

3. **Teste cada hipótese com o experimento mais BARATO primeiro.** Prefira, nesta ordem: um `node -e`/one-liner sobre a função suspeita → rodar o fluxo isolando uma variável (processo novo vs. mesmo processo, dado fixo vs. dado real) → instrumentação temporária (log/assert) que você remove ao final. Registre o comando exato e a saída real de cada experimento — evidência colada, não parafraseada. Descarte ou confirme cada hipótese explicitamente antes de passar à próxima. Se as 3 caírem, volte ao passo 2 com o que os experimentos revelaram.

4. **Escreva a reprodução mínima como teste que FALHA.** Crie um arquivo de teste separado da suíte de regressão (ex.: `test/reproducao-bug.test.js`), com o menor cenário que demonstra a causa raiz — poucas linhas, sem fixtures desnecessárias, com comentário apontando para o diagnóstico. Rode-o e confirme que falha pelo motivo certo (a asserção esperada, não um erro de setup). Esse teste vira o critério de pronto do fluxo de correção: a correção estará certa quando ele passar sem tocar nele.

5. **Documente em `DIAGNOSTICO.md`**, na raiz do projeto, com estas seções:
   - **Sintoma** — o erro exato observado, com a saída real colada.
   - **Causa raiz** — arquivo:linha e o mecanismo (por que o código produz esse sintoma), mais a explicação de por que o sintoma aparece longe da causa, se for o caso.
   - **Hipóteses descartadas** — cada uma com o experimento (comando + saída real) que a descartou.
   - **Reprodução mínima** — caminho do teste e a saída real dele falhando.
   - **Correção sugerida** — o que mudar e onde, SEM implementar. Se houver mais de uma opção, liste trade-offs em uma linha cada.

## Regras

- Nenhuma afirmação sem evidência executada: toda hipótese confirmada ou descartada precisa do comando e da saída real.
- Não implemente a correção, nem "só um ajustinho": o estado final do código é o mesmo do início + o teste de reprodução + o `DIAGNOSTICO.md`.
- Se o experimento barato já for conclusivo, não rode os caros — custo cresce só quando a dúvida sobrevive.
