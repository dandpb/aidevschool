# Spec — pacote de retomada

**Status:** accepted under the user's explicit commit/handoff request.

- Manter relatório, corpus congelado e evidências históricas em `docs/research/laya-jev/`.
- Derivar caminhos do checkout e aceitar `LAYA_ROOT`; arquivos de execução novos ficam em `.scratch/laya-jev/`.
- Documentar instalação, revisão upstream fixa, download e execução offline dos três checkpoints.
- Carregar a chave somente do processo ou `.env` ignorado pelo Git; não incluí-la no commit.
- Verificar SHA-256 dos artefatos versionados e dos pesos antes da inferência.
- Registrar a retomada na conversa indicada, sem tentar enviar mensagens ou modificar outra conversa.
- A comparação de qualidade fica pendente até existirem respostas reais dos modelos.

## Concern

A cloud atual mantém política restrita apesar da configuração mostrada no editor. O próximo executor deve verificar acesso efetivo; este commit não altera a política do proxy.
