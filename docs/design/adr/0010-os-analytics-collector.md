# ADR-0010: Coletor same-origin de analytics do OS — fronteira pseudônima, NDJSON append-only e retenção

**Status:** Accepted (construção e teste) · ativação pendente de decisão do board · **Data:**
2026-08-31 · **Decisor:** fatia OP-B do draft AID-463 aprovada pelo board em 2026-08-31
(interação `92af26d6`, opção `opb-foundation`; ordem AID-470)
**Contexto:** o ADR-0009 fixou a fronteira de analytics do bounded context `literacyDojo`
(envelope `source:"literacydojo"`) e escolheu NDJSON local sem backend para aquela fase. O OS
(`codexdojo-os-prototype`) já emite através de porta própria (`src/analytics/events.ts`) com
vocabulário fechado de 12 eventos, identidade pseudônima `installationId`+`sessionId` e transporte
same-origin que hoje fica em memória (nada sai do navegador). Este ADR define o **coletor** do
pipeline do OS — um endpoint same-origin que recebe os batches existentes, valida o envelope e
anexa em NDJSON — sem tocar o ADR-0009 e sem ativar emissão nenhuma.

## Opções

| # | Decisão | Alternativas | Escolhida |
| --- | --- | --- | --- |
| 1 | Onde recebe | (a) serviço externo cross-origin; (b) endpoint same-origin no próprio alias (Netlify function) | **(b) same-origin** |
| 2 | Formato de armazenamento | (a) banco de eventos; (b) NDJSON append-only rotacionado por dia UTC | **(b) NDJSON append-only** |
| 3 | Validação na recepção | (a) confiar no cliente; (b) revalidar vocabulários fechados em runtime | **(b) revalidar** |
| 4 | Estado nesta fatia | (a) coletor ligado + emissão; (b) construído e testado, transporte desligado | **(b) desligado** |

## Decisão

### 1. Endpoint same-origin no alias

`learner/gate/netlify-functions/dojo-analytics-collector.mjs` (fonte canônica; projeção
staged em `netlify/functions/` pelo `scripts/build-pilot-bundle.mjs`, nunca editada à mão),
roteado em `/__dojo/bridge/v1/analytics` no `netlify.toml` — o mesmo caminho default do
`SameOriginAnalyticsTransport` (`transports.ts`). Same-origin é imposto nos dois lados:
`sameOriginPath()` no cliente e `sec-fetch-site: same-origin` no coletor (403 caso contrário,
padrão da ponte de verificação). Sem cookies, sem CORS, sem parâmetros de rastreamento.

### 2. Fronteira pseudônima e vocabulário validado

O coletor aceita **somente** o envelope `schemaVersion: 1` do OS com identidade
`installationId`+`sessionId` (UUIDs aleatórios gerados no navegador; nenhum dado pessoal,
conta, e-mail ou fingerprint) e revalida em runtime os mesmos vocabulários fechados do emissor
(12 eventos, dimensões por evento, chaves de contexto, escalares limitados a 128 chars, texto
livre estruturalmente impossível). A paridade é travada por teste
(`collectorParity.test.ts` + `dojo_analytics_collector_netlify.test.mjs`): o coletor rejeita
exatamente o que o emissor consideraria inválido. Lote: máx 100 eventos / 64 KiB; resposta
`202 {acceptedEventIds}` com aceitação parcial — eventos inválidos não são anexados nem
retrabalhados. `mastered` permanece proibido em analytics (analytics ≠ evidência).

### 3. NDJSON append-only com retenção proposta

Eventos aceitos são anexados, um JSON por linha, em `events-<dia-UTC>.ndjson` (abertura em modo
append; nunca reescrito). **Retenção proposta:** NDJSON bruto por 90 dias (prune por nome de
arquivo, implementado), agregados por tempo indeterminado — agregação é a fatia F2, fora daqui.
O backing durável (se além do filesystem efêmero da function) é decisão da ativação; nesta
fatia o coletor é construído e testado, não operacional. Para qualquer leitura agregada futura
vale **k-anonimato n≥5**: nenhum agregado é exposto quando a célula (evento × dimensão × dia)
tiver menos de 5 instalações distintas.

### 4. Local-first preservado — transporte desligado

Nada é emitido sem `VITE_ANALYTICS_ENDPOINT` configurado em build; **nenhuma superfície de
build deste repo o define** (verificado por teste `createServices.analytics.test.ts` e por
ausência nos scripts/CI/netlify.toml). O sink default é in-memory; a fila local é best-effort,
limitada a 500 eventos, e falha de analytics nunca bloqueia a experiência. Ligar o transporte
em produção **volta ao board** com este ADR em mãos.

## Limites explícitos

- Este ADR **não emenda o ADR-0009** nem autoriza emissão literacy (`source:"literacydojo"`
  permanece com backend NDJSON local); não cria evento novo em vocabulário algum (OS ou
  literacy); não implanta o coletor nem emite evento nenhum (nenhum dado novo sai do navegador
  nesta ordem).
- Sem agregação/relatório (F2), sem emissão literacy (F3), sem mecânica de engajamento.
- Contrato de conteúdo intocado (regra 7); analytics ≠ evidência.

## Consequências

- Fica mais fácil: ativar depois é uma decisão de board + env var em build, com o endpoint e a
  validação já travados por paridade em CI.
- Fica mais caro: o NDJSON efêmero da function não sobrevive a restarts até a ativação definir
  backing durável; duplicatas de `eventId` (corrida beacon+fetch) são deduplicadas só na
  agregação futura, não na recepção.
- Revisitar quando: o board decidir ativar a coleta (decisão de deploy + backing durável +
  publicação da copy abaixo); ou quando a leitura agregada (F2) exigir k-anonimato além do
  n≥5 proposto.

## Anexo — proposta de copy para `/privacidade` e `/termos` (não aplicada)

Aplicar **somente quando o board ativar o coletor**. Texto no tom das páginas atuais
(`engines/literacyDojo/public/privacidade.html`, `termos.html`).

**`/privacidade` — seção nova "Telemetria opcional do produto" (após "Verificação"):**

> **Telemetria do produto.** Para entender onde a experiência trava, o app pode enviar eventos
> anônimos de uso (por exemplo: início de missão, conclusão, pedido de dica) para o nosso
> próprio serviço, no mesmo site, sem cookies e sem parceiros. Esses eventos não contêm nome,
> e-mail ou respostas suas — só identificadores aleatórios desta instalação e desta sessão,
> criados no seu navegador. Enquanto a coleta não estiver ativa, nada é enviado. Os registros
> brutos são mantidos por até 90 dias; só publicamos números agrupados de pelo menos 5 pessoas.
> Apagar os dados do site remove o identificador de instalação.

**`/termos` — parágrafo novo em "Progresso e aprendizagem":**

> Podemos coletar estatísticas anônimas de uso para melhorar a experiência, conforme o aviso
> de privacidade. Essas estatísticas não avaliam seu aprendizado e não identificam você.
