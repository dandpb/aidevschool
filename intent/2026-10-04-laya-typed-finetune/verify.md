# Verificação — fine-tuning typed-decisions

Escopo: research. Produção, gates, learner state e corpus histórico não alterados. Dois treinos reais e inferência dos checkpoints exportados; nenhum peso neural grande versionado.

## Provas executadas

- `python3 -m unittest discover -s docs/research/laya-jev -p 'test_*.py'`: 18 testes, OK.
- `python3 -m unittest discover -s docs/research/laya-jev/finetune -p 'test_*.py'`: 10 testes, OK.
- `python3 -m compileall -q docs/research/laya-jev/finetune`: sem erros.
- Builder copiado com catalog.json para diretório temporário: os três JSONLs e o data-manifest foram reproduzidos byte a byte, 4/4. Removida variável REPO não usada que impedia execução em diretório raso; nenhum dado mudou.
- Contratos negativos antes/depois: inclusão da engine pretendida (1 falha antes, 3 testes passando depois); teacher identity/split/digest (2 falhas antes, 4 depois); config-base/linhagem (2 falhas antes, 3 depois). Assertivas não enfraquecidas. Teste de análise usa fixture versionada para funcionar sem scratch/rede.
- Base SHA oficial verificado antes de treino/carregamento; encoder em memória before=after nas duas receitas; exportação confere 170 tensores encoder idênticos à base e 31 não-encoder alterados.
- `restore_adapter.py` reconstruiu ambos checkpoints: SHA integral igual ao exportado. ZIPs e todos os membros conferem no revisor independente.
- Cobertura teacher: train 244, calibration 98, test 362, versão efetiva jev-1.13.0, schemas/digests válidos. Targets do draft descartado não usados.
- BASE02, v1 e v2: 362/362 previsões novas e 62/62 históricas válidas; análises validam schema/digests/corpus/pesos/config antes de métricas. Novo corpus é sintético correlacionado; v2 exploratória após consulta do teste v1.
- Política anterior ao segundo treino escolhe v2 por menor KL na calibração 0,438760 vs0,503766; o seletor não lê teste/histórico. Calibração é tuning, não avaliação independente.

## Resultado

Teste novo: 107/410→183/410 concordância teacher, 62/72→63/72 rótulos sintéticos, KL 0,907910→0,576140, MAE 1,026632→0,777214. Ranking top1 17/26→16/26; Jev 24/26. Corpus antigo: 122/142→121/142 e ranking top1 0/6; top3 3/6→1/6. Não sustenta troca de produção.

Verificador independente: `/root/verify_live`, passes de REVIEW.md, regeneração integral das análises/seletor em temporários, conferência de hashes/ZIP/restauração sem API/inferência no revisor. Veredito detalhado em review.md. Simplificação manual reutilizou validation/sha/normalização e loop upstream, removeu variável de path não usada e tornou fixtures/reprodução portáveis.

Evidências: docs/research/laya-jev/finetune/evidence; relatórios e fontes executadas preservados. Hashes globais em docs/research/laya-jev/SHA256SUMS.txt. Binário selecionado ZIP2 SHA 1562baae01907e22c489b3e8553e3055f605f5e2a8ae40a54a309a332e98f888, peso SHA 760d6479aef421be52656431caea0a5a79099888027c92886f21d588e10393cf.
