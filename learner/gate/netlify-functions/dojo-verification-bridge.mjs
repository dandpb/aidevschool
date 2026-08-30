import { createHash, timingSafeEqual } from "node:crypto";

// Canonical parity projection of learner/gate/teaching_game_bridge.py (GAME_SPECS,
// evidence_validator structure checks, and the four fixed evaluators). The Python
// module stays the canonical trust boundary; this staged function must accept and
// reject exactly the same records (AID-415).

const SESSION_PATH = "/__dojo/bridge/v1/session";
const VERIFICATION_PATH = "/__dojo/bridge/v1/verification";
const TOKEN = createHash("sha256").update(`aidevschool:${process.env.SITE_ID ?? "local"}`).digest("base64url");

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...extra },
  });
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(record) {
  const { ts: _timestamp, verifier: _verifier, ...payload } = record ?? {};
  return createHash("sha256").update(stable(payload)).digest("hex");
}

function tokenMatches(received) {
  const left = Buffer.from(received ?? "");
  const right = Buffer.from(TOKEN);
  return left.length === right.length && timingSafeEqual(left, right);
}

// --- evaluator primitives (parity with learner/gate/evaluator_primitives.py) ---

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
  };
}

function base36(value) {
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
  let digits = "";
  while (value > 0) {
    const remainder = value % 36;
    value = Math.floor(value / 36);
    digits = alphabet[remainder] + digits;
  }
  return digits || "0";
}

function hash32(value, strength = "full") {
  const limit = typeof strength === "string"
    ? value.length
    : Math.max(1, Math.min(strength, value.length));
  let hashed = 0x811c9dc5;
  for (let index = 0; index < limit; index += 1) {
    hashed = Math.imul(hashed ^ value.charCodeAt(index), 0x01000193) >>> 0;
  }
  hashed = (hashed ^ (hashed >>> 16)) >>> 0;
  hashed = Math.imul(hashed, 0x85ebca6b) >>> 0;
  hashed = (hashed ^ (hashed >>> 13)) >>> 0;
  hashed = Math.imul(hashed, 0xc2b2ae35) >>> 0;
  return (hashed ^ (hashed >>> 16)) >>> 0;
}

function round2(value) {
  return Math.floor(value * 100 + 0.5) / 100;
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function closedDict(value, keys) {
  if (!isObject(value) || Object.keys(value).length !== keys.length) return false;
  return keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function metricsMatch(actual, expected) {
  if (!isObject(actual) || Object.keys(actual).length !== Object.keys(expected).length) return false;
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (!Object.prototype.hasOwnProperty.call(actual, key)) return false;
    const value = actual[key];
    if (typeof expectedValue === "boolean") {
      if (typeof value !== "boolean" || value !== expectedValue) return false;
    } else if (typeof expectedValue === "number") {
      if (typeof value !== "number" || !Number.isFinite(value) || value !== expectedValue) return false;
    } else if (value !== expectedValue) return false;
  }
  return true;
}

// --- WAREHOUSE evaluator (parity with learner/gate/warehouse_evaluator.py) ---

const WAREHOUSE_LEVELS = {
  L1: [11, 12, 0.0],
  L2: [22, 10, 0.0],
  L3: [33, 10, 0.0],
  L4: [44, 400, 0.7],
};

function warehouseKeys(seed, count, skew) {
  const random = mulberry32(seed);
  const result = [];
  for (let index = 0; index < count; index += 1) {
    if (skew > 0 && random() < skew) {
      result.push(`hot:${Math.floor(random() * 50)}`);
    } else {
      result.push(`key:${base36(Math.floor(random() * 1e9))}:${index}`);
    }
  }
  return result;
}

function warehousePredictionTrace(raw, expectedKeys, valueKey, valueType) {
  if (!Array.isArray(raw) || raw.length !== expectedKeys.length) return null;
  const parsed = [];
  for (let index = 0; index < raw.length; index += 1) {
    const item = raw[index];
    if (!isObject(item) || !closedDict(item, ["key", valueKey]) || item.key !== expectedKeys[index]) {
      return null;
    }
    const value = item[valueKey];
    const valid = valueType === "boolean"
      ? typeof value === "boolean"
      : Number.isInteger(value);
    if (!valid) return null;
    parsed.push(item);
  }
  return parsed;
}

function warehousePredictions(level, observations) {
  const [seed, count, skew] = WAREHOUSE_LEVELS[level];
  const keys = warehouseKeys(seed, count, skew);
  if (level === "L1") {
    if (!closedDict(observations, ["kind", "predictions"])) return null;
    const trace = warehousePredictionTrace(observations.predictions, keys, "shelf", "int");
    if (trace === null || observations.kind !== "warehouse-L1") return null;
    const correct = trace.filter((item) => item.shelf === hash32(item.key) % 6).length;
    const accuracy = round2(correct / count);
    return [accuracy >= 0.8, {
      kind: "voxeldoj-kv-warehouse",
      shelf_predictions: count,
      shelf_prediction_accuracy: accuracy,
    }];
  }
  const kind = `warehouse-${level}`;
  const required = level === "L3" ? ["kind", "probes", "predictedSwept"] : ["kind", "probes"];
  if (!closedDict(observations, required) || observations.kind !== kind) return null;
  const trace = warehousePredictionTrace(observations.probes, keys, "predictedAlive", "boolean");
  if (trace === null) return null;
  const expectedAlive = level === "L2";
  const correct = trace.filter((item) => item.predictedAlive === expectedAlive).length;
  const accuracy = round2(correct / count);
  if (level === "L2") {
    return [accuracy === 1, {
      kind: "voxeldoj-kv-warehouse",
      crud_probes: count,
      crud_accuracy: accuracy,
    }];
  }
  const predictedSwept = observations.predictedSwept;
  if (!Number.isInteger(predictedSwept)) return null;
  const swept = new Set(keys).size;
  const sweptOk = predictedSwept === swept;
  return [accuracy >= 0.8 && sweptOk, {
    kind: "voxeldoj-kv-warehouse",
    ttl_probes: count,
    ttl_accuracy: accuracy,
    expired_swept: swept,
    swept_prediction_ok: sweptOk,
  }];
}

function warehouseSkew(observations) {
  if (!closedDict(observations, ["kind", "hashStrength"])) return null;
  const strength = observations.hashStrength;
  if (observations.kind !== "warehouse-L4" || !(
    strength === "full"
    || (Number.isInteger(strength) && strength >= 1 && strength <= 32)
  )) {
    return null;
  }
  const keys = new Set(warehouseKeys(...WAREHOUSE_LEVELS.L4));
  const loads = new Array(8).fill(0);
  for (const key of keys) {
    loads[hash32(key, strength) % 8] += 1;
  }
  const skew = keys.size === 0 ? 1 : Math.max(...loads) / (keys.size / loads.length);
  const metricStrength = strength === "full" ? -1 : strength;
  return [skew <= 1.6 && (metricStrength === -1 || metricStrength > 1), {
    kind: "voxeldoj-kv-warehouse",
    load_skew: round2(skew),
    hash_strength: metricStrength,
  }];
}

function evaluateWarehouse(level, observations, producerMetrics, errors) {
  if (!isObject(observations)) {
    errors.push("observations must be a bounded object");
    return false;
  }
  const evaluated = level === "L4" ? warehouseSkew(observations) : warehousePredictions(level, observations);
  if (evaluated === null) {
    errors.push(`observations do not match the closed ${level} scenario trace`);
    return false;
  }
  const [passed, expectedMetrics] = evaluated;
  if (!metricsMatch(producerMetrics, expectedMetrics)) {
    errors.push("producer metrics disagree with independently recomputed observations");
    return false;
  }
  return passed;
}

// --- WORMHOLE evaluator (parity with learner/gate/wormhole_evaluator.py) ---

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const WORMHOLE_HOSTS = ["ada.io", "bytes.dev", "cache.net", "delta.app", "edge.run", "flux.sys"];
const WORMHOLE_LEVELS = { L1: [11, false], L2: [22, false], L3: [33, true], L4: [44, true] };
const CODE_LEN = 4;
const CODE_SPACE = 62 ** CODE_LEN;

function wormholeUrls(seed) {
  const random = mulberry32(seed);
  const urls = [];
  for (let index = 0; index < 6; index += 1) {
    const host = WORMHOLE_HOSTS[Math.floor(random() * WORMHOLE_HOSTS.length) % WORMHOLE_HOSTS.length];
    const path = base36(Math.floor(random() * 1e9));
    urls.push(`https://${host}/${path}-${index}`);
  }
  return urls;
}

function base62(value) {
  let digits = "";
  while (value > 0) {
    const remainder = value % 62;
    value = Math.floor(value / 62);
    digits = ALPHABET[remainder] + digits;
  }
  return digits || "0";
}

function wormholeCode(value) {
  const full = base62(hash32(value));
  return full.length <= CODE_LEN ? full.padStart(CODE_LEN, "0") : full.slice(0, CODE_LEN);
}

let collidingPairCache = null;
function collidingPair() {
  if (collidingPairCache) return collidingPairCache;
  const base = "https://wormhole.collide/";
  const seen = new Map();
  for (let index = 0; index < 500000; index += 1) {
    const code = wormholeCode(`${base}${index}`);
    const previous = seen.get(code);
    if (previous !== undefined) {
      collidingPairCache = [`${base}${previous}`, `${base}${index}`];
      return collidingPairCache;
    }
    seen.set(code, index);
  }
  throw new Error("no colliding pair found");
}

const scenarioCache = new Map();
function wormholeScenario(level) {
  if (scenarioCache.has(level)) return scenarioCache.get(level);
  const [seed, forcedCollision] = WORMHOLE_LEVELS[level];
  const urls = wormholeUrls(seed);
  let colliderIndex = -1;
  if (forcedCollision) {
    colliderIndex = Math.floor(urls.length / 2);
    const [first, second] = collidingPair();
    urls[colliderIndex - 1] = first;
    urls[colliderIndex] = second;
  }
  const scenario = [urls, colliderIndex];
  scenarioCache.set(level, scenario);
  return scenario;
}

function wormholePredictionList(observations, level, identityKey, predictionKey, predictionType, expectedIdentities) {
  if (!closedDict(observations, ["kind", "predictions"])) return null;
  const predictions = observations.predictions;
  if (observations.kind !== `wormhole-${level}` || !Array.isArray(predictions)) return null;
  if (predictions.length !== expectedIdentities.length) return null;
  for (let index = 0; index < predictions.length; index += 1) {
    const prediction = predictions[index];
    if (!isObject(prediction) || !closedDict(prediction, [identityKey, predictionKey])) return null;
    const value = prediction[predictionKey];
    if (prediction[identityKey] !== expectedIdentities[index]
      || (predictionType === "boolean" ? typeof value !== "boolean" : typeof value !== "string")) {
      return null;
    }
  }
  return predictions;
}

function wormholeSeedMap(urls) {
  const result = new Map();
  for (const url of urls) {
    const code = wormholeCode(url);
    if (!result.has(code)) result.set(code, url);
  }
  return result;
}

function wormholeL1(observations) {
  const [urls] = wormholeScenario("L1");
  const predictions = wormholePredictionList(observations, "L1", "url", "predictedCode", "string", urls);
  if (predictions === null) return null;
  const correct = predictions.filter((item) => item.predictedCode === wormholeCode(item.url)).length;
  const accuracy = round2(correct / urls.length);
  return [accuracy >= 0.8, {
    code_predictions: urls.length,
    code_prediction_accuracy: accuracy,
    strategy: "hash_trunc",
  }];
}

function wormholeL2(observations) {
  const [urls] = wormholeScenario("L2");
  const shortMap = wormholeSeedMap(urls);
  const codes = [...shortMap.keys()];
  const predictions = wormholePredictionList(observations, "L2", "code", "predictedUrl", "string", codes);
  if (predictions === null || codes.length !== urls.length) return null;
  const correct = predictions.filter((item) => item.predictedUrl === shortMap.get(item.code)).length;
  const accuracy = round2(correct / urls.length);
  return [accuracy >= 0.8, {
    redirect_predictions: urls.length,
    redirect_prediction_accuracy: accuracy,
  }];
}

function wormholeL3(observations) {
  const [urls] = wormholeScenario("L3");
  const predictions = wormholePredictionList(observations, "L3", "url", "predictedCollision", "boolean", urls);
  if (predictions === null) return null;
  const shortMap = new Map();
  let correct = 0;
  let collisions = 0;
  for (const item of predictions) {
    const code = wormholeCode(item.url);
    const collision = shortMap.has(code) && shortMap.get(code) !== item.url;
    collisions += collision ? 1 : 0;
    correct += item.predictedCollision === collision ? 1 : 0;
    if (!shortMap.has(code)) shortMap.set(code, item.url);
  }
  const accuracy = round2(correct / urls.length);
  return [accuracy >= 0.8, {
    collision_predictions: urls.length,
    collision_prediction_accuracy: accuracy,
    collisions_present: collisions,
  }];
}

function resolveSalted(shortMap, url) {
  let attempt = 0;
  for (;;) {
    const candidate = wormholeCode(`${url}#${attempt}`);
    if (!shortMap.has(candidate) || shortMap.get(candidate) === url) return candidate;
    attempt += 1;
  }
}

function resolveIncrement(shortMap, code) {
  let value = [...code].reverse().reduce(
    (acc, character, index) => acc + ALPHABET.indexOf(character) * 62 ** index,
    0,
  );
  for (let attempt = 0; attempt < CODE_SPACE; attempt += 1) {
    const candidate = base62(value).padStart(CODE_LEN, "0").slice(0, CODE_LEN);
    if (!shortMap.has(candidate)) return candidate;
    value = (value + 1) % CODE_SPACE;
  }
  throw new Error("code space exhausted");
}

function wormholeL4(observations) {
  const [urls, colliderIndex] = wormholeScenario("L4");
  if (!closedDict(observations, ["kind", "colliderUrl", "chosenResolution"])) return null;
  const colliderUrl = urls[colliderIndex];
  const chosen = observations.chosenResolution;
  if (observations.kind !== "wormhole-L4"
    || observations.colliderUrl !== colliderUrl
    || typeof chosen !== "string"
    || !["salted", "increment"].includes(chosen)) {
    return null;
  }
  const firstUrl = urls[colliderIndex - 1];
  const collidingCode = wormholeCode(colliderUrl);
  const shortMap = new Map([[wormholeCode(firstUrl), firstUrl]]);
  const resolvedCode = chosen === "salted"
    ? resolveSalted(shortMap, colliderUrl)
    : resolveIncrement(shortMap, collidingCode);
  const resolved = !shortMap.has(resolvedCode) || shortMap.get(resolvedCode) === colliderUrl;
  shortMap.set(resolvedCode, colliderUrl);
  const redirectOk = shortMap.get(resolvedCode) === colliderUrl;
  return [resolved && redirectOk, {
    resolution_chosen: chosen,
    resolved_code: resolvedCode,
    resolved_unique: resolved,
    redirect_ok: redirectOk,
  }];
}

function evaluateWormhole(level, observations, producerMetrics, errors) {
  if (!WORMHOLE_LEVELS[level]) {
    errors.push("unsupported WORMHOLE level");
    return false;
  }
  const evaluated = { L1: wormholeL1, L2: wormholeL2, L3: wormholeL3, L4: wormholeL4 }[level](observations);
  if (evaluated === null) {
    errors.push(`observations do not match the closed ${level} scenario trace`);
    return false;
  }
  const [passed, expectedMetrics] = evaluated;
  if (!metricsMatch(producerMetrics, expectedMetrics)) {
    errors.push("producer metrics disagree with independently recomputed observations");
    return false;
  }
  return passed;
}

// --- RELAY STATION evaluator (parity with learner/gate/relay_evaluator.py) ---

const STATIONS = {
  L1: {
    "st-0": [true, "", 100],
    "st-1": [false, "", 0],
    "st-2": [true, "", 100],
    "st-3": [false, "", 0],
    "st-4": [true, "", 100],
  },
  L2: {
    "st-0": [true, "alerts", 100],
    "st-1": [true, "", 100],
    "st-2": [false, "alerts", 0],
    "st-3": [true, "alerts", 100],
    "st-4": [true, "other", 100],
  },
  L3: {
    "st-0": [true, "alerts", 200],
    "st-1": [true, "alerts", 50],
    "st-2": [true, "alerts", 190],
    "st-3": [true, "alerts", 0],
    "st-4": [true, "alerts", 195],
  },
  L4: {
    "st-0": [true, "alerts", 300],
    "st-1": [true, "alerts", 300],
    "st-2": [false, "", 0],
    "st-3": [true, "alerts", 300],
  },
};

function relayPrediction(level, observations) {
  if (!closedDict(observations, ["kind", "predictions"])) return null;
  const predictions = observations.predictions;
  const stationIds = new Set(Object.keys(STATIONS[level]));
  if (observations.kind !== `relay-${level}`
    || !Array.isArray(predictions)
    || predictions.some((item) => typeof item !== "string")
    || new Set(predictions).size !== predictions.length
    || !predictions.every((item) => stationIds.has(item))) {
    return null;
  }
  let truth;
  let label;
  if (level === "L1") {
    truth = new Set(Object.entries(STATIONS.L1).filter(([, [connected]]) => connected).map(([id]) => id));
    label = "connected";
  } else if (level === "L2") {
    truth = new Set(Object.entries(STATIONS.L2)
      .filter(([, [connected, channel]]) => connected && channel === "alerts").map(([id]) => id));
    label = "delivery";
  } else {
    truth = new Set(Object.entries(STATIONS.L3)
      .filter(([, [connected, , heartbeat]]) => connected && 200 - heartbeat <= 100).map(([id]) => id));
    label = "survivor";
  }
  const predicted = new Set(predictions);
  let overlap = 0;
  for (const id of predicted) if (truth.has(id)) overlap += 1;
  let bothAbsent = 0;
  for (const id of stationIds) if (!truth.has(id) && !predicted.has(id)) bothAbsent += 1;
  const accuracy = round2((overlap + bothAbsent) / stationIds.size);
  const metrics = {
    kind: "voxeldoj-relay-station",
    [`${label}_accuracy`]: accuracy,
    [`${label}_predicted`]: predicted.size,
    [`${label}_truth`]: truth.size,
    [`${label}_total`]: stationIds.size,
  };
  if (level === "L3") {
    metrics.missed_heartbeat_dropped = Object.values(STATIONS.L3)
      .filter(([connected, , heartbeat]) => connected && 200 - heartbeat > 100).length;
  }
  return [accuracy >= 0.8, metrics];
}

function relayRecovery(observations) {
  if (!closedDict(observations, ["kind", "reconnectedId"])) return null;
  const stationId = observations.reconnectedId;
  if (observations.kind !== "relay-L4"
    || typeof stationId !== "string"
    || !Object.prototype.hasOwnProperty.call(STATIONS.L4, stationId)) {
    return null;
  }
  const [connected] = STATIONS.L4[stationId];
  const before = new Set(Object.entries(STATIONS.L4)
    .filter(([, [itemConnected, channel]]) => itemConnected && channel === "alerts").map(([id]) => id));
  const after = new Set(before);
  after.add(stationId);
  const rejoined = !before.has(stationId);
  const wasDropped = !connected;
  return [rejoined && wasDropped, {
    kind: "voxeldoj-relay-station",
    target_correct: stationId === "st-2",
    rejoined_fanout: rejoined,
    delivered_after: after.size,
    was_dropped: wasDropped,
  }];
}

function evaluateRelay(level, observations, producerMetrics, errors) {
  if (!Object.prototype.hasOwnProperty.call(STATIONS, level)) {
    errors.push("unsupported RELAY STATION level");
    return false;
  }
  if (!isObject(observations)) {
    errors.push("observations must be a bounded object");
    return false;
  }
  const evaluated = level === "L4" ? relayRecovery(observations) : relayPrediction(level, observations);
  if (evaluated === null) {
    errors.push(`observations do not match the closed ${level} scenario trace`);
    return false;
  }
  const [passed, expectedMetrics] = evaluated;
  if (!metricsMatch(producerMetrics, expectedMetrics)) {
    errors.push("producer metrics disagree with independently recomputed observations");
    return false;
  }
  return passed;
}

// --- PIPELINE PLANT evaluator (parity with learner/gate/pipeline_evaluator.py) ---

const JOBS = {
  L1: { size: 115, capacity: 100, chunkSize: 0, drainRate: 0, timeMs: 0 },
  L2: { size: 1023, capacity: 100, chunkSize: 40, drainRate: 0, timeMs: 0 },
  L3: { size: 496, capacity: 100, chunkSize: 40, drainRate: 0, timeMs: 0 },
  L4: { size: 1308, capacity: 100, chunkSize: 40, drainRate: 0.1, timeMs: 1000 },
};

function buffered(size, capacity) {
  const overflowed = Math.max(0, size - capacity);
  return {
    delivered: Math.min(size, capacity),
    overflowed,
    peakMem: size,
  };
}

function backpressured(size, capacity, drainRate, timeMs) {
  const drained = Math.min(size, drainRate * timeMs);
  const backlog = size - drained;
  const heldInTank = Math.min(backlog, capacity);
  const overflowed = Math.max(0, backlog - capacity);
  return {
    delivered: drained + heldInTank,
    drained,
    overflowed,
    peakMem: size,
    stalled: overflowed === 0 && drained < size,
  };
}

function streaming(size, chunkSize, capacity) {
  const fullChunks = Math.floor(size / chunkSize);
  const remainder = size - fullChunks * chunkSize;
  const perChunkDelivered = Math.min(chunkSize, capacity);
  const remainderDelivered = Math.min(remainder, capacity);
  const delivered = fullChunks * perChunkDelivered + remainderDelivered;
  return {
    delivered,
    overflowed: Math.max(0, size - delivered),
    peakMem: chunkSize,
  };
}

function pipelineOverflow(level, observations) {
  if (!closedDict(observations, ["kind", "predictedOverflow"])) return null;
  const predicted = observations.predictedOverflow;
  if (observations.kind !== `pipeline-plant-${level}` || typeof predicted !== "boolean") return null;
  const job = JOBS[level];
  const truth = level === "L4"
    ? backpressured(job.size, job.capacity, job.drainRate, job.timeMs)
    : buffered(job.size, job.capacity);
  const actualOverflow = truth.overflowed > 0;
  const metrics = {
    kind: "voxeldoj-pipeline-plant",
    size: job.size,
    capacity: job.capacity,
    mode: "buffered",
    overflow_predicted: predicted,
    overflow_actual: actualOverflow,
    peak_mem: truth.peakMem,
    delivered: truth.delivered,
    overflowed: truth.overflowed,
  };
  if (level === "L4") {
    metrics.stalled = truth.stalled;
    metrics.drained = truth.drained;
    metrics.drain_rate = job.drainRate;
    metrics.time_ms = job.timeMs;
  }
  return [predicted === actualOverflow, metrics];
}

function pipelineBounded(observations) {
  if (!closedDict(observations, ["kind", "predictedBounded"])) return null;
  const predicted = observations.predictedBounded;
  if (observations.kind !== "pipeline-plant-L2" || typeof predicted !== "boolean") return null;
  const job = JOBS.L2;
  const truth = streaming(job.size, job.chunkSize, job.capacity);
  const actualBounded = truth.overflowed === 0;
  return [predicted === actualBounded && actualBounded, {
    kind: "voxeldoj-pipeline-plant",
    size: job.size,
    capacity: job.capacity,
    chunk_size: job.chunkSize,
    mode: "streaming",
    bounded_predicted: predicted,
    bounded_actual: actualBounded,
    peak_mem: truth.peakMem,
    delivered: truth.delivered,
    overflowed: truth.overflowed,
  }];
}

function pipelineChunkTune(observations) {
  if (!closedDict(observations, ["kind", "chunkSize", "predictedPeak"])) return null;
  const chunkSize = observations.chunkSize;
  const predictedPeak = observations.predictedPeak;
  if (observations.kind !== "pipeline-plant-L3"
    || !Number.isInteger(chunkSize)
    || !Number.isInteger(predictedPeak)
    || chunkSize <= 0
    || predictedPeak < 0) {
    return null;
  }
  const job = JOBS.L3;
  const truth = streaming(job.size, chunkSize, job.capacity);
  const fits = truth.overflowed === 0;
  const peakAccurate = Math.abs(predictedPeak - truth.peakMem) <= 1;
  return [fits && peakAccurate, {
    kind: "voxeldoj-pipeline-plant",
    size: job.size,
    capacity: job.capacity,
    chunk_size: chunkSize,
    mode: "streaming",
    peak_predicted: predictedPeak,
    peak_actual: truth.peakMem,
    delivered: truth.delivered,
    overflowed: truth.overflowed,
    chunk_fits: fits,
  }];
}

function evaluatePipeline(level, observations, producerMetrics, errors) {
  if (!Object.prototype.hasOwnProperty.call(JOBS, level)) {
    errors.push("unsupported PIPELINE PLANT level");
    return false;
  }
  if (!isObject(observations)) {
    errors.push("observations must be a bounded object");
    return false;
  }
  const evaluated = level === "L3"
    ? pipelineChunkTune(observations)
    : (level === "L2" ? pipelineBounded(observations) : pipelineOverflow(level, observations));
  if (evaluated === null) {
    errors.push(`observations do not match the closed ${level} scenario trace`);
    return false;
  }
  const [passed, expectedMetrics] = evaluated;
  if (!metricsMatch(producerMetrics, expectedMetrics)) {
    errors.push("producer metrics disagree with independently recomputed observations");
    return false;
  }
  return passed;
}

// --- record validation and dispatch (parity with teaching_game_bridge.py) ---

const GAME_SPECS = {
  "KV WAREHOUSE": {
    unitId: "U2-key-value-store",
    project: "02_key_value_store",
    scenarioPrefix: "kv-warehouse-",
    evaluator: evaluateWarehouse,
  },
  "WORMHOLE": {
    unitId: "U3-url-shortener",
    project: "03_url_shortener",
    scenarioPrefix: "wormhole-",
    evaluator: evaluateWormhole,
  },
  "RELAY STATION": {
    unitId: "U5-websocket-chat",
    project: "05_websocket_chat",
    scenarioPrefix: "relay-station-",
    evaluator: evaluateRelay,
  },
  "PIPELINE PLANT": {
    unitId: "U6-file-upload",
    project: "06_file_upload_pipeline",
    scenarioPrefix: "pipeline-plant-",
    evaluator: evaluatePipeline,
  },
};

const ALLOWED_KEYS = new Set([
  "source",
  "unit_id",
  "project",
  "scenario_id",
  "game",
  "ts",
  "pass",
  "metrics",
  "observations",
  "review_context",
  "curriculum_context",
]);
const OPTIONAL_KEYS = new Set(["attempt_id"]);

function validateStructure(record) {
  const errors = [];
  for (const field of ["unit_id", "project", "game", "ts", "pass"]) {
    if (!(field in record)) errors.push(`evidence missing required field '${field}'`);
  }
  if (errors.length > 0) return errors;
  if (typeof record.pass !== "boolean") errors.push("evidence field 'pass' must be a boolean");
  const metrics = record.metrics;
  if (metrics !== undefined && metrics !== null && !isObject(metrics)) {
    errors.push("evidence.metrics must be an object");
  } else if (isObject(metrics) && "kind" in metrics && !metrics.kind) {
    errors.push("evidence.metrics.kind must be a non-empty discriminator when set");
  }
  if (typeof record.ts !== "string"
    || !/^\d{4}-\d{2}-\d{2}[Tt ].*(?:[Zz]|[+-]\d{2}:?\d{2})$/.test(record.ts)
    || !Number.isFinite(Date.parse(record.ts))) {
    errors.push(`evidence ts '${record.ts}' is not a valid timezone-aware ISO-8601 timestamp`);
  }
  if ("verifier" in record) {
    errors.push(
      "embedded verifier is producer-controlled and cannot authorize mastery; "
      + "provide a separate verifier receipt",
    );
  }
  return errors;
}

function validateIdentity(record) {
  const errors = [];
  const unknown = Object.keys(record)
    .filter((key) => !ALLOWED_KEYS.has(key) && !OPTIONAL_KEYS.has(key)).sort();
  const missing = [...ALLOWED_KEYS].filter((key) => !(key in record)).sort();
  if (unknown.length > 0) errors.push(`unknown fields: ${unknown.join(", ")}`);
  if (missing.length > 0) errors.push(`missing fields: ${missing.join(", ")}`);
  const attemptId = record.attempt_id;
  if (attemptId !== undefined && attemptId !== null
    && (typeof attemptId !== "string" || attemptId === "")) {
    errors.push("attempt_id must be a non-empty string when present");
  }
  const spec = GAME_SPECS[record.game];
  if (spec === undefined) {
    errors.push("game is not supported");
    return errors;
  }
  for (const [key, value] of [["source", "voxeldojo"], ["unit_id", spec.unitId], ["project", spec.project]]) {
    if (record[key] !== value) errors.push(`${key} must be '${value}'`);
  }
  const scenarioId = record.scenario_id;
  const levels = ["L1", "L2", "L3", "L4"].map((level) => `${spec.scenarioPrefix}${level}`);
  if (typeof scenarioId !== "string" || !levels.includes(scenarioId)) {
    errors.push(`scenario_id is not a supported ${record.game} level`);
  }
  const review = record.review_context;
  if (!isObject(review) || review.verifier_required !== true) {
    errors.push("review_context.verifier_required must be true");
  }
  return errors;
}

function evaluateObservations(record, errors) {
  const spec = GAME_SPECS[record.game];
  const level = record.scenario_id.slice(spec.scenarioPrefix.length);
  return spec.evaluator(level, record.observations, record.metrics, errors);
}

function verifyTeachingGameEvidence(record) {
  const errors = validateStructure(record);
  errors.push(...validateIdentity(record));
  const independentlyPassed = errors.length === 0 ? evaluateObservations(record, errors) : false;
  const producerClaim = typeof record.pass === "boolean" ? record.pass : null;
  if (producerClaim !== null && producerClaim !== independentlyPassed) {
    errors.push("producer pass claim disagrees with the fixed independent evaluator");
  }
  const passed = independentlyPassed && errors.length === 0;
  return {
    schema_version: 1,
    verdict: passed ? "PASS" : "FAIL",
    context_isolated: true,
    source: "independent-teaching-game-verifier",
    evidence_digest: digest(record ?? {}),
    unit_id: String(record?.unit_id ?? ""),
    project: String(record?.project ?? ""),
    scenario_id: String(record?.scenario_id ?? ""),
    game: String(record?.game ?? ""),
    attempt_id: String(record?.attempt_id ?? ""),
    producer_pass_claim: producerClaim,
    independent_pass: passed,
    errors,
    producer_writes_mastered: false,
    max_producer_claim: "completed",
    canonical_gate_status: "not-submitted",
    canonical_gate_reason: "learner-attempt-and-gate-eligibility-required",
  };
}

export default async (request) => {
  const originalPath = request.headers.get("x-nf-original-path");
  const pathname = originalPath || new URL(request.url).pathname;
  const sameOrigin = request.headers.get("sec-fetch-site") === "same-origin";
  if (!sameOrigin) return json({ error: "origin-forbidden" }, 403);
  if (pathname === SESSION_PATH) {
    if (request.method !== "GET") return json({ error: "method-not-allowed" }, 405, { allow: "GET" });
    return json({ token: TOKEN }, 200, { "cross-origin-resource-policy": "same-origin" });
  }
  if (pathname !== VERIFICATION_PATH) return json({ error: "not-found" }, 404);
  if (request.method !== "POST") return json({ error: "method-not-allowed" }, 405, { allow: "POST" });
  if (!tokenMatches(request.headers.get("x-codexdojo-bridge-token"))) return json({ error: "unauthorized" }, 401);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 65_536) return json({ error: "payload-too-large" }, 413);
  let input;
  try { input = JSON.parse(raw); } catch { return json({ error: "invalid-json" }, 400); }
  if (input?.schemaId !== "teaching-game-evidence" || input?.schemaVersion !== 1
    || !input.record || typeof input.record !== "object" || Array.isArray(input.record)) {
    return json({ error: "unsupported-schema" }, 422);
  }
  return json({ receipt: verifyTeachingGameEvidence(input.record) });
};

export { verifyTeachingGameEvidence };
