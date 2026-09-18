# Plan

Add engines/school-entry/{server,public,tests,scripts,docs,package.json,DESIGN.md,README.md,Dockerfile}. Server owns catalogue, SQLite release store, auth, automatic browser checks and TypeSafe; UI owns input, ranked/catalog states and operator list. First freeze checklist then write tests against its contracts, implement, run node tests, real TypeSafe smoke, browser flow and visual comparison, then independent verifier. Commands from engine: npm test; npm run test:browser; npm run test:live; npm run check. Each named proof in .checks is required. Update MANIFEST and root engine map only for the new engine; preserve unrelated dirty files. No push or deploy.

## Approved PR review corrections

User authorized fixing F1/F2 and making CI green. Follow `.checks/engine-entry-review-fixes.md`: first reproduce split UTF-8 and release-during-inference failures in a new test file, then fix only their production paths. Remove the blocked sample file and document env setup in README without changing guard policy. Run all feature proofs, independent verification, push same PR and wait for CI completion.
