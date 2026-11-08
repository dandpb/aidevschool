# Paperclip Archive — AiDevSchool (2026-08-04 → 2026-11-08)

Este diretório consolida **todo o conhecimento operacional e histórico** da instância
Paperclip da AiDevSchool, exportado em 2026-11-08 antes do desligamento da instância
(issue AID-6506, fundador: "consolide todo o conhecimento dos ultimos tempos no repo...
vou deletar esse paperclip").

**Proveniência:** snapshot do banco (backup SQL 2026-11-08T13:35Z) + delta da API ao vivo
até ~14:20Z do mesmo dia. Números: **5.784 issues** (AID-1 → AID-6506, com lacunas por
issues deletadas), **62.540 comentários**, **5.848 documentos** (195 substantivos + 5.649
recibos `continuation-summary`), **25 agentes** com instruções completas, **14 skills**
compartilhadas, 549 interações, 225 relações, 107 work products, 52 revisões de config.

## Mapa do arquivo

| Caminho | Conteúdo |
|---|---|
| `issues-index.csv` | Índice de TODAS as issues: identificador, título, status, prioridade, responsável, origem (`manual` / `routine_execution` / `issue_productivity_review` / `task_watchdog` / …), pai, datas |
| `raw/issue-comments.jsonl.gz` | Thread completa: 62.540 comentários (issue, data, autor, corpo), ordenados por issue/data |
| `raw/documents-all.jsonl.gz` | Corpo final de todos os 5.848 documentos anexados a issues (inclui recibos `continuation-summary`) |
| `issue-documents.csv` | Metadados dos documentos (issue, chave, título, datas) |
| `documents/` | Os **195 documentos substantivos** renderizados em Markdown navegável (planos, specs, briefs, runbooks, decisões, drafts de lições…) |
| `agents.csv` + `agents/<slug>/AGENTS.md` | Roster completo dos 25 agentes + **instruções finais de cada um** (políticas, fronteiras, protocolos) |
| `skills/` | As 14 skills compartilhadas da empresa (incl. a skill `paperclip` que regia atribuição/menção/handoff) |
| `protocols/` | Consolidação curada pelo CEO: protocolos operacionais, lições da plataforma Paperclip, histórico e estatísticas |
| `raw/interactions.jsonl` | 549 interações de thread (ask_user_questions, request_confirmation, suggest_tasks) com payload/resultado |
| `issue-relations.csv` | Relações bloqueia/é-bloqueado-por entre issues |
| `work-products.csv` | 107 work products (PRs, deploys, evidências) com URL e estado de review |
| `governance-agent-config-revisions.jsonl` | 52 revisões de configuração de agentes (evolução das instruções, before/after) |
| `company.json` | Company, goal, project e 4 routines (metadados) |

## Como ler

- Comece por `protocols/` — é a destilação humana do que foi aprendido.
- Use `issues-index.csv` como índice; os títulos das issues são autodescritivos
  (padrão `Papel: ação — detalhe (AID-ref)`).
- Para aprofundar, descompacte `raw/issue-comments.jsonl.gz`:
  `zcat raw/issue-comments.jsonl.gz | jq 'select(.issue=="AID-3317")'`
- Os documentos por chave canônica: `plan`, `brief`, `roadmap-30d`, `pitch`, `spec`,
  `runbook`, `decisao`, etc. (ver `issue-documents.csv`).

## Redação de segurança (repo público)

O export foi limpo automaticamente antes de entrar no repo:

- Valores literais de segredos conhecidos (API keys, JWT secret, OAuth token do GitHub):
  **0 ocorrências** verificadas por busca direta.
- Redações aplicadas: hostname da instância (`[paperclip-host]`, 2.711×), hashes hex-64
  (`[REDACTED-HASH64]`, 36.453× — fingerprints de rotina), e-mails (`[redacted-email]`,
  45×), IPv4 (`[redacted-ip]`, 146×), padrões de token (Bearer/gh_/sk_/nfp_/private keys).
- Tabelas de credenciais/contas do banco **não foram exportadas** (account, session,
  user, `*_api_keys`, `company_secrets`, invites, cli_auth_challenges).

## Lacunas conhecidas

- Issues deletadas antes do snapshot existem apenas como referência em outras issues.
- Runs, heartbeats, cost events e activity logs ficaram de fora (volume operacional sem
  valor de conhecimento; o essencial está nos comentários e recibos).
- Comentários postados entre 13:35Z e 14:20Z de 2026-11-08: cobertos pelo delta da API
  apenas para issues ≥ AID-5781; risco residual mínimo.
