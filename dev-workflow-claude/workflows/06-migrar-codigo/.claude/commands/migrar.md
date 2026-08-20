---
description: Migração mecânica em lote (padrão antigo → novo), um arquivo por vez, com a suíte de testes como sinal verde entre cada passo
---

# /migrar — Migração mecânica verificada

Migração pedida: **$ARGUMENTS**
(ex.: `/migrar CommonJS para ESM`, `/migrar moment para date-fns`, `/migrar enzyme para testing-library`)

Execute a migração seguindo EXATAMENTE estes passos. A regra de ouro: **nunca migre tudo de uma vez** — cada arquivo migrado precisa de sinal verde da suíte antes do próximo.

## Passos

1. **Inventariar.** Liste TODOS os arquivos que contêm o padrão antigo (use grep/glob; nada de "etc." ou "entre outros"). Ordene do menos dependido para o mais dependido (folhas primeiro, consumidores depois, testes por último). Apresente a lista numerada — ela é o contrato da migração.

2. **Linha de base verde.** Rode a suíte de testes completa no estado ANTIGO e registre a saída. Se a suíte já está vermelha, PARE: migração só começa sobre base verde. Se o projeto usa git, garanta um ponto de restauração (working tree limpo ou commit da linha de base).

3. **Migrar UM arquivo por vez.** Para cada arquivo do inventário, na ordem:
   a. Aplique a transformação mecânica APENAS nesse arquivo (incluindo ajustes nos consumidores diretos que a mudança exigir — ex.: caminho de import/require, extensão de arquivo);
   b. Rode a suíte de testes COMPLETA;
   c. Verde → marque o arquivo como migrado no inventário e siga para o próximo. NÃO agrupe arquivos "porque são parecidos".

4. **Se quebrar, reverter só aquele arquivo.** Restaure APENAS o arquivo que quebrou (e os consumidores tocados no mesmo passo) ao estado anterior — `git checkout -- <arquivo>` ou desfazer manual —, confirme que a suíte voltou ao verde, e anote o motivo da falha no inventário. Tente de novo corrigindo a causa; se falhar de novo, marque como `pendente (motivo)` e continue com os demais.

5. **Relatório final.** Apresente uma tabela `arquivo × migrado × testes` cobrindo TODO o inventário, com as tentativas revertidas anotadas. Inclua a saída da suíte final. Se algum arquivo ficou pendente, diga explicitamente que a migração está incompleta e o que falta.

## Regras

- Suíte de testes é o único sinal verde aceito — "parece certo" não conta.
- Um arquivo por passo; consumidores diretos só quando a mudança do arquivo exigir.
- Nunca misture migração com refatoração oportunista ("já que estou aqui...").
- Evidência real: cole saídas de teste de pelo menos 3 pontos — antes, meio e fim.
