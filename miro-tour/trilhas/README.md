# 🛤️ Trilhas de Aprendizado — ROADMAP Guia do Arquiteto

**Origem:** board [ROADMAP - Guia do arquiteto](https://miro.com/app/board/uXjVJuYQF28=/) (Renato Augusto)
**Gerado em:** 2026-08-21, a partir da exploração via navegador dos conteúdos e URLs de `../miro-tour/`
**URLs de aprendizado mapeados:** ~150 (cursos, artigos, vídeos, docs) · **Verificados no navegador em 2026-08-21:** ✅

> 15 trilhas sequenciais que transformam os 47 estágios do board + conteúdos bônus
> (treinamentos, artigos, vídeos, livros, certificações, NFRs) em um plano de estudo
> executável, com projeto prático e critérios de conclusão falsificáveis.

---

## 🗺️ Mapa das Trilhas

A jornada completa segue as 5 fases do board. Trilhas de fases anteriores são
pré-requisito das seguintes (exceto onde indicado).

| # | Trilha | Fase do board | Duração* | Pré-requisito |
|---|---|---|---|---|
| 01 | [Fundamentos de Computação & Linux](./trilha-01-fundamentos-computacao-linux.md) | F1 — Fundamentos | 4–6 sem. | — |
| 02 | [Programação & Python](./trilha-02-programacao-python.md) | F1 — Fundamentos | 8–12 sem. | 01 |
| 03 | [SQL & Bancos de Dados](./trilha-03-sql-bancos-relacionais.md) | F1/F2 — Dados | 4–6 sem. | 02 |
| 04 | [Web, Redes & HTTP](./trilha-04-web-redes-http.md) | F2 — Web | 3–4 sem. | 01 |
| 05 | [APIs & Integrações](./trilha-05-apis-integracoes.md) | F2 — APIs | 3–4 sem. | 03, 04 |
| 06 | [Segurança Web](./trilha-06-seguranca-web.md) | F2 — Segurança | 3–4 sem. | 04 |
| 07 | [Git, Docker & CI/CD](./trilha-07-git-docker-cicd.md) | F2 — DevOps | 3–4 sem. | 02 |
| 08 | [Clean Code, SOLID & Object Calisthenics](./trilha-08-clean-code-solid-calisthenics.md) | F3 — Qualidade | 5–7 sem. | 02 |
| 09 | [Refactoring](./trilha-09-refactoring.md) | F3 — Qualidade | 3–4 sem. | 08 |
| 10 | [Design Patterns (GoF)](./trilha-10-design-patterns-gof.md) | F3 — Padrões | 5–6 sem. | 08 |
| 11 | [Testes Automatizados](./trilha-11-testes-automatizados.md) | F3 — Qualidade | 3–4 sem. | 08 |
| 12 | [Cloud & AWS (Certificações)](./trilha-12-cloud-aws-certificacoes.md) | F3/F4 — Cloud | 8–12 sem. | 05, 07 |
| 13 | [Arquitetura de Software & DDD](./trilha-13-arquitetura-software-ddd.md) | F4 — Arquitetura | 8–10 sem. | 08–11 |
| 14 | [System Design & Escalabilidade](./trilha-14-system-design-escalabilidade.md) | F5 — Escala | 6–8 sem. | 03, 05, 13 |
| 15 | [Sistemas Distribuídos & NFRs](./trilha-15-sistemas-distribuidos-nfrs.md) | F5 — Especialista | 6–8 sem. | 14 |

\* Estimativas com ~8–10 h/semana de estudo. Jornada completa: **18–24 meses**.
Fases 1–3 (trilhas 01–11) equivalem ao nível **dev pleno/sênior**; 12–15 ao nível **arquiteto**.

Progressão de carreira correspondente (board: `03-carreira-arquitetura.md`):
Programador → Júnior → Pleno → Sênior → Tech Lead → **Arquiteto Software (LLD)** → **Arquiteto Soluções (HLD)** → Arquiteto Corporativo.

---

## 📐 Como usar uma trilha

Cada trilha tem: **objetivo**, **módulos sequenciais com links**, **projeto prático** e
**critérios de conclusão** (gates). Convenções:

1. **Marcação de verificação** — ✅ = URL aberto e verificado no navegador em 2026-08-21;
   ⚠️ = domínio bloqueia navegação automatizada (GeeksforGeeks/CloudFront), mas é URL estável conhecida.
2. **Gates falsificáveis** — só marque uma trilha como concluída quando o critério puder ser
   demonstrado com evidência (código, diagrama, resposta escrita, projeto rodando).
   Alinhado à convenção do repo: *progresso é auditável; nada é "dominado" sem evidência*.
3. **Fichas de resumo** — ao final de cada módulo, escreva 3–5 linhas no seu journal
   (`learner/journal.md`) explicando o conceito com suas palavras. Se não conseguir explicar, releia.
4. **Cadence dos vídeos** — os vídeos do Renato Augusto (✅ títulos reais extraídos via oEmbed)
   são aulas de 15–30 min: assista **pausando para reproduzir o exemplo em código próprio**.

---

## 🔍 Correções encontradas durante a verificação no navegador

A exploração real dos URLs revelou divergências em relação à documentação extraída do board:

1. **CS50x está na edição 2026** (não 2025, como listado no board): Weeks 0–10 +
   módulo *Artificial Intelligence* + *Final Project*.
2. **CS50 Understanding Technology — Week 2 é "Internet"**, não "Programming Languages"
   como constava em `09-treinamentos-completos.md`.
3. **O catálogo de vídeos (`06-catalogo-videos.md`) tinha títulos trocados.** Os títulos reais
   (via YouTube oEmbed) mostram outra composição: **10 padrões GoF** (Simple Factory, Adapter,
   State, Facade, Observer, Decorator, Strategy, **Proxy, Template Method, Singleton**) +
   vídeos de **YAGNI**, **Microsserviços/DDD** e **Cache-Aside**. A trilha 10 usa os títulos reais.
4. **GeeksforGeeks bloqueia navegador automatizado** ("request could not be satisfied", CloudFront) —
   os ~34 links seguem válidos em uso normal; marquei ⚠️.

---

## 📚 Livros mapeados por trilha

| Livro | Autor | Trilha |
|---|---|---|
| O Programador Pragmático | Hunt & Thomas | 02, 08 |
| Código Limpo | Robert C. Martin | 08 |
| Refatoração | Martin Fowler | 09 |
| Padrões de Projeto (GoF) | Gamma et al. | 10 |
| Clean Architecture / Arquitetura Limpa | Robert C. Martin | 13 |
| Fundamentos de Arquitetura de Software | Richards & Ford | 13 |
| Dominando Domain-Driven Design | Vaughn Vernon | 13 |
| Microsserviços Prontos para Produção | Susan Fowler | 15 |
| System Design Interview Vol. 1 e 2 | Alex Xu | 14 |

**Além do código** (indicados pelo autor, sem trilha técnica):
O Homem Mais Rico da Babilônia · Os Segredos da Mente Milionária · Pai Rico Pai Pobre ·
Pode me Ferir, que eu Aguento · Como Fazer Amigos e Influenciar Pessoas.
Links de compra em [`../02-livros.md`](../02-livros.md).

---

## 🔁 Recursos contínuos (acompanhar em paralelo, a partir da trilha 13)

**Blogs de engenharia** (um artigo/semana, rodízio):
Microsoft Azure Architecture Center ✅ · AWS Architecture Blog ✅ · Netflix TechBlog ✅ ·
Cloudflare Blog · [ByteByteGo Newsletter](https://blog.bytebytego.com/) (Alex Xu) ✅ ·
Stripe Engineering · Meta Engineering · Google Cloud Blog · Discord Engineering ·
GitHub Engineering ✅ · Slack Engineering · Uber Engineering · LinkedIn Engineering

**Newsletters semanais:** [System Design Newsletter](https://newsletter.systemdesign.one/) ·
[System Design Codex](https://newsletter.systemdesigncodex.com/)

**Influenciadores para seguir** (lista completa em `../01-conteudos-recomendados.md`):
Alex Xu, Martin Fowler, Uncle Bob, Sam Newman, James Lewis, Vaughn Vernon, Simon Brown (C4),
Grady Booch, Raul Junco, Nelson Djalo, Nina Durán, Neo Kim, Gaurav Sen.

---

## 📊 Cobertura dos URLs do board

- **~150 URLs de aprendizado** (cursos, artigos, vídeos, docs, certificações) → mapeados nas 15 trilhas.
- **~25 URLs decorativos** (ícones flaticon/iconduck/icons8, imagens freepik/vexels, foto LinkedIn) → excluídos.
- **~14 homepages de blogs** → seção "Recursos contínuos" acima.
- Links internos de navegação do Miro (155) e CSV de influenciadores → já documentados em `../12-recursos-csv.md` e `../13-links-internos-miro.md`.

O caso de estudo de **NFRs de e-commerce** (login, e-mail de confirmação, cálculo de compra,
99,9% disponibilidade, 1M usuários, <200ms — ver `../05-requisitos-nfrs.md`) é o **fio condutor
prático** das trilhas 05, 06, 14 e 15: cada projeto prático contribui uma peça desse sistema.
