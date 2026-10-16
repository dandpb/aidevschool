import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const { verify } = await import(pathToFileURL(resolve('learner/gate/netlify-functions/literacy-verify.mjs')));
const record = {
  schemaVersion: 1, source: 'literacydojo', attemptId: 'synthetic-readiness-probe',
  lessonId: 'l02', lessonVersion: 3, activityId: 'l02-a1',
  activityType: 'output_comparison', skillIds: ['entender', 'avaliar'],
  deterministicChecks: { betterOutputId: true, 'c-fontes': true, 'c-limites': true, noExtraCriteria: 0 },
  score: 1, pass: true, timestamp: '2026-10-15T12:00:00.000Z', verifierRequired: true,
  answer: { outputId: 'out-b', criterionIds: ['c-fontes', 'c-limites'] },
};
const legacy = verify(record);
const current = verify({ ...record, lessonVersion: 4 });
console.log(JSON.stringify({probe:'l02-producer-v4-vs-verifier-v3',
 legacy_v3: { verdict: legacy.verdict, errors: legacy.errors },
 current_v4: { verdict: current.verdict, errors: current.errors },
 source_only: true, remote_deployment_not_probed: true,
}, null, 2));
