# Scope and acceptance

- Preserve every W2 lesson, catalog, binding and competency byte from a240561c.
- Restore only pg-d03 `enunciado.md` and pg-d04 `rubrica-v1.md` to the accepted
  main bytes (`149464bb928571faa45c2d9e909cb2af1a5d231c` and
  `6d164b4343210572b4602a8002a418c4e86fbaf5`).
- Preserve all source contracts, adapters and existing tests. No repin,
  normalization, test override or new domain acceptance is part of this fix.
- Record the deferred l28v3 anchor and three spacing fixes outside the frozen
  packages, and correct the PR's scope description.
- Demonstrate rejection before the fix and success afterward with the existing
  adapter checks, catalog loader and OS projection. Request independent review
  of the final commit; the countersign of a240561c does not transfer.

Amending the frozen packages later requires explicit review of the affected
anchors/extractions and owner authorization for the existing adapter tests.
The W2 domain/protected-test accepts, producer provenance and normal merge gate
remain separate requirements; this correction supplies none of them.
