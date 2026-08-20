---
description: Endurece as fronteiras de entrada do projeto — mini-fuzz com entradas hostis, cada crash vira teste de regressão, correção com validação na fronteira
---

# /blindar — Hardening de fronteiras de entrada

Endureça os pontos onde dados externos entram no projeto. Alvo: $ARGUMENTS (se vazio, blinde todas as fronteiras encontradas).

## Passos

1. **Mapear as fronteiras de entrada.** Percorra o código e liste todo ponto onde dado externo entra: argumentos de CLI (`argv`), variáveis de ambiente, arquivos lidos (config, JSON, CSV...), stdin, e — se existirem — requisições de rede. Para cada fronteira, anote o que o código assume sobre o dado sem validar (formato, tipo, presença de campo, tamanho).

2. **Rodar um mini-fuzz caseiro.** Escreva um script curto (ex.: `tools/fuzz.mjs`, sem dependências externas) que executa o programa real com ~15 entradas hostis cobrindo pelo menos: string vazia, unicode/emoji, caractere de controle, número gigante, string enorme (100k+ chars), algo que parece flag (`--ajuda`, `--`), e — para fronteiras de arquivo — arquivo inexistente, conteúdo malformado, campo faltando, tipo errado e valor null. O script classifica cada caso em três categorias e sai com exit 1 se houver algum CRASH:
   - `ok` — exit code 0;
   - `erro-controlado` — exit code != 0 com mensagem limpa em stderr;
   - `CRASH` — stderr contém stack trace cru (linhas `at ...`, `node:internal`, etc.).

3. **Transformar cada crash em teste de regressão permanente.** Para cada CRASH encontrado, escreva um teste (na suíte oficial do projeto) que executa o binário real com aquela entrada e assevera o contrato da fronteira: exit code de erro, mensagem clara em stderr citando o problema, e **ausência de stack trace**. Nomeie os testes de forma rastreável (ex.: `FUZZ-1`, `FUZZ-2`...) e registre em comentário qual crash cada um cobre. Inclua também um teste do caminho feliz da fronteira, para a correção não quebrar o uso normal.

4. **Corrigir com validação na fronteira.** Valide o dado no ponto de entrada, não no fundo da pilha: cheque existência/leitura do arquivo, parse com try/catch, forma esperada (lista vs objeto), presença e tipo de cada campo. Toda falha vira mensagem de erro clara (dizendo o que veio errado e o que era esperado) + exit code != 0. O usuário final **nunca** vê stack trace. Não altere a lógica de negócio — só a casca de validação.

5. **Provar que o fuzz ficou limpo.** Rode a suíte de testes completa (regressões novas + testes antigos verdes) e o mini-fuzz de novo: o resultado final obrigatório é **zero CRASHes**. Se ainda houver crash, volte ao passo 3 com ele. Reporte um resumo: fronteiras mapeadas, crashes antes → depois, e os testes de regressão adicionados.

## Regras

- O fuzz executa o programa de verdade (processo filho), não funções isoladas — o que importa é o que o usuário vê.
- Crash "consertado" sem teste de regressão não conta: primeiro o teste, depois a correção.
- Mantenha o script de fuzz no repositório (ex.: `npm run fuzz`) — ele é a porta de entrada para blindar a próxima fronteira.
