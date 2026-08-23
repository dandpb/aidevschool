# 🛤️ Trilha 11 — Testes Automatizados

> **Fase do board:** F3 — Testes Automatizados (estágio 18) · **Duração:** 3–4 semanas · **Pré-requisito:** Trilha 08

## 🎯 Objetivo

Internalizar a pirâmide de testes do board — **80% unitários, 15% integração,
5% funcionais/E2E** — e escrever testes que dão confiança para refatorar
(par com a Trilha 09) e evoluir design (par com a Trilha 10).

## 📦 Módulos

### M1 — A pirâmide de testes (0,5 semana)

- ✅ [The Practical Test Pyramid (Martin Fowler)](https://martinfowler.com/articles/practical-test-pyramid.html)
  — o artigo de referência sobre unit × integration × end-to-end, trade-offs de custo/confiança/velocidade.
- Tópico do board: por que 80/15/5 — a proporção vem do custo crescente e da
  velocidade decrescente conforme se sobe a pirâmide.

**Checkpoint:** explicar em 1 página por que 100% de testes E2E é anti-pattern
e por que 100% unitários não dá confiança de integração.

### M2 — Testes unitários de qualidade (1–1,5 semana)

- Prática: testar o cálculo de compra do e-commerce (frete + descontos + impostos —
  requisito 3 do caso de estudo), a parte mais pura do domínio.
- Aprender: AAA (Arrange-Act-Assert), testes determinísticos, fakes/stubs/mocks
  (quando mockar: só em bordas do sistema), parametrização, cobertura ≠ qualidade.

**Checkpoint:** suite de testes do cálculo de compra com ≥ 12 casos cobrindo
regras de borda (carrinho vazio, frete grátis acima de X, cupom inválido).

### M3 — Testes de integração (1 semana)

- Prática: testar repositórios contra PostgreSQL real (docker, Trilha 07) e a API
  (Trilha 05) com banco em memória ou container efêmero.

**Checkpoint:** teste de integração do fluxo "cria pedido → consulta → cancela"
rodando contra o compose da Trilha 07.

### M4 — Testes funcionais/E2E (0,5 semana)

- Prática: 1–2 fluxos E2E críticos (login → adicionar ao carrinho → checkout),
  rodando no pipeline CI.

**Checkpoint:** pipeline verde com as 3 camadas rodando (unit < 10s,
integração < 2 min, E2E < 5 min).

## 🛠️ Projeto prático

**Suíte completa do e-commerce**: repo com as 3 camadas na proporção do board
(~80/15/5), rodando no GitHub Actions com relatório de cobertura configurado.

## 🏁 Critérios de conclusão

- [ ] ≥ 20 testes unitários do domínio, todos determinísticos e rápidos (< 10 s).
- [ ] ≥ 4 testes de integração contra banco real via Docker.
- [ ] 1–2 testes E2E do fluxo crítico no CI.
- [ ] Proporção da suíte ≈ 80/15/5 (mostrar contagem por tipo no README).
- [ ] Demonstrar: quebrar uma regra de negócio → teste vermelho → corrigir → verde.

**Conexões:** refactoring seguro (Trilha 09) · Singleton × testabilidade (Trilha 10) ·
[engineering blogs contínuos](./README.md#-recursos-contínuos-acompanhar-em-paralelo-a-partir-da-trilha-13)

**Próxima:** [Trilha 12 — Cloud & AWS (Certificações)](./trilha-12-cloud-aws-certificacoes.md)
