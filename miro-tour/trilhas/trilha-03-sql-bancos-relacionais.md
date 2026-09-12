# 🛤️ Trilha 03 — SQL & Bancos de Dados

> **Fase do board:** F1/F2 — Dados (estágios 3, 12) · **Duração:** 4–6 semanas · **Pré-requisito:** Trilha 02

## 🎯 Objetivo

Dominar SQL na prática (CRUD, joins, transações), entender propriedades ACID,
CAP, indexação, o problema N+1 e tuning básico — cobrindo os estágios "SQL e Bancos
relacionais" e "Mais sobre bancos de dados" (NoSQL) do board.

## 📦 Módulos

### M1 — SQL interativo (1–2 semanas)

- ✅ [SQLBolt](https://sqlbolt.com/lesson/select_queries_introduction) — lições 1–18, interativas:
  SELECT, constraints, filtragem/ordenação, JOINs, OUTER JOINs, NULLs, expressões,
  agregações, ordem de execução, INSERT/UPDATE/DELETE, CREATE/ALTER/DROP, subqueries, unions.

**Checkpoint:** completar as ~20 lições com screenshot do progresso.

### M2 — Banco de dados de verdade (2–3 semanas)

- ✅ [CS50's Introduction to Databases with SQL](https://cs50.harvard.edu/sql/) — modelagem,
  queries, joins, transações, índices, segurança. (O board também referencia a [edição 2024](https://cs50.harvard.edu/sql/2024/) — mesma trilha.)
- Praticar em **PostgreSQL** ou **SQLite** local (instalados na Trilha 01).
- ⚠️ [ACID Properties in DBMS](https://www.geeksforgeeks.org/acid-properties-in-dbms/) (GeeksforGeeks)
- ⚠️ [Transaction in DBMS](https://www.geeksforgeeks.org/transaction-in-dbms/)
- ⚠️ [Indexing in Databases](https://www.geeksforgeeks.org/indexing-in-databases-set-1/)
- ⚠️ [The CAP Theorem in DBMS](https://www.geeksforgeeks.org/the-cap-theorem-in-dbms/)

**Checkpoint:** explicar ACID com exemplo de transferência bancária; explicar
quando um índice ajuda e quando não.

### M3 — Performance e armadilhas (1 semana)

- ⚠️ [SQL Performance Tuning](https://www.geeksforgeeks.org/sql-performance-tuning/)
- ✅ [O que é o problema N+1](https://medium.com/linkapi-solutions/o-que-%C3%A9-o-problema-de-n-1-24975a28dcb8) — o board tem diagrama próprio disso em `../08-banco-imagens.md`
- ✅ [ACID vs BASE (AWS)](https://aws.amazon.com/pt/compare/the-difference-between-acid-and-base-database/)
- ✅ [Tipos de bancos NoSQL (AWS)](https://docs.aws.amazon.com/whitepapers/latest/choosing-an-aws-nosql-database/types-of-nosql-databases.html) — estágio 12 "Bancos não relacionais".
- ✅ [Documentação MongoDB (drivers)](https://www.mongodb.com/pt-br/docs/drivers) — document-store na prática.
- ⚠️ [SQL Injection](https://www.geeksforgeeks.org/sql-injection/) — voltar na Trilha 06.

**Checkpoint:** identificar um N+1 num código ORM exemplo e corrigir com JOIN/eager loading.

## 🛠️ Projeto prático

Modelar o **schema do e-commerce** (caso de estudo do board): usuários, produtos,
pedidos, itens, pagamentos — com chaves, constraints, índices e 10 queries de negócio
(top clientes, receita por mês, estoque baixo). Rodar tudo em PostgreSQL.

## 🏁 Critérios de conclusão

- [ ] SQLBolt 100% completo.
- [ ] CS50 SQL concluído (psets enviados).
- [ ] Schema e-commerce com diagrama entidade-relacionamento + dump SQL no repo.
- [ ] Explicar ACID, CAP e N+1 em ≤ 5 linhas cada (sem consultar).

**Cruza com:** [Trilha 14](./trilha-14-system-design-escalabilidade.md) (sharding, replication, CQRS) e
[Trilha 06](./trilha-06-seguranca-web.md) (SQL injection).
