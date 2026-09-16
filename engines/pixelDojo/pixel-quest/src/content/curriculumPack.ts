import {
  type ContentPack,
  type EncounterDefinition,
  type EvidenceContract,
  type PolicyCheck,
  type Region,
  type RouteCheck,
  type SequenceStep,
  TASK_QUEUE_CONTRACT,
  type TaskQueueJob,
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
  readonly encounterKind?:
    | "sequence_flow"
    | "route_health"
    | "policy_gate"
    | "task_queue"
    | "token_bucket"
  readonly sequenceSteps?: readonly SequenceStep[]
  readonly routeChecks?: readonly RouteCheck[]
  readonly policyChecks?: readonly PolicyCheck[]
  readonly taskQueueJobs?: readonly TaskQueueJob[]
}

const modules: readonly CurriculumModule[] = [
  {
    project: "01_rate_limiter",
    title: "Rate Limiter",
    concept: "Token bucket: capacidade vs refill, admitir legítimos e rejeitar abusivos",
    verb: "admitir requisições legítimas e rejeitar rajadas abusivas dentro do budget de tokens",
    mechanicName: "Token Bucket",
    resourceName: "Tokens",
    goodRequestLabel: "requisição legítima",
    badRequestLabel: "rajada abusiva",
    admitActionLabel: "Admitir",
    rejectActionLabel: "Rejeitar",
    practiceTitle: "Treino de token bucket",
    practiceText:
      "Admita requisições legítimas enquanto há tokens. Rejeite rajadas abusivas para preservar capacidade vs refill e manter a taxa observada abaixo da máxima.",
    encounterKind: "token_bucket",
  },
  {
    project: "02_key_value_store",
    title: "Key Value Store",
    concept: "Leitura, escrita, expiração e consistência básica de chaves",
    verb: "preservar valores quentes e descartar acessos inválidos",
    mechanicName: "TTL Cache",
    resourceName: "Slots",
    goodRequestLabel: "chave quente válida",
    badRequestLabel: "leitura expirada",
    admitActionLabel: "Servir",
    rejectActionLabel: "Invalidar",
    practiceTitle: "Treino de TTL",
    practiceText:
      "Sirva chaves quentes que ainda são válidas. Invalide leituras expiradas ou entradas corrompidas para provar consistência básica.",
    encounterKind: "sequence_flow",
    sequenceSteps: [
      { type: "advance", label: "PUT chave nova" },
      { type: "advance", label: "GET antes do TTL" },
      { type: "guard", label: "GET depois do TTL" },
      { type: "advance", label: "DELETE confirma remoção" },
      { type: "guard", label: "READ de chave removida" },
    ],
  },
  {
    project: "03_url_shortener",
    title: "URL Shortener",
    concept: "Códigos curtos, colisão e redirecionamento confiável",
    verb: "encaminhar slugs válidos e bloquear colisores",
    mechanicName: "Slug Router",
    resourceName: "Rotas",
    goodRequestLabel: "slug único",
    badRequestLabel: "colisão de slug",
    admitActionLabel: "Redirecionar",
    rejectActionLabel: "Regenerar",
    practiceTitle: "Treino de colisão",
    practiceText:
      "Redirecione slugs únicos e regenere colisores. A evidência mostra que o atalho não sobrescreve destinos existentes.",
  },
  {
    project: "04_concurrent_task_queue",
    title: "Concurrent Task Queue",
    concept: "Fila concorrente, backpressure e processamento justo",
    verb: "drenar tarefas prontas sem sobrecarregar workers",
    mechanicName: "Worker Queue",
    resourceName: "Workers",
    goodRequestLabel: "tarefa pronta",
    badRequestLabel: "job veneno sem lease",
    admitActionLabel: "Processar",
    rejectActionLabel: "Dead-letter",
    practiceTitle: "Treino de backpressure",
    practiceText:
      "Despache tarefas prontas enquanto drena a fila. Jobs veneno devem ir para a dead-letter queue após retries limitados, não serem reprocessados para sempre.",
    encounterKind: "task_queue",
    taskQueueJobs: [
      { type: "legit", at: 0, label: "checkout order #101" },
      { type: "legit", at: 1.0, label: "email send batch #5" },
      { type: "poison", at: 2.0, label: "image OCR null payload" },
      { type: "legit", at: 3.0, label: "report render #42" },
      { type: "legit", at: 4.0, label: "webhook fan-out #7" },
      { type: "legit", at: 5.0, label: "checkout order #102" },
      { type: "poison", at: 6.0, label: "import csv headers missing" },
      { type: "legit", at: 7.0, label: "thumbnail resize #200" },
      { type: "legit", at: 8.0, label: "notification digest" },
      { type: "legit", at: 9.0, label: "checkout order #103" },
      { type: "poison", at: 10.0, label: "schema migration bad json" },
      { type: "legit", at: 11.0, label: "audit log flush" },
      { type: "legit", at: 12.0, label: "checkout order #104" },
    ],
  },
  {
    project: "05_websocket_chat",
    title: "WebSocket Chat",
    concept: "Conexões persistentes, broadcast e isolamento de clientes",
    verb: "entregar mensagens legítimas e filtrar rajadas ruins",
    mechanicName: "Broadcast Hub",
    resourceName: "Canais",
    goodRequestLabel: "mensagem autenticada",
    badRequestLabel: "rajada sem sessão",
    admitActionLabel: "Broadcast",
    rejectActionLabel: "Dropar",
    practiceTitle: "Treino de conexão",
    practiceText:
      "Faça broadcast apenas de mensagens autenticadas. Drope rajadas sem sessão para manter isolamento entre clientes.",
  },
  {
    project: "06_file_upload_pipeline",
    title: "File Upload Pipeline",
    concept: "Validação, streaming e etapas seguras de upload",
    verb: "aceitar arquivos válidos e rejeitar payloads suspeitos",
    mechanicName: "Upload Pipeline",
    resourceName: "Buffers",
    goodRequestLabel: "chunk validado",
    badRequestLabel: "payload suspeito",
    admitActionLabel: "Ingerir",
    rejectActionLabel: "Quarentenar",
    practiceTitle: "Treino de pipeline",
    practiceText:
      "Ingerir chunks válidos preserva o stream. Quarentenar payloads suspeitos evita que arquivos ruins avançem pelas etapas.",
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
    concept: "Autenticação, autorização e respostas HTTP seguras",
    verb: "permitir chamadas autorizadas e negar invasoras",
    mechanicName: "Auth Gate",
    resourceName: "Sessões",
    goodRequestLabel: "token autorizado",
    badRequestLabel: "escopo inválido",
    admitActionLabel: "Permitir",
    rejectActionLabel: "Negar",
    practiceTitle: "Treino de autorização",
    practiceText:
      "Permita chamadas com token e escopo corretos. Negue escopos inválidos para manter a fronteira HTTP segura.",
    encounterKind: "policy_gate",
    policyChecks: [
      { type: "allowed", label: "GET /profile com token válido", scope: "user:read" },
      { type: "denied", label: "POST /admin com user token", scope: "admin:write" },
      { type: "allowed", label: "POST /orders com order:write", scope: "order:write" },
      { type: "denied", label: "GET /billing sem token", scope: "billing:read" },
      { type: "denied", label: "DELETE /users com escopo read-only", scope: "user:delete" },
      { type: "allowed", label: "refresh token válido", scope: "session:refresh" },
    ],
  },
  {
    project: "08_event_driven_order_system",
    title: "Event Driven Orders",
    concept: "Eventos, idempotência e fluxo de pedidos",
    verb: "processar eventos válidos sem duplicar transições",
    mechanicName: "Order Event Log",
    resourceName: "Offsets",
    goodRequestLabel: "evento novo",
    badRequestLabel: "evento duplicado",
    admitActionLabel: "Aplicar",
    rejectActionLabel: "Deduplicar",
    practiceTitle: "Treino de idempotência",
    practiceText:
      "Aplique eventos novos no fluxo do pedido. Deduplique eventos repetidos para evitar transições duplas.",
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
    concept: "Contrato de plugins, isolamento e carregamento dinâmico",
    verb: "ativar extensões confiáveis e bloquear plugins quebrados",
    mechanicName: "Plugin Host",
    resourceName: "Sandbox",
    goodRequestLabel: "plugin assinado",
    badRequestLabel: "contrato quebrado",
    admitActionLabel: "Ativar",
    rejectActionLabel: "Isolar",
    practiceTitle: "Treino de contrato",
    practiceText:
      "Ative plugins que respeitam o contrato. Isole extensões quebradas para proteger o host dinâmico.",
    encounterKind: "policy_gate",
    policyChecks: [
      { type: "allowed", label: "plugin assinado com manifest válido", scope: "manifest:load" },
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
    concept: "Replicação, invalidação e leitura distribuída",
    verb: "servir hits corretos e conter entradas obsoletas",
    mechanicName: "Replica Cache",
    resourceName: "Réplicas",
    goodRequestLabel: "hit consistente",
    badRequestLabel: "valor obsoleto",
    admitActionLabel: "Servir",
    rejectActionLabel: "Invalidar",
    practiceTitle: "Treino de réplica",
    practiceText:
      "Sirva hits consistentes entre réplicas. Invalide valores obsoletos antes que leituras distribuídas propaguem erro.",
  },
  {
    project: "11_load_balancer",
    title: "Load Balancer",
    concept: "Distribuição de carga, health checks e failover",
    verb: "rotear tráfego para nós saudáveis",
    mechanicName: "Health Router",
    resourceName: "Nós",
    goodRequestLabel: "nó saudável",
    badRequestLabel: "nó degradado",
    admitActionLabel: "Rotear",
    rejectActionLabel: "Retirar",
    practiceTitle: "Treino de health check",
    practiceText:
      "Roteie para nós saudáveis e retire nós degradados. O gate exige failover sem enviar carga para alvo ruim.",
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
    verb: "executar jobs elegíveis uma vez por janela",
    mechanicName: "Lease Scheduler",
    resourceName: "Leases",
    goodRequestLabel: "job elegível",
    badRequestLabel: "lease duplicado",
    admitActionLabel: "Executar",
    rejectActionLabel: "Adiar",
    practiceTitle: "Treino de lease",
    practiceText:
      "Execute jobs elegíveis com lease válido. Adie duplicatas para provar que o agendador não roda duas vezes.",
    encounterKind: "sequence_flow",
    sequenceSteps: [
      { type: "advance", label: "adquirir lease" },
      { type: "advance", label: "executar job elegível" },
      { type: "guard", label: "lease duplicado" },
      { type: "advance", label: "registrar sucesso" },
      { type: "guard", label: "retry antes do backoff" },
    ],
  },
  {
    project: "13_api_gateway_circuit_breaker",
    title: "API Gateway Circuit Breaker",
    concept: "Circuit breaker, bulkhead, retry e limites adaptativos",
    verb: "proteger upstreams instáveis sem derrubar clientes bons",
    mechanicName: "Circuit Breaker",
    resourceName: "Circuitos",
    goodRequestLabel: "upstream saudável",
    badRequestLabel: "falha em cascata",
    admitActionLabel: "Encaminhar",
    rejectActionLabel: "Abrir circuito",
    practiceTitle: "Treino de resiliência",
    practiceText:
      "Encaminhe chamadas saudáveis. Abra o circuito diante de falhas em cascata para proteger clientes bons.",
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
    concept: "Ingestão, consulta e ordenação de logs",
    verb: "aceitar linhas úteis e rejeitar ruído operacional",
    mechanicName: "Log Ingest",
    resourceName: "Janelas",
    goodRequestLabel: "linha indexável",
    badRequestLabel: "ruído malformado",
    admitActionLabel: "Indexar",
    rejectActionLabel: "Descartar",
    practiceTitle: "Treino de ingestão",
    practiceText:
      "Indexe linhas consultáveis e ordenadas. Descarte ruído malformado para manter a agregação útil.",
  },
  {
    project: "15_metrics_collector",
    title: "Metrics Collector",
    concept: "Coleta, agregação e janelas de métricas",
    verb: "coletar amostras válidas e evitar cardinalidade ruim",
    mechanicName: "Metrics Window",
    resourceName: "Series",
    goodRequestLabel: "amostra agregável",
    badRequestLabel: "cardinalidade explosiva",
    admitActionLabel: "Coletar",
    rejectActionLabel: "Filtrar",
    practiceTitle: "Treino de cardinalidade",
    practiceText:
      "Colete amostras agregáveis. Filtre series com cardinalidade explosiva antes que a janela fique inútil.",
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
      "Entregue mensagens prontas e reenfileire itens sem ack. A evidência mede entrega controlada.",
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
    concept: "Config versionada, watch e propagação segura",
    verb: "publicar versões válidas e rejeitar configs quebradas",
    mechanicName: "Config Watch",
    resourceName: "Versões",
    goodRequestLabel: "config versionada",
    badRequestLabel: "rollback quebrado",
    admitActionLabel: "Publicar",
    rejectActionLabel: "Bloquear",
    practiceTitle: "Treino de propagação",
    practiceText:
      "Publique configs versionadas e bloqueie rollbacks quebrados para manter watchers sincronizados.",
    encounterKind: "sequence_flow",
    sequenceSteps: [
      { type: "advance", label: "validar schema" },
      { type: "advance", label: "publicar versão nova" },
      { type: "guard", label: "rollback sem checksum" },
      { type: "advance", label: "notificar watchers" },
      { type: "guard", label: "config fora de versão" },
    ],
  },
  {
    project: "18_search_engine",
    title: "Search Engine",
    concept: "Indexação, ranking e consulta incremental",
    verb: "indexar documentos relevantes e filtrar consultas ruins",
    mechanicName: "Search Index",
    resourceName: "Postings",
    goodRequestLabel: "documento relevante",
    badRequestLabel: "consulta ruidosa",
    admitActionLabel: "Indexar",
    rejectActionLabel: "Filtrar",
    practiceTitle: "Treino de ranking",
    practiceText:
      "Indexe documentos relevantes e filtre consultas ruidosas. O objetivo é manter o ranking incremental limpo.",
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
    `Módulo ${index + 1}: ${module.title}. Treino alvo: ${module.concept}. No duelo, ${module.verb}; a partida emite evidência crua para o verifier.`,
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
    lockedLabel: `Gate bloqueado: gere evidência PASS para ${module.title}.`,
    unlockedLabel:
      nextModule === undefined
        ? "Currículo completo: toda a trilha emitiu evidência jogável."
        : `Gate aberto: avançar para ${nextModule.title}.`,
  }
  return {
    id: regionId(module),
    name: `Laboratório ${index + 1}: ${module.title}`,
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
  if (module.encounterKind === "task_queue") {
    const jobs = module.taskQueueJobs ?? []
    return {
      kind: "pixelquest-task-queue",
      // Pass requires processing every legit job and dead-lettering every poison job.
      minProcessed: jobs.filter((job) => job.type === "legit").length,
      maxPoisonRetried: TASK_QUEUE_CONTRACT.maxPoisonRetried,
      maxBackpressurePeak: TASK_QUEUE_CONTRACT.maxBackpressurePeak,
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
  if (module.encounterKind === "task_queue") {
    const jobs = module.taskQueueJobs ?? []
    return {
      ...base,
      kind: "task_queue",
      maxRetries: TASK_QUEUE_CONTRACT.maxPoisonRetried,
      arrivalRate: 1.0,
      processRate: 1.0,
      jobs,
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

// 01_rate_limiter keeps legacy identifiers (U0-sonda-rate-limiter-robustness,
// encounter-agent-quest-01) as a FROZEN persistence contract: U0 is the substrate's
// canonical rate-limiter unit (the only unit in learning_state.yaml). Do not rename
// without migrating the substrate, the verifier done-rule, and the smoke assertions.
// 04_concurrent_task_queue emits the canonical U4 unit id pinned by the CEO decision
// AID-1859 Option A (dispatch AID-1877): `U4-task-queue`, same identity as the
// voxelDojo catalog entry — NOT the `U-04_concurrent_task_queue` template default
// (identity drift class L4: gate rejects unit mismatch on first U4 attempt).
function unitId(module: CurriculumModule): string {
  if (module.project === "01_rate_limiter") {
    return "U0-sonda-rate-limiter-robustness"
  }
  if (module.project === "04_concurrent_task_queue") {
    return "U4-task-queue"
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
