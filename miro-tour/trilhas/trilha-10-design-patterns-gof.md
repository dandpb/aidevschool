# 🛤️ Trilha 10 — Design Patterns (GoF)

> **Fase do board:** F3 — Design Patterns (estágios 21–24: comportamentais, criacionais, estruturais) · **Duração:** 5–6 semanas · **Pré-requisito:** Trilha 08

## 🎯 Objetivo

Dominar os padrões de projeto clássicos (Gang of Four) nas três famílias do board —
**criacionais, estruturais e comportamentais** — com as 10 aulas do autor do board.

> 📌 **Correção importante:** o arquivo `06-catalogo-videos.md` do board mapeava
> títulos trocados. Os títulos abaixo são os **reais**, extraídos via YouTube oEmbed
> em 2026-08-21. São 10 padrões GoF + já vistos: Strategy (na Trilha 08, OCP) e
> Adapter (Trilha 08, DIP).

## 📦 Módulos

### M1 — Criacionais (1,5 semana)

Como objetos são criados:

- ✅ [Simple Factory: o design pattern mais fácil](https://youtu.be/3-ESljj0jgI) — porta de entrada.
- ✅ [Singleton: multithreading & testes expõem os riscos](https://youtu.be/E8ey3HjSthg) — assistir com espírito crítico: quando NÃO usar.
- ✅ [Template Method: eliminando código duplicado](https://youtu.be/j5fGTi8ObK4)

**Checkpoint:** implementar Simple Factory para formas de pagamento do e-commerce
(cartão, pix, boleto) e explicar por que Singleton atrapalha testes.

### M2 — Estruturais (1,5 semana)

Como objetos se compõem:

- ✅ [Adapter: melhore OO e testes unitários](https://youtu.be/Fg1kEjaaBrs)
- ✅ [Facade: o pattern que simplifica código complexo](https://youtu.be/4Aq9UHQ5f5Y)
- ✅ [Decorator: flexibilize seu código](https://youtu.be/7B60j9EGrrU)
- ✅ [Proxy: melhore a arquitetura do seu código](https://youtu.be/el1MtIPXTqo)

**Checkpoint:** implementar Decorator para log/medição de um serviço sem alterar
a classe original; explicar Adapter × Proxy × Decorator (os três "embrulham").

### M3 — Comportamentais (1,5 semana)

Como objetos conversam:

- ✅ [State: domine transições de estado](https://youtu.be/OrCgWzpNszk) — perfeito para status de pedido (pago → enviado → entregue).
- ✅ [Observer: código reativo e escalável](https://youtu.be/mv9JxI85Ac8) — base de event-driven (Trilha 15).
- ✅ [Strategy: tudo o que você precisa saber](https://youtu.be/DzlXwgsc_AU) — aprofundando o visto na Trilha 08.

**Checkpoint:** modelar o fluxo de pedido do e-commerce com State + Observer
(pedido mudando de estado notifica estoque e e-mail).

### M4 — Catálogo de referência (contínua)

- ✅ [Refactoring.Guru pt-BR — Design Patterns](https://refactoring.guru/pt-br/design-patterns) —
  catálogo visual completo das 3 famílias; usar como consulta permanente.

## 🛠️ Projeto prático

**Padrões no e-commerce**: implementar em código 5 padrões resolvendo problemas
reais do domínio (Factory de pagamentos, State do pedido, Observer de eventos,
Decorator de log, Facade do checkout) — 1 diretório `patterns/` com README
explicando cada escolha.

## 🏁 Critérios de conclusão

- [ ] 5 padrões implementados em código próprio com teste unitário cada.
- [ ] Classificar os 10 padrões assistidos em criacional/estrutural/comportamental de memória.
- [ ] Responder "qual padrão aqui?" para 3 trechos de problema dados (justificar).
- [ ] Explicar 1 anti-use: quando um padrão piora o design (ex.: Singleton global).

## 📚 Livro

Padrões de Projeto (GoF — Gamma, Helm, Johnson, Vlissides).

**Próxima:** [Trilha 11 — Testes Automatizados](./trilha-11-testes-automatizados.md)
