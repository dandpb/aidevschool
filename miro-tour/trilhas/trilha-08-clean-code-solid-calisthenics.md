# 🛤️ Trilha 08 — Clean Code, SOLID & Object Calisthenics

> **Fase do board:** F3 — Qualidade de Código (estágios 12, 15–18) · **Duração:** 5–7 semanas · **Pré-requisito:** Trilha 02

## 🎯 Objetivo

Escrever código que outros conseguem ler e evoluir: princípios de qualidade,
os 5 princípios SOLID e as regras de Object Calisthenics — com as aulas em vídeo
do próprio autor do board (títulos reais, verificados via oEmbed).

## 📦 Módulos

### M1 — Princípios de qualidade de código (0,5 semana)

- ✅ [Refactoring.Guru (pt-BR)](https://refactoring.guru/pt-br) — portal de referência; navegue a introdução.
- ✅ [Code smells (Refactoring.Guru)](https://refactoring.guru/pt-br/refactoring/smells) — reconhecer os maus-cheiros antes de corrigir (aprofundar na Trilha 09).
- ✅ [SOLID, Clean Code e Design Patterns: Pare de Buscar o Código Perfeito!](https://youtu.be/yZRd_EWUs1g) — visão geral do autor (17 min).

**Checkpoint:** listar 5 code smells encontrados num projeto próprio.

### M2 — SOLID, um princípio por semana (5 semanas)

Assista, depois **reproduza o exemplo em código próprio** — violação e correção:

1. ✅ **S** — [Responsabilidade Única: o que ninguém te explicou](https://youtu.be/EWHTE1dQM4U)
2. ✅ **O** — [Open Closed Principle + Strategy Pattern](https://youtu.be/T6pF7BfAPIo)
3. ✅ **L** — [Substituição de Liskov, o princípio mais crítico](https://youtu.be/f6-5ANuTkys)
4. ✅ **I** — [Interface Segregation: pare de sabotar com abstrações erradas](https://youtu.be/jHbI9ej5O1Y)
5. ✅ **D** — [Inversão de Dependências + Adapter](https://youtu.be/s8g32ePcPps)

**Checkpoint por semana:** 1 par "antes/depois" de código no repo, nomeando o
princípio violado.

### M3 — Object Calisthenics (1–1,5 semana)

As 5 aulas do autor (regras do board: um nível de indentação, nunca ELSE,
envolver tipos primitivos, etc.):

1. ✅ [Técnicas para eliminar o ELSE do seu código](https://youtu.be/pW9Bb4PteWU)
2. ✅ [A armadilha dos tipos primitivos](https://youtu.be/YGNH71KPIes)
3. ✅ [Lei de Demeter: eliminando dependências ocultas](https://youtu.be/KXaPJhG9yCk)
4. ✅ [Aumente a coesão das classes com duas regras](https://youtu.be/_OKbQKjiKR8)
5. ✅ [Pare de usar getters e setters](https://youtu.be/PXHqooNlkVM)

### M4 — YAGNI e mindset (0,5 semana)

- ✅ [O maior erro de programadores e como o YAGNI pode salvar seu código](https://youtu.be/wjtfJ9c4KdM)

**Checkpoint:** reescrever 1 classe "anía" aplicando ≥ 3 regras de Calisthenics
(sem primitivos obsessivos, sem getters expostos, sem else).

## 🛠️ Projeto prático

**Refactor guiado**: pegar a CLI da biblioteca (Trilha 02) e aplicar, em commits
separados e nomeados (`srp: extrair classe X`, `dip: inverter dependência Y`),
cada princípio estudado.

## 🏁 Critérios de conclusão

- [ ] 5 pares antes/depois (um por princípio SOLID) com explicação no commit.
- [ ] Explicar cada letra do SOLID com exemplo **seu**, em vídeo de 5 min ou texto.
- [ ] 3 regras de Object Calisthenics aplicadas em código real.
- [ ] Responder: quando YAGNI conflita com DIP/OCP?

## 📚 Livros

Código Limpo (Uncle Bob) — leitura paralela · O Programador Pragmático (fecho).

**Próximas:** [Trilha 09 — Refactoring](./trilha-09-refactoring.md) ·
[Trilha 10 — Design Patterns](./trilha-10-design-patterns-gof.md)
