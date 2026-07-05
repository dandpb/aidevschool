import {
  type ContentPack,
  type EncounterDefinition,
  type EvidenceContract,
  type PolicyCheck,
  type Region,
  type RouteCheck,
  type SequenceStep,
  TOKEN_BUCKET_CONTRACT,
  type TokenBucketRequest,
  type UnitDefinition,
} from "./types"

type CurriculumModule = {
  readonly project: string
  readonly title: string
  readonly concept: string
  readonly verb: string
  readonly mechanicName: string
  readonly resourceName: string
  readonly goodRequestLabel: string
  readonly badRequestLabel: string
  readonly admitActionLabel: string
  readonly rejectActionLabel: string
  readonly practiceTitle: string
  readonly practiceText: string
  readonly encounterKind?: "sequence_flow" | "route_health" | "policy_gate"
  readonly sequenceSteps?: readonly SequenceStep[]
  readonly routeChecks?: readonly RouteCheck[]
  readonly policyChecks?: readonly PolicyCheck[]
}

const modules: readonly CurriculumModule[] = [
  {
    project: "01_rate_limiter",
    title: "Agent Quest: Rate Limiter",
    concept: "Orquestracao agentica para provar robustez de token bucket",
    verb: "acionar agentes com evidencia e bloquear atalhos sem gate",
    mechanicName: "Agent Quest",
    resourceName: "Gates",
    goodRequestLabel: "acao agentica correta",
    badRequestLabel: "atalho sem evidencia",
    admitActionLabel: "Acionar",
    rejectActionLabel: "Bloquear",
    practiceTitle: "Simulacao de orquestracao",
    practiceText:
      "Conduza Sonda, Mestre-Conteudo e Prometor pelo ciclo plan-act-observe-verify. Acione passos com evidencia; bloqueie solucoes antes da tentativa, self-verification e mastery sem gate.",
    encounterKind: "sequence_flow",
    sequenceSteps: [
      { type: "advance", label: "PLAN: Sonda diagnostica sua tentativa no rate limiter" },
      { type: "guard", label: "TRAP: Socrates entrega solucao sem tentativa sua" },
      { type: "advance", label: "PLAN: Mestre-Conteudo define DoD e teste minimo" },
      { type: "guard", label: "TRAP: Implementador codifica antes do criterio" },
      { type: "advance", label: "ACT: Implementador aplica a menor mudanca verificavel" },
      { type: "guard", label: "TRAP: Produtor verifica o proprio patch" },
      { type: "advance", label: "OBSERVE: Testes rodam lint, suite focada e evidencia" },
      { type: "guard", label: "TRAP: Metricas celebra score sem comando executado" },
      { type: "advance", label: "VERIFY: Prometor isolado decide PASS ou FAIL" },
      { type: "guard", label: "TRAP: Memoria marca DOMINADO antes do gate" },
    ],
  },
  {
    project: "02_key_value_store",
    title: "Key Value Store",
    concept: "Leitura, escrita, expiracao e consistencia basica de chaves",
    verb: "preservar valores quentes e descartar acessos invalidos",
    mechanicName: "TTL Cache",
    resourceName: "Slots",
    goodRequestLabel: "chave quente valida",
    badRequestLabel: "leitura expirada",
    admitActionLabel: "Servir",
    rejectActionLabel: "Invalidar",
    practiceTitle: "Treino de TTL",
    practiceText:
      "Sirva chaves quentes que ainda sao validas. Invalide leituras expiradas ou entradas corrompidas para provar consistencia basica.",
    encounterKind: "sequence_flow",
    sequenceSteps: [
      { type: "advance", label: "PUT chave nova" },
      { type: "advance", label: "GET antes do TTL" },
      { type: "guard", label: "GET depois do TTL" },
      { type: "advance", label: "DELETE confirma remocao" },
      { type: "guard", label: "READ de chave removida" },
    ],
  },
  {
    project: "03_url_shortener",
    title: "URL Shortener",
    concept: "Codigos curtos, colisao e redirecionamento confiavel",
    verb: "encaminhar slugs validos e bloquear colisores",
    mechanicName: "Slug Router",
    resourceName: "Rotas",
    goodRequestLabel: "slug unico",
    badRequestLabel: "colisao de slug",
    admitActionLabel: "Redirecionar",
    rejectActionLabel: "Regenerar",
    practiceTitle: "Treino de colisao",
    practiceText:
      "Redirecione slugs unicos e regenere colisores. A evidencia mostra que o atalho nao sobrescreve destinos existentes.",
  },
  {
    project: "04_concurrent_task_queue",
    title: "Concurrent Task Queue",
    concept: "Fila concorrente, backpressure e processamento justo",
    verb: "drenar tarefas prontas sem sobrecarregar workers",
    mechanicName: "Worker Queue",
    resourceName: "Workers",
    goodRequestLabel: "tarefa pronta",
    badRequestLabel: "sobrecarga sem lease",
    admitActionLabel: "Despachar",
    rejectActionLabel: "Segurar",
    practiceTitle: "Treino de backpressure",
    practiceText:
      "Despache tarefas prontas enquanto houver capacidade. Segure itens sem lease ou rajadas que quebrariam a fila concorrente.",
  },
  {
    project: "05_websocket_chat",
    title: "WebSocket Chat",
    concept: "Conexoes persistentes, broadcast e isolamento de clientes",
    verb: "entregar mensagens legitimas e filtrar rajadas ruins",
    mechanicName: "Broadcast Hub",
    resourceName: "Canais",
    goodRequestLabel: "mensagem autenticada",
    badRequestLabel: "rajada sem sessao",
    admitActionLabel: "Broadcast",
    rejectActionLabel: "Dropar",
    practiceTitle: "Treino de conexao",
    practiceText:
      "Faça broadcast apenas de mensagens autenticadas. Drope rajadas sem sessao para manter isolamento entre clientes.",
  },
  {
    project: "06_file_upload_pipeline",
    title: "File Upload Pipeline",
    concept: "Validacao, streaming e etapas seguras de upload",
    verb: "aceitar arquivos validos e rejeitar payloads suspeitos",
    mechanicName: "Upload Pipeline",
    resourceName: "Buffers",
    goodRequestLabel: "chunk validado",
    badRequestLabel: "payload suspeito",
    admitActionLabel: "Ingerir",
    rejectActionLabel: "Quarentenar",
    practiceTitle: "Treino de pipeline",
    practiceText:
      "Ingerir chunks validos preserva o stream. Quarentenar payloads suspeitos evita que arquivos ruins avancem pelas etapas.",
    encounterKind: "sequence_flow",
    sequenceSteps: [
      { type: "advance", label: "validar metadata" },
      { type: "advance", label: "stream chunk limpo" },
      { type: "guard", label: "assinatura suspeita" },
      { type: "advance", label: "persistir objeto" },
      { type: "guard", label: "payload sem checksum" },
    ],
  },
  {
    project: "07_rest_api_auth",
    title: "REST API Auth",
    concept: "Autenticacao, autorizacao e respostas HTTP seguras",
    verb: "permitir chamadas autorizadas e negar invasoras",
    mechanicName: "Auth Gate",
    resourceName: "Sessoes",
    goodRequestLabel: "token autorizado",
    badRequestLabel: "escopo invalido",
    admitActionLabel: "Permitir",
    rejectActionLabel: "Negar",
    practiceTitle: "Treino de autorizacao",
    practiceText:
      "Permita chamadas com token e escopo corretos. Negue escopos invalidos para manter a fronteira HTTP segura.",
    encounterKind: "policy_gate",
    policyChecks: [
      { type: "allowed", label: "GET /profile com token valido", scope: "user:read" },
      { type: "denied", label: "POST /admin com user token", scope: "admin:write" },
      { type: "allowed", label: "POST /orders com order:write", scope: "order:write" },
      { type: "denied", label: "GET /billing sem token", scope: "billing:read" },
      { type: "denied", label: "DELETE /users com escopo read-only", scope: "user:delete" },
      { type: "allowed", label: "refresh token valido", scope: "session:refresh" },
    ],
  },
  {
    project: "08_event_driven_order_system",
    title: "Event Driven Orders",
    concept: "Eventos, idempotencia e fluxo de pedidos",
    verb: "processar eventos validos sem duplicar transicoes",
    mechanicName: "Order Event Log",
    resourceName: "Offsets",
    goodRequestLabel: "evento novo",
    badRequestLabel: "evento duplicado",
    admitActionLabel: "Aplicar",
    rejectActionLabel: "Deduplicar",
    practiceTitle: "Treino de idempotencia",
    practiceText:
      "Aplique eventos novos no fluxo do pedido. Deduplicate eventos repetidos para evitar transicoes duplas.",
    encounterKind: "sequence_flow",
    sequenceSteps: [
      { type: "advance", label: "OrderCreated" },
      { type: "advance", label: "PaymentAuthorized" },
      { type: "guard", label: "PaymentAuthorized duplicado" },
      { type: "advance", label: "InventoryReserved" },
      { type: "guard", label: "Ship antes de reservar" },
    ],
  },
  {
    project: "09_plugin_system",
    title: "Plugin System",
    concept: "Contrato de plugins, isolamento e carregamento dinamico",
    verb: "ativar extensoes confiaveis e bloquear plugins quebrados",
    mechanicName: "Plugin Host",
    resourceName: "Sandbox",
    goodRequestLabel: "plugin assinado",
    badRequestLabel: "contrato quebrado",
    admitActionLabel: "Ativar",
    rejectActionLabel: "Isolar",
    practiceTitle: "Treino de contrato",
    practiceText:
      "Ative plugins que respeitam o contrato. Isole extensoes quebradas para proteger o host dinamico.",
    encounterKind: "policy_gate",
    policyChecks: [
      { type: "allowed", label: "plugin assinado com manifest valido", scope: "manifest:load" },
      { type: "denied", label: "plugin sem assinatura", scope: "signature:verify" },
      { type: "allowed", label: "plugin com capability declarada", scope: "capability:declared" },
      { type: "denied", label: "plugin tenta acesso fora do sandbox", scope: "sandbox:escape" },
      { type: "allowed", label: "plugin passa health check", scope: "health:ready" },
      { type: "denied", label: "plugin quebra contrato de host", scope: "host:contract" },
    ],
  },
  {
    project: "10_distributed_cache",
    title: "Distributed Cache",
    concept: "Replicacao, invalidacao e leitura distribuida",
    verb: "servir hits corretos e conter entradas obsoletas",
    mechanicName: "Replica Cache",
    resourceName: "Replicas",
    goodRequestLabel: "hit consistente",
    badRequestLabel: "valor obsoleto",
    admitActionLabel: "Servir",
    rejectActionLabel: "Invalidar",
    practiceTitle: "Treino de replica",
    practiceText:
      "Sirva hits consistentes entre replicas. Invalide valores obsoletos antes que leituras distribuídas propaguem erro.",
  },
  {
    project: "11_load_balancer",
    title: "Load Balancer",
    concept: "Distribuicao de carga, health checks e failover",
    verb: "rotear trafego para nos saudaveis",
    mechanicName: "Health Router",
    resourceName: "Nos",
    goodRequestLabel: "no saudavel",
    badRequestLabel: "no degradado",
    admitActionLabel: "Roteiar",
    rejectActionLabel: "Retirar",
    practiceTitle: "Treino de health check",
    practiceText:
      "Roteie para nos saudaveis e retire nos degradados. O gate exige failover sem enviar carga para alvo ruim.",
    encounterKind: "route_health",
    routeChecks: [
      { type: "healthy", label: "api-a healthy" },
      { type: "unhealthy", label: "api-b health check fail" },
      { type: "healthy", label: "api-c healthy" },
      { type: "unhealthy", label: "api-a latency spike" },
      { type: "healthy", label: "api-b recovered" },
    ],
  },
  {
    project: "12_distributed_job_scheduler",
    title: "Distributed Job Scheduler",
    concept: "Agendamento distribuido, leases e retry",
    verb: "executar jobs elegiveis uma vez por janela",
    mechanicName: "Lease Scheduler",
    resourceName: "Leases",
    goodRequestLabel: "job elegivel",
    badRequestLabel: "lease duplicado",
    admitActionLabel: "Executar",
    rejectActionLabel: "Adiar",
    practiceTitle: "Treino de lease",
    practiceText:
      "Execute jobs elegiveis com lease valido. Adie duplicatas para provar que o agendador nao roda duas vezes.",
    encounterKind: "sequence_flow",
    sequenceSteps: [
      { type: "advance", label: "adquirir lease" },
      { type: "advance", label: "executar job elegivel" },
      { type: "guard", label: "lease duplicado" },
      { type: "advance", label: "registrar sucesso" },
      { type: "guard", label: "retry antes do backoff" },
    ],
  },
  {
    project: "13_api_gateway_circuit_breaker",
    title: "API Gateway Circuit Breaker",
    concept: "Circuit breaker, bulkhead, retry e limites adaptativos",
    verb: "proteger upstreams instaveis sem derrubar clientes bons",
    mechanicName: "Circuit Breaker",
    resourceName: "Circuitos",
    goodRequestLabel: "upstream saudavel",
    badRequestLabel: "falha em cascata",
    admitActionLabel: "Encaminhar",
    rejectActionLabel: "Abrir circuito",
    practiceTitle: "Treino de resiliencia",
    practiceText:
      "Encaminhe chamadas saudaveis. Abra o circuito diante de falhas em cascata para proteger clientes bons.",
    encounterKind: "route_health",
    routeChecks: [
      { type: "healthy", label: "orders upstream ok" },
      { type: "unhealthy", label: "payments 5xx cascade" },
      { type: "healthy", label: "catalog upstream ok" },
      { type: "unhealthy", label: "inventory timeout burst" },
      { type: "healthy", label: "profile upstream ok" },
    ],
  },
  {
    project: "14_log_aggregator",
    title: "Log Aggregator",
    concept: "Ingestao, consulta e ordenacao de logs",
    verb: "aceitar linhas uteis e rejeitar ruido operacional",
    mechanicName: "Log Ingest",
    resourceName: "Janelas",
    goodRequestLabel: "linha indexavel",
    badRequestLabel: "ruido malformado",
    admitActionLabel: "Indexar",
    rejectActionLabel: "Descartar",
    practiceTitle: "Treino de ingestao",
    practiceText:
      "Indexe linhas consultaveis e ordenadas. Descarte ruido malformado para manter a agregacao util.",
  },
  {
    project: "15_metrics_collector",
    title: "Metrics Collector",
    concept: "Coleta, agregacao e janelas de metricas",
    verb: "coletar amostras validas e evitar cardinalidade ruim",
    mechanicName: "Metrics Window",
    resourceName: "Series",
    goodRequestLabel: "amostra agregavel",
    badRequestLabel: "cardinalidade explosiva",
    admitActionLabel: "Coletar",
    rejectActionLabel: "Filtrar",
    practiceTitle: "Treino de cardinalidade",
    practiceText:
      "Colete amostras agregaveis. Filtre series com cardinalidade explosiva antes que a janela fique inutil.",
  },
  {
    project: "16_mini_message_queue",
    title: "Mini Message Queue",
    concept: "Publish/subscribe, ack e entrega controlada",
    verb: "entregar mensagens prontas e segurar consumo abusivo",
    mechanicName: "Ack Queue",
    resourceName: "Acks",
    goodRequestLabel: "mensagem pronta",
    badRequestLabel: "ack ausente",
    admitActionLabel: "Entregar",
    rejectActionLabel: "Reenfileirar",
    practiceTitle: "Treino de ack",
    practiceText:
      "Entregue mensagens prontas e reenfileire itens sem ack. A evidencia mede entrega controlada.",
    encounterKind: "sequence_flow",
    sequenceSteps: [
      { type: "advance", label: "publish mensagem" },
      { type: "advance", label: "deliver para subscriber" },
      { type: "guard", label: "ack ausente" },
      { type: "advance", label: "ack recebido" },
      { type: "guard", label: "redelivery duplicado" },
    ],
  },
  {
    project: "17_distributed_config_service",
    title: "Distributed Config Service",
    concept: "Config versionada, watch e propagacao segura",
    verb: "publicar versoes validas e rejeitar configs quebradas",
    mechanicName: "Config Watch",
    resourceName: "Versoes",
    goodRequestLabel: "config versionada",
    badRequestLabel: "rollback quebrado",
    admitActionLabel: "Publicar",
    rejectActionLabel: "Bloquear",
    practiceTitle: "Treino de propagacao",
    practiceText:
      "Publique configs versionadas e bloqueie rollbacks quebrados para manter watchers sincronizados.",
    encounterKind: "sequence_flow",
    sequenceSteps: [
      { type: "advance", label: "validar schema" },
      { type: "advance", label: "publicar versao nova" },
      { type: "guard", label: "rollback sem checksum" },
      { type: "advance", label: "notificar watchers" },
      { type: "guard", label: "config fora de versao" },
    ],
  },
  {
    project: "18_search_engine",
    title: "Search Engine",
    concept: "Indexacao, ranking e consulta incremental",
    verb: "indexar documentos relevantes e filtrar consultas ruins",
    mechanicName: "Search Index",
    resourceName: "Postings",
    goodRequestLabel: "documento relevante",
    badRequestLabel: "consulta ruidosa",
    admitActionLabel: "Indexar",
    rejectActionLabel: "Filtrar",
    practiceTitle: "Treino de ranking",
    practiceText:
      "Indexe documentos relevantes e filtre consultas ruidosas. O objetivo e manter o ranking incremental limpo.",
    encounterKind: "sequence_flow",
    sequenceSteps: [
      { type: "advance", label: "tokenizar documento" },
      { type: "advance", label: "atualizar postings" },
      { type: "guard", label: "consulta sem termos" },
      { type: "advance", label: "recalcular ranking" },
      { type: "guard", label: "spam de query" },
    ],
  },
]

const baseMap = {
  width: 16,
  height: 12,
  tiles: [
    "################",
    "#LLLL....TT...G#",
    "#LLLL.........G#",
    "#..............#",
    "#....######....#",
    "#....#....#....#",
    "#....#....#....#",
    "#......T.......#",
    "#..............#",
    "#..............#",
    "#WWWW......WWWW#",
    "################",
  ],
}

const encounterTimeline: readonly Omit<TokenBucketRequest, "label">[] = [
  { type: "legit", at: 0 },
  { type: "legit", at: 0.8 },
  { type: "abuse", at: 1.6 },
  { type: "legit", at: 2.4 },
  { type: "legit", at: 3.2 },
  { type: "abuse", at: 4.2 },
  { type: "legit", at: 5.2 },
  { type: "legit", at: 6.3 },
  { type: "abuse", at: 7.4 },
  { type: "legit", at: 8.6 },
  { type: "legit", at: 9.8 },
  { type: "abuse", at: 11.0 },
]

export const curriculumPack: ContentPack = {
  id: "curriculum",
  version: "0.2.0",
  title: "AIDevSchool Curriculum Quest",
  regions: modules.map((module, index) => makeRegion(module, index)),
  units: modules.map((module, index) => makeUnit(module, index)),
  encounters: modules.map((module, index) => makeEncounter(module, index)),
  assets: {
    tiles: ["procedural-floor", "procedural-wall", "procedural-lab", "procedural-gate"],
    sprites: ["procedural-learner", "procedural-mentor", "procedural-request"],
    audio: [],
  },
}

export const curriculumDialogues: Readonly<Record<string, string>> = Object.fromEntries(
  modules.map((module, index) => [
    dialogueRef(module),
    `Modulo ${index + 1}: ${module.title}. Treino alvo: ${module.concept}. No duelo, ${module.verb}; a partida emite evidencia crua para o verifier.`,
  ]),
)

export function firstCurriculumRegionId(): string {
  const first = modules[0]
  if (first === undefined) {
    throw new Error("Curriculum pack has no modules")
  }
  return regionId(first)
}

export function curriculumUnitCount(): number {
  return modules.length
}

function makeRegion(module: CurriculumModule, index: number): Region {
  const nextModule = modules[index + 1]
  const gate = {
    id: `gate-${module.project}`,
    position: { x: 14, y: 2 },
    requiresUnitId: unitId(module),
    lockedLabel: `Gate bloqueado: gere evidencia PASS para ${module.title}.`,
    unlockedLabel:
      nextModule === undefined
        ? "Curriculum completo: toda a trilha emitiu evidencia jogavel."
        : `Gate aberto: avancar para ${nextModule.title}.`,
  }
  return {
    id: regionId(module),
    name: `Laboratorio ${index + 1}: ${module.title}`,
    project: module.project,
    start: { x: 7, y: 9 },
    map: baseMap,
    npcs: [
      {
        id: mentorId(module),
        name: `MENTOR ${index + 1}`,
        role: "curriculum-guide",
        position: { x: 7, y: 8 },
        dialogueRef: dialogueRef(module),
        encounterId: encounterId(module),
      },
    ],
    gates: [nextModule === undefined ? gate : { ...gate, nextRegionId: regionId(nextModule) }],
  }
}

function makeUnit(module: CurriculumModule, index: number): UnitDefinition {
  const previous = modules[index - 1]
  return {
    unit_id: unitId(module),
    project: module.project,
    concept: module.concept,
    prerequisites: previous === undefined ? [] : [unitId(previous)],
    encounter_ids: [encounterId(module)],
    evidence_contract: evidenceContractFor(module),
  }
}

// The evidence contract kind MUST match the encounter kind it gates. Previously
// every unit carried a token-bucket contract even when its encounter was
// sequence_flow / route_health / policy_gate — that drift is now eliminated by
// dispatching on encounterKind. The token-bucket default covers modules that
// have no explicit encounterKind (they fall back to a token-bucket encounter in
// makeEncounter).
function evidenceContractFor(module: CurriculumModule): EvidenceContract {
  if (module.encounterKind === "sequence_flow") {
    const steps = module.sequenceSteps ?? []
    return {
      kind: "pixelquest-sequence-flow",
      minAdvanced: steps.filter((step) => step.type === "advance").length,
      maxGuardsMissed: 0,
    }
  }
  if (module.encounterKind === "route_health") {
    const checks = module.routeChecks ?? []
    return {
      kind: "pixelquest-route-health",
      minRouted: checks.filter((check) => check.type === "healthy").length,
      maxBadRoutes: 0,
    }
  }
  if (module.encounterKind === "policy_gate") {
    const checks = module.policyChecks ?? []
    return {
      kind: "pixelquest-policy-gate",
      minAllowed: checks.filter((check) => check.type === "allowed").length,
      maxPolicyLeaks: 0,
    }
  }
  return {
    kind: "pixelquest-token-bucket",
    minGoodAdmits: TOKEN_BUCKET_CONTRACT.minGoodAdmits,
    maxAbusiveAdmitted: TOKEN_BUCKET_CONTRACT.maxAbusiveAdmitted,
    maxObservedRateMultiplier: TOKEN_BUCKET_CONTRACT.maxObservedRateMultiplier,
  }
}

function makeEncounter(module: CurriculumModule, index: number): EncounterDefinition {
  const base = {
    id: encounterId(module),
    title: `Duelo ${index + 1}: ${module.title}`,
    unit_id: unitId(module),
    project: module.project,
    concept: module.concept,
    mechanicName: module.mechanicName,
    resourceName: module.resourceName,
    goodRequestLabel: module.goodRequestLabel,
    badRequestLabel: module.badRequestLabel,
    admitActionLabel: module.admitActionLabel,
    rejectActionLabel: module.rejectActionLabel,
    practiceTitle: module.practiceTitle,
    practiceText: module.practiceText,
  }
  if (module.encounterKind === "sequence_flow") {
    const steps = module.sequenceSteps ?? []
    return {
      ...base,
      kind: "sequence_flow",
      steps,
      minAdvanced: steps.filter((step) => step.type === "advance").length,
      maxGuardsMissed: 0,
    }
  }
  if (module.encounterKind === "route_health") {
    const checks = module.routeChecks ?? []
    return {
      ...base,
      kind: "route_health",
      checks,
      minRouted: checks.filter((check) => check.type === "healthy").length,
      maxBadRoutes: 0,
    }
  }
  if (module.encounterKind === "policy_gate") {
    const checks = module.policyChecks ?? []
    return {
      ...base,
      kind: "policy_gate",
      checks,
      minAllowed: checks.filter((check) => check.type === "allowed").length,
      maxPolicyLeaks: 0,
    }
  }
  return {
    ...base,
    kind: "token_bucket",
    capacity: 6,
    refillRate: 1.5,
    targetRate: 1.5,
    heatMax: 100,
    heatPerLegitAdmit: 7,
    heatPerAbuseAdmit: 28,
    requests: encounterTimeline.map((request) => ({
      ...request,
      label: request.type === "legit" ? module.goodRequestLabel : module.badRequestLabel,
    })),
  }
}

function regionId(module: CurriculumModule): string {
  return `lab-${module.project}`
}

function unitId(module: CurriculumModule): string {
  if (module.project === "01_rate_limiter") {
    return "U0-sonda-rate-limiter-robustness"
  }
  return `U-${module.project}`
}

function encounterId(module: CurriculumModule): string {
  if (module.project === "01_rate_limiter") {
    return "encounter-agent-quest-01"
  }
  return `encounter-${module.project}`
}

function mentorId(module: CurriculumModule): string {
  return `mentor-${module.project}`
}

function dialogueRef(module: CurriculumModule): string {
  return `dialogues/${module.project}.md`
}
