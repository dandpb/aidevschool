# Verification — handoff Laya × Jev

## Checks executados pelo produtor

- `/workspace/laya/.venv/bin/python -m compileall -q docs/research/laya-jev` — passou.
- `bash -n docs/research/laya-jev/bootstrap.sh docs/research/laya-jev/download_and_run_local.sh` — passou.
- Ruff com `E9,F63,F7,F82,F401,F811` — passou.
- Corpus: 62 casos, 220 perguntas, 142 respostas rotuladas, IDs únicos e digest original preservado.
- Outro checkout temporário com espaço no caminho: builder produziu dataset byte a byte idêntico; paths derivaram o novo checkout; saídas ficaram em `.scratch/`.
- Sem pesos, runner local termina com código 2 e declara ausência de inferência. O runner de comparação local grava erro e termina com código 2, sem acessar API ou fabricar previsão.
- Uma segunda execução com o mesmo arquivo de evidência é recusada; bytes anteriores permanecem iguais. A revisão independente identificou overwrite no runner local; ele foi corrigido para recusar antes da carga e persistir com criação exclusiva. Verificado com arquivo existente preservado byte a byte.
- Analyzer histórico e analyzer sobre a falha de preflight: zero respostas válidas e zero pares comparáveis.
- Stage limitado ao pacote e ao intent; sem `.env`, venv, cache, pesos, bytecode ou credenciais.
- Manifesto SHA-256 verificado; reconstruir após qualquer revisão dos artefatos.

## Review.md e simplificação

Escopo sem mudanças em aplicações, learner/curriculum, gates ou limiares. Caminhos absolutos operacionais foram substituídos por defaults derivados do checkout. Logs históricos mantêm seus caminhos originais e são identificados como evidência antiga. Não há alegação de qualidade live validada.

O comando `/simplify` não está exposto neste executor; o passe equivalente de simplificação/revisão foi realizado sobre o diff, incluindo revisão independente. `rtk` não está instalado, então os comandos usaram diretamente as ferramentas disponíveis.

Revisão independente e seu veredicto: ver `independent-review.md`. Não rerodar downloads/API neste handoff, pois os bloqueios anteriores já foram registrados e a execução neural é trabalho pendente.

## Entrega

Commit e branch destinados à retomada pelo usuário. Nenhum merge ou deploy. A publicação da branch será registrada na resposta final; indisponibilidade de push deve ser informada explicitamente.
