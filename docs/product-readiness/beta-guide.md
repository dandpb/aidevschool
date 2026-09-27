# Guia Beta — Founder: como testar cada engine

> **Proveniência deste arquivo:** espelho em repo do doc `beta-guide` (issue AID-2671, título "Guia Beta Founder — como testar cada engine + loop de feedback (verificado 2026-09-26; +school-entry 16:55Z)"). Publicado no repo pela AID-2960 (DRE) para que toda claim de beta tenha data + fonte verificável no repositório — o doc na thread permanece o espelho de sessão; divergência entre os dois é bug de docs (reportar, não editar à mão na matriz gerada).
> Fonte vigente da URL do túnel school-entry: `school-entry-tunnel/public-url.txt` no servidor de ops (quick tunnel — muda por restart).

**Para quem:** você (founder), sem instalar nada e sem criar conta.
**Quando foi verificado:** 2026-09-26 — cartões 1–5: ~01:28Z (criação) e re-checados ~16:56Z; cartão 6 (school-entry): adicionado e verificado ~16:55Z nesta revisão. Todos os links responderam **HTTP 200** (curl, a partir do servidor; evidências em "Fontes e datas"). Re-check do cartão 6 no repo: 17:01:56Z — `GET /` HTTP 200; `GET /api/engines` → `{"engines":[]}`.
**Base:** doc `engine-reports` (rev `4c2a2724`, 2026-09-26) + matriz de readiness `docs/product-readiness/README.md` (linhas 10–18, todos `pass`, revalidação 2026-10-16/19).
**Smoke QA da sessão (AID-2670):** matriz publicada — doc `beta-smoke-matrix` rev `db5bd7de` (evidência 25/25 Playwright, 2026-09-26T01:31–01:34Z; 9/9 superfícies customer-tier PASS, 0 blockers de sessão). O card 6 (school-entry) não estava naquela matriz — a evidência dele hoje é a checagem ao vivo desta revisão (Fontes e datas).

---

## Como usar (leia isto primeiro — 1 minuto)

1. Abra os links em qualquer navegador (computador ou celular). **Sem login**: o progresso fica salvo no navegador usado no teste. Para recomeçar do zero, use uma janela privada.
2. Siga a ordem dos cartões abaixo — a sessão inteira leva **~30–35 min**. Cada cartão é independente; pode parar e voltar depois.
3. **Se algo não abrir ou quebrar: não tente consertar** — só reporte (seção "Como reportar seus achados" no fim). Nós consertamos.

---

## Os cartões de teste

### 1. LiteracyDojo — microlearning de IA para não-programadores
- **Onde:** https://aidevschool-literacydojo.netlify.app
- **Teste:** abra, comece a **1ª missão**, responda; erre uma de propósito e veja a recuperação; depois recarregue a página.
- **Esperado:** lição concluída com resultado na tela; ao voltar, seu progresso continua de onde parou (mesmo navegador).
- **Tempo:** ~5 min.

### 2. CodexDojo OS — o "computador de estudos" (experiência principal)
- **Onde:** https://aidevschool-codexdojo-os.netlify.app
- **Teste:** escolha uma trilha de IA → complete a missão de literacy hospedada dentro do OS; feche a aba, reabra e volte.
- **Esperado:** missão concluída com resultado do OS; ao retornar, retoma sem repetir o setup inicial.
- **Tempo:** ~8 min.

### 3. dojoToday — "a lição de hoje" (dentro do OS)
- **Onde:** https://aidevschool-codexdojo-os.netlify.app/apps/dojotoday/
- **Teste:** abra e leia: lição do dia, revisões vencidas e unidade ativa; siga a próxima ação sugerida.
- **Esperado:** página de leitura com a próxima ação clara (é só-leitura: não há nada a "concluir" aqui).
- **Tempo:** ~3 min.

### 4. PixelQuest — RPG 8-bit onde jogar é aprender (dentro do OS)
- **Onde:** https://aidevschool-codexdojo-os.netlify.app/apps/pixelquest/
- **Teste:** entre no mapa, complete um encontro/lab de começo.
- **Esperado:** encontro concluído e o jogo registra a prova do que você fez (ele marca o que foi feito — nunca declara "dominado").
- **Tempo:** ~5 min.

### 5. voxelDojo — simulações 3D, um conceito por jogo (dentro do OS)
- **Onde (destaque):** Armazém KV — https://aidevschool-codexdojo-os.netlify.app/apps/warehouse/
- **Teste:** jogue o loop do Armazém KV (guardar e reencontrar chaves). Demais jogos do catálogo: `/apps/wormhole/`, `/apps/relay-station/`, `/apps/pipeline-plant/` etc. (19 apps no total no bundle).
- **Esperado:** o loop completa de forma previsível e gera a prova de execução; os outros jogos abrem pelo mesmo padrão.
- **Tempo:** ~5 min (+ opcional por jogo extra).

### 6. school-entry — a "porta de entrada" do site (novo)
- **Onde:** https://reaction-bizrate-soviet-patient.trycloudflare.com
- **Teste:** abra a página e descreva no campo o que você quer aprender (ex.: "quero usar IA no meu trabalho sem programar") e envie; depois peça para ver o catálogo de experiências.
- **Esperado:** a página responde. Enquanto as experiências não forem liberadas pela operação, recomendação e catálogo aparecem vazios com aviso honesto — "Nenhuma engine está disponível agora. Volte mais tarde." O catálogo começa **bloqueado por design**; liberado, cada experiência vira um cartão com botão "Começar" que leva até ela.
- **Tempo:** ~3 min.
- **Se o link não abrir:** ele usa um túnel temporário e pode mudar após reinício do servidor — peça a URL vigente num comentário (AID-2660) que a equipe atualiza este guia.

### 7. miniTown — cidade para explorar (experimental)
- **Onde:** sem link público hoje — não conta para o beta de agora.
- **Status:** tier `experimental` por design; aparecerá no Beta Hub (AID-2669) se for publicado, ou em sessão local agendada.
- **Tempo:** n/a.

### Demais engines — por que não estão no beta de hoje (1 linha cada)

| Engine | Motivo |
| --- | --- |
| codexDojo (dashboard) | superfície interna de operação, sem caso customer |
| zai-duolingo-like | incubada, sem tier de readiness (decisão pendente) |
| sdlc-quest | roda local (`npm start`), sem tier avaliado |
| aiDevschoolMvp | sem web; decisão absorção/sunset pendente |
| minimaxDojo · miniMaxEvolutionEngine · openclaw · shared | infra interna de agentes/tutor, sem tela para founder |

---

## Como reportar seus achados (loop de feedback)

### Passo 1 — Founder reporta (1 achado = 1 comentário)

Comente nesta issue (AID-2660) usando este molde — copie e cole:

```
Engine: (ex.: LiteracyDojo)
URL: (a página onde aconteceu)
O que fiz: (passos, ex.: "cliquei em iniciar missão e respondi 2 questões")
O que aconteceu: (o que vi)
Esperava: (o que deveria acontecer)
Bloqueia a sessão? (sim/não — "sim" = não dá pra testar a engine)
```

Não precisa ser formal: screenshot + duas linhas já ajudam; o molde garante que nada se perca.

### Passo 2 — Equipe converte em issue no mesmo dia (qualquer agente executa)

1. **Ack** do comentário em ≤1 heartbeat (responder "recebido" no thread).
2. **Abrir issue** child de AID-2660, título PT-BR `BETA <engine>: <achado curto>`, corpo com: repro steps do comentário, URL, evidência (screenshot/log), severidade — `BLOCKER` (impede o teste da engine; priority `high`) ou `COSMÉTICO` (queue normal).
3. **Dono por rota padrão:** deploy/URL/pipeline → FPE (Platform & Release); conteúdo/currículo → Curriculum Platform Engineer; UI/lógica da engine → dono da engine (ver README/docs da engine em `engines/`); re-teste → QA Lead.
4. **Correção** via PR pequena (FPE mergeia — single-writer; sem push direto em `main`).
5. **Verificação e fechamento:** QA Lead re-executa o smoke da engine (matriz AID-2670) → comenta verificação na issue do achado → fecha. Só a verificação independente fecha o achado (nunca "parece arrumado").
6. **Registrar** na tabela "Achados" abaixo + link da issue.

### Achados da sessão (log vivo)

| # | Data | Engine | Achado (resumo) | Severidade | Issue | Status |
| --- | --- | --- | --- | --- | --- | --- |
| — | — | — | *(nenhum registrado ainda)* | — | — | — |

---

## Fontes e datas (rastreabilidade)

- Engine-reports rev `4c2a2724` (doc nesta issue, 2026-09-26 01:17Z) — 15 engines, tiers, deploys.
- Matriz de readiness: `docs/product-readiness/README.md` linhas 10–18 — 8 corredores `customer-ready`/`pass`, revalidação 2026-10-16/19.
- Checagem de URLs: 2026-09-26 ~01:28Z, curl HTTP 200 em ambos os aliases e nos apps `/apps/{literacydojo,warehouse,dojotoday,pixelquest,wormhole,relay-station}/`.
- Pilot bundle: `pilot-bundle-manifest.json` (sourceRevision `b6a0ea1b`) — 20 superfícies com hash de integridade.
- Smoke QA por engine: AID-2670 (QA Lead, em andamento) — será refletido no log acima quando publicado.

- **school-entry (card 6, adicionado nesta revisão por AID-2958 — ordem CEO AID-2910 passo 3):** verificado ao vivo 2026-09-26 ~16:55Z — `GET /` → HTTP 200; `GET /api/engines` → `{"engines":[]}` (catálogo inicia bloqueado); `POST /api/recommend` (com Origin válido) → `{"mode":"empty","message":"Nenhuma engine está disponível agora. Volte mais tarde."}`; painel do operador `/admin/engines` → HTTP 200 (acesso por senha com CEO/founder — senha fora deste guia). Server-side na mesma infra do beta (padrão AID-2677). URL vigente do túnel gerenciada pela operação (arquivo `school-entry-tunnel/public-url.txt` no servidor de ops; muda por restart do quick tunnel).

*Regra de ouro do produto: nenhum "concluído/dominado" sem verificador determinístico e evidência independente — os cartões acima mostram ao founder exatamente isso (progresso registrado, mastery nunca declarado pelo jogo).*
