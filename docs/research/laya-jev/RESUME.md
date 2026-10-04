# Retomada — download local Laya e comparação com Jev

Destino indicado pelo usuário: `codex://threads/01a1089e-eb9d-731a-8584-f166a10c200c?hostId=durable`.

## Objetivo e autorização

O usuário pediu baixar e rodar os três modelos do Laya localmente, compará-los com Jev nas tarefas do AI DevSchool e entregar relatório completo. Autorizou salvar/usar sua chave TypeSafe, instalar dependências e executar os modelos; pediu agora commit para continuar nessa outra conversa. Não pedir novamente essas autorizações. A credencial foi salva apenas no `.env` ignorado da instância anterior e não está no Git. Utilizar a credencial do processo/gerenciador de secrets do novo executor; não imprimir ou versionar valores.

## O que está preservado

- Laya upstream: commit `8a6e1328cce2460a0e5aa348ad465bb1b5821cd2`, versão 0.3.27.
- Manifesto fixado dos pesos: `checkpoint-manifest.json`.
- Corpus e SHA-256: `dataset.jsonl`, `dataset.sha256`.
- Scripts portáveis de instalação, download, inferência local e comparação.
- Relatório e logs anteriores em `REPORT.md` e `evidence/`.
- Testes históricos: 1.789 verificações assertivas, 84 unit tests, 247 testes HTTP Laya; 24 Python e 1 Node da integração Jev. Testes live ficaram sem resultados.

## Próximas ações

1. Conferir se o checkout contém este diretório e se a nova execução consegue acessar Hugging Face e TypeSafe mantendo o proxy/configuração próprios do ambiente. A instância anterior tinha política restrita apesar do editor mostrar todos os domínios. Não repetir pedidos de autorização nem confundir um 403 do proxy com erro da chave.
2. Executar `bootstrap.sh` e `download_and_run_local.sh` conforme README. Baixar todos os pesos e verificar os hashes antes de declarar execução neural.
3. Executar o corpus contra Laya local e Jev live. Preservar cada rodada com nomes novos em `.scratch/laya-jev/output/`; identificar a versão real respondida por Jev e separar os checkpoints Laya.
4. Antes de analisar dados live, conferir os digests de entrada e o esquema de respostas contra o corpus congelado: o analyzer atual confia em `status=ok` produzido pelo runner, sem validar essa proveniência novamente. Depois avaliar acurácia/MAE/ranking por tarefa e idioma. Os 78 scores do catálogo não têm notas esperadas inventadas; as seis referências de engine servem para top-1/top-3.
5. Medir latência aquecida separadamente da carga de pesos e do transporte HTTP. Complementar com exemplos de perfil/diário revisados independentemente antes de inferir equivalência desses fluxos.
6. Atualizar o relatório com resultados reais. Não afirmar vencedor ou qualidade medida até existirem respostas válidas dos dois lados. Não alterar estados/gates ou trocar o backend em produção como efeito deste experimento.

## Cuidados de proveniência

As evidências anteriores usam caminhos absolutos da cloud, preservados como fatos históricos. Os scripts atuais derivam caminhos deste checkout e usam `.scratch/`. `summary.json` histórico registra zero respostas válidas; erros de rede não são previsões. A identificação de backend/modelo nos recibos canônicos Python precisa ser corrigida antes de qualquer integração Laya; atualmente o código pode gravar a constante `jev-latest` independentemente do backend.

O servidor anterior respondeu HTTP 200 em `/health`, com `loaded: []`; isso comprovou somente liveness. Um timeout inicial de hooks desapareceu quando sockets locais foram habilitados, e não é um defeito upstream confirmado.
