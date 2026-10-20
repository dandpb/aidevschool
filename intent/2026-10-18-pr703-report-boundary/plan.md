# Correct PR #703 report provenance and accounting

User authorization: delegated review/correction/integration request. Base head
8eb980f54a5866119fc0aee096f49fefa7330dd4 has a native QA GO and green countersign,
but a new independent offline review reproduced three defects: --allow-real
outputs unverified synthetic claims, pre-dedup erases rows/duplicate accounting,
and Python accepts boolean OS schemaVersion despite the TypeScript boundary.

Add failing tests in a new file. Derive provenance only from actual input labels
(nonempty, every record synthetic:true); otherwise explicitly report that the
synthetic origin is unverified, without asserting that real learners exist.
Compute the funnel from raw rows so its own dedup accounting is retained; keep
separately deduped rows for projection/retention. Reject boolean schema versions
while retaining numeric 1 compatibility with TypeScript. Keep emitters, schemas,
privacy policy, canonical learner truth, existing tests and gate logic untouched.
Update MANIFEST. Run focused offline suites and real complexity gate, then get
independent review of the exact delta. A new published head invalidates any old
head-specific approval: require fresh native countersign and normal merge door.
Do not contact any denied service or use synthetic probes as real learner data.
