<!-- issue: AID-982 | key: proposal | doc_id: 09a3d18c-c471-4775-b50c-bc7c4d867538 | updated: 2026-09-07 03:16:28.603+00 -->

# Proposal AID-982 — ambiente de serving staging→prod p/ clientes externos (options doc advisory)

(AID-982)

# AID-982 — Proposal (advisory): ambiente de serving staging→prod para clientes externos

**Ordem:** AID-980/B (CEO) · **Autor:** FPE (fa8130d5) · **Tipo:** options doc advisory — **ZERO produção**: nada foi provisionado, criado, deployado ou commitado nesta ordem. Insumo para decisão founder. Baseline de evidência: `main@3fae2095` (prod deployed `e41b9b93`), probes live 2026-09-07 ~03:1xZ (read-only).

## 0. Sumário executivo

O gap #2 do consenso AID-900 é real e verificável first-hand: a garantia hoje é **de repositório, não de serviço** — 2 superfícies estáticas live no Netlify free tier, coletor de telemetria pseudônimo operacional (Blobs + export), pipeline de promoção manual com precheck de 72 checks, mas **sem staging durável, sem contas, sem observabilidade de serviço (uptime/erros/latência), sem SLA**. Este doc mapeia o que existe (§1), apresenta 3 opções de serving (§2) com escopo FPE, custo recorrente, riscos e dependências de decisão founder, e recomenda **Opção A** (superfícies atuais + coletor gerenciado endurecido com monitor externo + gate formalizado staging→prod) sob o critério explícito do §3: é a menor mudança que fecha o gap repositório→serviço para o piloto pago **facilitado** (modelo P6/O1 já provado) sem quebrar a fronteira local-first/zero-PII vigente. B (auth edge + contas) fica como follow-up sequenciado ao ruling de identidade; C (VM própria) só sob demanda de SLA.

## 1. Inventário first-hand do que existe (verificado nesta run)

### 1.1 Superfícies live (2)

| Superfície | URL | Verificação live (2026-09-07 ~03:1xZ) | Build/deploy |
| --- | --- | --- | --- |
| codexDojo OS | `https://aidevschool-codexdojo-os.netlify.app/` | HTTP 200, `server: Netlify`, CSP completa no header (ver §1.4), `/privacidade.html` 200 | `npm run build:pilot` + `scripts/build-pilot-bundle.mjs` (staging de functions é projeção gitignored) |
| LiteracyDojo avulso | `https://aidevschool-literacydojo.netlify.app/` | HTTP 200, `server: Netlify`, `/privacidade.html` 200 | `npm run build`; functions do dir canônico `learner/gate/netlify-functions` |

Ambas em subdomínio `*.netlify.app` (padrão free tier — **sem domínio próprio**). Pin de produção vigente: `e41b9b93` (redeploy 2026-09-06 ~20:1xZ, receipts AID-961/AID-964; `main` = `3fae2095` docs-only à frente). Readiness: **5/8 use cases `customer-ready`** (v33 @ `e41b9b93`, `docs/product-readiness/README.md`).

### 1.2 Pipeline de promoção (staging→prod como existe hoje)

Runbook AID-956 (`_work-products/AID-956/REDEPLOY-RUNBOOK.md`), fluxo provado 3× (ondas AID-935/AID-960/AID-964):

1. **Pin** do merge commit (branch `release/<sha>`), gates confirmados (QA GO + merge single-writer CEO).
2. **Build** com `COMMIT_REF` + env pins espelhados do `netlify.toml`.
3. **Deploy draft** (Netlify CLI) → **precheck adaptado de AID-935 (72 checks)**: manifesto/sourceRevision, coletor cross-origin 403, export fail-closed, smoke de ingestão 202, bridges preservadas.
4. **Alias de produção só com precheck verde**; pós-deploy: idempotência 2× POST, export >0 linhas, timestamps.
5. **Recibo** na issue + rollback documentado (re-pin do deploy anterior; owner FPE).

**Caracterização honesta:** o "staging" hoje é um **draft deploy efêmero + precheck script** — não é um ambiente durável com URL estável, não existe ambiente separado de prod, e o deploy público exige CLI autenticado + autorização do founder (`docs/ESTADO_REAL_2026-08-17.md:238`). Não há CI/CD de deploy: merge no GitHub **não** gera deploy automático.

### 1.3 Coletor de telemetria (AID-913 — como o dado chega e onde vive)

- **Rota:** `POST /__dojo/bridge/v1/analytics` same-origin nas 2 superfícies (`netlify.toml` ×2; `VITE_ANALYTICS_ENDPOINT` idêntico). Verificado live agora: GET sem token → **401** (export fail-closed), POST cross-site (`sec-fetch-site: cross-site`) → **403**.
- **Envelope:** OS v1 (12 eventos, vocabulário fechado) + literacy v2 (`source:"literacydojo"`); paridade emissor↔coletor travada por teste em CI (`collectorParity.test.ts`).
- **Onde vive:** **Netlify Blobs** (backing durável desde PR #280/AID-947; chave `dia/eventId` idempotente) — antes do fix AID-961 o export devolvia 0 linhas; **agora verificado >0 nas 2** (receipt AID-961 20:1xZ: OS 7 linhas, literacy 3). Fallback NDJSON `/tmp` só local/teste. Retenção proposta 90 dias; **nenhum PII** (identidade = `installationId`+`sessionId` UUIDs aleatórios no navegador); leitura agregada k-anonimato **n≥5** imutável (`learner/gate/analytics/`; ADR-0009/ADR-0010).
- **Leitura:** export via Bearer `ANALYTICS_EXPORT_TOKEN` (segredo só no provedor, owner founder/CEO — AID-934/AID-956 passo 4) → drift monitor → `aggregate_funnel` (procedimento `docs/piloto/LEITURA_FUNIL_OPB.md`).

### 1.4 Restrições vigentes (que qualquer opção de serving precisa respeitar ou emendar via ADR)

- **CSP do OS** (header live): `default-src 'self'; script-src 'self'; connect-src 'self' https:; frame-src https:; object-src 'none'` — sem cookies, `Referrer-Policy: strict-origin`, `Permissions-Policy` fechada.
- **Coletor same-origin por design** (ADR-0010 decisão 1b): mover frontend e coletor para domínios diferentes exige ADR + mudança no gate `sec-fetch-site`; analytics externo cross-origin foi **rejeitado** no ADR-0010 (alternativa 1a).
- **Zero contas/auth** em qualquer superfície; progresso é **local-first** (`progressSemantics: local-completion`, localStorage) — multi-device não existe (maior risco de churn segundo consenso AID-900).
- **`mastered` proibido em analytics**; analytics ≠ evidência; funil mede retorno, não aprendizagem.

### 1.5 Custos correntes

**US$ 0/mês documentado.** Free tier do Netlify em tudo: hospedagem de subdomínio, Functions, Blobs e banda dentro das cotas gratuitas; nenhum plano pago, domínio próprio ou conta externa paga consta no repo. Custo real dominante hoje é **tempo FPE por deploy manual** (~1–2h/onda com precheck, já no processo). Limites do free tier (funções/mês, banda) não foram atingidos em nenhuma onda — tráfego de piloto (5–8 sessões O1) está ordens de magnitude abaixo.

## 2. As três opções de serving

### Opção A — Superfícies estáticas atuais + coletor gerenciado, ops endurecidas (sem contas)

Mantém a arquitetura vigente integralmente e fecha o gap de **serviço** com o que falta de fato: monitoramento e disciplina operacional formalizada.

- **Escopo FPE (decomposto, rubrica AID-558 rev 2):** (a) monitor externo de uptime em free tier (checks HTTP de 1–5 min nas 2 superfícies + rotas do coletor com estados esperados: `/` 200, export sem token **401**, cross-site **403**) — 1–1,5h; (b) consolidação do gate staging→prod como runbook canônico (draft→precheck 72 checks→alias; AID-956 promovido a documento de processo + rollback/incidente) — 1,5–2,5h; (c) opcional domínio próprio + DNS (decisão founder) — 1–2h; (d) revisão das cotas free tier vs. escala do piloto — 0,5h. **Total ≈ 3,5–6,5h FPE.**
- **Custo recorrente:** US$ 0/mês (free tier) + opcional domínio ~US$ 10–15/ano + monitor free tier US$ 0 (alertas por e-mail).
- **Riscos:** sem SLA (contrato do piloto deve dizer best-effort — honesto); cotas free tier se o tráfego crescer 100× (irrelevante no piloto); conta Netlify é do founder (ônibus/autorização — já é o padrão single-writer); monitor externo é mais uma dependência SaaS.
- **Piloto pago (habilita/bloqueia):** **habilita o piloto facilitado** — modelo P6/O1 com cobrança out-of-band (fatura manual/Pix), suporte via kit do facilitador, sem contas de aprendiz: coerente com local-first + zero-PII (postura de privacidade vira argumento de venda). **Bloqueia:** self-serve signup, retenção multi-device (progresso por aparelho — risco de churn conhecido e assumido), checkout automático.
- **Dependência founder:** aprovar ferramenta de monitor, decidir domínio próprio, confirmar o modelo facilitado como o formato do piloto pago.

### Opção B — Plataforma edge com auth + contas (Vercel/Netlify/Cloudflare) 

Mesmo núcleo estático+functions, adicionando **identidade na edge** (magic-link/OTP em function ou Access da plataforma) e caminho para sync multi-device.

- **Escopo FPE:** ADR do seam de identidade (3–5h); implementação auth magic-link/OTP + store de contas em Blobs/KV (8–14h); site de staging durável separado (branch deploy context com URL estável) (2–3h); extensão do precheck para os fluxos de conta (2–3h); copy de privacidade/termos reescrita (conta = e-mail = PII; deveres LGPD crescem) (2–4h). **Total ≈ 17–29h FPE** + rulings.
- **Custo recorrente:** US$ 0–40/mês (free tiers cobrem escala de piloto; planos Pro ~US$ 19–20/membro/mês quando recursos de equipe forem necessários).
- **Riscos:** **conflito identidade × pseudonimidade** — ADR-0009/0010 desenharam o funil para zero-PII; contas introduzem identidade linkável ao lado da telemetria (precisa ruling do board mantendo os dois mundos separados por construção); auth é superfície crítica de ataque; escopo tende a escorregar para produto (anti-escopo desta ordem decidir isso aqui); suporte passa a demandar fluxos "não recebi o link/perdi acesso".
- **Piloto pago:** habilita **self-serve + checkout (Stripe) no futuro + retenção multi-device** (o maior risco de churn); bloqueia nada estrutural, mas **não é pré-requisito do piloto facilitado** e adiciona obrigação de privacidade antes da primeira receita.
- **Dependência founder:** escolha de plataforma, ruling de identidade (contas vs. zero-PII), decisão de se o piloto pago exige self-serve.

### Opção C — Container/VM próprio com observabilidade completa

VPS (Hetzner/Fly/EC2) ou PaaS de container servindo estáticos + coletor como serviço Node pequeno atrás de reverse proxy; store durável próprio (SQLite/Postgres) substituindo Blobs; stack Prometheus/Grafana/Loki (ou APM gerenciado); staging como VM real; drills de backup/restore.

- **Escopo FPE:** infra como código (6–10h); porta do coletor + paridade do store durável (semântica idempotente `dia/eventId` do Blobs precisa equivalente testado) (8–12h); stack de observabilidade (6–10h); backup/restore (3–5h); runbooks + verificação de carga (4–6h). **Total ≈ 27–43h FPE** + **~2–4h/mês recorrentes** de ops (patch, certificados, monitoramento do monitoramento).
- **Custo recorrente:** ~US$ 5–50/mês (VM pequena) + US$ 0 self-hosted observability.
- **Riscos:** fardo operacional contínuo concentrado no FPE (ônibus); superfície de segurança a manter (patching, secrets); contradiz o minimalismo local-first; overkill para 1–3 clientes; SLA continua sendo o que você operar — VM própria não cria SLA sozinha.
- **Piloto pago:** habilita tudo que B habilita + independência de cotas de plataforma e observabilidade de serviço real (latência, taxa de erro, traces); apropriado **somente** quando houver contrato B2B exigindo SLA/regionamento ou custo marginal de plataforma ficar relevante.
- **Dependência founder:** provedor + orçamento mensal; qualquer compromisso de SLA em contrato.

## 3. Recomendação única — **Opção A** (com B como follow-up sequenciado, C sob demanda de SLA)

**Critério explícito:** *menor mudança de serving que fecha o gap repositório→serviço para o piloto pago iminente, sem quebrar a fronteira local-first/zero-PII vigente, ao menor custo × tempo × risco.* Aplicado:

1. **O piloto pago (gap #3) é facilitado por desenho** — o kit P6 (`docs/piloto/`) e os grants de readiness já operam com founder/facilitadora entre a empresa e o aprendiz; cobrança out-of-band e suporte humano são o formato testado. A não adiciona nada entre o piloto e a receita; B adiciona obrigações (PII, suporte de auth) **antes** da primeira receita.
2. **O gap real de serviço em A é barato de fechar:** uptime + runbook formalizado ≈ 3,5–6,5h FPE e US$ 0/mês. O que A honestamente não entrega — SLA e self-serve — **não é exigido pelo piloto facilitado** e não deve ser comprado antecipadamente.
3. **Fronteira preservada:** zero contas mantém ADR-0009/0010 intactos (funil pseudônimo sem linkabilidade) e a postura de privacidade como diferencial do produto para o público leigo.
4. **Sequenciamento registrado (não decidido aqui):** B vira a próxima janela de serving **quando** (i) o funil OP-B pós-O1 mostrar churn/atrito multi-device, ou (ii) o board decidir self-serve/checkout — ambas exigem o ruling de identidade como porta. C só entra sob demanda de SLA em contrato. Gatilhos objetivos evitam pagar B/C antes da evidência (mesmo método "nenhuma decisão sem dado" do consenso AID-900).

**Estimativas FPE por opção (rubrica AID-558 rev 2 — decomposição verificável acima):** A ≈ 3,5–6,5h · B ≈ 17–29h (+ rulings) · C ≈ 27–43h (+ 2–4h/mês). Custo recorrente: A US$ 0 (+ domínio opcional ~US$ 10–15/ano) · B US$ 0–40/mês · C US$ 5–50/mês + ops.

## 4. Comparação resumida

| Dimensão | A — atual endurecida | B — edge + auth | C — VM própria |
| --- | --- | --- | --- |
| Contas de aprendiz | não (facilitado) | sim (magic-link) | sim |
| Multi-device | não | caminho aberto | caminho aberto |
| Billing piloto | out-of-band (manual) | self-serve possível (futuro) | self-serve possível |
| Observabilidade de serviço | uptime externo + funil | uptime + funil + auth logs | full (métricas/traces/logs) |
| SLA | nenhum (best-effort declarado) | nenhum (plataforma ~99.9% não-contratual) | o que você operar |
| Fronteira zero-PII | intacta | exige ruling (e-mail = PII) | exige ruling |
| staging durável | não (draft+precheck formalizado) | sim (branch context) | sim (VM) |
| FPE inicial | ≈3,5–6,5h | ≈17–29h | ≈27–43h |
| Custo recorrente | US$ 0 | US$ 0–40/mês | US$ 5–50/mês + ops |
| Decisões founder | monitor, domínio, modelo piloto | plataforma, ruling identidade, self-serve | provedor, orçamento, SLA |

## 5. Anti-escopo (o que NÃO fazer, em qualquer opção)

- Nada provisionado/criado/deployado nesta ordem (sem conta, resource, commit ou PR).
- Não propor engines novas nem mudanças de produto (sync multi-device, checkout, novos eventos de analytics: fora; B mapeia dependências, não implementa).
- Não resolver billing/suporte além do mapeamento (escopo de agente futuro, se aprovado).
- Analytics externo cross-origin permanece rejeitado (ADR-0010 alt. 1a); coletor próprio é ativo, não dívida.

## 6. Método de verificação e fontes (first-hand, 2026-09-07 ~03:0x–03:1xZ)

- Probes live read-only (curl): 2 superfícies 200 + headers CSP/server; `/privacidade.html` 200 ×2; export GET 401 ×2; POST cross-site 403 (OS).
- Arquivos: `netlify.toml` ×2 (`engines/codexdojo-os-prototype/`, `engines/literacyDojo/`); `learner/gate/netlify-functions/dojo-analytics-collector.mjs`; `docs/design/adr/0009-*`, `0010-*`; `docs/piloto/LEITURA_FUNIL_OPB.md`; `_work-products/AID-956/REDEPLOY-RUNBOOK.md`; `_work-products/AID-935/WAVE-PROMOTION-65d64bca.md`; `docs/product-readiness/README.md` + `inventory.yaml`; `docs/ESTADO_REAL_2026-08-17.md`; `.github/workflows/ci.yml` (garantia de repositório: sdlc-guards + lint/test/build por engine).
- Issues: AID-900 (consenso/gaps), AID-910/D + AID-913 (ativação telemetria), AID-947/AID-955/AID-956/AID-961/AID-963/AID-964 (Blobs, redeploy, export fix — todos `done`), AID-558 rev 2 (rubrica de estimativa).
- Preços de lista citados são estimativas de planejamento (valores públicos aproximados na data); **verificar na contratação** — nenhuma cota foi solicitada.

## 7. Decisões reservadas (não tomadas aqui)

Escolha da opção e das dependências founder de cada uma (monitor/domínio/modelo de piloto em A; plataforma/ruling de identidade/self-serve em B; provedor/orçamento/SLA em C) — penduradas no `request_confirmation` desta issue. Produção de qualquer opção = ordem nova com SDLC completo.
