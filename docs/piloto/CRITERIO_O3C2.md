# Critério de decisão O3-C2 — gate quantitativo mínimo do P6

Regra em pé: **O3-C2 (l08–l13, +12 lições) só entra no board com O3-C1
sustentando + evidência OP-B** (AID-644 §RESERVADO). Este documento define o
gate mínimo proposto pelo System Designer (AID-720) para ler a evidência do
piloto P6 e decidir. **O3-C2 permanece RESERVADA até este gate ser aplicado**;
nada aqui produz conteúdo novo.

Amostra de 1–3 pessoas não sustenta percentuais nem prova de mercado; todos os
limiares abaixo são **contagens com denominador** (`2/3`), coerentes com o
[kit AID-639](../PILOTO_PERCURSO_CLIENTE.md). Fonte dos números: as
[fichas P6](FICHA_P6.md) desidentificadas + [síntese](SINTESE_PILOTO.md) +
[leitura do funil](LEITURA_FUNIL_OPB.md) quando executada.

## Gate mínimo (GO exige TODOS os itens de bloco)

| # | Item | Limiar mínimo |
| --- | --- | --- |
| G1 | Amostra iniciada no perfil | **≥ 3 participantes** iniciaram a S1 dentro dos critérios do kit (menos ⇒ inconclusivo, nova rodada pequena) |
| G2 | Bloqueio de entrada | **Zero** defeito Critical/High aberto no caminho central (link → onboarding → primeira lição) durante a rodada; 3/3 chegaram a abrir a primeira lição |
| G3 | Primeira lição sem ajuda | **≥ 2/3** concluíram a primeira lição com **H0** em ≤ 20 min (PRD pedia ≥ 1; para gatear +12 lições, propõe-se 2/3 — CEO pode aceitar 1/3 com justificativa registrada) |
| G4 | Compreensão do resultado local | **≥ 2/3** explicaram, nas próprias palavras, que o progresso é local e `completed` ≠ `mastered` (nenhum atribuiu conta/sync/certificação/domínio ao produto) |
| G5 | Cada bloqueio virou item priorizado | Toda fricção/bloqueio observado tem issue com evidência **antes** do despacho (regra do PRD) |

## Itens informados (não bloqueiam sozinhos; vão anotados no despacho)

| # | Item | Por que não bloqueia |
| --- | --- | --- |
| I1 | Retry/recuperação | Só avaliável com erro natural; ausência de erro = `não observado` (kit §7), não falha. Se houve erro e ninguém recuperou com H0, o CEO decide com o registro explícito |
| I2 | Retorno/ritmo diário | A obrigatoriedade do retorno é decisão pendente do founder (PRD + AID-718). Registrar direto/relatado/não por participante; 0/3 retornos precisa constar em destaque |
| I3 | Funil OP-B | Na escala do P6 (n<5) todas as células são suprimidas (k≥5). A evidência OP-B aplicável é o **dry-run do pipeline** (coleta sem drift + agregação executa + zero identificadores publicados — ver [LEITURA_FUNIL_OPB](LEITURA_FUNIL_OPB.md)); células publicáveis viram evidência adicional quando houver ≥5 instalações |

## Resultados possíveis

- **GO** — todos G1–G5 atendidos. Autoriza **somente** despachar a produção da
  O3-C2 ao board; não prova retenção, mercado ou domínio.
- **INCONCLUSIVO** — G1 não atingido ou dimensão central não observada;
  realizar nova rodada pequena desenhada para a lacuna (kit: gate amarelo).
- **NO-GO** — G2, G3 ou G4 falham, ou gate vermelho do kit (promessa central
  falhou / defeito Critical/High). Corrigir e revalidar antes de nova rodada.

## Assinaturas (producer ≠ verifier)

| Papel | Responsabilidade |
| --- | --- |
| Facilitadora/founder | Executa o piloto, produz fichas + síntese desidentizadas (produtor da evidência) |
| **QA** | Valida a evidência de forma independente: fichas completas com fontes (observado vs relatado), denominadores coerentes, severidades corretas, itens G1–G5 verificados contra os registros, dry-run do funil conferido quando houver. QA não reexecuta o piloto; confere auditabilidade |
| **CEO** | Aplica o gate e despacha O3-C2 no board (único autorizador; pode rejeitar GO com justificativa ou aceitar 1/3 no G3 registrando a decisão) |

Despacho mínimo anexado à issue de decisão: síntese preenchida, fichas
desidentizadas, estado dos itens G1–G5 (com `n`), itens I1–I3 anotados,
veredito QA e decisão do CEO. Sem veredito QA, o gate não se aplica.
