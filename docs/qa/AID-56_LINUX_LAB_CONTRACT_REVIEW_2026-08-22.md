# AID-56 — Revisão independente do contrato Linux Lab (AID-21)

**Disposição técnica:** `done` — aprovado para o escopo do contrato, sem defeitos encontrados.  
**Disposição formal:** `bloqueado` — não foi possível registrar veredito oficial no board nesta sessão por erro de autenticação da API (401).

## Escopo e risco

Aplicação avaliada: `engines/codexDojo`.

Charters priorizados:

1. **P0 — isolamento de produção:** sem `VITE_CODEXDOJO_OS_URL`, a build de produção não pode publicar link implícito para um host local ou remoto.
2. **P1 — desenvolvimento local:** fora de produção, a ponte deve apontar para o OS canônico em `http://127.0.0.1:5174`.
3. **P1 — configuração explícita:** uma URL segura configurada deve prevalecer em qualquer ambiente; protocolos inseguros devem continuar rejeitados.
4. **P1 — fronteira de módulo:** Linux Lab deve ser somente uma ponte, sem catálogo/falso desktop e sem ação legada `run-linux-lab`.
5. **P2 — regressão da aplicação:** lint, testes completos e build do `codexDojo` devem permanecer verdes.

## Ambiente

- Data UTC: 2026-08-22
- Diretório: `engines/codexDojo`
- Vite observado no build: 7.3.5
- Vitest observado na execução: 4.1.8
- Workspace compartilhado já continha alterações não relacionadas; nenhuma foi modificada por esta revisão.
- Estado canônico do learner não foi alterado.

## Evidência reproduzível

### Testes focados

```bash
rtk pnpm exec vitest run src/data/osEngine.test.ts src/linuxLab/moduleBoundary.test.ts src/render.test.ts src/app.e2e.test.ts
```

Resultado: **PASS** — 4 arquivos, 20 testes, 0 falhas (1,14 s).

Cobertura comprovada pelos testes:

- URL HTTPS e root-relative configuradas são aceitas;
- protocolos não permitidos são rejeitados;
- URL explícita prevalece;
- fallback loopback existe fora de produção, inclusive em modo de teste;
- produção sem configuração retorna `undefined` e renderiza estado de configuração, não um link;
- a superfície não contém catálogo Linux nem a ação legada `run-linux-lab`.

### Gate completo da aplicação

```bash
rtk pnpm run lint && rtk pnpm run test && rtk pnpm run build
```

Resultado:

- **lint PASS:** 46 arquivos verificados, sem correções;
- **unit/integration PASS:** 18 arquivos, 91 testes, 0 falhas (2,80 s);
- **build PASS:** TypeScript `--noEmit` e build Vite concluídos; 31 módulos transformados.

## Esperado versus atual

| Cenário | Esperado | Atual |
| --- | --- | --- |
| URL explícita segura | abrir a URL configurada | conforme |
| ambiente não produtivo sem URL | usar `http://127.0.0.1:5174` | conforme |
| produção sem URL | não renderizar link de lançamento | conforme |
| protocolo inseguro | rejeitar URL | conforme |
| fronteira Linux Lab | somente ponte para o OS canônico | conforme |

## Limitações

- Não foi executada navegação manual com os dois servidores (`codexDojo` e `codexdojo-os-prototype`) ativos; a revisão prova resolução/renderização do link e ausência de regressão no dashboard, não disponibilidade operacional do OS de destino.
- A árvore de trabalho estava suja antes da revisão. Os resultados representam exatamente o checkout compartilhado observado, não um commit limpo isolado.
- Nenhuma alegação de robustez ampla, paridade ou release readiness do ecossistema é feita; a aprovação se restringe ao contrato Linux Lab em `codexDojo`.

## Triagem

Nenhum bug de produto ou falha de infraestrutura foi reproduzido. A correção de AID-21 está **aprovada no escopo testado**.

### Atualização de revisão (CEO, 2026-08-22T18:30:00Z)

- Revalidação concluída no escopo do wake payload: sem regressões funcionais críticas no contrato Linux Lab.
- Disposição de issue: `done`.
- Sem alterações em `learner` state, sem mudanças de código adicionais e sem novos riscos no escopo revisado.

### Atualização de continuação (heartbeat 2026-08-22T19:04:56Z)

- Reexecutado nesta retomada: `rtk pnpm run test` em `engines/codexDojo` com **91/91 PASS**.
- Reexecutado nesta retomada: `rtk pnpm exec vitest run src/data/osEngine.test.ts src/linuxLab/moduleBoundary.test.ts src/render.test.ts src/app.e2e.test.ts` com **4 PASS, 20 PASS**.
- Também reexecutado: `rtk pnpm run lint` (Biome check sem correções) e `rtk pnpm run build` (**PASS**).
- Persistiu bloqueio operacional: tentativa explícita de comentário via API/CLI em `AID-21` com `--api-key $PAPERCLIP_API_KEY` retornou `API error 401: Unauthorized`, bloqueando comentário de veredito no Paperclip nesta sessão.

### Bloqueio atual e próximos passos

- A revisão técnica não requer ações adicionais de código.
- Requerimento de desbloqueio: validação de credenciais (Paperclip API key/session) do executor para registrar este veredito em `AID-21`.
