import {
  forgeWithSecret,
  hmacSign,
  hmacVerify,
  type Layer,
  type PipelineResult,
  type Request,
  runPipeline,
  tamperPayload,
  tamperSignature,
} from "./middleware"
import { mulberry32 } from "./rng"

export type LevelId = "L1" | "L2" | "L3" | "L4"

/** What a player is asked to predict for one request. */
export type PredictionTarget = "reaches-handler" | "logging" | "auth" | "rate-limit"

/** A scripted request in a wave, paired with its ground-truth pipeline outcome. */
export interface WaveRequest {
  index: number
  label: string
  request: Request
  truth: PipelineResult
  /** the prediction target a correct player would state. */
  answer: PredictionTarget
}

/** The L4 reorder task: an ordered layer list the player must re-arrange. */
export interface ReorderTask {
  /** layer names in the starting (scrambled) order */
  given: string[]
  /** layer names in the canonical order the player must produce */
  target: string[]
  /** a request whose reject point changes when the order changes */
  probe: Request
}

export interface LevelConfig {
  id: LevelId
  title: string
  lesson: string
  /** deterministic seed for the wave's request stream */
  seed: number
  /** shared signing secret for this level's auth wall */
  secret: string
  /** rate-limit cap for this level's stack */
  rateCap: number
  /** how many requests the player predicts in the wave */
  waveSize: number
  /** L4: the reorder task (null on L1–L3) */
  reorder: ReorderTask | null
  passRule: string
}

const SECRET = "city-gate-secret"

export const LEVELS: readonly LevelConfig[] = [
  {
    id: "L1",
    title: "Through the walls",
    lesson:
      "A request walks the walls in order — logging, auth, rate-limit — and reaches the citadel only if every layer passes.",
    seed: 11,
    secret: SECRET,
    rateCap: 20,
    waveSize: 8,
    reorder: null,
    passRule:
      "Predict the gate each request passes: 'reaches the handler' when nothing rejects it.",
  },
  {
    id: "L2",
    title: "Forged badge",
    lesson:
      "The auth wall checks the JWT's HMAC-SHA256 signature against the secret — not just that a token is present. A tampered badge never matches the seal.",
    seed: 22,
    secret: SECRET,
    rateCap: 20,
    waveSize: 8,
    reorder: null,
    passRule: "Predict 'auth' for forged/tampered tokens and 'reaches the handler' for valid ones.",
  },
  {
    id: "L3",
    title: "Rate limit",
    lesson:
      "After N requests pass, the (N+1)th is turned back at the rate-limit wall. Counting and the threshold decide who is bounced.",
    seed: 33,
    secret: SECRET,
    rateCap: 5,
    waveSize: 8,
    reorder: null,
    passRule: "Predict 'rate-limit' for the (cap+1)th request and beyond.",
  },
  {
    id: "L4",
    title: "Order matters",
    lesson:
      "A reject earlier in the stack masks every later layer. Reorder the walls and the reject point moves.",
    seed: 44,
    secret: SECRET,
    rateCap: 0,
    waveSize: 4,
    reorder: {
      // given scrambled; the player must restore logging → auth → rate-limit
      given: ["rate-limit", "logging", "auth"],
      target: ["logging", "auth", "rate-limit"],
      // a forged token: under the GIVEN order rate-limit (cap 0) rejects first; under the TARGET
      // order auth rejects — so reordering visibly changes the reject point.
      probe: { id: "probe", token: forgeWithSecret({ sub: "spy" }, "wrong-secret") },
    },
    passRule:
      "Restore the wall order (logging → auth → rate-limit), then predict the probe's reject point under it.",
  },
] as const

export function levelConfig(id: LevelId): LevelConfig {
  const cfg = LEVELS.find((l) => l.id === id)
  if (!cfg) throw new Error(`unknown level ${id}`)
  return cfg
}

// ── layer construction (rate-limit counter is fresh per stack) ─────────────

function loggingLayer(): Layer {
  return { name: "logging", check: () => "pass" }
}

function authLayer(secret: string): Layer {
  return {
    name: "auth",
    check: (req) => {
      if (req.token === null) return "reject"
      return hmacVerify(req.token, secret) ? "pass" : "reject"
    },
  }
}

function rateLimitLayer(cap: number): Layer {
  let count = 0
  return {
    name: "rate-limit",
    check: () => {
      count += 1
      return count > cap ? "reject" : "pass"
    },
  }
}

/**
 * Build a fresh Layer stack in `order` from the three wall names. The canonical order is
 * `["logging","auth","rate-limit"]` (outer → inner). Used to evaluate predictions against the
 * ground truth; the controller also uses it to drive the scene.
 */
export function buildLayers(secret: string, rateCap: number, order: string[]): Layer[] {
  const byName: Record<string, Layer> = {
    logging: loggingLayer(),
    auth: authLayer(secret),
    "rate-limit": rateLimitLayer(rateCap),
  }
  return order.map((n) => byName[n] ?? loggingLayer())
}

// ── wave generation (deterministic per level seed) ─────────────────────────

const CANONICAL_ORDER = ["logging", "auth", "rate-limit"]

/**
 * Generate the deterministic wave of requests for a level, each paired with its ground-truth
 * pipeline outcome. L1/L2 run each request through a FRESH stack (rate-limit never accumulates);
 * L3 runs the whole wave through ONE shared stack so the cumulative counter is the lesson;
 * L4 is the reorder task + a few probes under the canonical order.
 */
export function buildWave(cfg: LevelConfig): WaveRequest[] {
  const rng = mulberry32(cfg.seed)
  const out: WaveRequest[] = []

  if (cfg.id === "L1") {
    for (let i = 0; i < cfg.waveSize; i++) {
      const token = hmacSign({ sub: `u${i}`, i }, cfg.secret)
      const req: Request = { id: `req-${i}`, token }
      const truth = runPipeline(buildLayers(cfg.secret, cfg.rateCap, CANONICAL_ORDER), req)
      out.push({ index: i, label: "valid token", request: req, truth, answer: "reaches-handler" })
    }
    return out
  }

  if (cfg.id === "L2") {
    for (let i = 0; i < cfg.waveSize; i++) {
      const kind = Math.floor(rng() * 3) // 0 valid, 1 tampered-sig, 2 forged/payload
      const base = hmacSign({ sub: `u${i}`, i }, cfg.secret)
      let token: string
      let label: string
      let answer: PredictionTarget
      if (kind === 0) {
        token = base
        label = "valid token"
        answer = "reaches-handler"
      } else if (kind === 1) {
        token = tamperSignature(base)
        label = "tampered signature"
        answer = "auth"
      } else {
        token =
          i % 2 === 0
            ? forgeWithSecret({ sub: `u${i}` }, "attacker-secret")
            : tamperPayload(base, "role", "admin")
        label = i % 2 === 0 ? "foreign-secret token" : "tampered payload"
        answer = "auth"
      }
      const req: Request = { id: `req-${i}`, token }
      const truth = runPipeline(buildLayers(cfg.secret, cfg.rateCap, CANONICAL_ORDER), req)
      out.push({ index: i, label, request: req, truth, answer })
    }
    return out
  }

  if (cfg.id === "L3") {
    // shared stack so the rate-limit counter accumulates across the wave
    const stack = buildLayers(cfg.secret, cfg.rateCap, CANONICAL_ORDER)
    for (let i = 0; i < cfg.waveSize; i++) {
      const token = hmacSign({ sub: `u${i}`, i }, cfg.secret)
      const req: Request = { id: `req-${i}`, token }
      const truth = runPipeline(stack, req)
      out.push({
        index: i,
        label:
          i < cfg.rateCap ? `valid (under cap ${cfg.rateCap})` : `valid (over cap ${cfg.rateCap})`,
        request: req,
        truth,
        answer: truth.reachedHandler ? "reaches-handler" : "rate-limit",
      })
    }
    return out
  }

  // L4 — reorder task + probes under the canonical order
  const task = cfg.reorder
  if (!task) return out
  const correctStack = buildLayers(cfg.secret, cfg.rateCap, task.target)
  const probeTruth = runPipeline(correctStack, task.probe)
  out.push({
    index: 0,
    label: "probe (forged token) under the order you chose",
    request: task.probe,
    truth: probeTruth,
    answer: (probeTruth.rejectedAt ?? "reaches-handler") as PredictionTarget,
  })
  const extras: Request[] = [
    { id: "e1", token: hmacSign({ sub: "good" }, cfg.secret) },
    { id: "e2", token: forgeWithSecret({ sub: "bad" }, "x") },
    { id: "e3", token: hmacSign({ sub: "good2" }, cfg.secret) },
  ]
  for (let i = 0; i < extras.length; i++) {
    const req = extras[i] as Request
    const t = runPipeline(buildLayers(cfg.secret, cfg.rateCap, task.target), req)
    out.push({
      index: i + 1,
      label: req.id,
      request: req,
      truth: t,
      answer: (t.rejectedAt ?? "reaches-handler") as PredictionTarget,
    })
  }
  return out
}

// ── evaluation ─────────────────────────────────────────────────────────────

export interface WaveOutcome {
  pass: boolean
  metrics: Record<string, number | boolean | string>
}

/** L1/L2/L3: prediction accuracy across the wave. ≥ 80% clears. */
export function evaluatePredictions(
  wave: WaveRequest[],
  predictions: PredictionTarget[],
): WaveOutcome {
  let correct = 0
  for (let i = 0; i < wave.length; i++) {
    if (predictions[i] === wave[i]?.answer) correct++
  }
  const accuracy = wave.length === 0 ? 0 : correct / wave.length
  const reachedHandlerCount = wave.filter((w) => w.answer === "reaches-handler").length
  const lastAnswer = wave[wave.length - 1]?.answer ?? ""
  return {
    pass: accuracy >= 0.8,
    metrics: {
      predictions: wave.length,
      prediction_accuracy: round2(accuracy),
      correct_predictions: correct,
      reached_handler: reachedHandlerCount > 0,
      rejected_at: lastAnswer,
    },
  }
}

/**
 * L4: the reorder must be exactly the target order AND the probe prediction must match the
 * outcome under that order. A correct order proves the player knows the canonical stack; a
 * correct probe prediction proves they understand "a reject earlier masks later layers."
 */
export function evaluateReorder(args: {
  task: ReorderTask
  playerOrder: string[]
  probePrediction: PredictionTarget
}): WaveOutcome {
  const orderCorrect = args.playerOrder.join(",") === args.task.target.join(",")
  const correctStack = buildLayers(SECRET, 0, args.task.target)
  const probeTruth = runPipeline(correctStack, args.task.probe)
  const expected = (probeTruth.rejectedAt ?? "reaches-handler") as PredictionTarget
  const probeCorrect = args.probePrediction === expected
  return {
    pass: orderCorrect && probeCorrect,
    metrics: {
      reorder_correct: orderCorrect,
      given_order: args.task.given.join(","),
      player_order: args.playerOrder.join(","),
      target_order: args.task.target.join(","),
      probe_prediction_ok: probeCorrect,
      probe_answer: expected,
    },
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
