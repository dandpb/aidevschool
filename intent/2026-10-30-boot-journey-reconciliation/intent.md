# Intent

A deep-link journey switch can save successfully and then report failure. Boot currently falls back to an earlier progress snapshot while the next read sees the newer state, so the visible journey can disagree with saved progress. Reconcile after an uncertain switch and explain it.
