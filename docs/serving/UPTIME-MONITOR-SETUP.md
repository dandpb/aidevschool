# Monitor externo de uptime — config exata + runbook de signup (free tier)

**Status:** preparado por AID-989/Opção A (a). Estados esperados **validados first-hand live em
2026-09-07 06:13Z** (probes read-only: 6/6 conformes — ver AID-989). **US$0/mês.**
O **único passo externo** é o signup da conta pelo founder (§3); tudo o mais (config, verificação
pós-signup, manutenção) é FPE.

## 1. Objetivo e frontier

Fechar o gap "garantia de serviço entre deploys" do doc AID-982 §2-A(a): checks HTTP externos
contra as 2 superfícies e as rotas do coletor com **estados esperados exatos**, alertas por
e-mail, a cada 5 min. Regras invariáveis:

- **O monitor nunca porta o `ANALYTICS_EXPORT_TOKEN`** — o check de export é tokenless por design
  (401 esperado). O token não sai do provedor/segredo.
- Checks são read-only e sem PII; o check POST usa envelope com `events: []` (mesmo que o gate
  regredisse, nada é escrito).
- Sem transações sintéticas de produto, sem analytics cross-origin (ADR-0010 alt. 1a vigente).

## 2. Os 6 checks (config exata)

Intervalo: **5 min** em todos. Alerta: e-mail (destinatário = e-mail founder da conta).

| # | Nome | URL | Método | Headers | Corpo | Esperado | O que protege |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `os-root-200` | `https://aidevschool-codexdojo-os.netlify.app/` | GET | — | — | **200** | Superfície OS de pé |
| 2 | `literacy-root-200` | `https://aidevschool-literacydojo.netlify.app/` | GET | — | — | **200** | Superfície literacy de pé |
| 3 | `os-export-401` | `https://aidevschool-codexdojo-os.netlify.app/__dojo/bridge/v1/analytics` | GET | — | — | **401** + corpo `{"error":"unauthorized"}` | Export fail-closed + token armado no OS (regressão AID-961-classe: 404 = token sumiu) |
| 4 | `literacy-export-401` | `https://aidevschool-literacydojo.netlify.app/__dojo/bridge/v1/analytics` | GET | — | — | **401** + corpo `{"error":"unauthorized"}` | Idem na literacy |
| 5 | `os-collector-403` | `https://aidevschool-codexdojo-os.netlify.app/__dojo/bridge/v1/analytics` | POST | `sec-fetch-site: cross-site`, `content-type: application/json` | `{"schemaVersion":1,"events":[]}` | **403** + corpo `{"error":"origin-forbidden"}` | Gate same-origin do coletor no OS (ADR-0010 1b) |
| 6 | `literacy-collector-403` | `https://aidevschool-literacydojo.netlify.app/__dojo/bridge/v1/analytics` | POST | idem #5 | `{"schemaVersion":2,"source":"literacydojo","events":[]}` | **403** + corpo `{"error":"origin-forbidden"}` | Idem na literacy |

Semântica de alerta dos checks 3–6: **qualquer desvio do status esperado** (401→200 vaza export;
401→404/token removido; 403→202 = gate aberto) abre incidente. Esses 4 checks são dupla função:
uptime **e** regressão de segurança entre deploys.

## 3. Runbook de signup founder (único passo externo, ~15 min)

**Ferramenta primária: Better Stack Free** — 10 monitors & heartbeats, 1 status page, alertas
e-mail + Slack, US$0 (preço de lista verificado 2026-09-07). Os checks 1–2 usam monitor HTTP
simples; os checks 3–6 usam **API monitor** (método custom, header custom, status esperado
custom). **Fallback: UptimeRobot Free** — 50 monitors @5 min, alertas e-mail; porém custom
statuses/headers/API monitoring são pagos ⇒ na UptimeRobot free os checks 3–6 **degradam**
(monitor HTTP só enxerga "não-2xx = down": servem como alarme de *mudança* de estado — qualquer
flip 401↔200↔404 alerta — sem afirmar qual estado; checks 1–2 ficam idênticos).

Passos (fundador):

1. Criar conta em `https://betterstack.com` (e-mail founder; 2FA se oferecido). Plano Free.
2. Monitors → Create monitor ×6, exatamente a tabela §2 (URL, método, headers, corpo,
   "expected/success status" = status da tabela; onde houver asserção de corpo, keyword
   `unauthorized` / `origin-forbidden`).
3. Confirmar o canal de alerta e-mail ativo (enviar alerta de teste).
4. *(Opcional, depois)* 1 status page público com os checks 1–2 (transparência para clientes do
   piloto; incluir link no kit P6 só quando o founder quiser).
5. Responder a confirmação pendente na AID-989 (ou avisar o FPE) — nada de credenciais no
   canal; o FPE verifica o estado dos monitors por leitura pública/dashboard compartilhado.

## 4. Verificação pós-signup (FPE, first-hand)

1. Conferir os 6 monitors **verdes com a semântica correta** (não basta "up": o check 3 precisa
   estar registrado como *sucesso em 401*; se o plano free expressar diferente, ajustar tipo de
   monitor ou registrar a degradação aqui).
2. Forçar 1 alerta de teste (ex.: pausar/retomar um monitor) e confirmar recebimento no e-mail
   founder.
3. Registrar nesta seção (§4) a tabela final: ferramenta escolhida, IDs/nomes dos monitors,
   data da verificação — evidência de serviço operacional.
4. Conectar ao processo: incidente de monitor ⇒ `PROMOTION-RUNBOOK.md` §7; achados re-entram
   como `intent.md`.

## 5. Manutenção

- Mudança de URL/rota (ex.: domínio próprio futuro) ⇒ atualizar §2 e os monitors na mesma
  mudança.
- O monitor **não substitui** o precheck de 72 checks do gate de promoção (aquele é por-onda e
  mais profundo); este vigore 24/7 entre ondas.
- Custo marginal no Netlify: ~52k req/mês ≈ 10 créditos do pool free de 300 (ver
  `README.md` §postura de cotas) — desprezível.

## 6. Registro de operação (preencher pós-signup)

| Data | Ferramenta | Monitors (6) | Verificado por | Notas |
| --- | --- | --- | --- | --- |
| 2026-09-09 | Better Stack Free — conta founder | 6 checks conforme §2, criação **atestada pelo founder** (aceitação da confirmação AID-989 `2e9f8dd6`, 22:28Z; credenciais/IDs fora do canal por design) | FPE: estados esperados re-verificados live **6/6 @ 22:29:30Z** (2× `/` 200; 2× export 401; 2× cross-site 403); runbook merged no `main` via PR #289 (CI 36/36, 2026-09-07) | Status page público é opcional (§3.4) — registrar o link aqui quando o founder compartilhar; e-mail de alerta testado no signup (passo §3.3) |

Divisão honesta de evidência: **FPE-verificável first-hand** = estados esperados das 6 rotas ao
vivo + config/runbook merged; **founder-atestado** = existência/configuração da conta e dos
monitors no provedor (sem credenciais no canal, o founder é a única parte que pode atestar). Um
incidente real futuro (e-mail de alerta chegando) é a confirmação operacional final.
