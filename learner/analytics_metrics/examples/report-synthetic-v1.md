# Relatório de progresso — EXEMPLO SINTÉTICO (AID-3515)

> **FIXTURES SINTÉTICAS DE CALIBRAÇÃO — nenhum aprendiz real; nenhum dado exportado de produção**
> Fonte: fixtures `learner/analytics_metrics/fixtures/synthetic/` ·
 dicionário v1 ·
 reproduzível via `python3 learner/analytics_metrics/compute.py --fixtures <dir>`.

## Pipeline

- linhas lidas: 32 · aceitas pós-dedup: 31 · duplicatas removidas: 1

## Funil literacy (unidade: sessão/page load — visita ≠ pessoa)

| estágio | sessões |
| --- | --- |
| entrada | 5 |
| brief | 2 |
| licao_iniciada | 2 |
| primeira_atividade_exposta | 1 |
| tentativa | 2 |
| licao_concluida | 2 |

- tentativas: 3 · com erro determinístico (passed=false): 1 · taxa de erro: suppressed (n=3<k=5)
- sessões-com-retry (≥2 tentativas na mesma lição): 1
- split de entrada: {'home': 3, 'lesson-resume': 1} · envelopes pré-v4 sem prop entry: 1 (fora do denominador da retomada)
- taxa de retomada (entry=lesson-resume): suppressed (n=4<k=5)
- retenção cross-dia: **não medido** — G8: sessionId efêmero por page load; sem identificador cross-dia (ADR-0009 emenda AID-913)

## Funil OS (unidade: instalação)

- instalações: 2 · onboarding iniciado: 2 · concluído: 2 · taxa: suppressed (n=2<k=5)
- tentativas submetidas: 2 · aprovadas (observável): 1 · erro (proxy): 1 — proxy: submitted sem passed subsequente na mesma (instalação, sessão, missão); evento de veredito negativo não existe no vocabulário OS v1
- retry.requested: 1 · instalações cross-dia: 1 · taxa: suppressed (n=2<k=5)

## Transferência (canal de evidência — rubricas tp-c01/tp-d01)

- **tp-c01-cotidiano**: aplicações 2 (1ª tentativa: 1, suficientes: 0, taxa: suppressed (n=1<k=5)) · 2ª tentativa: 1 (recuperadas: 1) — registros SINTÉTICOS de calibração; aplicações reais = 0 (práticas PR #619 ainda sem teste com alunos)
- **tp-d01-dev**: aplicações 1 (1ª tentativa: 1, suficientes: 1, taxa: suppressed (n=1<k=5)) · 2ª tentativa: 0 (recuperadas: 0) — registros SINTÉTICOS de calibração; aplicações reais = 0 (práticas PR #619 ainda sem teste com alunos)
- exemplos autorais de calibração excluídos dos numeradores: 1 · aplicações REAIS: 0

## Não medido (zeros honestos)

- retention_literacy_standalone: sem identificador cross-dia (G8)
- feedback_shown_rate: evento feedback_shown fora dos vocabulários (TF-1)
- transfer_real: canal de evidência sem aplicações reais
- funil_dev_deep: dojoToday emite só daily-view-open (G3)

## Leitura obrigatória

- Conclusão ≠ mastery: eventos acima medem experiência; competência exige
  evidência independente no gate (learner/AGENTS.md), fora daqui.
- Células `suppressed (n<k)` não são zero nem baixo — são não-publicáveis (k=5).
- Reload = 2 sessões: cruzar com ficha P6 antes de concluir drop-off.
