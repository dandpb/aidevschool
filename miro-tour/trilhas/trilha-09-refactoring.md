# 🛤️ Trilha 09 — Refactoring

> **Fase do board:** F3 — Técnicas de Refactoring (estágio 19) · **Duração:** 3–4 semanas · **Pré-requisito:** Trilha 08

## 🎯 Objetivo

Adquirir o catálogo de técnicas de refactoring do Fowler (métodos de composição,
organização de dados, condicionais, chamadas de método) e a disciplina de
tratar débito técnico de forma incremental e segura.

## 📦 Módulos

### M1 — Débito técnico e code smells (0,5 semana)

- ✅ [Technical Debt (Refactoring.Guru pt-BR)](https://refactoring.guru/pt-br/refactoring/technical-debt) — o board lista "o que é débito técnico" como primeiro tópico do estágio.
- ✅ [Code Smells (Refactoring.Guru pt-BR)](https://refactoring.guru/pt-br/refactoring/smells) — catálogo completo de maus-cheiros por categoria.

**Checkpoint:** auditar um repo (seu ou open source) e abrir issues nomeando
3 smells com a terminologia do catálogo.

### M2 — Composing Methods (1 semana)

- ✅ [Composing Methods (Refactoring.Guru)](https://refactoring.guru/refactoring/techniques/composing-methods)
  — Extract Method, Inline Method, Replace Temp with Query, Substitute Algorithm...

**Prática:** pegar 2 métodos longos (> 30 linhas) e reduzi-los a métodos de
≤ 10 linhas usando apenas Extract Method + Rename.

### M3 — Organizando dados (0,5 semana)

- ✅ [Organizing Data (Refactoring.Guru)](https://refactoring.guru/refactoring/techniques/organizing-data)
  — Replace Data Value with Object, encapsular coleções, substituir magic numbers.

**Prática:** substituir primitivos por value objects (conecta com Object Calisthenics da Trilha 08).

### M4 — Simplificando expressões condicionais (0,5 semana)

- ✅ [Simplifying Conditional Expressions (Refactoring.Guru)](https://refactoring.guru/refactoring/techniques/simplifying-conditional-expressions)
  — Decompose Conditional, Replace Conditional with Polymorphism, Introduce Null Object...

**Prática:** eliminar um `switch/if-else` em cadeia com polimorfismo.

### M5 — Simplificando chamadas de método (0,5 semana)

- ✅ [Simplifying Method Calls (Refactoring.Guru)](https://refactoring.guru/refactoring/techniques/simplifying-method-calls)
  — Rename Method, Introduce Parameter Object, Replace Error Code with Exception...

**Prática:** aplicar Introduce Parameter Object numa função com 4+ parâmetros.

## 🛠️ Projeto prático

**Diário de refactoring**: módulo legado (seu ou de tutorial) refinado em 8+ commits,
um por técnica aplicada, cada commit referenciando o nome da técnica no catálogo
(como `refactor: replace-conditional-with-polymorphism no cálculo de frete`).

> ⚠️ Regra de segurança: refactoring sem testes é perigoso. Se o módulo não tem
> testes, escreva-os primeiro (Trilha 11 pode ser feita em paralelo).

## 🏁 Critérios de conclusão

- [ ] 8 técnicas do catálogo aplicadas em código real, uma por commit nomeado.
- [ ] 3 code smells identificados por nome em code review (propósito ou alheio).
- [ ] Explicar débito técnico deliberado × inadvertido com exemplo.
- [ ] Antes/depois mensurável: complexidade ciclomática ou contagem de linhas.

## 📚 Livro

Refatoração — Martin Fowler (o catálogo completo; o GuRu é a versão web gratuita).

**Próxima:** [Trilha 10 — Design Patterns (GoF)](./trilha-10-design-patterns-gof.md)
