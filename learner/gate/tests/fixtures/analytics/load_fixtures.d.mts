/**
 * Type surface of the analytics fixture loader for the OS engine's typecheck
 * (fixtureSchemaDrift.test.ts). Plain ESM on the node side, same pattern as
 * dojo-analytics-collector.d.mts (AID-470 F1).
 */

export declare function syntheticFixtureLines(): Promise<
  ReadonlyArray<{ readonly file: string; readonly number: number; readonly line: string }>
>
export declare function driftFixtureLines(): Promise<ReadonlyArray<string>>
export declare function exampleReportRaw(): Promise<string>
