# Plano — execução live e análise validada

Aceito sob a autorização explícita do usuário. Limite: scripts e documentação de research; nenhum código de produção.

1. Conferir branch/commit, hash do corpus congelado e manifesto; reaproveitar checkout/pesos verificados usando LAYA_ROOT documentado. Executar bootstrap e downloader; registrar versões, rede e logs novos.
2. Criar regressões negativas antes da correção do analyzer (digest adulterado, respostas inválidas, IDs duplicados e não finitos). Centralizar contrato em validation.py; usar no runner e antes de qualquer métrica no analyzer.
3. Registrar carga e aquecimento fora da duração da inferência Laya, e HTTP roundtrip no Jev. Usar nomes inéditos em todas as rodadas, com corpus/checkpoint SHA e versão real do modelo. Adicionar suporte a arquivo de credencial externo autorizado, sem copiar para produção.
4. Executar comparação auto e Jev no corpus integral; typed-decisions em triagem inglesa separado e Jev fixado em recomendação. Validar e persistir evidências sanitizadas em evidence/live-2026-10-04/.
5. Atualizar REPORT/README/RESUME, preservar relatório histórico, regenerar SHA256SUMS. Testar regressões, compilação, shell e manifesto; revisão independente dos passes de REVIEW.md e simplificação. Registrar entrega em verification.md.

Provas: `python3 docs/research/laya-jev/test_validation.py`; bootstrap/download com LAYA_ROOT; novos run_comparison --output; analyze --files explícitos; SHA256SUMS/corpus/checkpoints; diff limitado a docs/research/laya-jev e intent desta mudança.

Riscos: probabilidades arredondadas exigem tolerância numérica; confiança não equivale a calibração. Carga/HTTP podem ser confundidos com inferência. Revisões posteriores aos runs requerem registrar digests finais dos scripts e resultados; o corpus não será regenerado.
