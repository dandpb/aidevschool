import type {
  AssetManifest,
  ContentPack,
  EncounterDefinition,
  EvidenceContract,
  Position,
  Region,
  RegionGate,
  RegionMap,
  RegionNpc,
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

function readEvidenceContract(raw: unknown, path: string, issues: string[]): EvidenceContract {
  const value = readRecord(raw, path, issues)
  const kind = readString(value, `${path}.kind`, issues)
  if (kind !== "pixelquest-token-bucket") {
    issues.push(`${path}.kind must be pixelquest-token-bucket`)
  }
  return {
    kind: "pixelquest-token-bucket",
    minGoodAdmits: readNumber(value, `${path}.minGoodAdmits`, issues),
    maxAbusiveAdmitted: readNumber(value, `${path}.maxAbusiveAdmitted`, issues),
    maxObservedRateMultiplier: readNumber(value, `${path}.maxObservedRateMultiplier`, issues),
  }
}

function readEncounter(raw: unknown, path: string, issues: string[]): EncounterDefinition {
  const value = readRecord(raw, path, issues)
  const kind = readString(value, `${path}.kind`, issues)
  if (kind !== "token_bucket") {
    issues.push(`${path}.kind must be token_bucket`)
  }
  return readTokenBucketEncounter(value, path, issues)
}

function readTokenBucketEncounter(
  value: Record<string, unknown>,
  path: string,
  issues: string[],
): TokenBucketEncounter {
  return {
    id: readString(value, `${path}.id`, issues),
    kind: "token_bucket",
    title: readString(value, `${path}.title`, issues),
    unit_id: readString(value, `${path}.unit_id`, issues),
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

function readRequest(raw: unknown, path: string, issues: string[]): TokenBucketRequest {
  const value = readRecord(raw, path, issues)
  const type = readString(value, `${path}.type`, issues)
  if (type !== "legit" && type !== "abuse") {
    issues.push(`${path}.type must be legit or abuse`)
  }
  return {
    type: type === "abuse" ? "abuse" : "legit",
    at: readNumber(value, `${path}.at`, issues),
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
  return {
    id: readString(value, `${path}.id`, issues),
    position: readPosition(value["position"], `${path}.position`, issues),
    requiresUnitId: readString(value, `${path}.requiresUnitId`, issues),
    lockedLabel: readString(value, `${path}.lockedLabel`, issues),
    unlockedLabel: readString(value, `${path}.unlockedLabel`, issues),
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
