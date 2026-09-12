# 🛤️ Trilha 05 — APIs & Integrações

> **Fase do board:** F2 — APIs & Integrações (estágio 8) · **Duração:** 3–4 semanas · **Pré-requisitos:** Trilhas 03, 04

## 🎯 Objetivo

Projetar e consumir APIs profissionais: REST madura (HATEOAS, versionamento,
paginação, status codes, métodos), alternativas (gRPC, GraphQL) e o formato JSON.

## 📦 Módulos

### M1 — Fundamentos de API e REST (1 semana)

- ✅ [What is an API? (AWS)](https://aws.amazon.com/pt/what-is/api/)
- ✅ [What is a RESTful API? (AWS)](https://aws.amazon.com/pt/what-is/restful-api/)
- ✅ [Detailed overview of HTTP methods (Medium)](https://medium.com/@reetesh043/detailed-overview-of-http-methods-271e88848b0d) — GET/POST/PUT/PATCH/DELETE, idempotência.
- ✅ [HTTP Status Codes (Microsoft Learn)](https://learn.microsoft.com/en-us/troubleshoot/developer/webapps/iis/health-diagnostic-performance/http-status-code)

**Checkpoint:** desenhar o contrato REST de um recurso `pedidos` (métodos, rotas,
status de sucesso/erro) em tabela.

### M2 — REST madura (1 semana)

- ✅ [Como versionar uma API REST (freeCodeCamp)](https://www.freecodecamp.org/portuguese/news/como-versionar-uma-api-rest/)
- ✅ [O que é HATEOAS? (TreinaWeb)](https://www.treinaweb.com.br/blog/o-que-e-hateoas)
- ✅ [How do we perform pagination in API design? (ByteByteGo)](https://bytebytego.com/guides/how-do-we-perform-pagination-in-api-design/) — offset × cursor.
- ✅ [Identifying resources on the Web — esquema/protocolo (MDN)](https://developer.mozilla.org/pt-BR/docs/orphaned/Web/HTTP/Basics_of_HTTP/Identifying_resources_on_the_Web)

**Checkpoint:** explicar quando usar paginação por cursor em vez de offset.

### M3 — Além do REST (1 semana)

- ✅ [gRPC vs REST (AWS)](https://aws.amazon.com/pt/compare/the-difference-between-grpc-and-rest/) e
  ✅ [gRPC (Microsoft Learn)](https://learn.microsoft.com/pt-br/dotnet/architecture/cloud-native/grpc)
- ✅ [GraphQL vs REST (AWS)](https://aws.amazon.com/pt/compare/the-difference-between-graphql-and-rest/)

**Checkpoint:** recomendar REST/gRPC/GraphQL para 3 cenários dados (API pública,
comunicação interna de microsserviços, app mobile com telas variáveis) e justificar.

## 🛠️ Projeto prático

**API de catálogo do e-commerce** (caso de estudo): `/v1/produtos` com CRUD,
paginação por cursor, filtros, status codes corretos e HATEOAS no retorno.
Documentar com OpenAPI/Swagger.

## 🏁 Critérios de conclusão

- [ ] API rodando com 2 versões (`/v1`, deprecada via header) demonstrando versionamento.
- [ ] Paginação por cursor implementada e explicada.
- [ ] Comparativo REST × gRPC × GraphQL (1 página) com recomendação justificada.
- [ ] Collection/Insomnia ou OpenAPI spec commitada no repo.

**Próxima:** [Trilha 06 — Segurança Web](./trilha-06-seguranca-web.md)
