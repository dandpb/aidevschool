# Restaurar a prova de browser do OS sem confundir drift com falha de produto

Status: draft — sem plano aceito ou autorização para editar testes existentes.

A qualificação do candidato privado baseado em `0a2e2dbeda5e41b00642a5280e40a0d8102d1102` executou os cinco arquivos de browser previstos para C19. A rodada inicial teve 22 passes, 8 skips explícitos e 6 falhas. O diagnóstico retido está em `.scratch/readiness-implementation-20261015/browser-producers/diagnosis/report.json` (SHA-256 `e67904dd2365790f4260b18d32210c645f1e5a790e09bcbe0a5d938dabb10327`).

Quatro falhas usam o nome acessível `Orbita 3D`, enquanto o controle efetivamente servido se chama `Órbita 3D`. Os seletores estão em `engines/codexdojo-os-prototype/tests/engines.smoke.spec.ts:58,118,119`; o nome do produto está em `engines/pixelDojo/pixel-quest/src/ui/orbitPanels.ts:48`. Duas outras falhas atingiram o timeout total de 30 segundos durante uma espera explicitamente permitida por 60 segundos em `tests/release-journeys.smoke.spec.ts:78`. Isso ainda não estabelece falha do recibo ou do produto.

A repetição com o timeout de 60 segundos da política compartilhada foi interrompida pelo root quando o host estava sob forte contenção. O teste de continuidade já declara timeout próprio de 180 segundos; ele não foi reduzido ou alterado. Os 26 processos exclusivos dessa rodada foram encerrados. A falha inicial independente de dojoToday era colisão de porta; a repetição serial passou em 15 testes.

O resultado desejado é uma prova atual, discriminante e reexecutável para os fluxos oferecidos do OS. A proposta futura deve distinguir correção de seletor, política de timeout e defeito real, obter o aceite exigido para qualquer edição de teste protegido e repetir o mesmo escopo serialmente em host estável. Não enfraquecer assertions, trocar o texto do produto para satisfazer teste antigo ou chamar a rodada interrompida de verde. Nenhum usuário afetado ou impacto financeiro foi medido.

Este intent registra dívida de verificação descoberta durante a execução; não amplia o reparo dos PRs #657/#656 nem concede prontidão.
