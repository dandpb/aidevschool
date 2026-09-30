// Type declarations for the node-side loader (see guidedPracticeSources.mjs).
export declare const repoRoot: string
export declare const missingRepoRoot: string
export declare const packageRoot: string
export declare const generatedReadModelPath: string
export declare function sha256Text(text: string): string
export declare function readCanonicalSource(relativePath: string): Promise<string>
export declare function readGeneratedReadModel(): Promise<string>
export declare function regenerateProjection(): Promise<{
  fileBody: string
  outputPath: string
  projection: {
    practiceId: string
    contentVersion: string
    track: string
    anchorLessonId: string
    title: string
    objective: string
    estimatedMinutes: { min: number; max: number }
    exemplar: { markdown: string; sourcePath: string }
    inputs: { role: string; path: string; contents: string }[]
    attemptSteps: string[]
    rubric: { id: string; criterion: string; perCheck: string }[]
    takeawayPrompts: { a: string; b: string }
    manifest: { path: string; sha256: string }[]
  }
}>
export declare function regenerateProjectionFrom(customRepoRoot: string): Promise<{ fileBody: string }>
