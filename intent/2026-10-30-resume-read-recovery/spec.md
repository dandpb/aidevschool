# Specification

Keep standalone resumeSession's confirmed-absent behavior for existing callers, but allow boot to require the just-activated state to still exist. Reject unreadable, invalid or unexpectedly absent second reads, and show a fixed recovery message with a reload action on rejection rather than onboarding or an indefinite spinner. Do not erase or replace saved state, claim a failed read is absence, or change hosted navigation. Verify real boot paths, rejected and discriminated reads, first-time absence, unmount and independent review.
