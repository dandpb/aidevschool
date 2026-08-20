---
description: Corrige um bug com teste de regressão que reproduz o problema ANTES da correção
---

Corrija o bug descrito em: $ARGUMENTS

(Pode ser um caminho para um bug report — ex.: `BUGREPORT.md`, link de issue — ou a
descrição direta do sintoma. Se estiver vazio, peça o report antes de continuar.)

Siga EXATAMENTE esta ordem. Não pule etapas nem as reordene.

## 1. Reproduzir o bug manualmente

- Leia o report e extraia: entrada exata, comportamento observado, comportamento esperado.
- Execute o cenário do report de verdade (CLI, teste ad-hoc, `node -e`, requisição...) e
  confirme que o sintoma acontece. Cole a saída real na conversa.
- Se não conseguir reproduzir, PARE e reporte — não corrija o que não se reproduz.
- Rode a suíte existente e confirme que ela está verde (o bug não é coberto por nenhum
  teste atual — é por isso que ele existe).

## 2. Teste de regressão que FALHA (vermelho)

- Escreva um teste automatizado que reproduz o bug, com o identificador do bug no nome
  (ex.: `BUG-001 (regressão): ...`), cobrindo tanto a unidade quanto o ponto onde o
  usuário observou o sintoma (CLI/endpoint), quando aplicável.
- Rode a suíte e cole a saída mostrando o novo teste FALHANDO pelo motivo certo
  (o sintoma do report, não erro de setup). Vermelho primeiro é obrigatório: um teste
  que já nasce verde não prova nada.

## 3. Correção mínima na CAUSA RAIZ

- Investigue POR QUE o sintoma acontece, não apenas ONDE ele aparece. Corrigir o sintoma
  (ex.: filtrar a entrada ruim no chamador) deixa a causa viva para o próximo caminho.
- Antes de editar a função culpada, liste TODOS os seus chamadores (`grep` pelo nome) e
  confirme que a mudança não quebra nenhum contrato que eles dependem.
- Faça a menor mudança que elimina a causa raiz. Nada de refatoração oportunista,
  renomeações ou "melhorias" no mesmo diff.

## 4. Suíte inteira verde

- Rode a suíte COMPLETA (não só o teste novo) e cole a saída: o teste de regressão passa
  e nenhum teste antigo quebrou.
- Repita a reprodução manual do passo 1 e confirme o comportamento esperado do report.

## 5. Revisão do diff: só o necessário mudou

- Gere o diff completo (`git diff` + arquivos novos) e delegue a revisão ao subagente
  `revisor-de-diff`, passando o report e o diff. Critério: cada linha alterada é
  necessária para a correção ou para o teste de regressão — nada além.
- Se a revisão apontar mudança desnecessária, reverta-a e volte ao passo 4.
- Só então finalize (commit, se o projeto usa git), citando o bug na mensagem e
  explicando a causa raiz no corpo.
