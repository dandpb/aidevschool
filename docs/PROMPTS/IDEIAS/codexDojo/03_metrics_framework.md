# Framework de Métricas e Benchmarking

> **Documento 03** — aidevschool: ecossiistema de aprendizado contínuo em engenharia de software, executado sobre OpenClaw e Hermes com implementações poliglotas (Go, Rust, Node.js/TypeScript).

---

## 1. Visão Geral

Métricas-driven learning é a diferença entre *achismo* e *engenharia*. Quando medimos, transformamos debates de opinião em dados reproduzíveis. Quando comparamos, transformamos intuição em evidência. Quando registramos, transformamos tentativas isoladas em uma trilha evolutiva de aprendizado.

No **aidevschool**, o framework de métricas tem três objetivos centrais:

1. **Ensinar pelo contraste** — comparar Go, Rust e Node.js/TypeScript resolvendo o *mesmo* problema sob as *mesmas* condições revela verdades que nenhuma documentação teórica consegue igualar. Um developer júnior que vê Rust entregar 10x o throughput de Node.js em I/O intensivo aprende, em cinco minutos, o que custaria horas lendo sobre `tokio` e `libuv`.

2. **Construir intuição quantitativa** — "rápido", "lento", "pesado", "leve" são adjetivos vazios. `RPS=84.231`, `p99=12ms`, `RAM=18MB`, `LoC=312` são afirmações que podem ser verificadas, contestadas e melhoradas. A repetição disciplinada de benchmarks semana após semana treina o olho do engenheiro para detectar anomalias em produção.

3. **Promover a evolução deliberada** — uma métrica isolada é um número. Uma série temporal de métricas é uma história. Ao registrar cada iteração, conseguimos responder perguntas profundas: *o algoritmo A realmente escalou melhor que B? A refatoração reduziu latência ou apenas a移iu? O memory leak que apareceu no terceiro endurance test foi corrigido na quinta iteração?*

A filosofia por trás do framework é simples: **números ensinam o que opiniões não conseguem**. Toda decisão arquitetural deve ser embasada em medição, toda otimização deve ser validada por benchmark, e toda alegação de superioridade tecnológica deve ser comprovada por evidência empírica reproduzível.

O framework cobre quatro camadas:

- **Coleta** — quais métricas capturar e com quais ferramentas.
- **Execução** — quais cenários de carga simulam produção realista.
- **Documentação** — como padronizar relatórios para comparação histórica.
- **Interpretação** — como ler números e transformá-los em decisões de design.

---

## 2. Métricas Primárias

As dez métricas abaixo formam o **núcleo quantitativo** do aidevschool. Toda implementação — independentemente da linguagem — deve ser avaliada contra todas elas. A omissão de uma métrica gera um ponto cego que compromete a análise comparativa.

| Métrica                       | Unidade     | Ferramenta                          | O Que Mede                                                                                  |
| ----------------------------- | ----------- | ----------------------------------- | ------------------------------------------------------------------------------------------- |
| **Throughput (RPS)**          | req/s       | `k6`, `autocannon`                  | Capacidade bruta de processamento — quantas requisições o sistema completa por segundo sob carga sustentada. |
| **Latência p50**              | ms          | `k6`                                | Tempo de resposta mediano — metade das requisições termina abaixo deste valor. Indica experiência típica. |
| **Latência p95**              | ms          | `k6`                                | Tempo de resposta para 95% das requests — captura degradações que o p50 esconde. É o **SLO padrão** da indústria. |
| **Latência p99**              | ms          | `k6`                                | Tempo de resposta para 99% das requests (worst case realista) — expõe caudas longas de latência. |
| **Pico de Memória (RAM)**     | MB          | `docker stats`, `/proc/meminfo`     | Consumo máximo de memória RSS durante o teste — fundamental para dimensionar containers.    |
| **Uso de CPU**                | %           | `docker stats`, `mpstat`            | Utilização média e de pico do processador — revela saturação e paralelismo efetivo.         |
| **Taxa de Erro**              | %           | `k6`                                | Percentual de requests com falha (4xx/5xx, timeouts, conexões recusadas) — confiabilidade.  |
| **Linhas de Código (LoC)**    | count       | `cloc`, `tokei`                     | Complexidade/verbosidade da implementação — proxy para custo de manutenção.                |
| **Tempo de Build**            | seconds     | `time` (GNU), `hyperfine`           | Velocidade de compilação — impacta o feedback loop do developer.                            |
| **Tamanho do Binário/Imagem** | MB          | `du`, `docker images`               | Footprint de deploy — cold start, custo de transferência, surface area de segurança.       |

### Diretrizes de Coleta

- **Throughput e latência** são coletados simultaneamente pelo `k6` no mesmo run, garantindo correlação temporal.
- **RAM e CPU** são amostrados externamente a cada 1s durante o teste (loop sobre `docker stats --no-stream=false --format`).
- **LoC** é medido sobre o código-fonte da aplicação, excluindo testes, comentários e arquivos gerados. Use `cloc` com `--not-match-d` para过滤 diretórios irrelevantes.
- **Tempo de build** deve ser medido em máquina fria (após `docker builder prune -af` e cache limpo) e warm (segunda execução). Reportamos ambos.
- **Tamanho do binário/imagem** mede o artefato final pronto para deploy, não o source tree.

---

## 3. Cenários de Teste

Quatro cenários cobrem o espectro realista de comportamento em produção. Todo benchmark no aidevschool executa **todos os quatro** sequencialmente, com cooldown de 30s entre eles para evitar thermal carryover.

### 3.1 Baseline Test

- **Duração:** 30 segundos
- **Virtual users:** 10 (constante)
- **Ramp-up:** 5 segundos
- **Padrão de carga:** uniforme
- **Propósito:** Estabelecer a performance de linha de base — o comportamento do sistema em condições nominais. É a referência contra a qual todas as outras medições são comparadas. Se a otimização não melhora o baseline, ela não é uma otimização real.

### 3.2 Stress Test

- **Duração:** 60 segundos
- **Virtual users:** 100 → 1000 (ramping linear)
- **Ramp-up:** 60 segundos (1 VU a cada ~60ms)
- **Propósito:** Encontrar o ponto de ruptura. O sistema degrada graciosamente ou colapsa? Em que RPS a latência p99 explode? Onde a taxa de erro deixa de ser aceitável? Identifica o **limite operacional**.

### 3.3 Spike Test

- **Duração:** 30 segundos totais
- **Virtual users:** 10 → 500 → 10 (spike súbito)
- **Padrão:** 5s baseline → 10s com 500 VU → 15s recuperação
- **Propósito:** Testar resiliência a picos súbitos (ex: viralização, black friday, ataque). O sistema sobrevive sem OOM kill? Recupera o throughput normal? Há degradação permanente após o pico?

### 3.4 Endurance Test

- **Duração:** 5 minutos
- **Virtual users:** 100 (constante)
- **Propósito:** Detectar **memory leaks** e degradação temporal. Se a curva de RAM cresce monotonicamente, há leak. Se a latência p99 cresce sem causa externa (ex: thermal throttling), há degradação. Também valida estabilidade de connection pools e file descriptors.

---

## 4. Templates de Script de Benchmark

Os templates abaixo são **parametrizáveis via environment variables** para que o mesmo script sirva qualquer projeto do aidevschool.

### k6 Script Template

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ============================================================
// Custom metrics
// ============================================================
const errorRate = new Rate('custom_errors');
const latencyTrend = new Trend('custom_latency', true);

// ============================================================
// Configuration via environment variables
// ============================================================
const BASE_URL       = __ENV.BASE_URL       || 'http://localhost:8080';
const ENDPOINT       = __ENV.ENDPOINT       || '/';
const SCENARIO       = __ENV.SCENARIO       || 'baseline';
const RPS_LIMIT      = __ENV.RPS_LIMIT      ? parseInt(__ENV.RPS_LIMIT) : null;
const PAYLOAD_FILE   = __ENV.PAYLOAD_FILE   || null;

const payload = PAYLOAD_FILE ? open(PAYLOAD_FILE) : null;

// ============================================================
// Scenario definitions
// ============================================================
const scenarios = {
  baseline: {
    executor: 'constant-vus',
    vus: 10,
    duration: '30s',
    gracefulStop: '5s',
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '5s',  target: 100  },
      { duration: '55s', target: 1000 },
      { duration: '5s',  target: 0    },
    ],
    gracefulRampDown: '10s',
  },
  spike: {
    executor: 'ramping-vus',
    startVUs: 10,
    stages: [
      { duration: '5s',  target: 10  },
      { duration: '1s',  target: 500 },
      { duration: '10s', target: 500 },
      { duration: '1s',  target: 10  },
      { duration: '13s', target: 10  },
    ],
  },
  endurance: {
    executor: 'constant-vus',
    vus: 100,
    duration: '5m',
  },
};

// ============================================================
// k6 options
// ============================================================
export const options = {
  scenarios: {
    [SCENARIO]: scenarios[SCENARIO],
  },
  thresholds: {
    http_req_duration: ['p(50)<100', 'p(95)<500', 'p(99)<1000'],
    http_req_failed:   ['rate<0.01'],
    custom_errors:     ['rate<0.01'],
  },
  noConnectionReuse: false,
  userAgent: 'aidevschool/1.0',
};

// ============================================================
// Default function executed by each VU
// ============================================================
export default function () {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent':   'aidevschool-benchmark',
    },
    tags: { scenario: SCENARIO, endpoint: ENDPOINT },
    timeout: '10s',
  };

  const start = Date.now();
  const res = http.post(`${BASE_URL}${ENDPOINT}`, payload, params);
  const duration = Date.now() - start;

  latencyTrend.add(duration);
  errorRate.add(res.status >= 400);

  const ok = check(res, {
    'status is 2xx':       (r) => r.status >= 200 && r.status < 300,
    'response time < 1s':  (r) => r.timings.duration < 1000,
    'has body':            (r) => r.body && r.body.length > 0,
  });

  if (!ok) {
    console.error(`[VU ${__VU}] FAIL status=${res.status} dur=${duration}ms`);
  }

  // Think time: small sleep to simulate realistic user behavior
  sleep(Math.random() * 0.5 + 0.1);
}

// ============================================================
// Lifecycle hooks
// ============================================================
export function setup() {
  console.log(`Starting scenario=${SCENARIO} target=${BASE_URL}${ENDPOINT}`);
  // Optional warmup: 1 request to ensure service is up
  const warmup = http.get(`${BASE_URL}/health`);
  if (warmup.status !== 200) {
    throw new Error(`Service not healthy: status=${warmup.status}`);
  }
  return { startedAt: new Date().toISOString() };
}

export function teardown(data) {
  console.log(`Finished scenario=${SCENARIO} started_at=${data.startedAt}`);
}

// ============================================================
// Custom summary handler — emits JSON for aggregation
// ============================================================
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    [`summary-${SCENARIO}.json`]: JSON.stringify(data, null, 2),
  };
}

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.3/index.js';
```

**Uso:**

```bash
# Baseline contra um serviço Go local
k6 run -e SCENARIO=baseline -e BASE_URL=http://localhost:8080 benchmark.js

# Stress test contra serviço Rust em container
k6 run -e SCENARIO=stress -e BASE_URL=http://rust-svc:8080 benchmark.js

# Spike test com payload customizado
k6 run -e SCENARIO=spike -e PAYLOAD_FILE=./payload.json -e ENDPOINT=/api/users benchmark.js
```

### autocannon Script Template

```javascript
#!/usr/bin/env node
/**
 * autocannon benchmark template — aidevschool
 *
 * Usage:
 *   node benchmark.js [scenario] [url]
 *
 * Scenarios: baseline | stress | spike | endurance
 */
const autocannon = require('autocannon');
const fs = require('fs');
const path = require('path');

const SCENARIO = process.argv[2] || 'baseline';
const URL      = process.argv[3] || process.env.BASE_URL || 'http://localhost:8080';
const ENDPOINT = process.env.ENDPOINT || '/';

// ============================================================
// Scenario parameters
// ============================================================
const scenarioConfig = {
  baseline: {
    connections:  10,
    duration:     30,
    pipelining:   1,
  },
  stress: {
    connections:  1000,
    duration:     60,
    pipelining:   1,
  },
  spike: {
    connections:  500,
    duration:     30,
    pipelining:   1,
  },
  endurance: {
    connections:  100,
    duration:     300, // 5 minutes
    pipelining:   1,
  },
};

const config = scenarioConfig[SCENARIO];
if (!config) {
  console.error(`Unknown scenario: ${SCENARIO}`);
  process.exit(1);
}

// ============================================================
// Payload (optional, from file or inline)
// ============================================================
const payloadPath = process.env.PAYLOAD_FILE;
let payload = undefined;
if (payloadPath && fs.existsSync(payloadPath)) {
  payload = fs.readFileSync(payloadPath, 'utf8');
}

// ============================================================
// Build autocannon request
// ============================================================
const opts = {
  url:        `${URL}${ENDPOINT}`,
  method:     payload ? 'POST' : 'GET',
  body:       payload,
  headers:    { 'Content-Type': 'application/json' },
  ...config,
};

// ============================================================
// Run benchmark
// ============================================================
console.log(`[aidevschool] scenario=${SCENARIO} url=${opts.url} conn=${config.connections} dur=${config.duration}s`);

const instance = autocannon(opts, (err, result) => {
  if (err) {
    console.error('Benchmark failed:', err);
    process.exit(1);
  }

  // Custom output: simplified JSON
  const report = {
    scenario:    SCENARIO,
    url:         opts.url,
    timestamp:   new Date().toISOString(),
    metrics: {
      rps:        result.requests.average,
      rps_stddev: result.requests.stddev,
      latency: {
        p50: result.latency.p50,
        p90: result.latency.p90,
        p99: result.latency.p99,
        max: result.latency.max,
        mean: result.latency.mean,
      },
      throughput: {
        avg_bytes_per_sec: result.throughput.average,
      },
      errors:     result.errors,
      timeouts:   result.timeouts,
      '2xx':      result['2xx'],
      '4xx':      result['4xx'],
      '5xx':      result['5xx'],
    },
  };

  // Persist
  const outDir = path.join(__dirname, '..', 'reports');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `autocannon-${SCENARIO}-${Date.now()}.json`);
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

  console.log('\n=== Results ===');
  console.log(`RPS:           ${report.metrics.rps.toFixed(2)}`);
  console.log(`p50:           ${report.metrics.latency.p50} ms`);
  console.log(`p99:           ${report.metrics.latency.p99} ms`);
  console.log(`Errors:        ${report.metrics.errors}`);
  console.log(`Report saved:  ${outFile}`);
});

// Progress monitoring
autocannon.track(instance, { renderProgressBar: true, renderResultsTable: false });
```

**Uso:**

```bash
# Instalar dependência
npm install --save-dev autocannon

# Executar
node benchmark.js baseline http://localhost:8080
SCENARIO=stress node benchmark.js http://rust-svc:8080
```

---

## 5. Formato do Relatório de Benchmark

Todo benchmark concluído gera um arquivo `docs/benchmark_results.md` seguindo **exatamente** o template abaixo. A padronização é não-negociável: a comparabilidade histórica depende dela.

```markdown
# Benchmark Results: {Project Name}

**Date:** {date}
**Hardware:** {system specs}
**Commit:** {git SHA}
**Test runner version:** k6 v0.49.0 / autocannon v8.10.0
**Environment:** {OS, kernel, container runtime}

## Summary Table

| Metric              | Go           | Rust         | Node.js      | Winner      |
| ------------------- | ------------ | ------------ | ------------ | ----------- |
| RPS (baseline)      |              |              |              |             |
| p50 Latency (ms)    |              |              |              |             |
| p95 Latency (ms)    |              |              |              |             |
| p99 Latency (ms)    |              |              |              |             |
| Peak RAM (MB)       |              |              |              |             |
| CPU Usage (%)       |              |              |              |             |
| Error Rate (%)      |              |              |              |             |
| Lines of Code       |              |              |              |             |
| Build Time (s)      |              |              |              |             |
| Binary Size (MB)    |              |              |              |             |

## Baseline Test Analysis

[Detailed analysis of 30s/10VU run. Include:
 - Throughput mean and stddev
 - p50/p95/p99 distribution
 - RAM growth curve (start vs end)
 - CPU utilization pattern
 - Any anomalies observed]

## Stress Test Analysis

[Detailed analysis of 60s ramping 100→1000 VU. Include:
 - RPS curve as VU count increased
 - Latency degradation profile
 - Breaking point identification (at what VU count did p99 cross 1s?)
 - Error rate as function of load
 - Throughput plateau or collapse?]

## Spike Test Analysis

[Analysis of 10→500→10 VU pattern. Include:
 - Behavior during spike
 - Recovery time after spike
 - Permanent degradation or clean recovery?
 - OOM kills, restarts, or graceful degradation?]

## Endurance Test Analysis

[Analysis of 5min/100VU sustained load. Include:
 - RAM growth (linear? flat? exponential?)
 - Latency drift over time
 - Connection pool stability
 - File descriptor leaks
 - GC pause patterns (if applicable)]

## Comparative Analysis

[Cross-language comparison and learning insights. Include:
 - Which language won each metric and by what margin
 - Architectural reasons for the difference
 - Trade-offs revealed (e.g., Rust faster but 2x more LoC)
 - When each language's advantages matter most in production]

## Bottleneck Identification

[What's slow and why. Include:
 - Flame graph interpretation (if available)
 - Lock contention evidence
 - I/O vs CPU bottleneck breakdown
 - Network vs disk vs memory pressure analysis
 - Specific function/hotspot identification]

## Learning Takeaways

[What these numbers teach us. Include:
 - 3-5 actionable insights
 - Implications for production deployment
 - When to choose which language for this workload
 - Open questions for the next iteration
 - Refactoring hypotheses to test next]
```

---

## 6. Interpreting Results: A Learning Guide

Números sem interpretação são ruído. Esta seção é o **manual de decodificação** que transforma medições em entendimento.

### When RPS is low

**Possíveis causas:**

- **Blocking I/O** — chamadas síncronas que paralizam o event loop (Node.js), goroutine starvation (Go) ou blocking em `async` runtime (Rust com `tokio` mal usado).
- **Ausência de concorrência** — código serial que poderia ser paralelizado (ex: processar uma request de cada vez).
- **Computação pesada no request path** — parsing, regex complexas, serialização custosa, alocações excessivas.
- **Saturação de CPU** — single-threaded em workload paralelo.

**O que verificar:**

- Profiling de CPU: `pprof` (Go), `perf` + `cargo flamegraph` (Rust), `node --prof` (Node.js).
- Event loop lag: `clinic.js doctor` para Node.js.
- Goroutine count: `runtime.NumGoroutine()` em Go.
- Thread state: `cat /proc/$PID/status` para Rust com threads nativas.

### When p99 is high

**Possíveis causas:**

- **GC pauses** — Stop-The-World em Go (limitado pós-1.21), Major GC em Node.js, ausência de GC em Rust (mas alocações no hot path).
- **Lock contention** — mutexes serializando trabalho que deveria ser paralelo.
- **Disk I/O** — leituras síncronas, queries de banco lentas, fsync forçado.
- **Cold cache** — primeiro request após um intervalo encontra cache vazio.
- **Connection pool exhaustion** — todas as conexões em uso, novos requests esperando.

**O que verificar:**

- GC traces: `GODEBUG=gctrace=1` (Go), `--trace-gc-verbose` (Node.js).
- Mutex contention: `pprof` mutex profile (Go), `perf lock` (Rust).
- Disk I/O patterns: `iotop`, `iostat -x`.
- Connection pool metrics: latência de acquire, pool exhaustion events.

### When memory is high

**Possíveis causas:**

- **Memory leaks** — referências retidas, slices crescendo sem bound, caches sem eviction.
- **Buffers grandes** — `bytes.Buffer` não liberados, `Vec` com capacity excessivo, `Buffer.concat` em Node.js.
- **Ausência de streaming** — carregar arquivo inteiro em memória ao invés de streamar.
- **Per-request allocations** — alta cardinalidade de objetos imutáveis em hot path.
- **Connection pool over-sizing** — manter 1000 conexões abertas ociosas.

**O que verificar:**

- Heap profile: `pprof heap` (Go), `heaptrack` (Rust), `heapdump` (Node.js).
- Object lifecycle: validar que objetos do request são elegíveis para GC após response.
- Buffer sizes: medir com `benchmark_allocs` (Go), `dhat` (Rust).
- Streaming vs buffering: identificar pontos onde o código materializa dados em memória.

### When CPU is high

**Possíveis causas:**

- **Busy waiting** — loops com `while !ready` ao invés de notificação/blocking.
- **Algoritmos ineficientes** — O(n²) onde O(n) é possível, regex catastróficas (ReDoS), lookups O(n) onde hashmap é O(1).
- **Ausência de caching** — recálculo de valores derivados, queries repetidas.
- **Deserialização custosa** — JSON parsing em hot path, especialmente com estruturas profundas.
- **Compressão/crypto** — TLS termination sem offload, compressão de responses grandes.

**O que verificar:**

- CPU profile: `pprof cpu` (Go), `cargo flamegraph` (Rust), `v8-prof` (Node.js).
- Algoritmo complexidade: revisar hot paths com `Big-O` analysis.
- Cache hit rate: instrumentar caches com métricas de hit/miss.
- CPU profiling: identificar top 10 funções em tempo de CPU cumulativo.

---

## 7. Evolution Scoring System

Para acompanhar a evolução **ao longo de iterações**, definimos um **score composto** que combina as dez métricas primárias em um único número rastreável. Isso permite visualizar progresso em gráficos temporais e identificar regressões rapidamente.

### Pesos por Categoria

| Categoria        | Peso    | Métricas Envolvidas                  | Justificativa                                                                 |
| ---------------- | ------- | ------------------------------------ | ----------------------------------------------------------------------------- |
| **Performance**  | 40%     | RPS, Latência (p50, p95, p99)        | O objetivo primário de qualquer serviço web.                                  |
| **Efficiency**   | 25%     | RAM, CPU, Tamanho do binário         | Custo operacional e de deploy.                                                 |
| **Reliability**  | 20%     | Taxa de erro, p99 vs p50 (jitter)    | Sistema rápido que falha não é aceitável.                                    |
| **Code Quality** | 15%     | LoC, cobertura de testes (futuro)    | Manutenibilidade e custo de evolução.                                         |

### Fórmula de Cálculo

Para cada métrica, normalizamos em uma escala **0–100** baseada em benchmarks internos do aidevschool:

```text
Score_normalized = clamp((value - worst) / (best - worst) * 100, 0, 100)
```

Onde `worst` e `best` são os limites inferior e superior esperados para aquela métrica naquela categoria de projeto.

**Fórmula final por categoria:**

```text
Performance  = (RPS_norm × 0.5 + p99_norm × 0.3 + p95_norm × 0.2) × 0.40
Efficiency   = (RAM_inv_norm × 0.4 + CPU_inv_norm × 0.3 + Binary_inv_norm × 0.3) × 0.25
Reliability  = ((1 - error_rate) × 0.6 + jitter_norm × 0.4) × 0.20
Code_Quality = (LoC_inv_norm × 0.6 + coverage_norm × 0.4) × 0.15
```

**Score final:**

```text
Score_total = Performance + Efficiency + Reliability + Code_Quality
```

Valores entre 0 e 100, onde 100 é o ideal teórico.

### Exemplo de Cálculo

| Métrica           | Valor    | Norm (0–100) |
| ----------------- | -------- | ------------ |
| RPS               | 50.000   | 80           |
| p99               | 15ms     | 90           |
| p95               | 8ms      | 85           |
| RAM               | 64MB     | 70 (inverso) |
| CPU               | 45%      | 55 (inverso) |
| Binário           | 12MB     | 80 (inverso) |
| Error rate        | 0.2%     | 80           |
| Jitter (p99/p50)  | 2.5      | 75           |
| LoC               | 450      | 60 (inverso) |
| Cobertura testes  | 85%      | 85           |

**Performance**  = (80×0.5 + 90×0.3 + 85×0.2) × 0.40 = (40 + 27 + 17) × 0.40 = **33.6**
**Efficiency**   = (70×0.4 + 55×0.3 + 80×0.3) × 0.25 = (28 + 16.5 + 24) × 0.25 = **17.1**
**Reliability**  = (80×0.6 + 75×0.4) × 0.20 = (48 + 30) × 0.20 = **15.6**
**Code_Quality** = (60×0.6 + 85×0.4) × 0.15 = (36 + 34) × 0.15 = **10.5**

**Score_total = 33.6 + 17.1 + 15.6 + 10.5 = 76.8 / 100**

### Critérios de Aceitação para Promoção de Iteração

| Faixa de Score | Veredicto                                  | Ação                                  |
| -------------- | ------------------------------------------ | ------------------------------------- |
| 85 – 100       | **Excelência** — pronto para referência   | Documentar e usar como baseline       |
| 70 – 84        | **Sólido** — atende critérios de produção  | Prosseguir, refinar nas próximas iterações |
| 50 – 69        | **Aceitável** — funcional mas otimizável   | Identificar e atacar maior gargalo    |
| 30 – 49        | **Fraco** — múltiplas deficiências         | Refatoração significativa necessária  |
| 0 – 29         | **Inaceitável** — anti-patterns dominantes | Repensar arquitetura antes de continuar |

### Acompanhamento Temporal

O score é registrado em `docs/evolution_log.md` a cada iteração, formando uma série temporal que responde perguntas como:

- A iteração N+1 melhorou ou regrediu em relação à N?
- Quais categorias estão estagnadas há mais de 5 iterações?
- Em que momento o trade-off performance × code quality começou a compensar?
- A refatoração para streaming reduziu RAM mas afetou latência? Em quanto?

Gráficos de radar (por categoria) e linha (score total ao longo do tempo) são gerados a partir desse log e revisados semanalmente nas sessões de planejamento do aidevschool.

---

> **Próximo documento:** [04_observability_setup.md](./04_observability_setup.md) — instrumentação contínua com Prometheus, Grafana e OpenTelemetry para complementar os benchmarks pontuais com telemetria em produção.
