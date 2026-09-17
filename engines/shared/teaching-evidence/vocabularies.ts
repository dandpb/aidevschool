/**
 * The TS-side loader for the single vocabulary authority
 * (vocabularies/{surfaces,literacy,os}.json — 2026-09-13 emitter
 * consolidation). JSON so both this package and the plain-`.mjs` tooling
 * (collector tables via refresh_vocabularies.mjs, drift monitor) consume the
 * same files without a build step. Structural invariants (duplicate keys,
 * table↔eventNames coverage) are enforced by the loader pair
 * learner/gate/analytics/refresh_vocabularies.mjs +
 * learner/gate/tests/dojo_analytics_vocabularies.test.mjs, which locks total
 * JSON↔collector equality.
 *
 * Producers without a dependency edge on @aidevschool/evidence (literacyDojo,
 * codexdojo-os-prototype) read the same JSON files through their established
 * cross-tree relative import precedent instead of this module.
 */

import literacyJson from "./vocabularies/literacy.json" with { type: "json" };
import osJson from "./vocabularies/os.json" with { type: "json" };
import surfacesJson from "./vocabularies/surfaces.json" with { type: "json" };

export type SurfacesVocabulary = {
  readonly sources: readonly string[];
  readonly eventNames: readonly string[];
  readonly eventProps: Readonly<Record<string, readonly string[]>>;
  readonly resultValues: readonly string[];
};

export type LiteracyVocabulary = {
  readonly eventNames: readonly string[];
  readonly eventProps: Readonly<Record<string, readonly string[]>>;
  readonly optionalProps: Readonly<Record<string, readonly string[]>>;
  readonly entryRoutes: readonly string[];
  readonly activityTypes: readonly string[];
};

export type OsVocabulary = {
  readonly eventNames: readonly string[];
  readonly eventVocabularies: Readonly<
    Record<string, Readonly<Record<string, readonly (string | number | boolean)[]>>>
  >;
  readonly contextKeys: readonly string[];
  readonly contextVocabularies: Readonly<Record<string, readonly string[]>>;
};

export const SURFACES_VOCABULARY = surfacesJson as SurfacesVocabulary;
export const LITERACY_VOCABULARY = literacyJson as LiteracyVocabulary;
export const OS_VOCABULARY = osJson as OsVocabulary;
