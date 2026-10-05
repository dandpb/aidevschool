# Plano — fine-tuning e medição

Aceito sob o pedido explícito de treinamento. Fluxo research, nenhum deploy.

1. Builder cria JSONL sintético train/calibration/test com famílias textuais separadas, en/pt, triagem/sentimento/recomendação por engine; detecta duplicações/hashes e preserva dataset original. Congelar splits antes das consultas.
2. Coletar distribuições Jev com respostas validadas, nomes novos e redaction; registrar versão retornada. Rodar checkpoint base no teste no mesmo formato.
3. Reutilizar laya.train para frozen-encoder, soft-ce, option-order augmentation para choice/noul, quatro epochs, CPU quatro threads, micro-batch 2/grad-accum 8. Calibrar somente no split separado. Verificar pesos/head mudaram e encoder não mudou; exportar checkpoint carregável por laya.load com hash novo.
4. Avaliar teste novo e corpus congelado, sem escolher epochs pelo teste. Relatar concordância/MAE/KL teacher, labels manuais diagnósticos e regressões; comparar formato antigo separadamente quando aplicável.
5. Revisão independente, regressões significativas de separação/proveniência/targets, hashes/versionamento/publicação na branch de pesquisa. Pesos ficam no scratch; report inclui caminho/hash e limites CPU/sintético/teacher.

Provas: splits sem overlap de estados/famílias/hash; schema teacher; hash oficial antes; run history loss finita e encoder congelado; carregamento do checkpoint exportado; resultados novos com digests e rótulos independentes do treino. Nenhum teste/gate canônico alterado.

## Segunda rodada exploratória

A rodada1 com head_lr=5e-5 teve perda final1,015 (entropia teacher de treino0,496), melhorou KL/MAE, mas não alterou nenhuma decisão do teste. Executar uma segunda receita fixada antes da execução: partir novamente da base oficial, quatro épocas soft-ce, head_lr=5e-4, demais parâmetros iguais. Escolher v1 ou v2 pelo menor KL ao teacher nas 138 perguntas de calibração, já usadas para ajustar temperatura. Essa comparação é ajuste em calibração, não prova de generalização. Não selecionar por corpus histórico nem pelo teste novo. O teste novo já visto é exploratório nesta segunda rodada; preservar a rodada1 e registrar essa adaptação explicitamente. Dois treinos constituem o orçamento desta execução; se não houver ganho discreto, entregar a limitação medida.
