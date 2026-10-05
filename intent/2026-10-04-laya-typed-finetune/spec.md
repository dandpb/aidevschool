# Contrato — fine-tuning CPU experimental

Treino parte do peso typed-decisions verificado no manifesto. CPU sem GPU; congelar encoder e treinar head/type embedding/scorer via laya.train.TrainConfig, objetivo soft-ce suportado. Distilar distribuições Jev e não inventar gold confidences. Seeds/hashes/proveniência devem acompanhar pesos e outputs. Treino/calibração/teste separados por exemplos e famílias de frases; corpus histórico permanece intocado e é teste de regressão já conhecido, sem selecionar checkpoint sobre ele.

Recomendação usa formato objetivo + uma descrição de engine por decisão score (variante de input separada). Comparar BASE e TREINADO no mesmo novo formato, distinguir ganho de formato de ganho de pesos. Triagem e sentimento exercitam choice/score/noul; português no encoder inglês é limitação, não presumir melhora. Métricas de aproximação ao teacher são concordância/KL/MAE, não ground truth independente. Rótulos semânticos manuais de triagem/sentimento oferecem diagnóstico secundário.

Não enviar dados reais de alunos. Exportar pesos em scratch ignorado, sem sobrescrever peso oficial; versionar scripts/datasets sintéticos/respostas/relatório, sem chave ou binário grande.
