# Review and verification

Independent local browser audit reproduced both hints disappearing before an answer, then appearing only with feedback. The new browser test failed before the change; after it, the first and second hints appeared immediately, the exhausted control kept keyboard focus, another Enter added nothing, feedback retained both hints, and retry cleared them. Seven browser tests passed including the full existing corridor; lint passed.

Independent review repeated the keyboard flow at 360×740 and verified that the next activity starts with no prior hints. The live region was inspected; actual screen-reader speech was not tested. Submission and completion failures in the checkpoint remain separate concerns; no formal approval was granted.
