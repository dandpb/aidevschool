# Polyglot Arena

Calibration layer on top of the project cycle: the learner predicts language outcomes before
seeing benchmarks, then compares. Nascent — design and partial implementation.

## Language

**Arena**:
The prediction-and-comparison exercise across polyglot implementations of one Project.
_Avoid_: leaderboard, contest for its own sake

**Prediction**:
A pre-registered learner forecast of which implementation wins on which metric, committed before
results are shown.
_Avoid_: guess after the fact, vibe check

**Effort Budget**:
The fairness constraint that each language implementation received comparable implementation
effort before comparison.
_Avoid_: equal lines of code, equal time wall-clock only

**Calibration**:
How well the learner's Predictions match measured outcomes over time.
_Avoid_: accuracy as mastery of the Project concept

**Arena Report**:
The pedagogical comparison narrative after Predictions and benchmarks are in.
_Avoid_: benchmark dump, raw table alone
