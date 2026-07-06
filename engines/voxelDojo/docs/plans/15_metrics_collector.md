# PLAN slice — Game 15: "OBSERVATORY" (Metrics Collector)

> One game = one concept. This slice fills all 13 template sections of
> `engines/voxelDojo/PLAN.md` for the histograms + percentiles + alerting game.
> Scaffolds `game-15-observatory/`.

---

**1. Subject & concept**
Curriculum project: `../../curriculum/15_metrics_collector/`. The ONE concept this game
teaches: **distribution-aware metrics + percentile alerting** — incoming samples are bucketed
into a histogram; p50/p95/p99 are computed from the buckets by interpolation; an alert
threshold (an SLO on a percentile, e.g. p95 latency > SLO) fires when the percentile value
crosses the line. The lesson is that **distribution-aware metrics + percentile alerting beat
averages**: two streams can share a mean yet have wildly different tails, so a p95 (read off
the shape of the histogram) is what actually catches the slow requests an average hides. Out
of scope: counters/gauges/timers type semantics, Prometheus text exposition, downsampling,
retention, label cardinality, the multi-language implementation (the curriculum project's job).
This game narrows to the histogram → percentile → alert spine because that is the one idea
that averages flatten and terrain makes obvious.

**2. Why 3D**
A histogram *is* terrain: bucket counts become elevation (a bar-chart mountain range across the
value axis), a percentile (p95) is a visible contour line cut across that terrain at the value
below which 95% of samples fall, and an SLO alert is a horizontal plane — the alert fires where
the terrain's p95 contour pokes above the plane. In 3D the player drops samples into buckets
(the terrain rises), reads the percentile off the contour, sets the SLO plane, and watches the
p95 contour light up red the moment it crosses the plane. The "distribution shape + percentile
contour + threshold plane" relationship is intrinsically spatial: a fat right tail is a ridge a
2D sparkline flattens, and "is p95 above the SLO" is a geometric crossing, not a number to
memorize. A 2D rule cannot show the contour-vs-plane crossing the way a 3D terrain can — the
player reads the distribution as a mountain and the SLO as a ceiling.

**3. Player goal**
Keep the observatory green: bucket the incoming sample stream, read the percentile off the
terrain contour, set the SLO plane where the team's latency budget lives, and predict whether
the alert fires — for one distribution and then for two that share a mean but diverge on the
tail.

**4. Concept → mechanic mapping** (the pedagogical core)

| Concept element | 3D mechanic | What "playing it right" proves |
| --- | --- | --- |
| Sample value | A glowing sample falling into a bucket column | Player maps a value → a bucket |
| Histogram bucket | A column whose height = bucket count | Player reads "more samples ⇒ taller column" |
| Bucket boundaries | Tick marks along the value axis | Player reads which bucket a value lands in |
| Distribution shape | The skyline of columns (uniform = flat, tail = ridge) | Player reads the shape, not just one number |
| Percentile (p50/p95/p99) | A glowing contour ring at the value below which p% of samples fall | Player reads the percentile off the terrain |
| Percentile interpolation | The ring sits *inside* a bucket, at the interpolated value | Player understands p95 is a value, not a bucket |
| SLO / alert threshold | A translucent horizontal plane at the SLO value | Player sets the ceiling the percentile must stay under |
| Alert firing | Terrain pokes above the plane → plane + contour turn red | Player predicts "does the percentile cross the SLO?" |
| Mean ≠ percentile | Two distributions, same average, different p95 | Player distinguishes "average is fine" from "tail is on fire" |

**5. Main loop**
A wave opens with a seeded sample stream dripping into the histogram (the terrain rises as
buckets fill). The player **predicts which bucket** the next sample lands in (L1), then **reads
the p95** off the terrain and predicts its value (L2), then **sets the SLO plane** and predicts
whether the alert fires (L3). In L4 two distributions with the same mean but different tails
appear side by side: the player predicts which one alerts — the lesson that averages hide what
percentiles reveal. Score = bucket-prediction accuracy + percentile-prediction closeness +
alert-fires prediction correctness + the mean-vs-tail contrast.

**6. Camera & controls**
Mouse-orbit + scroll zoom around the terrain (OrbitControls). Click a bucket to predict the
next sample lands there (L1) · drag the SLO slider to set the alert plane (L2/L3) · click the
distribution you predict will alert (L4). Three actions plus camera.

**7. Win / fail states**
*Win a wave:* predict buckets / percentile / alert outcome correctly per the level's rule.
*Fail:* a wrong bucket prediction beyond the accuracy threshold (L1), a percentile guess off by
more than the tolerance (L2), a wrong fires/does-not-fire prediction (L3), or picking the wrong
distribution in the mean-vs-tail contrast (L4). Every failure is a misread of either the
distribution shape or the percentile-vs-threshold relationship.

**8. Progression / difficulty**

- **L1 — Bucket the samples:** uniform distribution, 8 buckets. Predict which bucket each
  incoming sample lands in; pass at ≥80% accuracy. Learn "a value falls in the bucket whose
  boundaries straddle it."
- **L2 — Read the percentile:** a skewed distribution with a visible tail. Predict the p95
  value within a tolerance; the contour ring is the visual aid. Learn "p95 = the value below
  which 95% of samples fall."
- **L3 — Set the SLO:** set the alert plane; predict whether the alert fires for a given SLO.
  Learn "alert fires iff percentile(p) > SLO."
- **L4 — Distribution matters:** two distributions with the same mean but different p95
  (tight vs fat tail). Predict which one alerts. Learn "averages hide what percentiles reveal."

**9. Visual direction**
Two hero objects in one void: (a) the **histogram terrain** — a row of `BoxGeometry` columns
along the value axis whose height scales with bucket count, painted by a cool→hot gradient so
the tail reads as a ridge; (b) the **percentile contour** — a glowing horizontal ring at the
p95 value, interpolating *inside* its bucket; and (c) the **SLO alert plane** — a translucent
horizontal plane at the SLO value that turns from cyan (clear) to red (firing) when the p95
contour crosses it. A faint reference grid floor anchors the value axis. Dark void, subtle fog,
≤8-color palette. All geometry procedural (`BoxGeometry`, `TorusGeometry`, `PlaneGeometry`).

**10. Simulation core (headless)**
One pure-TypeScript module, ZERO `three` imports, unit-testable in node:

- `src/sim/histogram.ts` — `Histogram = {boundaries, counts, total}`; `record(h, value)`
  increments the right bucket (clamping above the last boundary to the +∞ bucket);
  `percentile(h, p)` interpolates within buckets to return the p-th percentile value (0..100)
  using linear interpolation across cumulative bucket counts (Prometheus-style);
  `quantileFromCounts(counts, boundaries, q)` is the shared interpolation kernel;
  `setAlert(h, slo, p)` returns `{firing: percentile(h,p) > slo, observedP, slo}`;
  `mean(h)` for the L4 contrast (averages hide tails).

Shared `src/sim/rng.ts` (mulberry32 + a sample-stream generator, copied from the pilot) gives
deterministic, replayable sample streams. Injected seed ⇒ same samples ⇒ same buckets ⇒ same
percentile ⇒ same alert outcome.

**11. Stack & performance budget**
Vite + strict TS + plain `three` (+ `OrbitControls` from `three/addons`). Budget: 60fps with
≤12 bucket columns and ≤1000 samples; plain meshes (no InstancedMesh needed at this count), no
postprocessing, no physics engine — the contour ring and plane color are parametric emissive /
material changes driven by the sim snapshot.

**12. Learning-gate hooks**

- Targets unit **`U15-metrics-collector`** (project `15_metrics_collector`) in
  `../../learner/learning_state.yaml`. As of 2026-07-05 that unit is **not yet seeded** in the
  substrate (only U0 exists), so OBSERVATORY evidence serves **deepening** play now
  (`scheduled_review: false`, `review_reason: "deepening"`) and will serve the real learning
  gate for U15 when the scheduler makes it the active unit. The emitter derives
  `scheduled_review` / `review_reason` from the substrate-generated review slice, so both modes
  work without code changes.
- On wave clear/fail, emit one evidence record:
  `{"source":"voxeldojo","unit_id":"U15-metrics-collector","project":"15_metrics_collector","scenario_id":"observatory-L<n>","game":"OBSERVATORY","ts":"<iso>","pass":true,"metrics":{"bucket_prediction_accuracy":0.92,"p95":86.5,"slo":80,"alert_firing":true},"review_context":{"unit_kind":"concept","scheduled_review":false,"review_reason":"deepening","scheduler_source":"learner-substrate","verifier_required":true},"curriculum_context":{"concept":"histograms + percentiles + alerting","mechanic":"histogram terrain + alert plane"}}`
  via `window.__voxelDojoEvidence` and an `EVIDENCE <json>` console record.
- The verifier (Prometor context) validates metrics against the gate/review policy and owns any
  state transition. **The game never writes learner state.**

**13. Milestones**

- **M0** this plan.
- **M1** `sim/histogram.ts` + Vitest suite proving: record increments the right bucket;
  percentile returns the correct value for known distributions (uniform → p50≈mid, p95≈high);
  alert fires when p95 > SLO and is silent below; determinism (same seed ⇒ same percentile).
  (No pixels yet.)
- **M2** scene: histogram terrain (height-scaled columns) + p95 contour ring + SLO plane
  rendering a static sim snapshot.
- **M3** interaction: click a bucket to predict the next sample / drag the SLO slider / click a
  distribution; contour + plane recolor on the crossing.
- **M4** levels L1–L4 with deterministic `evaluate*`.
- **M5** evidence emit wired to wave clears/fails; console `EVIDENCE` records.
- **M6** verify: Playwright plays L1 (and L2) headed via the `window.__observatory` hook,
  asserts evidence records + screenshots to `.logs/`.

**Open questions / risks**
Is predicting a single bucket enough active recall for L1, or should the player also drag the
sample's value onto the axis? Does WebGL run reliably in the Playwright smoke environment
(see `docs/GAP_ANALYSIS.md` §G6)? The percentile interpolation must match between sim and the
contour ring's visual position, or the lesson reads as a lie — keep one shared kernel
(`quantileFromCounts`) and have the scene read the sim's `percentile()` output directly.
