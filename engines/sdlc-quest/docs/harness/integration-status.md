# Estado da integração — 16/09/2026

Repositório solicitado: https://github.com/dandpb/harness-toolkit

**Conteúdo não acessível nesta sessão; integração real não concluída.**

A página GitHub e tentativas de ler README/raw/API não forneceram conteúdo. A descoberta de ferramentas não expôs ação GitHub utilizável. A busca nos arquivos/contexto disponíveis não encontrou documentação desse repositório. Não é possível deduzir dessas falhas se ele é privado, novo, removido ou temporariamente indisponível.

Não foram verificados: README, branch, commit, licença, CLI, API, modelos de estado, formatos de traces, políticas de execução, hooks, permissões ou testes do repositório. Nenhum código do toolkit foi copiado, executado ou instalado.

## O que foi incluído

Um ponto de entrada no Quest para estudar a camada de execução, com a referência ao repositório e o status acima. O motor `src/harness-core.js`, a UI, o runner `tools/quest-gate.cjs` e os formatos `quest-harness-demo` / `quest-local-gate/v1` são criações locais deste jogo. NÃO são interfaces atribuídas ao toolkit.

O mapeamento de Discover → Plan → Implement → Verify → Judge → Package é uma adaptação didática do fluxo já ensinado no Quest, não uma descrição inspecionada do repositório.

## Critérios para conectar o toolkit real

1. Receber acesso ao código ou seu ZIP, identificar commit e licença e inspecionar a interface efetiva.
2. Mapear eventos, artefatos, erros, códigos de saída e cancelamento sem alterar as garantias reais do executor.
3. Verificar se cada etapa é apenas instrução, execução observada ou controle efetivamente imposto.
4. Testar pré-condição ausente, erro, timeout, nenhum resultado, recibo de outra revisão, reexecução, concorrência, interrupção e limite de tentativas.
5. Vincular evidências à revisão/política/execução e definir quem protege/verifica esses registros.
6. Separar a autoridade de merge/deploy da autoridade que altera o candidato. Só então declarar a integração real validada.

Esse trabalho depende do código verdadeiro. Um contrato inventado aqui não o substitui.
