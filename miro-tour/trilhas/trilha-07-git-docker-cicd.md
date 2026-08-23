# 🛤️ Trilha 07 — Git, Docker & CI/CD

> **Fase do board:** F2 — Versionamento + Docker + Pipelines (estágios 4–5, 10, 13) · **Duração:** 3–4 semanas · **Pré-requisito:** Trilha 02

## 🎯 Objetivo

Dominar versionamento profissional (Git + repositórios remotos), conteinerização
com Docker e pipelines de CI/CD com GitHub Actions.

## 📦 Módulos

### M1 — Git & repositórios remotos (1 semana)

- Estágio 4–5 do board: **GitHub** (foco), **GitLab**, **Bitbucket** — criar conta,
  configurar SSH, primeiro push.
- Fluência essencial: `clone/add/commit/push/pull`, branches, merge × rebase,
  pull requests, resolução de conflitos, `.gitignore`, tags.
- ✅ [Git cheat sheet (gist leocomelli)](https://gist.github.com/leocomelli/2545add34e4fec21ec16) e
  ✅ [Documentação oficial do Git](https://git-scm.com/doc) como referência permanente.

**Checkpoint:** criar branch, abrir PR com 2 commits, resolver 1 conflito de merge
propositalmente criado.

### M2 — Docker (1–1,5 semana)

- Estágio 10 do board: **conceitos de conteinerização** → por que container ≠ VM;
  **comandos básicos** (`run/ps/exec/logs/stop`); **imagens, volumes, networks**;
  **Dockerfile** (layers, multi-stage); **Docker Compose** (app + banco juntos).
- ✅ [Documentação oficial do Docker](https://docs.docker.com) — referência durante todo o módulo.

**Prática:** containerizar a API do e-commerce (Trilha 05) com o PostgreSQL da
Trilha 03 via `docker compose up`.

**Checkpoint:** explicar layers de imagem e por que multi-stage reduz o tamanho;
demonstrar volume persistindo dados do banco entre reboots do container.

### M3 — CI/CD com GitHub Actions (1 semana)

- ⚠️ [What is CI/CD? (GeeksforGeeks)](https://www.geeksforgeeks.org/what-is-ci-cd/)
- ✅ [GitHub Actions — Quickstart (GitHub Docs)](https://docs.github.com/en/actions/writing-workflows/quickstart)
- Pipeline mínimo: lint → testes → build → imagem Docker.

**Checkpoint:** pipeline verde no PR, vermelho quando um teste quebra (provar
com os dois prints).

## 🛠️ Projeto prático

**E-commerce containerizado com pipeline**: repo único com `Dockerfile` +
`docker-compose.yml` (API + Postgres) + workflow GitHub Actions rodando lint/teste/build
em cada PR.

## 🏁 Critérios de conclusão

- [ ] `docker compose up` sobe o ambiente completo com 1 comando (documentado no README).
- [ ] Pipeline CI com estágios lint+test+build aprovando/bloqueando PRs.
- [ ] Demonstrar resolução de conflito via rebase em branch de exemplo.
- [ ] Explicar imagem × container × volume com suas palavras.

**Fonte contínua:** [GitHub Engineering Blog](https://github.blog/category/engineering/) ✅

**Próxima:** [Trilha 08 — Clean Code, SOLID & Object Calisthenics](./trilha-08-clean-code-solid-calisthenics.md)
