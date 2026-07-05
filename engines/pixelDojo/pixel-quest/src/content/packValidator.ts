import type {
  AssetManifest,
  ContentPack,
  EncounterDefinition,
  EvidenceContract,
  PolicyCheck,
  PolicyGateEncounter,
  Position,
  Region,
  RegionGate,
  RegionMap,
  RegionNpc,
  RouteCheck,
  RouteHealthEncounter,
  SequenceEncounter,
  SequenceStep,
  TileCode,
  TokenBucketEncounter,
  TokenBucketRequest,
  UnitDefinition,
} from "./types"
import { tileLegend } from "./types"

export class PackValidationError extends Error {
  readonly issues: readonly string[]

  constructor(issues: readonly string[]) {
    super(`Invalid content pack: ${issues.join("; ")}`)
    this.name = "PackValidationError"
    this.issues = issues
  }
}

export function validateContentPack(raw: unknown): ContentPack {
  const issues: string[] = []
  const root = readRecord(raw, "pack", issues)
  const pack: ContentPack = {
    id: readString(root, "id", issues),
    version: readString(root, "version", issues),
    title: readString(root, "title", issues),
    regions: readArray(root, "regions", issues).map((region, index) =>
      readRegion(region, `regions[${index}]`, issues),
    ),
    units: readArray(root, "units", issues).map((unit, index) =>
      readUnit(unit, `units[${index}]`, issues),
    ),
    encounters: readArray(root, "encounters", issues).map((encounter, index) =>
      readEncounter(encounter, `encounters[${index}]`, issues),
    ),
    assets: readAssets(root["assets"], "assets", issues),
  }
  validateReferences(pack, issues)
  if (issues.length > 0) {
    throw new PackValidationError(issues)
  }
  return pack
}

function readRegion(raw: unknown, path: string, issues: string[]): Region {
  const value = readRecord(raw, path, issues)
  return {
    id: readString(value, `${path}.id`, issues),
    name: readString(value, `${path}.name`, issues),
    project: readString(value, `${path}.project`, issues),
    start: readPosition(value["start"], `${path}.start`, issues),
    map: readMap(value["map"], `${path}.map`, issues),
    npcs: readArray(value, "npcs", issues, path).map((npc, index) =>
      readNpc(npc, `${path}.npcs[${index}]`, issues),
    ),
    gates: readArray(value, "gates", issues, path).map((gate, index) =>
      readGate(gate, `${path}.gates[${index}]`, issues),
    ),
  }
}

function readUnit(raw: unknown, path: string, issues: string[]): UnitDefinition {
  const value = readRecord(raw, path, issues)
  return {
    unit_id: readString(value, `${path}.unit_id`, issues),
    project: readString(value, `${path}.project`, issues),
    concept: readString(value, `${path}.concept`, issues),
    prerequisites: readStringList(value["prerequisites"], `${path}.prerequisites`, issues),
    encounter_ids: readStringList(value["encounter_ids"], `${path}.encounter_ids`, issues),
    evidence_contract: readEvidenceContract(
      value["evidence_contract"],
      `${path}.evidence_contract`,
      issues,
    ),
  }
}

type EvidenceContractReader = (
  value: Record<string, unknown>,
  path: string,
  issues: string[],
) => EvidenceContract

const readTokenBucketEvidenceContract: EvidenceContractReader = (value, path, issues) => ({
  kind: "pixelquest-token-bucket",
  minGoodAdmits: readNumber(value, `${path}.minGoodAdmits`, issues),
  maxAbusiveAdmitted: readNumber(value, `${path}.maxAbusiveAdmitted`, issues),
  maxObservedRateMultiplier: readNumber(value, `${path}.maxObservedRateMultiplier`, issues),
})

// One reader per EvidenceContract["kind"] tag. Adding a new kind = one entry
// here. Unknown kinds fall through to the issue push below — they no longer
// silently substitute the token-bucket shape (which would have validated as
// "well-formed" with all-zero thresholds, a free PASS).
const EVIDENCE_CONTRACT_READERS: Record<string, EvidenceContractReader> = {
  "pixelquest-token-bucket": readTokenBucketEvidenceContract,
  "pixelquest-route-health": (value, path, issues) => ({
    kind: "pixelquest-route-health",
    minRouted: readNumber(value, `${path}.minRouted`, issues),
    maxBadRoutes: readNumber(value, `${path}.maxBadRoutes`, issues),
  }),
  "pixelquest-policy-gate": (value, path, issues) => ({
    kind: "pixelquest-policy-gate",
    minAllowed: readNumber(value, `${path}.minAllowed`, issues),
    maxPolicyLeaks: readNumber(value, `${path}.maxPolicyLeaks`, issues),
  }),
  "pixelquest-sequence-flow": (value, path, issues) => ({
    kind: "pixelquest-sequence-flow",
    minAdvanced: readNumber(value, `${path}.minAdvanced`, issues),
    maxGuardsMissed: readNumber(value, `${path}.maxGuardsMissed`, issues),
  }),
}

function readEvidenceContract(raw: unknown, path: string, issues: string[]): EvidenceContract {
  const value = readRecord(raw, path, issues)
  const kind = readString(value, `${path}.kind`, issues)
  const reader = EVIDENCE_CONTRACT_READERS[kind]
  if (reader === undefined) {
    issues.push(`${path}.kind must be ${Object.keys(EVIDENCE_CONTRACT_READERS).join(", ")}`)
    // Return a token-bucket-shaped placeholder so the rest of validation
    // still runs (we want every issue surfaced in one pass); the caller
    // already sees the unknown-kind issue and will throw.
    return readTokenBucketEvidenceContract(value, path, issues)
  }
  return reader(value, path, issues)
}

function readEncounter(raw: unknown, path: string, issues: string[]): EncounterDefinition {
  const value = readRecord(raw, path, issues)
  const kind = readString(value, `${path}.kind`, issues)
  if (kind === "sequence_flow") {
    return readSequenceEncounter(value, path, issues)
  }
  if (kind === "route_health") {
    return readRouteHealthEncounter(value, path, issues)
  }
  if (kind === "policy_gate") {
    return readPolicyGateEncounter(value, path, issues)
  }
  if (kind !== "token_bucket") {
    issues.push(`${path}.kind must be token_bucket, sequence_flow, route_health, or policy_gate`)
  }
  return readTokenBucketEncounter(value, path, issues)
}

function readTokenBucketEncounter(
  value: Record<string, unknown>,
  path: string,
  issues: string[],
): TokenBucketEncounter {
  return {
    ...readBaseEncounter(value, path, "token_bucket", issues),
    capacity: readNumber(value, `${path}.capacity`, issues),
    refillRate: readNumber(value, `${path}.refillRate`, issues),
    targetRate: readNumber(value, `${path}.targetRate`, issues),
    heatMax: readNumber(value, `${path}.heatMax`, issues),
    heatPerLegitAdmit: readNumber(value, `${path}.heatPerLegitAdmit`, issues),
    heatPerAbuseAdmit: readNumber(value, `${path}.heatPerAbuseAdmit`, issues),
    requests: readArray(value, "requests", issues, path).map((request, index) =>
      readRequest(request, `${path}.requests[${index}]`, issues),
    ),
  }
}

function readBaseEncounter(
  value: Record<string, unknown>,
  path: string,
  kind: "token_bucket",
  issues: string[],
): Omit<
  TokenBucketEncounter,
  | "capacity"
  | "refillRate"
  | "targetRate"
  | "heatMax"
  | "heatPerLegitAdmit"
  | "heatPerAbuseAdmit"
  | "requests"
>
function readBaseEncounter(
  value: Record<string, unknown>,
  path: string,
  kind: "sequence_flow",
  issues: string[],
): Omit<SequenceEncounter, "steps" | "minAdvanced" | "maxGuardsMissed">
function readBaseEncounter(
  value: Record<string, unknown>,
  path: string,
  kind: "route_health",
  issues: string[],
): Omit<RouteHealthEncounter, "checks" | "minRouted" | "maxBadRoutes">
function readBaseEncounter(
  value: Record<string, unknown>,
  path: string,
  kind: "policy_gate",
  issues: string[],
): Omit<PolicyGateEncounter, "checks" | "minAllowed" | "maxPolicyLeaks">
function readBaseEncounter(
  value: Record<string, unknown>,
  path: string,
  kind: "token_bucket" | "sequence_flow" | "route_health" | "policy_gate",
  issues: string[],
) {
  return {
    id: readString(value, `${path}.id`, issues),
    kind,
    title: readString(value, `${path}.title`, issues),
    unit_id: readString(value, `${path}.unit_id`, issues),
    project: readString(value, `${path}.project`, issues),
    concept: readString(value, `${path}.concept`, issues),
    mechanicName: readString(value, `${path}.mechanicName`, issues),
    resourceName: readString(value, `${path}.resourceName`, issues),
    goodRequestLabel: readString(value, `${path}.goodRequestLabel`, issues),
    badRequestLabel: readString(value, `${path}.badRequestLabel`, issues),
    admitActionLabel: readString(value, `${path}.admitActionLabel`, issues),
    rejectActionLabel: readString(value, `${path}.rejectActionLabel`, issues),
    practiceTitle: readString(value, `${path}.practiceTitle`, issues),
    practiceText: readString(value, `${path}.practiceText`, issues),
  }
}

function readRequest(raw: unknown, path: string, issues: string[]): TokenBucketRequest {
  const value = readRecord(raw, path, issues)
  const type = readString(value, `${path}.type`, issues)
  if (type !== "legit" && type !== "abuse") {
    issues.push(`${path}.type must be legit or abuse`)
  }
  const request: TokenBucketRequest = {
    type: type === "abuse" ? "abuse" : "legit",
    at: readNumber(value, `${path}.at`, issues),
  }
  const label = readOptionalString(value, `${path}.label`, issues)
  if (label === undefined) {
    return request
  }
  return {
    ...request,
    label,
  }
}

function readSequenceEncounter(
  value: Record<string, unknown>,
  path: string,
  issues: string[],
): SequenceEncounter {
  return {
    ...readBaseEncounter(value, path, "sequence_flow", issues),
    steps: readArray(value, "steps", issues, path).map((step, index) =>
      readSequenceStep(step, `${path}.steps[${index}]`, issues),
    ),
    minAdvanced: readNumber(value, `${path}.minAdvanced`, issues),
    maxGuardsMissed: readNumber(value, `${path}.maxGuardsMissed`, issues),
  }
}

function readSequenceStep(raw: unknown, path: string, issues: string[]): SequenceStep {
  const value = readRecord(raw, path, issues)
  const type = readString(value, `${path}.type`, issues)
  if (type !== "advance" && type !== "guard") {
    issues.push(`${path}.type must be advance or guard`)
  }
  return {
    type: type === "guard" ? "guard" : "advance",
    label: readString(value, `${path}.label`, issues),
  }
}

function readRouteHealthEncounter(
  value: Record<string, unknown>,
  path: string,
  issues: string[],
): RouteHealthEncounter {
  return {
    ...readBaseEncounter(value, path, "route_health", issues),
    checks: readArray(value, "checks", issues, path).map((check, index) =>
      readRouteCheck(check, `${path}.checks[${index}]`, issues),
    ),
    minRouted: readNumber(value, `${path}.minRouted`, issues),
    maxBadRoutes: readNumber(value, `${path}.maxBadRoutes`, issues),
  }
}

function readRouteCheck(raw: unknown, path: string, issues: string[]): RouteCheck {
  const value = readRecord(raw, path, issues)
  const type = readString(value, `${path}.type`, issues)
  if (type !== "healthy" && type !== "unhealthy") {
    issues.push(`${path}.type must be healthy or unhealthy`)
  }
  return {
    type: type === "unhealthy" ? "unhealthy" : "healthy",
    label: readString(value, `${path}.label`, issues),
  }
}

function readPolicyGateEncounter(
  value: Record<string, unknown>,
  path: string,
  issues: string[],
): PolicyGateEncounter {
  return {
    ...readBaseEncounter(value, path, "policy_gate", issues),
    checks: readArray(value, "checks", issues, path).map((check, index) =>
      readPolicyCheck(check, `${path}.checks[${index}]`, issues),
    ),
    minAllowed: readNumber(value, `${path}.minAllowed`, issues),
    maxPolicyLeaks: readNumber(value, `${path}.maxPolicyLeaks`, issues),
  }
}

function readPolicyCheck(raw: unknown, path: string, issues: string[]): PolicyCheck {
  const value = readRecord(raw, path, issues)
  const type = readString(value, `${path}.type`, issues)
  if (type !== "allowed" && type !== "denied") {
    issues.push(`${path}.type must be allowed or denied`)
  }
  return {
    type: type === "denied" ? "denied" : "allowed",
    label: readString(value, `${path}.label`, issues),
    scope: readString(value, `${path}.scope`, issues),
  }
}

function readNpc(raw: unknown, path: string, issues: string[]): RegionNpc {
  const value = readRecord(raw, path, issues)
  return {
    id: readString(value, `${path}.id`, issues),
    name: readString(value, `${path}.name`, issues),
    role: readString(value, `${path}.role`, issues),
    position: readPosition(value["position"], `${path}.position`, issues),
    dialogueRef: readString(value, `${path}.dialogueRef`, issues),
    encounterId: readString(value, `${path}.encounterId`, issues),
  }
}

function readGate(raw: unknown, path: string, issues: string[]): RegionGate {
  const value = readRecord(raw, path, issues)
  const nextRegionId = readOptionalString(value, `${path}.nextRegionId`, issues)
  const gate = {
    id: readString(value, `${path}.id`, issues),
    position: readPosition(value["position"], `${path}.position`, issues),
    requiresUnitId: readString(value, `${path}.requiresUnitId`, issues),
    lockedLabel: readString(value, `${path}.lockedLabel`, issues),
    unlockedLabel: readString(value, `${path}.unlockedLabel`, issues),
  }
  if (nextRegionId === undefined) {
    return gate
  }
  return {
    ...gate,
    nextRegionId,
  }
}

function readMap(raw: unknown, path: string, issues: string[]): RegionMap {
  const value = readRecord(raw, path, issues)
  const width = readNumber(value, `${path}.width`, issues)
  const height = readNumber(value, `${path}.height`, issues)
  const tiles = readStringList(value["tiles"], `${path}.tiles`, issues)
  if (Number.isInteger(width) && Number.isInteger(height) && tiles.length !== height) {
    issues.push(`${path}.tiles must contain exactly ${height} rows`)
  }
  for (const [rowIndex, row] of tiles.entries()) {
    if (row.length !== width) {
      issues.push(`${path}.tiles[${rowIndex}] must be ${width} chars wide`)
    }
    for (const code of row) {
      if (!isTileCode(code)) {
        issues.push(`${path}.tiles[${rowIndex}] has unknown tile ${code}`)
      }
    }
  }
  return { width, height, tiles }
}

function readAssets(raw: unknown, path: string, issues: string[]): AssetManifest {
  const value = readRecord(raw, path, issues)
  return {
    tiles: readStringList(value["tiles"], `${path}.tiles`, issues),
    sprites: readStringList(value["sprites"], `${path}.sprites`, issues),
    audio: readStringList(value["audio"], `${path}.audio`, issues),
  }
}

function readPosition(raw: unknown, path: string, issues: string[]): Position {
  const value = readRecord(raw, path, issues)
  return {
    x: readNumber(value, `${path}.x`, issues),
    y: readNumber(value, `${path}.y`, issues),
  }
}

function validateReferences(pack: ContentPack, issues: string[]): void {
  const unitIds = new Set(pack.units.map((unit) => unit.unit_id))
  const encounterIds = new Set(pack.encounters.map((encounter) => encounter.id))
  for (const unit of pack.units) {
    for (const prerequisite of unit.prerequisites) {
      if (!unitIds.has(prerequisite)) {
        issues.push(`unit ${unit.unit_id} has unknown prerequisite ${prerequisite}`)
      }
    }
    for (const encounterId of unit.encounter_ids) {
      if (!encounterIds.has(encounterId)) {
        issues.push(`unit ${unit.unit_id} has unknown encounter ${encounterId}`)
      }
    }
  }
  for (const encounter of pack.encounters) {
    if (!unitIds.has(encounter.unit_id)) {
      issues.push(`encounter ${encounter.id} points to unknown unit ${encounter.unit_id}`)
    }
  }
  for (const region of pack.regions) {
    for (const npc of region.npcs) {
      if (!encounterIds.has(npc.encounterId)) {
        issues.push(`npc ${npc.id} points to unknown encounter ${npc.encounterId}`)
      }
    }
    for (const gate of region.gates) {
      if (!unitIds.has(gate.requiresUnitId)) {
        issues.push(`gate ${gate.id} points to unknown unit ${gate.requiresUnitId}`)
      }
      if (
        gate.nextRegionId !== undefined &&
        !pack.regions.some((candidate) => candidate.id === gate.nextRegionId)
      ) {
        issues.push(`gate ${gate.id} points to unknown next region ${gate.nextRegionId}`)
      }
    }
  }
}

function readRecord(raw: unknown, path: string, issues: string[]): Record<string, unknown> {
  if (!isRecord(raw)) {
    issues.push(`${path} must be an object`)
    return {}
  }
  return raw
}

function readArray(
  raw: Record<string, unknown>,
  key: string,
  issues: string[],
  parentPath = "pack",
): readonly unknown[] {
  const value = raw[key]
  if (!Array.isArray(value)) {
    issues.push(`${parentPath}.${key} must be an array`)
    return []
  }
  return value
}

function readString(raw: Record<string, unknown>, path: string, issues: string[]): string {
  const key = path.split(".").at(-1)
  const value = key === undefined ? undefined : raw[key]
  if (typeof value !== "string" || value.trim() === "") {
    issues.push(`${path} must be a non-empty string`)
    return ""
  }
  return value
}

function readOptionalString(
  raw: Record<string, unknown>,
  path: string,
  issues: string[],
): string | undefined {
  const key = path.split(".").at(-1)
  const value = key === undefined ? undefined : raw[key]
  if (value === undefined) {
    return undefined
  }
  if (typeof value !== "string" || value.trim() === "") {
    issues.push(`${path} must be a non-empty string when provided`)
    return undefined
  }
  return value
}

function readNumber(raw: Record<string, unknown>, path: string, issues: string[]): number {
  const key = path.split(".").at(-1)
  const value = key === undefined ? undefined : raw[key]
  if (typeof value !== "number" || !Number.isFinite(value)) {
    issues.push(`${path} must be a finite number`)
    return 0
  }
  return value
}

function readStringList(raw: unknown, path: string, issues: string[]): readonly string[] {
  if (!Array.isArray(raw)) {
    issues.push(`${path} must be an array`)
    return []
  }
  const values: string[] = []
  for (const [index, value] of raw.entries()) {
    if (typeof value !== "string" || value.trim() === "") {
      issues.push(`${path}[${index}] must be a non-empty string`)
    } else {
      values.push(value)
    }
  }
  return values
}

function isRecord(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw)
}

function isTileCode(value: string): value is TileCode {
  return Object.hasOwn(tileLegend, value)
}
