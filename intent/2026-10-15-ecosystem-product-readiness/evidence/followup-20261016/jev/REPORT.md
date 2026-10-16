# Observação semântica independente — primeiro lote Jev

Quatro capturas retidas de C18/C20/C23 foram avaliadas em uma chamada HTTP, com 18 perguntas Noul. O serviço aceitou a credencial herdada pelo shell interativo: HTTP 200, `jev-latest` resolvido como `jev-1.13.0`; formato de resposta `answers[id].noul` validado. Transporte: `urllib.request` da biblioteca padrão, sem instalação de SDK e sem retry automático. Consumo: 13.478 tokens de entrada e 406 de saída; 1,52 s medidos na chamada.

Credenciais e base64 das imagens permaneceram em memória. O pacote retém nomes de headers, fingerprint do request, perguntas, caminhos/digests, resposta tipada completa e uso. Não há valor de chave ou header de autenticação nos recibos. O serviço não retornou um request ID nos dois nomes consultados.

| Captura e vínculo de caso | Observação | Probabilidades Noul relevantes |
| --- | --- | --- |
| C18 `configured-bridge/next-action.png` → `C18-projection-next-action` | O destino da próxima ação mostra a lista do ciclo, “Diagnosticar nível”, evidência/artefato e “Concluir etapa”. | estado esperado 0,98; legibilidade 0,97; overlay de erro 0,02 |
| C20 `daily-guidance/projection-and-action.png` → `C20-readonly-projection-and-next-action` | O card visível de Sócrates identifica KV WAREHOUSE e controles de prática/tutor. | estado esperado 0,98; legibilidade 0,95; overlay de erro 0,05 |
| C20 `daily-guidance/inline-open.png` → `C20-game02-real-inline-practice` | A região embutida mostra “Sua lição de hoje”/“Quebre o gelo hoje”, sem prática identificável do warehouse. | warehouse visível 0,04; landing diária embutida 0,97 |
| C23 `explore-day-night-return/explored-morning.png` → `C23-entry-hud-exploration` e `C23-declared-town-content` | Há plano de chão e HUD de manhã/tempo; não há prédios, residentes ou veículos identificáveis na captura. | HUD 0,98; entidades de cidade 0,05 |

Os dois últimos resultados corroboram as lacunas dos relatos de runtime. A cidade vazia observada continua sem cumprir a promessa de conteúdo documentada; a prática inline continua sem prova do jogo. A observação não infere defeito de fonte ou reparo de empacotamento. As outras duas capturas sustentam apenas os elementos visíveis: não comprovam projeção completa, clipboard, interação, provider ou preservação de estado.

Os bytes das quatro imagens, três relatórios e arquivos fonte selecionados foram preservados antes/depois. Os manifests históricos dos produtores divergiam somente para o plano e o checklist, já alterados depois da captura; os arquivos de produto listados conferiam. O HEAD observado foi `528a56c847ec50276ed9d2dab2c7247584c567c3`; os relatórios mantêm sua identidade original de fonte, `0a2e2dbeda5e41b00642a5280e40a0d8102d1102`, sem reatribuição.

Limites: imagens são experimentais nos docs atuais do TypeSafe; as probabilidades são dados consultivos sem threshold de aprovação. Este lote cobre 1/5 capturas de C18, 2/6 de C20 e 1/6 de C23. As outras 13 e os demais engines seguem sem avaliação Jev neste lote. Não concede ReadinessTier, mastery, PASS de engine ou PASS global. O observador semântico não é o verificador final da feature.

Próximas chamadas aguardam autorização do root para controlar quantidade e custo.

Recibos: [REPORT.json](REPORT.json), [request metadata](sample-request-metadata.json), [resposta](sample-response.json), [status](sample-status.json), [fonte antes](source-before.json), [fonte depois](source-after.json). Docs vivos retidos em `docs/`: `llms.txt`, `images.md`, `api.md`, `primitives-noul.md`.
