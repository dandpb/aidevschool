# Fixtures SINTÉTICAS — controle de dupla contagem e exemplo de relatório
#
# AVISO: 100% sintéticas. Autoria: Learner Analytics Engineer (AID-3515,
# 2026-09-30). Não são resultados de alunos nem de pessoas reais; nenhum dado
# foi exportado de produção. Servem para (1) calibrar/reproduzir o cálculo do
# dicionário `../dictionary.yaml` e (2) exercitar os controles negativos
# NC-1..NC-8. Exemplos de desfecho de rubrica espelham a estrutura das
# rubricas tp-c01/tp-d01 (PR #619 @ 7259dbc5), NÃO aplicações reais
# (teste com alunos pendente, README do pacote §1).
#
# Formato: 3 feeds NDJSON, um cenário por linha, envelope idêntico ao dos
# emissores reais (literacy v2: engines/literacyDojo/src/domain/analytics.ts;
# OS v1: engines/codexdojo-os-prototype/src/analytics/collector.ts).
#
# Regeneração do relatório exemplo:
#   python3 learner/analytics_metrics/compute.py \
#     --fixtures learner/analytics_metrics/fixtures/synthetic \
#     --out-json /tmp/report.json --out-md /tmp/report.md
#
# Cenários embutidos (ver compute.py §expectations):
#   literacy: S1 feliz c/ erro+retry · S2 drop-off no brief · S3 retomada
#             (entry=lesson-resume) · S4 pré-v4 (sem prop entry) ·
#             S5 revisão espaçada · 1 linha duplicada exata (dedup NC-1)
#   os:       I1 completo + retorno dia 2 (retenção) + retry +
#             submitted-sem-passed (proxy erro) · I2 só onboarding
#   transfer: tp-c01 1ª insuficiente + 2ª recuperada · tp-d01 1ª suficiente ·
#             1 registro autorial de exemplo (FORA de todo numerador, NC-7)
