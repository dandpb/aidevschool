# ADR-0009: Analytics de produto do literacyDojo — eventos mínimos, fronteira de privacidade e backend

**Status:** Accepted · **Emendado 2026-09-06 (AID-913, ordem AID-910/D):** envelope v2
(`eventId` + `sessionId` efêmero), eventos `lesson_started`/`activity_attempted`,
instrumentação de `entry_viewed`, batch sink same-origin e ativação do transporte
(roteada para o coletor do ADR-0010; ver §Emenda no fim). · **Data:** 2026-08-13 · **Decisor:** Daniel (Fase 4.3 do
acompanhamento do plano LiteracyDojo)
**Contexto:** O vertical slice do `literacyDojo` está funcional (onboarding,
Mapa Inicial, lições, revisão espaçada, evidência por tentativa), mas **não
existe nenhuma instrumentação de uso real**: não sabemos o funil de onboarding,
a conclusão de lições nem a retenção — é impossível dizer se as pessoas
aprendem. O ADR-0005 já previa a porta `AnalyticsSink` (sem adapter remoto
antes de hipótese validada) e o contrato de evidência
(`docs/design/ai-literacy/evidence-contract.md`) já lista eventos de analytics
propostos com adapter inicial `NoopAnalyticsSink`. Este ADR fixa o conjunto
mínimo de eventos, a fronteira inviolável do que não pode ser coletado e a
escolha de backend para a fase atual.

A fronteira de privacidade do bounded context é **inviolável** e prevalece
sobre qualquer necessidade de métrica:

- respostas de texto livre **não persistem** e **não vão para analytics** —
  respostas são transitórias na UI (regra 4 das invariantes do engine e regra 3
  do contrato de evidência);
- nada de dados pessoais (nome, e-mail, identificadores persistentes de pessoa
  ou dispositivo, fingerprint);
- o termo `mastered` é proibido também em analytics (ADR-0005);
- analytics mede **progresso de experiência e engajamento**, nunca competência
  (separação progresso ≠ engajamento ≠ competência do contrato de evidência).

## Opções

| # | Decisão | Alternativas | Escolhida |
| --- | --- | --- | --- |
| 1 | Conjunto de eventos | (a) autocapture de tudo (cliques, DOM, sessão); (b) conjunto mínimo fechado de eventos nomeados com props estruturadas | **(b) conjunto mínimo fechado** |
| 2 | Forma do payload | (a) payload livre por evento; (b) envelope versionado com props primitivas validadas em runtime | **(b) envelope versionado validado** |
| 3 | Backend da fase atual | (a) Plausible (nuvem EU ou self-hosted); (b) PostHog self-hosted; (c) NDJSON local agregado, sem backend | **(c) NDJSON local agregado** |
| 4 | Acoplamento ao engine | (a) chamadas diretas da UI a ferramenta de analytics; (b) porta `AnalyticsSink` + adapters, no-op sem backend | **(b) porta + adapters** |

## Decisão

### 1. Eventos mínimos (conjunto fechado)

O domínio define um **vocabulário fechado** de eventos; nenhum código pode
emitir evento fora desta lista sem revisão deste ADR. O conjunto mínimo da
fase atual responde ao funil de ativação e à pergunta "a pessoa concluiu a
lição?":

| Evento | Quando dispara | Props permitidas (somente estas) |
| --- | --- | --- |
| `entry_viewed` | superfície de entrada (home) exibida | — |
| `mapa_inicial_done` | Mapa Inicial (diagnóstico do onboarding) concluído | `lessonId`, `lessonVersion`, `score` (0..1), `durationSeconds?` |
| `route_chosen` | rota adaptativa atribuída após o Mapa Inicial | `route` (`"guided"` \| `"intermediate"`) |
| `lesson_completed` | qualquer lição concluída | `lessonId`, `lessonVersion`, `score` (0..1), `durationSeconds?` |

`mapa_inicial_done` e `route_chosen` são especializações analíticas da
conclusão do Mapa Inicial: mantidos separados de `lesson_completed` para o
funil de onboarding ser legível sem filtrar por `lessonId`. Os demais eventos
propostos no contrato de evidência (`lesson_started`, `activity_attempted`,
`hint_requested`, `review_*`, `real_world_application_reported`, …) entram por
fatias futuras, um a um, sempre respeitando a mesma fronteira — este ADR não os
autoriza em lote.

### 2. Envelope versionado com props primitivas

```ts
type ProductAnalyticsEvent = {
  schemaVersion: 1
  source: "literacydojo"
  event: "entry_viewed" | "mapa_inicial_done" | "route_chosen" | "lesson_completed"
  occurredAt: string              // ISO 8601
  contentVersion: string          // versão do read model — análise por versão de conteúdo
  props: Record<string, string | number | boolean>
}
```

- Somente valores primitivos em `props` (string, number, boolean) — nunca
  objetos, arrays ou `null`; strings curtas (≤ 120 chars) como guarda-chuva
  contra vazamento de texto.
- Construtores de evento são **fechados por tipo** no domínio
  (`src/domain/analytics.ts`): só aceitam as props da tabela acima. O envelope
  é validado em runtime antes de sair; evento inválido é erro de programação e
  falha o teste/build, nunca é enviado.
- **Sem identificadores**: nenhum user id, device id, session id persistente ou
  correlação entre pessoas. Se uma fase futura precisar de funil por sessão,
  o identificador será efêmero (em memória, não persistido) e exigirá emenda
  deste ADR.
- O que **nunca** entra: texto livre de respostas ou de onboarding, conteúdo
  das respostas (ids de opções/critérios escolhidos ficam na evidência, não em
  analytics), dados pessoais, `mastered`, e qualquer chave fora da lista de
  props permitidas.

### 3. Backend: NDJSON local agregado nesta fase

| Opção | Prós | Contras | Veredito |
| --- | --- | --- | --- |
| **NDJSON local agregado** | zero infra nova; coerente com a convenção do ecossistema (Markdown/YAML/NDJSON auditáveis); dados nunca saem do dispositivo; funil respondível por inspeção local nesta fase de aprendiz único/poucos pilotos | sem visão multiusuário agregada; exige exportação manual | **escolhida** |
| Plausible (nuvem EU / self-hosted) | privacy-friendly por padrão (sem cookies, sem dados pessoais, agregado); eventos customizados com props limitadas | exige serviço + rede no caminho do app local-first; props limitadas podem não bastar para funis por versão de conteúdo | forte candidata quando houver backend multiusuário validado |
| PostHog self-hosted | funis, retenção e coortes completos | pesado de operar; defaults perigosos para a nossa fronteira (autocapture, session replay capturam texto livre — teriam de ser desligados e auditados) | rejeitado nesta fase: custo operacional + risco de vazamento por default |

Decisão: nesta fase o adapter padrão é **no-op/local** — os eventos existem
atrás da porta, agregam localmente (console em dev; nada em produção até haver
endpoint) e um adapter NDJSON-over-HTTP (uma linha JSON por evento) só é
ativado quando um endpoint for explicitamente configurado
(`VITE_ANALYTICS_ENDPOINT`). Sem endpoint configurado, o sink é no-op e a
experiência de aprendizagem nunca é afetada (o sink nunca lança exceção).

**Gatilho de revisão:** quando existir hipótese validada de backend
multiusuário (Fase 4 do plano) e precisarmos de funil/retenção agregados,
reabrir esta decisão: preferir Plausible (postura de privacidade por default
alinhada à fronteira) e só considerar PostHog self-hosted se funis/coortes
exigirem — com autocapture e session replay desligados e auditados.

### 4. Porta `AnalyticsSink` + adapters

Seguindo o padrão do engine (portas em `src/application/ports.ts`, adapters em
`src/adapters/`, composição em `src/app/services.ts`):

- porta `AnalyticsSink { track(event) }` — o domínio e os casos de uso só
  conhecem a interface;
- adapters: `noopAnalyticsSink` (padrão sem backend), `consoleAnalyticsSink`
  (visibilidade em dev), `httpNdjsonAnalyticsSink(endpoint)` (uma linha NDJSON
  por evento via `fetch` keepalive, fire-and-forget, erros engolidos);
- o caso de uso emite o evento **depois** de persistir o progresso; falha de
  analytics nunca bloqueia a lição.

## Limites explícitos

- Este ADR autoriza **um evento piloto** (`lesson_completed`) instrumentado no
  engine. Os demais três eventos do conjunto mínimo entram por fatias próprias.
- **Emenda (2026-09-06, corredor AID-916 / spec AID-915 §4.3):** o vocabulário
  ganha exatamente dois eventos de medição da revisão espaçada, um a um como
  manda este ADR: `review_started` (props: `lessonId`, `intervalDays`,
  `stage`) no início de uma revisão devida e `review_completed` (props:
  `lessonId`, `score`) na conclusão aprovada. Mesma fronteira de privacidade
  (sem texto livre, sem identificadores persistentes, nunca `mastered`);
  engajamento de retorno, nunca competência. Os demais eventos propostos
  (`lesson_started`, `activity_attempted`, `hint_requested`,
  `real_world_application_reported`, …) continuam não instrumentados por este
  ADR — a ativação O1 (AID-913) corre por emenda própria e não renomeia os
  eventos daqui.
- Nenhum backend é implantado por este ADR; o adapter HTTP só existe para
  provar a porta e degradar silenciosamente.
- Analytics não muda a fronteira `completed`/`mastered` e não carrega
  competência: `score` aqui é a média das melhores notas da lição (progresso de
  experiência), jamais domínio verificado.
- A evidência (`LiteracyEvidenceRecord`) permanece o canal de tentativas
  avaliadas; analytics não a substitui nem a duplica.

## Consequências

- Fica mais fácil: responder funil de onboarding e conclusão de lição sem
  tocar a fronteira de privacidade; adicionar eventos futuros é repetir o
  padrão (nome na lista fechada + construtor fechado + teste de não-vazamento).
- Fica mais caro: cada evento novo exige revisão contra a fronteira (não há
  autocapture); a visão multiusuário agregada fica adiada até o backend.
- Revisitar quando: hipótese de backend validada (ver gatilho acima) ou quando
  o funil exigir correlação por sessão — ambos pedem emenda deste ADR.

## Emenda 2026-09-06 (AID-913 — ativação O1, ordem AID-910/D)

A ordem CEO AID-910/D ativou a telemetria nas 2 journeys live antes da janela O1
(~09-23), exatamente pela via que este ADR reservava: identificador **efêmero em
memória** + eventos fatia a fatia + sink existente. Em vigor:

- **Envelope v2** (`schemaVersion: 2`): todo evento carrega `eventId` (UUID por
  evento; dedup na recepção) e `sessionId` (UUID por page load, **só em
  memória**, nunca persistido — o §2 pré-autorizava esta forma via emenda).
  Sem `installationId` no literacy: a sessão anônima basta para o funil.
- **Eventos novos**: `lesson_started` (`lessonId`, `lessonVersion`) e
  `activity_attempted` (`lessonId`, `activityType`, `passed`); `entry_viewed`
  passa a ser instrumentado (1× por page load na home). Funil:
  entry_viewed → lesson_started → activity_attempted → lesson_completed.
  Retry = tentativas repetidas na mesma lição/sessão (sem evento novo);
  hint continua fora do vocabulário literacy.
- **Props fechadas por evento** com conjunto exato de chaves e vocabulários de
  valor (activityType: os 7 tipos do contrato; route: guided|intermediate) —
  paridade 1:1 com o coletor, travada por teste.
- **Batch sink**: lotes `{schemaVersion:2, source:"literacydojo", events:[…]}`
  via POST same-origin (buffer 20 eventos / 15s / pagehide com beacon; teto do
  coletor respeitado). Missão hospedada permanece **noop** no literacy (o host
  OS mede a missão; sem dupla contagem).
- **Ativação**: `VITE_ANALYTICS_ENDPOINT=/__dojo/bridge/v1/analytics` definido
  SOMENTE nos `[build.environment]` dos dois netlify.toml (invariante fail-closed
  por teste). Recepção pelo coletor do ADR-0010 estendido a este envelope.
  Retenção e k-anonimato (n≥5) conforme ADR-0010 e AID-463 §3.0.
