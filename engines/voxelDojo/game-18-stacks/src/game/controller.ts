import { emitEvidence } from "../evidence/emit"
import { type index, type ScoredDoc, tokenize } from "../sim/index"
import {
  evaluateFiling,
  evaluateRanking,
  evaluateTopDoc,
  evaluateTwoTerm,
  LEVELS,
  type LevelConfig,
  type LevelId,
  type LevelOutcome,
  levelConfig,
  levelIndex,
  levelQueryTerms,
  levelRanking,
  shelves,
} from "../sim/levels"

export type Phase = "briefing" | "predicting" | "firing" | "cleared" | "failed"

/**
 * Live game state. The corpus + index are built once per level (deterministic); the player's
 * predictions accumulate as they click, then a level-specific `evaluate*` judges the wave.
 */
export interface GameState {
  level: LevelConfig
  phase: Phase
  /** the indexed corpus */
  docs: LevelConfig["docs"]
  /** inverted index + document count N (for idf) */
  inverted: ReturnType<typeof index>["inverted"]
  n: number
  /** ranked result of the level's query (empty for L1 which has no query) */
  ranking: ScoredDoc[]
  /** the query terms the level fires (L2+) */
  queryTerms: string[]
  /** the shelves (sorted terms) — the filing targets for L1 */
  shelves: string[]
  /** L1: word-cards the player must file */
  cards: string[]
  /** L1: per-card predictions (predicted shelf/term) */
  filingPredictions: string[]
  /** L2/L3: predicted top doc */
  predictedTop: string | null
  /** L4: predicted top-k order */
  predictedOrder: string[]
  lastMetrics: Record<string, number | boolean | string> | null
}

export type Listener = (state: GameState) => void

/** Word-cards for L1 — chosen so the tokenization lesson (lowercasing, splitting) is visible. */
const L1_CARDS = ["FOX", "Quick-Brown", "  sleeps  ", "DOG!"] as const

/**
 * STACKS state machine.
 *
 * Phases per level:
 * - L1: briefing → predicting (file each word-card onto a shelf) → cleared/failed
 * - L2: briefing → predicting (predict the top doc, then FIRE the query) → cleared/failed
 * - L3: briefing → predicting (predict the top doc for a two-term query) → cleared/failed
 * - L4: briefing → predicting (predict the full top-3 order) → cleared/failed
 *
 * The corpus, index, and ranking are all derived deterministically from the level config, so the
 * Playwright smoke can drive the public API to the exact same result a player reaches.
 */
export class GameController {
  private state: GameState
  private listeners: Listener[] = []

  constructor(level: LevelId = "L1") {
    this.state = this.freshState(levelConfig(level))
  }

  private freshState(cfg: LevelConfig): GameState {
    const { inverted, n } = levelIndex(cfg)
    return {
      level: cfg,
      phase: "briefing",
      docs: cfg.docs,
      inverted,
      n,
      ranking: levelRanking(cfg),
      queryTerms: levelQueryTerms(cfg),
      shelves: shelves(cfg),
      cards: cfg.id === "L1" ? [...L1_CARDS] : [],
      filingPredictions: [],
      predictedTop: null,
      predictedOrder: [],
      lastMetrics: null,
    }
  }

  get snapshot(): GameState {
    return this.state
  }

  subscribe(fn: Listener): void {
    this.listeners.push(fn)
    fn(this.state)
  }

  private commit(): void {
    for (const fn of this.listeners) fn(this.state)
  }

  start(): void {
    this.state.phase = "predicting"
    this.commit()
  }

  loadLevel(level: LevelId): void {
    this.state = this.freshState(levelConfig(level))
    this.commit()
  }

  nextLevel(): void {
    const idx = LEVELS.findIndex((l) => l.id === this.state.level.id)
    const next = LEVELS[idx + 1]
    if (next) this.loadLevel(next.id)
  }

  retry(): void {
    this.loadLevel(this.state.level.id)
    this.start()
  }

  // ── L1: file word-cards onto shelves ──────────────────────────────────────

  /**
   * Predict the shelf (term) for the next pending word-card. Each card is tokenized to its term;
   * a card lands on exactly one shelf.
   */
  fileCard(predictedTerm: string): void {
    if (this.state.level.id !== "L1" || this.state.phase !== "predicting") return
    if (this.state.filingPredictions.length >= this.state.cards.length) return
    this.state.filingPredictions.push(predictedTerm)
    if (this.state.filingPredictions.length >= this.state.cards.length) {
      const out = evaluateFiling({
        cards: this.state.cards,
        predictions: this.state.filingPredictions,
      })
      this.finish(out)
      return
    }
    this.commit()
  }

  // ── L2 / L3: predict the top doc, then fire the query ─────────────────────

  /** Record the predicted top document (L2 single-term, L3 two-term). */
  predictTop(docId: string): void {
    if (this.state.phase !== "predicting") return
    if (this.state.level.id !== "L2" && this.state.level.id !== "L3") return
    this.state.predictedTop = docId
    this.state.phase = "firing"
    const fn = this.state.level.id === "L2" ? evaluateTopDoc : evaluateTwoTerm
    const out = fn({
      docs: this.state.docs,
      terms: this.state.queryTerms,
      predictedTop: docId,
    })
    this.finish(out)
  }

  // ── L4: predict the full top-k order ──────────────────────────────────────

  /**
   * Add a document to the predicted ranking (L4). Documents are appended in the order clicked;
   * the prediction is judged once `topK` documents are chosen.
   */
  predictRank(docId: string): void {
    if (this.state.level.id !== "L4" || this.state.phase !== "predicting") return
    if (this.state.predictedOrder.includes(docId)) return
    this.state.predictedOrder.push(docId)
    const topK = 3
    if (this.state.predictedOrder.length >= topK) {
      const out = evaluateRanking({
        docs: this.state.docs,
        terms: this.state.queryTerms,
        predictedOrder: this.state.predictedOrder,
        topK,
      })
      this.finish(out)
      return
    }
    this.commit()
  }

  /** Remove the last predicted rank entry (let the player re-order before locking in). */
  undoRank(): void {
    if (this.state.level.id !== "L4" || this.state.phase !== "predicting") return
    this.state.predictedOrder.pop()
    this.commit()
  }

  // ── ground truth (HUD hints + smoke hook) ─────────────────────────────────

  /** Ground-truth top document for the level's query (test hook + HUD hint). */
  topDocId(): string | null {
    return this.state.ranking[0]?.docId ?? null
  }

  /** Ground-truth full ranking (test hook + HUD hint). */
  fullRanking(): ScoredDoc[] {
    return this.state.ranking
  }

  /** Ground-truth shelf (tokenized term) for a word-card (L1 test hook + HUD hint). */
  cardTruth(card: string): string {
    return tokenize(card)[0] ?? ""
  }

  /** Filing predictions so far (L1). */
  filingProgress(): { cards: string[]; predictions: string[] } {
    return { cards: this.state.cards, predictions: this.state.filingPredictions }
  }

  private finish(out: LevelOutcome): void {
    this.state.lastMetrics = out.metrics
    this.state.phase = out.pass ? "cleared" : "failed"
    emitEvidence(this.state.level.id, out.pass, out.metrics)
    this.commit()
  }
}
