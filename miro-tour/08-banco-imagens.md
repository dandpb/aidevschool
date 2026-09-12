# 🖼️ Banco de Imagens — Diagramas de Padrões

**Seção:** `Banco de Imagens` (frame esquerdo, abaixo de Treinamentos)

> 7 diagramas visuais sobre padrões de arquitetura — o tipo de conteúdo que
> ajuda a **visualizar conceitos abstratos** que são difíceis de explicar só com texto.

## 📊 Os 7 Diagramas

### 1. 🗣️ Diferença entre Linguagens

Diagrama comparativo entre linguagens: Go, Java, .Net, Node.js, Python.
Mostra o posicionamento típico de cada uma (backend, frontend, mobile, etc.)

### 2. 🔄 Problema N+1

Exemplo de SQL demonstrando o **Problema N+1** em queries:

```sql
SELECT id, name, email FROM users; -- 1 query
-- Para cada user (N vezes):
SELECT * FROM articles WHERE user_id = ?; -- N queries
-- Resultado: 1 + N queries (ineficiente!)
```

**Solução:** JOIN ou eager loading.

### 3. 🗄️ No Caching

Arquitetura SEM cache:

```
[Client 1] \
[Client 2]  -> [App Server] -> [Database]
[Client 3] /
```

Toda requisição vai direto ao banco — alta latência, alta carga no DB.

### 4. ⚡ Cache-Aside Pattern

Arquitetura COM cache (estratégia cache-aside):

```
[Client 1] \
[Client 2]  -> [App Server] -> [Cache] (hit) ✅
[Client 3] /                          |
                                      v (miss)
                                  [Database]
```

1. App consulta o cache primeiro
2. Se hit, retorna o dado
3. Se miss, busca no DB, popula o cache, retorna

### 5. 🔄 Sem Processamento Assíncrono

Processamento SÍNCRONO (requisição espera o trabalho):

```
[Client] -> [App Server] --> [Long Task] --> [Database] --> [Response]
                                   ⏰ (blocking)
```

Problema: response time alto, threads ocupadas.

### 6. 🐰 Com Processamento Assíncrono (RabbitMQ)

Processamento ASSÍNCRONO (via fila de mensagens):

```
[Client] -> [App Server] --> [RabbitMQ Queue] --> [Worker] --> [Database]
                ↓                                          ↑
             [Response] (rápido!)                  [Processa depois]
```

Benefícios: response rápido, resiliência (worker pode falhar e reprocessar),
escala independente (múltiplos workers).

### 7. 📈 Sequence Diagram (Cache-Aside Sequence)

Diagrama de sequência mostrando o fluxo User → App → Cache → DB com:

```
User     App      Cache     DB
  |       |         |        |
  |--R--> |         |        |  (Request)
  |       |--C1---> |        |  (Cache Lookup)
  |       |         |        |
  |       |<--miss--|        |  (Cache Miss)
  |       |--D1---------->|  |  (DB Query)
  |       |<--data---------|  |  (DB Response)
  |       |--set---> |        |  (Populate Cache)
  |       |         |        |
  |<--R---|         |        |  (Response to User)
```

## 🎯 Por que esses diagramas?

Esses 7 padrões cobrem os conceitos mais importantes que todo arquiteto
precisa visualizar na prática:

- **Escolha de linguagem** (#1) — trade-offs arquiteturais
- **Performance SQL** (#2) — problemas clássicos de queries
- **Caching** (#3, #4, #7) — desde o problema até a solução e sequência
- **Async processing** (#5, #6) — sync vs async com message queue

Memorize esses 7 diagramas e você terá uma base sólida para entrevistas
e decisões arquiteturais reais.