---
description: Refatoração com rede de segurança — baseline verde, passos pequenos, testes intocáveis, diff mínimo
---

Refatore o código descrito em: $ARGUMENTS

Refatorar = mudar a estrutura SEM mudar o comportamento. Os testes existentes são o
contrato de comportamento e a sua rede de segurança. Siga o protocolo abaixo à risca.

## Protocolo

1. **Baseline verde (pré-condição dura).** Rode a suíte de testes completa do projeto
   (`npm test`, `pytest`, `make test` — o que o projeto usar) e cole a saída.
   - Se QUALQUER teste falhar: **PARE**. Não se refatora sobre base vermelha — primeiro
     conserte os testes (isso é outro trabalho, não esta refatoração).
   - Guarde uma cópia do estado atual para comparação (ex.: `cp -R src /tmp/antes-src`,
     ou anote o commit: `git rev-parse HEAD`).

2. **Declare o plano antes de tocar em código.** Escreva explicitamente:
   - **Objetivo:** o que a refatoração melhora (ex.: extrair função, remover duplicação,
     renomear, inverter dependência).
   - **O que NÃO muda:** comportamento observável, API pública, formato de saída,
     mensagens de erro que os testes verificam.
   - **Passos:** quebre em passos pequenos e independentes — cada passo deve deixar a
     suíte verde. Se um passo não puder ser verificado por testes no meio do caminho,
     ele está grande demais: quebre mais.

3. **Execute UM passo por vez e rode os testes após CADA passo.**
   - Passo N → suíte completa → verde? → próximo passo.
   - Se ficar vermelho: reverta o passo (não "conserte pra frente") e tente um passo menor.
   - Nunca acumule dois passos sem rodar os testes no meio.

4. **PROIBIDO editar os testes.** Nenhum arquivo em `test/`, `tests/`, `__tests__/`,
   `*.test.*` ou `*.spec.*` pode ser alterado, deletado ou pulado (`skip`) durante a
   refatoração. Se você sentir necessidade de mudar um teste para a refatoração "passar",
   isso é sinal de que está mudando comportamento — pare e reavalie o plano.
   Exceção única: adicionar testes NOVOS de caracterização ANTES do passo 1, se a área
   estiver descoberta (e aí eles entram no baseline).

5. **Compare antes/depois e confirme diff mínimo.**
   - Rode a suíte final e cole a saída (mesmo número de testes passando do baseline).
   - Gere o diff real contra a cópia/commit do passo 1 (`diff -ru` ou `git diff`) e mostre:
     a) o diretório de testes NÃO aparece no diff;
     b) todas as mudanças servem ao objetivo declarado — remova qualquer alteração
        oportunista que tenha escapado (formatação alheia, renomes fora de escopo).
   - Relate: objetivo, passos executados, evidência verde antes/depois, resumo do diff.

## Regras de ouro

- Baseline vermelho ⇒ não há refatoração hoje.
- Um passo sem teste rodado em seguida não aconteceu.
- Teste alterado ⇒ não é refatoração, é mudança de comportamento.
- Diff que mistura refatoração com feature/fix deve ser desfeito e separado.
