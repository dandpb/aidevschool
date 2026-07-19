# AI DevSchool MVP — Technical Specification
Version 1.0 · 2026-07-19 · Status: Final

## 1. Vision, Principles, and the Mastery Law

### 1.1 The Problem and the Opportunity

Adults who will never learn to code now need AI literacy. Since 2 February 2025, Article 4 of the EU AI Act has made it a legal expectation for staff of AI providers and deployers, and the European Commission's Q&A on the article explicitly names hallucination-risk training[^9^].

Existing options are proven but mis-shaped. Elements of AI — the strongest existence proof of non-technical AI education at scale, with over 1.8 million learners across 170+ countries, 40% women, and more than 25% aged 45+ — demands roughly 30 hours of scheduled browser time[^6^]. The learner this specification targets already lives in WhatsApp or Telegram and will not book 30 hours at a desk.

The product in one sentence: a single skill package that turns a personal agent (OpenClaw or Hermes Agent) on WhatsApp or Telegram into an AI-literacy tutor for exactly one learner[^1^][^3^].

The design descends from the aidevschool coding-school ecosystem; the pivot to non-coders preserves its three principles — one learner, one curriculum, many engines; agents propose, deterministic machinery disposes; the completion-certainty law — formalized below as laws L1–L3, joined by principles P4–P5.

### 1.2 The Design Laws (Normative)

**Law L1 (completion certainty).** "Completion certainty never lives in the language model." Mastery MUST require a learner attempt plus a separate verifier producing executable evidence; no explanation, review, or shipped artifact substitutes.

**Law L2 (propose/dispose split).** The LLM MAY propose — draft feedback, select a candidate next lesson, phrase a hint. Deterministic scripts alone dispose — mutate state, score gates, append ledger entries, schedule reviews.

**Law L3 (file-based everything).** All curriculum state, evidence, and plans are JSON/JSONL files mutated only by scripts: no database, no server, nothing auditable in model memory.

**Principle P4 (evidence-based pedagogy is normative).** Worked-example-first teaching (d=0.52[^20^]), retrieval practice every session (~80% vs. ~36% one-week recall[^11^]), spaced reviews with a gap of 10–20% of the retention interval[^12^], and teach-back[^18^] are system requirements, not style choices.

**Principle P5 (scope discipline).** One learner, one track, one channel, four gate types. Every later chapter traces back to this line.

### 1.3 Definitions and the Propose/Dispose Boundary

Five terms carry load in every later chapter:

**propose / dispose.** To propose is to generate a candidate — wording, a selection, a hint — with no effect until a script commits it; to dispose is to commit it. Only scripts dispose.

**mastery.** The status MASTERED in state.json, reachable only from a passing gate verdict on a learner attempt — never from exposure, explanation, or self-report.

**executable evidence.** One append-only line in ledger.jsonl — attempt id, gate id and version, raw artifact, verifier output, verdict, timestamp — sufficient to recompute the verdict with no model in the loop.

**gate.** The assessment bound to a concept: one of four types, G1–G4 (chapter 6), with machine-checkable pass criteria.

**verifier.** What executes a gate — a deterministic script for G1–G3, a rubric-anchored LLM check on granular binary items for G4. The tutor is never its own verifier.

The boundary these definitions imply, stated as paired obligations:

| The language model — MAY propose; MUST NEVER dispose | The scripts — MUST dispose |
|---|---|
| MAY draft feedback on an attempt; MUST NEVER mark it passed | gate_check.py MUST score every attempt and emit the verdict |
| MAY recommend a candidate next concept; MUST NEVER unlock it | next_step.py MUST select and unlock concepts in state.json |
| MAY phrase a hint at the current scaffold level; MUST NEVER change the level | next_step.py MUST pick the level from the attempt count |
| MAY word a review nudge; MUST NEVER decide one is due | schedule.py MUST compute review dates and emit nudge payloads |
| MAY discuss progress; MUST NEVER estimate, edit, or author the plan or its status words | plan_recompute.py MUST recompute plan.json after every verdict; progress_card.py MUST render it verbatim |
| MUST NEVER write, reorder, or delete history | Scripts MUST only append to ledger.jsonl — never update or delete |
| MUST NEVER hold authoritative state in conversation memory | Scripts MUST mutate state.json atomically; the file is the only state |
| MAY explain a verdict; MUST NEVER override or soften it | A verdict changes only via a new attempt scored by gate_check.py |

Every learner-visible consequence maps to exactly one of these five scripts; chapter 4 defines their contracts.

### 1.4 Trace One Concept End-to-End

The laws are testable. This trace walks concept C14 "Hallucinations" (module M4, gate type G1 seeded-error, 45-day retention target) from LOCKED to MASTERED; chapter 12 re-executes it as the acceptance demo.

1. With C14 LOCKED in state.json, gate_check.py scores the final C13 attempt PASS, appends the verdict, and marks C13 MASTERED. (script disposes: ledger.jsonl, state.json)
2. plan_recompute.py reads state.json and curriculum.json, finds C14's prerequisites (all of M1–M3) satisfied, and lists C14 next. (script disposes: plan.json)
3. next_step.py flips C14 LOCKED → AVAILABLE → IN_PROGRESS at scaffold level 1 and opens the session. (script disposes: state.json)
4. The tutor delivers the micro-lesson — hook, worked example of a fabricated "fact," faded practice — from $SKILL_DIR/content/, writing nothing. (LLM proposes: wording only)
5. The tutor issues the G1 task verbatim: a biography as nine numbered claims, four planted fabrications; "reply with the numbers of the false claims." (LLM proposes: delivery; key sealed in $SKILL_DIR/keys/)
6. The learner replies "2, 5, 7, 9"; the agent relays the raw text without judging it. (LLM proposes: transport only)
7. gate_check.py marks C14 ATTEMPTED and scores the reply against the seeded key {2, 5, 7, 9}: recall 1.0, precision 1.0 — PASS (rule: recall = 1.0 AND precision ≥ 0.8). (script disposes: state.json)
8. gate_check.py appends the evidence line (attempt id, gate G1, key version, raw reply, scores, verdict PASS, timestamp) and flips C14 to MASTERED. (script disposes: ledger.jsonl, state.json)
9. schedule.py applies the spacing rule to the 45-day target — gap ≈ 7 days — and writes next_review_ts. (script disposes: state.json)
10. plan_recompute.py rebuilds the plan: C14 MASTERED, C15 (requires C14) available, first review queued with its date. (script disposes: plan.json)
11. The tutor explains the verdict — which claims were planted, why each was plausible — but did not and cannot produce the PASS. (LLM proposes: explanation only)
12. On "progress?", progress_card.py renders plan.json as a plain-text card showing C14 MASTERED with its review date. (script disposes: reads plan.json; no mutation)

Every MASTERED here rests on a ledger line a script can replay without any model; chapter 12 runs these steps verbatim.

## 2. Learner Profile and Experience Design

This chapter fixes the learner, the session shape, and the authoring rules, so that a lesson author can produce compliant content without further research. It operationalizes principle P4 (evidence-based pedagogy) as a fixed session template and derives every session's closing gate task from law L1 (no mastery on explanation alone).

### 2.1 Who the Learner Is

**Persona (normative).** The MVP designs for exactly one persona: an adult aged roughly 25–65, a daily WhatsApp or Telegram user, with zero programming background, who meets AI at work — a colleague's chatbot draft, an AI feature switched on inside a familiar tool — without any training. This audience is validated at scale: Elements of AI reports more than 1.8 million learners across 170+ countries, about 40% women and at least a quarter aged 45 or older, all learning without mathematics or programming prerequisites[^6^]. Every rule in this chapter is written against this persona; content that assumes any other reader is out of scope (P5).

**Environment constraints.** Learning happens phone-only and in short fragments — a commute, a queue, a break. The core flow MUST NOT require a second device, a browser, links out of the chat, or any dashboard. Every session, gate task, and progress card arrives as plain DM text inside the existing conversation. Author test: a message that cannot be read comfortably on a phone screen while standing in line is too long.

### 2.2 The Micro-Session Contract

A session is completable in 5–10 minutes, spends at most about 12 tutor messages, and MUST end with an active retrieval task rather than exposition[^11^][^13^]. Retrieval practice shows consistent benefit across 50 classroom experiments[^13^], and testing roughly doubles one-week recall compared with re-study (~80% vs. ~36%)[^11^] — so the session's scarce minutes are spent on learner production, not on tutor text. Every session follows the fixed template of Table 1.

**Table 1 — Session template with per-phase timing budget.**

| Phase | Author rule | Time | Tutor messages |
|---|---|---|---|
| Hook | A relatable scenario question from the learner's work life | ~1 min | 1 |
| Worked example | Tutor demonstrates the concept on a concrete case; the learner answers at most one check question | ~2 min | 2 |
| Faded practice | Learner attempts at the scaffold level selected from the attempt count | ~3 min | 3–4 |
| Gate task | The concept's G1–G4 task, with the exact reply format stated | ~2 min | 1–2 |
| Feedback + takeaway | Verifier verdict in plain words, then a one-line takeaway | ~1 min | 1 |

The phase order is fixed and MUST NOT be rearranged: the worked example always precedes the first learner production (P4), and no session ships without its gate task. If a draft overruns the budget, the author shortens faded practice — never the gate task. Nothing follows the one-line takeaway.

**Fading rule.** Every concept ships with at least two scaffold levels. Level 1 carries maximal support (worked slots, partial answers, gap-fills); the highest level removes them. The state machine always serves level 1 first and the highest last, and the level is chosen from the attempt count by the script (`next_step.py`) — never by the LLM. The tutor may rephrase a served scaffold; it MUST NOT substitute an easier or harder one.

**Teach-back rule.** Every module (M1–M6) closes with a teach-back task: "explain this to a colleague in your own words." Expecting to teach measurably improves how learners organize and recall material[^18^]. The teach-back artifact feeds the G4 gate defined in ch. 6 and is scored against a versioned rubric checklist, not by tutor impression.

### 2.3 Authoring Rules for Non-Technical Content

**Tone.** Warm, plain, never condescending. Address the learner as "you." Keep sentences at or below ~20 words and the reading level near CEFR B1. Humor is allowed; sarcasm never.

**Jargon.** No technical term may appear before a one-line everyday analogy has introduced it. The terms in Table 2 are banned in raw form; authors MUST lead with the approved everyday phrasing, and MAY attach the technical term in parentheses only afterwards. The same table binds the tutor persona in `SKILL.md` (ch. 4).

**Table 2 — Banned jargon and approved everyday phrasing.**

| Banned term | Approved everyday phrasing |
|---|---|
| hallucination | "when the AI confidently makes something up" |
| model | "the know-how the AI has learned from examples" |
| training | "the AI's practice phase, when it learns from examples" |
| prompt | "the instructions you type for the AI" |
| token | "a chunk of text — often part of a word — that the AI reads or writes" |
| parameter / weights | "the internal dials tuned during the AI's practice phase" |
| inference | "the AI producing an answer when you ask" |
| fine-tuning | "extra practice on one narrow topic" |
| context window | "how much of the chat the AI can take in at once" |
| temperature | "a dial between predictable and surprising wording" |
| embedding | "turning words into numbers so the AI can compare meanings" |
| latency | "the wait before the AI answers" |

**Language of instruction (resolves open question 5.4).** All MVP content is authored in English. Every learner-facing string MUST live in content files — never hardcoded in scripts or `SKILL.md` — so later localization costs no code change; the 26-language reach of Elements of AI demonstrates the payoff of this path[^6^].

**Channel-neutral formatting.** Authors use only what WhatsApp and Telegram DMs share: short paragraphs, numbered lists, bold. No tables, no required images, plain-text replies only — the learner must never need formatting to answer.

**Answer-format discipline.** Every task states the exact expected reply format, quoted — e.g., "reply with the numbers of the false claims, comma-separated" — so the deterministic parsers behind gates G1–G3, and the rubric intake of G4, work without interpretation.

**Progress feedback.** Progress is shown only as a script-generated plain-text progress card (`progress_card.py`). There are no streaks, leaderboards, or shame mechanics: a lapsed learner is a scheduling input (state REVIEW_DUE), never an audience for admonishment.

**Author checklist.** A session file MUST pass items 1–11 below before merge; item 12 is a SHOULD.

1. Time budget: completable in 5–10 minutes at B1 reading speed.
2. Message budget: at most 12 tutor messages, counted per Table 1.
3. Template order follows Table 1; nothing appears after the takeaway.
4. The worked example precedes the first learner production.
5. The session ends on an active retrieval task, never on exposition.
6. The gate task states the exact expected reply format, quoted.
7. The stated reply format is parseable by the gate's checker (G1–G3 parser or G4 rubric intake).
8. At least two scaffold levels are authored; level 1 is the most supported.
9. Jargon scan passed: no Table 2 term appears before its approved phrasing.
10. Sentences ≤20 words; ~CEFR B1 vocabulary; the learner is "you"; no sarcasm.
11. Formatting limited to short paragraphs, numbered lists, bold; no links out of chat, no required images.
12. SHOULD — humor, where used, is kind and never at the learner's expense.

### 2.4 Example Session Excerpt

The excerpt below shows the template end to end for concept C12 "Prompts as instructions" (module M3, gate G4). The learner's C12 state is IN_PROGRESS with attempt count 0, so `next_step.py` serves scaffold level 1. Tutor messages are tagged with phase and running count; learner replies are illustrative; design annotations appear in italics.

> **T1 — hook (1/7):** "You text a new colleague: 'Can you send me the thing for tomorrow's meeting?' What could go wrong?"

> **Learner:** "They won't know which thing I mean."

> **T2 — worked example (2/7):** "Exactly. An AI is in the same spot — it only sees the instructions you type for it (your 'prompt'). Look: I type 'Write something about our sales.' It answers with three vague paragraphs. Nothing I can use."

> *Worked example precedes any learner production (P4, Table 1); "prompt" is used only after its everyday phrasing (Table 2).*

> **T3 — worked example (3/7):** "Now I give the three parts. Task: 'Write a three-sentence update.' Context: 'Sales rose 10% in March.' Format: 'plain sentences, no jargon.' The answer is exactly what I needed. A good prompt = task + context + format."

> **T4 — faded practice, level 1 (4/7):** "Your turn, with training wheels. Fill the two gaps and reply with the full prompt: 'Task: write a birthday message for Ana. Context: she loves [gap 1]. Format: [gap 2].'"

> *Scaffold level 1 selected by `next_step.py` from attempt count 0 — the LLM renders, the script disposes (L2).*

> **Learner:** "Task: write a birthday message for Ana. Context: she loves gardening. Format: two short lines."

> **T5 — faded practice, level 1 (5/7):** "That works — the AI now knows the job, the situation, and the shape. One more: what is missing in 'Tell me about taxes'? Reply in one sentence."

> **Learner:** "It says nothing about the task or my situation."

> **T6 — gate task (6/7):** "Final task — no help this time. Rewrite this prompt so it has all three parts: 'Tell me about marketing.' Reply with exactly three lines, in this order: Task: / Context: / Format: — one line each."

> *The session MUST end on this active retrieval task (L1); the quoted reply format lets the G4 prompt-rewrite rubric parse the artifact without interpretation (ch. 6).*

> **Learner:** "Task: suggest three Instagram post ideas. Context: a small bakery's spring menu. Format: one line each, casual tone."

> **T7 — feedback + takeaway (7/7):** "Passed — task, context, and format are all there. Keep this line: tell the AI the job, the situation, and the shape of the answer, like a good brief to a colleague."

> *The verdict comes from the G4 rubric-anchored verifier and is appended to `ledger.jsonl` — not from tutor impression (L1, ch. 6). The takeaway is one line; nothing follows it (Table 1).*

Seven tutor messages, roughly eight minutes, zero links, zero jargon-before-analogy: this is the unit of experience every one of the 24 concepts (ch. 3) must reproduce.

## 3. Curriculum Model: "AI Fluency Foundations"

### 3.1 Track and Module Structure

The MVP ships exactly one track, **AI Fluency Foundations**: 24 ordered concepts, C01–C24, delivered entirely as data in `curriculum.json`. The sequence is the MVP's own defensible design, synthesized from four published sources — the six-chapter progression of Elements of AI[^6^], the four domains of the OECD/EC AILit framework[^8^], the aspects of the UNESCO AI competency frameworks[^7^], and Anthropic's 4Ds (Delegation, Description, Discernment, Diligence)[^10^]. No single source publishes this sequence; it is presented here as a grounded design decision, not an established standard, and §3.3 makes the grounding auditable.

The 24 concepts group into six modules: M1 "What AI is" (C01–C05), M2 "How AI learns from data" (C06–C09), M3 "Generative AI and LLMs" (C10–C13), M4 "Using AI critically" (C14, C15, C19), M5 "Using AI responsibly" (C16, C17, C18, C21, C23), and M6 "AI at work and in society" (C20, C22, C24). After C13 the published sequence interleaves M4–M6 concepts for conversational flow — source evaluation (C19) lands directly after data ownership (C18). Module membership determines prerequisites and retention targets; published order determines the default teaching sequence. Each concept fits one ch. 2 micro-session (5–10 minutes) and carries one primary gate plus, for module-final concepts, the module teach-back.

The module-level prerequisite structure is a directed acyclic graph (DAG) of six nodes and five labeled edges; an edge A → B means every concept of B presumes every concept of A.

| Edge | Label | Dependency rationale |
|---|---|---|
| M1 → M2 | shared vocabulary | Talking about data and learned patterns presumes the mental models of what AI is and where it operates. |
| M2 → M3 | models generalize | Generative AI is taught as a special case of learned models; data quality, training, and prediction error carry over. |
| M3 → M4 | generation mechanics | Judging outputs critically presumes knowing how LLMs produce text and why false statements arise. |
| M3 → M5 | generation mechanics (parallel) | Bias, privacy, and ownership rules anchor in the same mechanics; M5 does not depend on M4. |
| M4 → M6 | critical judgment | Delegation and workflow decisions presume the verification habits built in M4. |

M4 and M5 are parallel branches off M3, and no module-level edge joins M5 to M6: the branches interleave in published order and meet only in the track-completion rule (every concept must reach MASTERED, ch. 5). Because C19 (M4) outnumbers C16 (M5), an edge M4 → M5 would contradict published order; the five edges shown are exactly the module-level dependencies consistent with the topological rule of §3.2.4.

### 3.2 The Computable Curriculum

Every concept is one record in `curriculum.json`, which stores the 24 records as an array in published order. Records MUST conform to this schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ConceptRecord",
  "type": "object",
  "required": ["id", "title", "module", "prerequisites", "gate_id", "target_retention_days", "scaffold_levels", "teach_back", "content_refs"],
  "additionalProperties": false,
  "properties": {
    "id": { "type": "string", "pattern": "^C(0[1-9]|1[0-9]|2[0-4])$" },
    "title": { "type": "string", "minLength": 1 },
    "module": { "enum": ["M1", "M2", "M3", "M4", "M5", "M6"] },
    "prerequisites": {
      "type": "array",
      "items": { "type": "string", "pattern": "^C(0[1-9]|1[0-9]|2[0-4])$" },
      "uniqueItems": true
    },
    "gate_id": { "enum": ["G1", "G2", "G3", "G4"] },
    "target_retention_days": { "enum": [30, 45, 60] },
    "scaffold_levels": { "type": "integer", "minimum": 2, "maximum": 3 },
    "teach_back": { "type": "boolean" },
    "content_refs": { "type": "array", "items": { "type": "string" }, "minItems": 1 }
  }
}
```

One filled example, the C14 record as shipped:

```json
{
  "id": "C14",
  "title": "Hallucinations: why fabricated facts arise",
  "module": "M4",
  "prerequisites": ["C01", "C02", "C03", "C04", "C05", "C06", "C07", "C08", "C09", "C10", "C11", "C12", "C13"],
  "gate_id": "G1",
  "target_retention_days": 45,
  "scaffold_levels": 3,
  "teach_back": false,
  "content_refs": ["content/C14.l1.md", "content/C14.l2.md", "content/C14.l3.md"]
}
```

Field semantics: `prerequisites` is the fully expanded id list produced by §3.2.3; `gate_id` is the primary gate per §3.2.5, with variants (redaction vs. keyed scenario; prompt-rewrite vs. teach-back) resolved by the ch. 6 gate registry; `target_retention_days` follows §3.2.6; `scaffold_levels` counts support tiers from level 1 (full worked example) up to the highest (minimal hint), consumed by the ch. 2 fading rule and ch. 5 remediation; `teach_back` marks the module-final concept carrying the module's G4 teach-back gate; `content_refs` lists content files relative to `$SKILL_DIR`.

The master curriculum table is the chapter's centerpiece. In the prerequisites column, `M<x>` denotes every concept of module `M<x>` and `C0a–C0b` an inclusive id range; in `curriculum.json` these shorthands expand to explicit id lists, as in the C14 example.

| Id | Title | Module | Prerequisites | Gate | Retention (days) | Teach-back |
|---|---|---|---|---|---|---|
| C01 | What AI is — and what it is not | M1 | — | G3 (keyed quiz) | 30 | no |
| C02 | AI in daily life | M1 | C01 | G3 (keyed quiz) | 30 | no |
| C03 | Rules vs. learned behavior | M1 | C01–C02 | G3 (keyed quiz) | 30 | no |
| C04 | Search and problem solving | M1 | C01–C03 | G3 (keyed quiz) | 30 | no |
| C05 | Probability and uncertainty | M1 | C01–C04 | G3 (keyed quiz) | 30 | yes |
| C06 | Data: garbage in, garbage out | M2 | M1 | G3 (keyed quiz) | 30 | no |
| C07 | Learning patterns from examples | M2 | M1, C06 | G3 (keyed quiz) | 30 | no |
| C08 | Training vs. using a model | M2 | M1, C06–C07 | G3 (keyed quiz) | 30 | no |
| C09 | Classification and prediction errors | M2 | M1, C06–C08 | G3 (keyed quiz) | 30 | yes |
| C10 | Neural networks and generative AI | M3 | M1–M2 | G3 (keyed quiz) | 45 | no |
| C11 | Why LLMs sound confident but do not "know" | M3 | M1–M2, C10 | G3 (keyed quiz) | 45 | no |
| C12 | Prompts as instructions | M3 | M1–M2, C10–C11 | G4 (prompt-rewrite) | 45 | no |
| C13 | Iterating prompts | M3 | M1–M2, C10–C12 | G4 (prompt-rewrite) | 45 | yes |
| C14 | Hallucinations: why fabricated facts arise | M4 | M1–M3 | G1 (seeded-error) | 45 | no |
| C15 | Verification habits | M4 | M1–M3, C14 | G1 (seeded-error) | 45 | no |
| C16 | Bias in data, bias in outputs | M5 | M1–M3 | G3 (keyed quiz) | 60 | no |
| C17 | Privacy: what never goes into a chatbot | M5 | M1–M3, C16 | G2 (redaction) | 60 | no |
| C18 | Data ownership, consent, and copyright | M5 | M1–M3, C16–C17 | G3 (keyed quiz) | 60 | no |
| C19 | Source evaluation and misinformation | M4 | M1–M3, C14–C15 | G3 (keyed quiz) | 45 | yes |
| C20 | Delegation judgment: when (not) to use AI | M6 | M1–M4 | G2 (keyed scenario) | 60 | no |
| C21 | Human oversight and accountability | M5 | M1–M3, C16–C18 | G2 (keyed scenario) | 60 | no |
| C22 | Workplace use cases and safe workflows | M6 | M1–M4, C20 | G2 (keyed scenario) | 60 | no |
| C23 | Transparency: disclosing AI use | M5 | M1–M3, C16–C18, C21 | G2 (keyed scenario) | 60 | yes |
| C24 | Societal and economic implications | M6 | M1–M4, C20, C22 | G2 (keyed scenario) | 60 | yes |

Prerequisites are computed, not hand-listed. **Default rule:** for concept $c$ in module $m$, prerequisites($c$) = every concept of every ancestor module of $m$ in the DAG, plus every concept of $m$ preceding $c$ in published order. Three load-bearing edges MUST appear verbatim in the records regardless of the default: C15 requires C14 (verification drills presume hallucination mechanics); C17 requires C10 (redaction drills presume how an LLM ingests input); C19 requires C14 (source triage presumes hallucination recognition). The default already implies all three under the current module assignment; they are restated so a future re-assignment cannot silently drop them.

**Graph validity (normative).** The curriculum graph MUST be acyclic, and the published order C01…C24 MUST be a valid topological ordering of it: every prerequisite of a concept MUST carry a lower concept id. The install script MUST validate `curriculum.json` before enabling the skill and MUST reject the installation on any violation — schema nonconformance, a cycle, a topological inversion, a missing mandatory edge, a module lacking exactly one teach-back concept, or a gate assignment deviating from §3.2.5. Validation runs at install time, so the ch. 5 state machine assumes a well-formed graph and performs no graph checks at runtime.

**Gate assignment (normative).** Gate ids G1–G4 name the four gate types defined in ch. 6 (seeded-error; regex/keyed; keyed adaptive quiz; rubric-anchored LLM):

- C14, C15 → G1 seeded-error (spot-the-hallucination);
- C17 → G2, redaction variant (PII-redaction drill);
- C20–C24 → G2, keyed-scenario variant (safe-use decisions);
- C12, C13 → G4 prompt-rewrite;
- module-final concepts C05, C09, C13, C19, C23, C24 (teach-back flag = yes) MUST additionally pass the module's G4 teach-back gate;
- all remaining concepts (C01–C11, C16, C18, C19) → G3 keyed quiz.

**Retention targets.** `target_retention_days` is assigned per module: 30 for M1–M2, 45 for M3–M4, 60 for M5–M6 — a design decision: foundational vocabulary is rehearsed for free in later sessions, while responsible-use behaviors are exercised rarely and decay faster. These values are the curriculum's only timing output; the ch. 5 scheduler derives each review gap from `target_retention_days`, holding it within 10–20% of the target interval, the spacing range a 254-study meta-analysis found optimal[^12^].

### 3.3 Grounding and Positioning

Each module maps onto the source frameworks — Elements of AI chapters[^6^], AILit domains (Engage with AI, Create with AI, Manage AI, Design AI)[^8^], UNESCO student-framework aspects[^7^], and the 4Ds[^10^] — so adopters can defend coverage claims:

| Module | Elements of AI | AILit domain | UNESCO aspect | 4Ds |
|---|---|---|---|---|
| M1 What AI is | Ch. 1–2 | Engage with AI | Human-centred mindset | foundation for Delegation |
| M2 How AI learns from data | Ch. 3–4 | Engage with AI | AI techniques and applications | foundation for Discernment |
| M3 Generative AI and LLMs | Ch. 5 | Create with AI | AI techniques and applications | Description |
| M4 Using AI critically | Ch. 6 | Engage with AI | Human-centred mindset | Discernment |
| M5 Using AI responsibly | Ch. 6 | Manage AI | Ethics of AI | Diligence |
| M6 AI at work and in society | Ch. 6 | Manage AI; Design AI (awareness) | Human-centred mindset; AI system design (awareness) | Delegation |

Every module cites at least one entry per column, and two coverage limits are stated honestly rather than smoothed over: AILit's Design AI domain and UNESCO's AI system design aspect are served at awareness level only (M6), a deliberate scoping decision for non-builders; and Create with AI is covered through prompting practice (M3), not artifact construction. This is the sense in which the sequence is a synthesis: M1–M3 compress Elements of AI's conceptual spine into chat-sized units, while M4–M6 re-express AILit, UNESCO, and 4Ds competencies as code-free drills.

Modules M4–M6 are also the track's compliance-facing face: they directly serve the AI-literacy expectation that Article 4 of the EU AI Act places on providers and deployers of AI systems, in force since 2 February 2025, and the European Commission's Q&A explicitly names hallucination-risk awareness as expected training content[^9^] — covered by M4. The MVP issues no certificate with legal weight (a non-goals decision, ch. 10); the grounding table lets an adopting organization document, per module, which framework elements the track addresses.

Finally, extensibility is a data operation, not a code change: adding a concept means assigning the next unused concept id, appending one conforming record at its published-order position in `curriculum.json`, and adding the content files named in `content_refs`. `next_step.py`, `gate_check.py`, `schedule.py`, and `plan_recompute.py` MUST read `curriculum.json` at runtime and MUST NOT hard-code concept ids, module boundaries, gate assignments, or the concept count; the state machine, scheduler, and plan generator MUST treat the curriculum purely as data. Install-time validation (§3.2.4) re-runs against the extended file, so an invalid extension is rejected before the next session.

## 4. System Architecture: Skill Package, Agent Layer, Deterministic Core

### 4.1 Components and Layers

The MVP ships as exactly one folder, `aidevschool/`: a SKILL.md file, a deterministic script core, curriculum and content files, and — once installed — four learner state files. The platform supplies everything else: gateway, language model, memory, and the proactive machinery (cron and, on OpenClaw, heartbeats) are services of OpenClaw or Hermes Agent, not of the skill [^1^][^3^]. The skill adds no networking code or server component; its only model integration is the verifier endpoint named in config.json (§4.3.3).

The package has three layers. The **tutor persona layer** is the SKILL.md instruction body consumed by the agent runtime. The **deterministic core** — five scripts plus curriculum.json, rubrics/, and keys/ — implements the state machine (ch. 5), the gates (ch. 6), the scheduler, the evidence ledger, the progress card, and the plan. The **install layer** isolates every per-platform delta in one script (§4.3.2). The persona layer MUST NOT contain verdict logic: no SKILL.md instruction may assert an answer's correctness, a review's timing, or a concept's mastery. This is law L2 restated as architecture (the persona proposes, scripts dispose) and law L3 restated as storage (every fact about progress lives in JSON/JSONL files, none in model memory).

The runtime behavior is two paths. **Inbound:** a learner message in the Telegram or WhatsApp direct-message (DM) chat reaches the gateway, which routes it to the agent runtime session bound to that paired peer; the runtime — which scans every installed skill's frontmatter and loads bodies on demand [^1^][^2^][^5^] — activates aidevschool. The persona acts only through tools: it invokes one script with JSON arguments, and the script — reading and, per its contract, mutating $STATE_DIR files — returns one JSON object on stdout for the persona to render into chat messages. **Proactive:** the platform cron — `openclaw cron add` with chat delivery, or Hermes Agent's built-in cron with platform delivery [^2^][^3^], with OpenClaw's recurring heartbeat as fallback wake-up [^1^] — starts a runtime session instructed to run schedule.py; the script scans state.json and emits nudge payloads for due reviews, which the persona renders for gateway delivery. Scripts never send messages; the persona never touches files.

### 4.2 The Skill Package

SKILL.md is the only file the platforms read natively: both scan the YAML frontmatter of all installed skills and load full bodies on demand (progressive disclosure), in a format aligned with the open agentskills.io standard [^1^][^2^][^5^]. Hence two requirements: `description` MUST be written as an activation trigger — it is the only text the model sees before loading the body — and the body MUST be self-contained, since nothing else enters the context unless the agent reads it explicitly. The mandated file:

```markdown
---
name: aidevschool
description: >-
  AI-literacy tutor for exactly one learner, teaching the 24-concept track
  "AI Fluency Foundations" in 5-10 minute chat sessions. Activate when the
  learner asks to learn or continue a lesson, answers a gate task, replies
  to a scheduled review nudge, or asks about their progress. All scoring,
  state changes, scheduling, and progress reporting are delegated to the
  bundled scripts in scripts/; this skill never decides pass/fail, never
  schedules reviews, and never edits state files itself.
---

# AI DevSchool Tutor

## Role
You are the AI DevSchool tutor: a warm, plain-language teacher of AI
literacy for adults with no technical background. You compose messages,
adapt explanations, encourage, and call the bundled tools. You are not
a grader.

## Session flow
1. Call next_step.py; act only on the action it returns.
2. Deliver the content file it names, following that file's tone rules.
3. When the learner replies to a gate task, pass the raw reply to
   gate_check.py; render feedback strictly from its output fields.
4. Render progress only via progress_card.py; never compute it yourself.
5. End every session by stating the next step the scripts returned.

## Tool-use rules
- Use only the five scripts in scripts/: next_step.py, gate_check.py,
  schedule.py, progress_card.py, plan_recompute.py.
- Pass arguments as one JSON object on stdin; treat the stdout JSON as
  authoritative ground truth.
- After every gate_check.py verdict, call schedule.py, then plan_recompute.py, before replying.
- When woken by the review cron job or heartbeat, call schedule.py first.

## Prohibited actions
- Never write or edit state.json, plan.json, ledger.jsonl, or config.json.
- Never decide, pre-announce, or hint at pass/fail before gate_check.py returns.
- Never schedule, skip, or delay a review; schedule.py alone computes timing.
- Never quote or paraphrase files under keys/ or rubric exemplars.
- On any non-zero script exit: relay the error string verbatim and stop
  the lesson.
```

The boundary inside that skeleton is exact. The persona composes messages, adapts explanations, encourages, and calls tools. It MUST NOT write state files, decide pass or fail, schedule or skip reviews, or quote answer keys; the last prohibition extends to paraphrase, since keys/ files and rubric exemplars are script inputs, never chat content (ch. 6).

The deterministic core exposes exactly five entry points. Together they are the only mutation paths in the system: state.json, plan.json, and ledger.jsonl change inside one of these scripts or not at all (progress_card.py is read-only; the persona is forbidden from computing progress itself). Every script is JSON-in/JSON-out: one argument object on stdin, one result object on stdout.

| Script | stdin arguments | stdout JSON payload | Mutates |
|---|---|---|---|
| next_step.py | `{"state_dir", "skill_dir"}` | `{"ok": true, "action": "lesson\|review\|idle\|complete", "concept_id", "content_ref", "scaffold_level", "attempt_no"}` | Marks concept IN_PROGRESS; appends `lesson_delivered` |
| gate_check.py | `{"state_dir", "skill_dir", "concept_id", "attempt_id", "reply_text"}` | `{"ok": true, "verdict": "pass\|fail\|parse_error", "scores": {...}, "feedback": {...}, "ledger_event_id"}` | Appends attempt/verdict/transition; updates state.json |
| schedule.py | `{"state_dir", "skill_dir"}` | `{"ok": true, "due": [{"concept_id", "due_ts"}], "nudge_payloads": [{"concept_id", "kind"}], "next_due_ts"}` | Writes next_review_ts, sets REVIEW_DUE; appends `review_scheduled` / `review_due` events |
| progress_card.py | `{"state_dir"}` | `{"ok": true, "card_text", "counts": {"mastered", "in_progress", "review_due", "remaining"}}` | None (read-only) |
| plan_recompute.py | `{"state_dir", "skill_dir"}` | `{"ok": true, "plan_version", "next_available": [...], "due_reviews": [...], "diff_summary"}` | Rewrites plan.json; appends `plan_recomputed` |

All five share one exit-code convention, which is part of the contract. Exit 0: success; the stdout payload is authoritative. Exit 1: usage, I/O, or guard rejection — the event is refused and no mutation occurs. Exit 2: inconsistency detected — schema violation, broken ledger hash chain, curriculum-graph cycle — triggering §4.3.5. On any non-zero exit the script prints exactly one plain-language sentence to stderr. Re-running a script with identical input MUST NOT double-apply a mutation; ledger event ids serve as idempotency keys (ch. 5).

### 4.3 Two Platforms, One Package

The skill addresses storage through two logical roots. **$SKILL_DIR** holds everything versioned and shipped: SKILL.md, curriculum.json, and scripts/, content/, rubrics/, keys/. **$STATE_DIR** holds exactly four generated files: state.json, plan.json, ledger.jsonl, config.json. Mapping these roots onto real paths is the only platform-specific step in the package [^1^][^3^]:

```text
# OpenClaw
~/.openclaw/workspace/
├── skills/aidevschool/            # $SKILL_DIR
│   ├── SKILL.md
│   ├── curriculum.json
│   ├── scripts/
│   │   ├── next_step.py
│   │   ├── gate_check.py
│   │   ├── schedule.py
│   │   ├── progress_card.py
│   │   └── plan_recompute.py
│   ├── content/                   # C01.l1.md … C24.l3.md (one file per concept per scaffold level) + module intros
│   ├── rubrics/                   # versioned G4 rubrics (rubric_id + semver)
│   └── keys/                      # seeded-error keys, quiz keys — scripts only
└── aidevschool-state/             # $STATE_DIR
    ├── state.json
    ├── plan.json
    ├── ledger.jsonl
    └── config.json

# Hermes Agent
~/.hermes/
├── skills/aidevschool/            # $SKILL_DIR — byte-identical to the OpenClaw copy
└── aidevschool-state/             # $STATE_DIR — same four files, same schemas
```

The skill folder is byte-identical across platforms; only its location differs (on Hermes, the installer resolves the configured skills root under `~/.hermes` [^3^]). State lives outside the skill folder so reinstalls never touch learner data.

The install script performs five steps: detect the platform (OpenClaw gateway configuration versus Hermes `~/.hermes`); place the skill folder; create the state directory; register the review scheduler — `openclaw cron add` with chat delivery on OpenClaw, Hermes Agent's built-in cron with platform delivery on Hermes [^2^][^3^]; and add `aidevschool` to the agent's skill allowlist, then print verification steps. The installer MUST be idempotent: no step is applied twice.

Model configuration resolves open question 5.5: the skill is **model-agnostic with a documented default**. config.json names `tutor_model` and `verifier_model` separately as provider-qualified identifiers; the documented default for both is `inherit`, the platform's configured primary model. Any OpenAI-compatible endpoint MAY be substituted on either platform [^2^][^3^]; local models via Ollama are the privacy-maximizing option, keeping learner data on the operator's hardware [^4^]. For G4 reproducibility, gate_check.py invokes the verifier at temperature 0, and every rubric-gate ledger entry records the verifier model identity for replay (ch. 6). config.json also carries `channel`, `install_platform`, `skill_version`, and `feature_flags.llm_gates_enabled`, the G4 kill-switch (ch. 6).

Telegram is the **reference channel** (simplest bot setup: a BotFather token added to the gateway configuration); WhatsApp is a documented install variant with identical behavior after pairing [^1^][^3^]. Learner identity binds to the paired direct-message peer: OpenClaw's default DM policy issues unknown senders a pairing code approved on the host, and Hermes' gateway provides the equivalent step [^1^][^3^]. The state files model exactly one learner; group chats are out of MVP scope (implements decision 5.1; recorded in ch. 10).

The failure posture is uniform: any script that detects an inconsistency MUST exit non-zero with a plain-language error string; the persona relays that string verbatim and stops the lesson. It MUST NOT improvise a verdict, a fix, or retries: an inconsistent state machine is a stop condition. Recovery is an operator action built on the ledger verification and replay tooling of ch. 7.

A Telegram-first install on OpenClaw (on Hermes only the scheduler line differs, registering the built-in cron with platform delivery [^3^]):

```text
$ python3 install.py
[aidevschool] platform detected: openclaw (gateway at 127.0.0.1:18789)
[aidevschool] skill folder -> ~/.openclaw/workspace/skills/aidevschool/ (written)
[aidevschool] state folder -> ~/.openclaw/workspace/aidevschool-state/ (created)
[aidevschool] curriculum.json: 24 concepts, DAG acyclic, order valid ... OK
[aidevschool] scheduler: openclaw cron add aidevschool-review --every 30m ... OK
[aidevschool] allowlist: aidevschool added to agent skills ... OK
[aidevschool] install complete (re-run any time; every step is idempotent)

Next steps:
 1. Create a bot with @BotFather in Telegram; add its token to the gateway.
 2. Message the bot, then approve the pairing code on the host:
    openclaw pairing approve <code>
 3. Send "start"    -> the tutor opens concept C01.
 4. Send "progress" -> a card reports 0/24 concepts mastered.
```

## 5. The Deterministic State Machine

### 5.1 States and Storage

The learner's entire pedagogical state is one finite-state machine per concept, persisted in state.json and mutated only by the five scripts of ch. 4. This chapter fixes the machine: §5.1 the states and the storage rule, §5.2 the closed transition set and the session orchestration built on it, §5.3 the spaced-repetition engine that drives the MASTERED ↔ REVIEW_DUE cycle. Six states, normative:

- **LOCKED** — at least one prerequisite in curriculum.json is not MASTERED; the concept is invisible to the learner and ineligible for selection.
- **AVAILABLE** — every prerequisite is MASTERED; next_step.py may open the concept.
- **IN_PROGRESS** — a lesson or remediation loop is open; the concept is the session's current concept and accepts attempts.
- **ATTEMPTED** — at least one attempt is scored but the concept's gate contract (ch. 6) is incomplete — canonically a G3 concept holding one consecutive pass in gate_progress, awaiting the second pass at least 24 hours later.
- **MASTERED** — the gate contract is complete; the concept sits under retention scheduling with a script-written next_review_ts.
- **REVIEW_DUE** — next_review_ts has been reached; the concept awaits a review attempt, and only a review verdict moves it.

**Session state.** state.json stores, per concept: status, scaffold_level, attempt counts, failures_this_session, a deferred flag, gate_progress (consecutive passes, last pass timestamp), target_days_effective, and next_review_ts; and at session level: current_concept and session_phase, one of idle / lesson / awaiting_attempt / feedback. A crashed session MUST be fully recoverable by re-reading state.json: a crash during feedback leaves session_phase = feedback with the verdict already appended to ledger.jsonl, and the resumed session re-renders from the files. There is no hidden in-memory state (law L3); the chat context is a rendering cache, never a store.

**Mutation rule.** Every mutation is a pure function (current_state, event, evidence) → new_state, executed inside a script and committed by atomic write. LLM output is data — wording, a relayed reply, a proposed hint; it may request an event only by being passed to a script as an argument, and model text is never an event itself (law L2). The learner's reply reaches the machine solely as the evidence field of an attempt_submitted event.

### 5.2 Transitions and Orchestration

The transition set is closed: the eight rows below are the only legal transitions. Guards are evaluated against files only, and an event whose guard fails MUST be rejected (exit 1, §4.2 convention).

| From-state | Event | Guard | To-state | Acting script |
|---|---|---|---|---|
| LOCKED | unlock | all prerequisites MASTERED | AVAILABLE | next_step.py |
| AVAILABLE | lesson_start | concept heads plan.json next_available; phase idle; not deferred | IN_PROGRESS | next_step.py |
| IN_PROGRESS | attempt_submitted | phase awaiting_attempt; attempt_id unseen in ledger | ATTEMPTED | gate_check.py |
| ATTEMPTED | verdict_pass | gate contract complete: single pass (G1/G2/G4), or second consecutive G3 pass ≥ 24 h after the first; teach-back pass recorded where flagged | MASTERED | gate_check.py |
| ATTEMPTED | verdict_fail | any fail verdict; scaffold_level floored at 1 | IN_PROGRESS | gate_check.py |
| MASTERED | review_due | now ≥ next_review_ts; review_due key not yet in ledger | REVIEW_DUE | schedule.py |
| REVIEW_DUE | review_pass | review attempt PASS; effective target doubles (cap 365 d) | MASTERED | gate_check.py |
| REVIEW_DUE | review_fail | review attempt FAIL; effective target resets to curriculum value | IN_PROGRESS | gate_check.py |

Three properties keep the table closed. A passing verdict whose gate contract is still incomplete — the first of G3's two consecutive passes — fires no row: gate_check.py updates gate_progress and the concept remains ATTEMPTED. A parse_error verdict likewise fires no row; the persona re-asks the question in the same phase. A review session is not itself a transition: the concept stays REVIEW_DUE until the review verdict fires row 7 or 8.

Rendered as a diagram, the machine has six nodes — the six states — and eight labeled edges, one per table row:

- LOCKED → AVAILABLE, label unlock (all prerequisites MASTERED).
- AVAILABLE → IN_PROGRESS, label lesson_start (phase idle, not deferred).
- IN_PROGRESS → ATTEMPTED, label attempt_submitted (attempt_id unseen).
- ATTEMPTED → MASTERED, label verdict_pass (gate contract complete).
- ATTEMPTED → IN_PROGRESS, label verdict_fail (scaffold floor 1).
- MASTERED → REVIEW_DUE, label review_due (now ≥ next_review_ts).
- REVIEW_DUE → MASTERED, label review_pass (target doubles, cap 365 d).
- REVIEW_DUE → IN_PROGRESS, label review_fail (target resets).

LOCKED is the unique source: no edge enters it. Three cycles carry the pedagogy — the remediation loop IN_PROGRESS → ATTEMPTED → IN_PROGRESS, the spacing loop MASTERED → REVIEW_DUE → MASTERED, and the relearning loop REVIEW_DUE → IN_PROGRESS → ATTEMPTED → MASTERED. Track completion (all 24 concepts MASTERED, ch. 3) ends teaching; the spacing loop continues.

**Orchestration.** One session traverses lesson → attempt → gate → feedback → advance/remediate; each phase names a script entry point and a persona rendering duty:

1. [script] next_step.py fires unlock and lesson_start, returns action, concept_id, content_ref, scaffold_level, attempt_no; phase lesson.
2. [persona] renders content_ref — wording only — and issues the gate task verbatim; phase awaiting_attempt.
3. [learner] replies; [persona] relays the raw text unjudged to gate_check.py with a fresh attempt_id.
4. [script] gate_check.py fires attempt_submitted, scores, fires verdict_pass or verdict_fail, appends the ledger line.
5. [script] schedule.py applies the gap rule on a mastery-completing pass — writes next_review_ts, appends review_scheduled; no-op otherwise.
6. [script] plan_recompute.py rebuilds plan.json — mandatory after every verdict (§4.2).
7. [persona] renders feedback strictly from the verdict's structured fields and states the next step; phase idle.

Every session MUST end in a persisted phase; if the learner goes silent, the phase recorded in state.json is the resume point.

**Remediation policy.** On verdict_fail, gate_check.py records the failure in ledger.jsonl, sets scaffold_level ← max(1, scaffold_level − 1) — never below 1 — increments failures_this_session, and at the second failure in one session sets deferred; next_step.py MUST NOT select a deferred concept until a new session begins. LLM feedback is composed strictly from the verifier's structured output (scores, per-item results, versioned explanations); the persona MUST NOT re-grade, add diagnosis, or predict future verdicts.

### 5.3 The Spaced-Repetition Engine

**Gap rule.** On any pass, schedule.py sets next_review_ts = last_pass_ts + gap with gap $= \max(1\,\text{day}, \operatorname{round}_{1/2\uparrow}(0.15 \times T))$, where $T$ is the concept's effective target in days. The 15% midpoint holds every gap inside the band of 10–20% of the retention interval that the spacing meta-analysis reports as optimal[^12^]; round-half-up removes rounding ambiguity ($0.15 \times 30 = 4.5 \rightarrow 5$). The floor never binds on the shipped targets (30/45/60 days) but MUST remain for future curricula. Each successful review doubles the effective target, $T \leftarrow \min(2T, 365)$; a failed review resets $T$ to the curriculum's target_retention_days (table row 8). gap is recomputed from the new $T$ on every pass.

**Execution.** The platform scheduler — `openclaw cron add` with chat delivery on OpenClaw, with the recurring heartbeat as fallback wake-up[^1^], and Hermes Agent's built-in cron with platform delivery on Hermes[^2^][^3^] (§4.3) — wakes a runtime session to invoke schedule.py. The script scans state.json, writes any missing next_review_ts, fires review_due transitions, and emits nudge payloads. The scheduler MUST NOT send messages: payloads are data; the persona renders them and the gateway delivers.

**Nudge etiquette.** At most one proactive message per day, sent only inside the learner-configured active_hours in state.json, naming the due concept, and accepting the one-word reply "GO", which opens the review session (next_step.py returns action review). Concepts that fall due while a nudge is suppressed wait for the next active window.

**Idempotency and audit.** Every mutation appends a ledger.jsonl event carrying its triggering event id, and those ids serve as idempotency keys: gate_check.py keys on attempt_id; schedule.py on (concept_id, next_review_ts); next_step.py on its lesson instance id. Re-running any script with identical input MUST NOT double-apply: a retried cron tick returns the recorded payload, a double-delivered reply the recorded verdict, with no second ledger line.

**Scheduler pseudocode.**

```text
function schedule(state_dir, skill_dir):
    state ← read(state.json);  keys ← ledger idempotency keys
    now ← utc_now();  due ← []
    for each concept c in state.concepts:
        if c.status = MASTERED and c.next_review_ts is null:   # pass not yet scheduled
            gap ← max(1, round_half_up(0.15 × c.target_days_effective))
            c.next_review_ts ← c.last_pass_ts + gap days
        if c.status = MASTERED and now ≥ c.next_review_ts:
            key ← "review_due|" + c.id + "|" + c.next_review_ts
            if key ∉ keys:                                     # idempotent
                c.status ← REVIEW_DUE;  append_ledger(review_due, key)
                due.append(c)
    payloads ← []
    if due ≠ [] and in_active_hours(now, state.json) and not nudged_today(state):
        payloads ← [ {concept_id: due[0].id, kind: "review_nudge"} ]   # ≤ 1 per day
        state.last_nudge_date ← date(now)
    atomic_write(state.json, state)
    return {ok: true, due, nudge_payloads: payloads, next_due_ts: earliest pending}
```

**Worked timing example.** Suppose C14 (target_retention_days = 45) is passed Monday 10:00 UTC. gap = round_half_up(0.15 × 45) = round_half_up(6.75) = 7 days — inside the 4.5–9 day band — so next_review_ts falls the following Monday 10:00. With the cron firing every 30 minutes (§4.3) and active_hours 08:00–21:00, the first tick at or after the due instant — the 10:00 tick itself — emits the payload, and the persona renders one nudge naming C14. "GO" opens the review: on pass, $T$ becomes 90 days and the next gap is round_half_up(13.5) = 14 days; on fail, $T$ resets to 45 and C14 re-enters the lesson loop at its current scaffold level. Had the pass landed at 22:30, the due instant would fall outside active hours and the nudge would hold until the first tick of the next active window; the one-nudge-per-day cap applies throughout.

## 6. Gates and Verifiers for Non-Coders

This chapter defines the four gate types behind every MASTERED, the verdict record each gate emits, and the operating rules that keep verdicts reproducible — the enforcement point of law L1: completion certainty rests on versioned, replayable machinery, never on model judgment.

### 6.1 The Four MVP Gate Types

**Gate selection (resolves open question 5.2).** The MVP ships exactly four gate types. **G1** is the seeded-error spot-the-hallucination drill: hallucination-risk awareness is training content the European Commission explicitly expects under EU AI Act Article 4[^9^]. **G2** is the regex/keyed gate, in two variants — PII redaction scored by exact string match, and scenario decisions keyed A/B/C. **G3** is the keyed adaptive quiz over versioned item banks. **G4** is rubric-anchored LLM scoring, admitted only for prompt-rewrite and teach-back, only behind versioned rubrics, and only on granular binary items — the one regime where LLM judging reaches κ≈0.75 agreement with human consensus[^15^], while holistic scoring fails outright (rank-order ≈ 0)[^17^]. Two research-backed candidates are excluded: source-triage is deferred to the roadmap (its fact-checker-derived keys, validated in lateral-reading research, exceed the MVP content budget)[^14^], and safe-use scenarios fold into G2's keyed variant, where the decision is deterministic and the rationale is only screened for forbidden misconception strings.

**Gate registry.** This table is the single source of truth binding concepts to verifiers; `gate_check.py` reads it to resolve each concept's `gate_id` (ch. 3) plus variant to one scoring path, one pass rule, and one versioned definition file. Scripts MUST NOT hard-code any row.

| Gate id | Type | Concepts served | Verifier kind | Pass rule |
|---|---|---|---|---|
| G1 | seeded-error spot-the-hallucination | C14, C15 | deterministic | recall = 1.0 AND precision ≥ 0.8 against the seeded key |
| G2 — redaction variant | regex/keyed (PII redaction) | C17 | deterministic | precision = recall = 1.0 on the seeded PII list |
| G2 — keyed-scenario variant | regex/keyed (scenario decision) | C20–C24 | deterministic | keyed option chosen AND no forbidden misconception string in rationale |
| G3 | keyed adaptive quiz | C01–C11, C16, C18, C19 (primary) | deterministic | all 3 drawn items correct; mastery = 2 consecutive passes ≥ 24 h apart |
| G4 | rubric-anchored LLM scoring | C12, C13 (prompt-rewrite); C05, C09, C13, C19, C23, C24 (module teach-back) | rubric-LLM | every required binary rubric item true |

The G3 row lists primary-gate service; module-final concepts additionally carry the G4 teach-back (ch. 3), so C05 completes only when its G3 mastery rule and its G4 teach-back have both passed. When `config.json` disables LLM gates (§6.3.4), the G4 row falls back to G3 service.

**Universal gate contract.** Every gate is a 4-tuple: a **task spec** (the versioned chat task text plus its key or rubric file under `$SKILL_DIR`), a **learner artifact** (the raw reply exactly as received), a **verifier script** (the `gate_check.py` scoring path for that registry row), and a **verdict record** (the JSON below). The verifier MUST emit a structured record carrying `gate_id`, `gate_version`, `attempt_id`, `scores`, `verdict`, and `evidence`; identical artifact + identical gate version MUST yield identical verdict — for LLM gates additionally requiring the same rubric version, the recorded model, and temperature 0 (ch. 4).

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "VerdictRecord",
  "type": "object",
  "required": ["gate_id", "gate_version", "attempt_id", "concept_id", "scores", "verdict", "evidence"],
  "additionalProperties": false,
  "properties": {
    "gate_id": { "enum": ["G1", "G2", "G3", "G4"] },
    "gate_version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
    "attempt_id": { "type": "string", "minLength": 1 },
    "concept_id": { "type": "string", "pattern": "^C(0[1-9]|1[0-9]|2[0-4])$" },
    "scores": { "type": "object", "minProperties": 1 },
    "verdict": { "enum": ["pass", "fail"] },
    "evidence": {
      "type": "object",
      "required": ["artifact_text", "artifact_sha256", "verifier", "details"],
      "additionalProperties": false,
      "properties": {
        "artifact_text": { "type": "string" },
        "artifact_sha256": { "type": "string", "pattern": "^[0-9a-f]{64}$" },
        "verifier": {
          "type": "object",
          "required": ["kind"],
          "properties": {
            "kind": { "enum": ["deterministic", "rubric_llm"] },
            "model": { "type": "string" },
            "temperature": { "type": "number" },
            "rubric_id": { "type": "string" },
            "rubric_version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" }
          }
        },
        "details": { "type": "object" }
      }
    }
  }
}
```

Field semantics: `gate_version` is the semver of the shipped gate definition — the key file for G1–G3, the rubric file for G4 — so replay loads the identical definition. `scores` carries the per-gate result object defined in §6.2. In `evidence`, `artifact_text` is the raw reply, hashed as SHA-256 over UTF-8 bytes; the `verifier` descriptor requires `model`, `temperature`, `rubric_id`, `rubric_version` exactly when `kind` is `rubric_llm`; `details` holds gate-specific reproduction data (key id and version, item draws, screen results). The `verdict` enum excludes parse outcomes: an unparseable reply emits no record (§6.3.2). Chapter 7 embeds this record verbatim as the `verdict_issued` payload; `concept_id` travels inside so the payload is self-contained.

### 6.2 Gate Specifications

**G1 — seeded-error spot-the-hallucination.** The task spec is a chat passage of $N$ numbered claims with $K$ planted false claims (the shipped C14 fixture: $N=9$, $K=4$); the learner replies with the numbers of the claims judged false, normalized by the §6.3.2 parser to a set $F$ and scored against the key $P$ in `keys/`. With recall $R = \frac{|P \cap F|}{|P|}$ and precision $Pr = \frac{|P \cap F|}{|F|}$, the pass rule is $R = 1.0$ AND $Pr \geq 0.8$ — every planted error found, at most one over-flag tolerated at $K=4$ ($Pr = 4/5$). `scores` reports `recall`, `precision`, `flagged`, `planted`.

**G2 — regex/keyed.** The **redaction variant** (C17) presents a message with $S$ seeded synthetic PII items from `keys/` — drill data is always fabricated (ch. 9) — and the learner returns it with every personal-data item replaced by the exact token `[REDACTED]`. Scoring is exact string matching: a surviving seeded item is a miss, a redaction not covering a seeded item is a false positive; pass = precision = recall = 1.0. The **keyed-scenario variant** (C20–C24) presents a short workplace scenario — situated decision tasks carry strong problem-based-learning evidence for skill application[^19^] — answered with one letter — A, B, or C — matched to the key. When the task also asks for a one-line rationale, it is screened deterministically for the key's forbidden misconception strings and MUST NOT be holistically scored: it can fail the attempt but never rescue a wrong option. `scores` reports `expected`/`found`/`extra` with precision and recall (redaction) or `chosen`, `keyed`, `misconception_hits` (scenario).

**G3 — keyed adaptive quiz (resolves open question 5.3).** Each G3-served concept ships at least 8 keyed items in `keys/`; an attempt draws 3 by a seeded RNG (seed = attempt id) favoring previously unasked items, so the bank is covered before it repeats. Pass = all 3 correct; mastery = 2 consecutive passes at least 24 hours apart, forcing retrieval on two separate days (P4); any fail resets the consecutive count. Partial progress — `consecutive_passes`, `last_pass_ts`, `asked_item_ids` — lives in `gate_progress` in state.json, mutated only by `gate_check.py`. The banked, re-tested format follows the PISA 2029 Media & AI Literacy assessment direction anchored in AILit[^8^].

**G4 — rubric-anchored LLM scoring.** G4 exists for exactly two task forms — prompt-rewrite (C12, C13) and teach-back (module-final concepts; expecting to teach measurably improves organization and recall[^18^]). A rubric is 3–6 granular binary items; pass = every required item true. The verifier prompt MUST embed the rubric id, its version, and two anchored exemplars (one pass, one fail), which measurably improve judge alignment[^17^]; the call runs at temperature 0 with the model identity recorded. Holistic scores, essay grading, and rank-ordering are FORBIDDEN: κ≈0.75 agreement holds only for granular anchored items[^15^], and holistic essay scoring shows zero rank-order agreement[^17^]. A teach-back attempt runs the rubric's deterministic misconception-string screen first — any hit fails the attempt without invoking the model — and only then the LLM binary items.

**Rubric schema.** Rubrics are versioned files, one per `{rubric_id}`, under `$SKILL_DIR/rubrics/`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "GateRubric",
  "type": "object",
  "required": ["rubric_id", "rubric_version", "gate_id", "concept_id", "task", "items", "anchors"],
  "additionalProperties": false,
  "properties": {
    "rubric_id": { "type": "string", "pattern": "^[a-z0-9_]+$" },
    "rubric_version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
    "gate_id": { "const": "G4" },
    "concept_id": { "type": "string", "pattern": "^C(0[1-9]|1[0-9]|2[0-4])$" },
    "task": { "enum": ["prompt_rewrite", "teach_back"] },
    "items": {
      "type": "array",
      "minItems": 3,
      "maxItems": 6,
      "items": {
        "type": "object",
        "required": ["item_id", "text", "required", "feedback_fail"],
        "additionalProperties": false,
        "properties": {
          "item_id": { "type": "string", "pattern": "^[a-z0-9_]+$" },
          "text": { "type": "string", "minLength": 1 },
          "required": { "type": "boolean" },
          "feedback_fail": { "type": "string", "minLength": 1 }
        }
      }
    },
    "misconception_strings": { "type": "array", "items": { "type": "string" }, "uniqueItems": true },
    "anchors": {
      "type": "object",
      "required": ["pass_example", "fail_example"],
      "additionalProperties": false,
      "properties": {
        "pass_example": { "type": "string", "minLength": 1 },
        "fail_example": { "type": "string", "minLength": 1 }
      }
    }
  }
}
```

One filled example, `rubrics/c13_teach_back.json` as shipped — four binary items, two exemplar anchors:

```json
{
  "rubric_id": "c13_teach_back",
  "rubric_version": "1.0.0",
  "gate_id": "G4",
  "concept_id": "C13",
  "task": "teach_back",
  "items": [
    {
      "item_id": "tb1",
      "text": "States that the system produces text by predicting likely next words from patterns in its training data.",
      "required": true,
      "feedback_fail": "Start with the mechanism: the AI writes by predicting which words are likely to come next, based on patterns it learned from training text."
    },
    {
      "item_id": "tb2",
      "text": "States that the system has no human-style knowledge, beliefs, or understanding behind its words.",
      "required": true,
      "feedback_fail": "One piece is missing: say plainly that the AI has no knowledge or beliefs like a person's — it produces likely words, not understanding."
    },
    {
      "item_id": "tb3",
      "text": "Explains why the output sounds confident: fluent, plausible phrasing is exactly what the system is trained to produce.",
      "required": true,
      "feedback_fail": "Add the 'why': the AI sounds sure of itself because producing smooth, plausible sentences is precisely what it was trained to do."
    },
    {
      "item_id": "tb4",
      "text": "Draws a practical consequence: important claims from an AI must be checked before they are relied on.",
      "required": true,
      "feedback_fail": "Close with the habit: anything important the AI says needs checking before you rely on it or pass it on."
    }
  ],
  "misconception_strings": [
    "the ai knows but",
    "it actually knows",
    "the ai understands",
    "it chooses to lie",
    "the ai is always right"
  ],
  "anchors": {
    "pass_example": "It doesn't know anything the way you and I do. It was trained on huge amounts of text and predicts which words are likely to come next, so the sentences come out smooth and confident even when they are wrong. That's why I double-check anything important it tells me.",
    "fail_example": "The AI is confident because it has read the whole internet and remembers everything, so it usually knows the answer and you can trust its tone of voice."
  }
}
```

The `anchors` are the exemplars the verifier prompt embeds verbatim; `feedback_fail` strings are the structured feedback delivered on failure, so remediation wording is rubric-authored, never improvised. Misconception strings match case-insensitively after §6.3.2 normalization and apply only to `teach_back` rubrics.

### 6.3 Gate Operations

**Rubric and key governance.** Rubrics and keys are versioned files shipped with the skill — `rubrics/{rubric_id}.json`, `keys/{key_id}.json`, each with a semver — and every verdict records the exact versions that produced it. Changing a rubric NEVER alters a past verdict: replay (ch. 7) loads the recorded version, so an amendment changes only future attempts.

**Answer-format enforcement.** A pre-verifier parser inside `gate_check.py` normalizes every reply before scoring: trim whitespace, case-fold, split lists on commas, semicolons, or whitespace, map connectives ("and", "then"), strip trailing punctuation. If normalization yields no valid artifact, the script returns `parse_error` (ch. 4) and the persona issues exactly one clarification request restating the quoted reply format; a second unparseable reply appends a failed-parse event (an `attempt_recorded` line with `outcome: "parse_error"`). A parse failure is never scored as a wrong answer: no verdict record, no `gate_progress` mutation.

**Key isolation.** `keys/` files and rubric anchors are read by scripts only. The persona MUST NOT quote or paraphrase them and MUST NOT reveal which claims were planted before the verdict; post-verdict explanations (ch. 1, step 11) draw exclusively on the returned record's `evidence`, never on a direct read of the key file.

**Calibration posture.** Formal κ-calibration of the G4 judge against human double-scored samples is a roadmap phase; the stated ceiling is human–human agreement itself, ~κ0.7–0.8 on structured tasks[^15^][^16^]. The MVP mitigates by construction — binary, anchored, few-item rubrics — and by the `feature_flags.llm_gates_enabled` kill-switch in config.json (ch. 4): when false, `gate_check.py` MUST serve G4-mapped concepts from their shipped G3-format quiz banks (shipped for every G4-served concept precisely so the fallback works), and no LLM verdict can be issued.

### 6.4 Worked End-to-End Examples

Four examples — one per gate type — in identical format: exact chat task text, raw learner reply, verifier input, verifier output, resulting ledger line. Every value is a real fixture: each artifact hash is the SHA-256 of the exact reply string shown, so every verdict recomputes by hand from its record. Ledger lines are single-line JSON with `event_id` (ULID), `ts` (ISO 8601 UTC), `type`, `concept_id`, `payload`; chapter 7 owns the full ledger schema.

**Example 1 — G1 seeded-error (C14).** The C14 gate task from ch. 1, step 5, scored end to end.

**Task text (sent verbatim in chat):**

> Check time. Below is a short biography an AI assistant wrote. Four of the nine claims are planted fabrications. Reply with the numbers of the false claims, comma-separated.
>
> 1. Grace Hopper was an American computer scientist and a rear admiral in the U.S. Navy.
> 2. She was born in London in 1906 and emigrated to New York as a child.
> 3. During World War II she worked on the Harvard Mark I computer.
> 4. Her team popularized the term "computer bug" after finding a moth stuck in a relay.
> 5. She single-handedly invented the COBOL programming language in 1952.
> 6. She argued that programs should be written in English-like words, not only in mathematical notation.
> 7. The Navy named a destroyer, USS Hopper, after her in 1971.
> 8. She retired as one of the oldest officers on active duty.
> 9. She received the Nobel Prize in Computer Science in 1986.

**Learner reply (raw, uninterpreted):**

> 2, 5, 7, 9

**Verifier input (`gate_check.py` stdin):**

```json
{"state_dir": "$STATE_DIR", "skill_dir": "$SKILL_DIR", "concept_id": "C14", "attempt_id": "att_c14_0007", "reply_text": "2, 5, 7, 9"}
```

**Verifier output (verdict record):**

```json
{
  "gate_id": "G1",
  "gate_version": "1.0.0",
  "attempt_id": "att_c14_0007",
  "concept_id": "C14",
  "scores": { "recall": 1.0, "precision": 1.0, "flagged": [2, 5, 7, 9], "planted": [2, 5, 7, 9] },
  "verdict": "pass",
  "evidence": {
    "artifact_text": "2, 5, 7, 9",
    "artifact_sha256": "2601b73b094cf2e21edd7979645dcf9ffbf457069b0a72a7b1c06dfaab27f578",
    "verifier": { "kind": "deterministic" },
    "details": { "key_id": "c14_seeded_bio", "key_version": "1.0.0", "claims_total": 9, "normalized_flags": [2, 5, 7, 9] }
  }
}
```

**Ledger line appended:**

```json
{"event_id": "01K4D0F8Z3QX7T2V9M6R1C5E8B", "ts": "2026-08-03T09:14:37Z", "type": "verdict_issued", "concept_id": "C14", "payload": {"gate_id": "G1", "gate_version": "1.0.0", "attempt_id": "att_c14_0007", "concept_id": "C14", "scores": {"recall": 1.0, "precision": 1.0, "flagged": [2, 5, 7, 9], "planted": [2, 5, 7, 9]}, "verdict": "pass", "evidence": {"artifact_text": "2, 5, 7, 9", "artifact_sha256": "2601b73b094cf2e21edd7979645dcf9ffbf457069b0a72a7b1c06dfaab27f578", "verifier": {"kind": "deterministic"}, "details": {"key_id": "c14_seeded_bio", "key_version": "1.0.0", "claims_total": 9, "normalized_flags": [2, 5, 7, 9]}}}}
```

All four planted claims found, nothing over-flagged: $R = 4/4 = 1.0$, $Pr = 4/4 = 1.0 \geq 0.8$ — PASS. The following `state_transition` line (ATTEMPTED → MASTERED) is ch. 1, step 8; only then may the persona explain which claims were planted.

**Example 2 — G2 redaction variant (C17).** An HR email carrying six seeded synthetic PII items; the learner redacts all six.

**Task text (sent verbatim in chat):**

> Final task. A colleague wants to paste the email below into a chatbot to get a reply drafted. Send back the same email, but replace every piece of personal data with [REDACTED] — exactly that token, in square brackets.
>
> Hi Ana — please draft a polite reminder for Marta Kowalska, born 14 March 1982. Her personal email is marta.kowalska@examplemail.com and her mobile is +48 601 223 445. Her national ID is 82031455667. She lives at ul. Słoneczna 12/4, 00-789 Warszawa.

**Learner reply (raw, uninterpreted):**

> Hi Ana — please draft a polite reminder for [REDACTED], born [REDACTED]. Her personal email is [REDACTED] and her mobile is [REDACTED]. Her national ID is [REDACTED]. She lives at [REDACTED].

**Verifier input (`gate_check.py` stdin):**

```json
{"state_dir": "$STATE_DIR", "skill_dir": "$SKILL_DIR", "concept_id": "C17", "attempt_id": "att_c17_0002", "reply_text": "Hi Ana — please draft a polite reminder for [REDACTED], born [REDACTED]. Her personal email is [REDACTED] and her mobile is [REDACTED]. Her national ID is [REDACTED]. She lives at [REDACTED]."}
```

**Verifier output (verdict record):**

```json
{
  "gate_id": "G2",
  "gate_version": "1.1.0",
  "attempt_id": "att_c17_0002",
  "concept_id": "C17",
  "scores": { "expected_redactions": 6, "found_redactions": 6, "extra_redactions": 0, "precision": 1.0, "recall": 1.0 },
  "verdict": "pass",
  "evidence": {
    "artifact_text": "Hi Ana — please draft a polite reminder for [REDACTED], born [REDACTED]. Her personal email is [REDACTED] and her mobile is [REDACTED]. Her national ID is [REDACTED]. She lives at [REDACTED].",
    "artifact_sha256": "ff2b34d7639bb6f623ee819162ef226e8887f2294071674a846b697efab83bbb",
    "verifier": { "kind": "deterministic" },
    "details": { "key_id": "c17_pii_email", "key_version": "1.1.0", "seeded_items_remaining": [], "unseeded_redactions": [] }
  }
}
```

**Ledger line appended:**

```json
{"event_id": "01K4HA3N6P2XW9D8Q5B7T4R0SC", "ts": "2026-08-05T17:41:12Z", "type": "verdict_issued", "concept_id": "C17", "payload": {"gate_id": "G2", "gate_version": "1.1.0", "attempt_id": "att_c17_0002", "concept_id": "C17", "scores": {"expected_redactions": 6, "found_redactions": 6, "extra_redactions": 0, "precision": 1.0, "recall": 1.0}, "verdict": "pass", "evidence": {"artifact_text": "Hi Ana — please draft a polite reminder for [REDACTED], born [REDACTED]. Her personal email is [REDACTED] and her mobile is [REDACTED]. Her national ID is [REDACTED]. She lives at [REDACTED].", "artifact_sha256": "ff2b34d7639bb6f623ee819162ef226e8887f2294071674a846b697efab83bbb", "verifier": {"kind": "deterministic"}, "details": {"key_id": "c17_pii_email", "key_version": "1.1.0", "seeded_items_remaining": [], "unseeded_redactions": []}}}}
```

No seeded string survives and no unseeded text was redacted, so precision = recall = 1.0 — PASS. Redacting "Ana" as well would make `extra_redactions` 1 and fail the attempt on precision: the verifier checks strings, not intentions.

**Example 3 — G3 keyed adaptive quiz (C05).** Two passing attempts across two days; the second triggers mastery. Attempt one, 2026-08-06:

**Task text (sent verbatim in chat):**

> Quiz on probability — 3 questions. Reply with just the three letters in order, like: A C B.
>
> 1. An AI says: "I'm 90% sure this email is spam." What does the 90% mean?
> A) It is mostly guessing
> B) It will be right in about 90 out of 100 similar cases
> C) It checked 90% of the words
>
> 2. A weather app says 70% chance of rain, and the day stays dry. Was the forecast wrong?
> A) No — 70% still means about 3 dry days in 10
> B) Yes
> C) Only if it happens twice in a row
>
> 3. Why do AI systems give probabilities instead of plain yes-or-no answers?
> A) To sound scientific
> B) To save computing power
> C) Because they work from patterns in data, so some uncertainty always remains

**Learner reply (raw, uninterpreted):**

> B, A, C

**Verifier input (`gate_check.py` stdin):**

```json
{"state_dir": "$STATE_DIR", "skill_dir": "$SKILL_DIR", "concept_id": "C05", "attempt_id": "att_c05_0003", "reply_text": "B, A, C"}
```

**Verifier output (verdict record):**

```json
{
  "gate_id": "G3",
  "gate_version": "2.0.0",
  "attempt_id": "att_c05_0003",
  "concept_id": "C05",
  "scores": {
    "items": [
      { "item_id": "c05_q03", "given": "B", "keyed": "B", "correct": true },
      { "item_id": "c05_q06", "given": "A", "keyed": "A", "correct": true },
      { "item_id": "c05_q01", "given": "C", "keyed": "C", "correct": true }
    ],
    "correct": 3, "of": 3, "consecutive_passes": 1
  },
  "verdict": "pass",
  "evidence": {
    "artifact_text": "B, A, C",
    "artifact_sha256": "454edfe72ae2fad0db3d5c9e6b64ced11a3c2d987eaab416df1cf0edf7b9d294",
    "verifier": { "kind": "deterministic" },
    "details": { "key_id": "c05_quiz_bank", "key_version": "2.0.0", "bank_size": 9, "draw_seed": "att_c05_0003", "last_pass_ts": "2026-08-06T08:02:11Z", "mastery_rule_met": false }
  }
}
```

**Ledger line appended:**

```json
{"event_id": "01K4P6Y1E8R3N0A2X9W7T5M4QD", "ts": "2026-08-06T08:02:11Z", "type": "verdict_issued", "concept_id": "C05", "payload": {"gate_id": "G3", "gate_version": "2.0.0", "attempt_id": "att_c05_0003", "concept_id": "C05", "scores": {"items": [{"item_id": "c05_q03", "given": "B", "keyed": "B", "correct": true}, {"item_id": "c05_q06", "given": "A", "keyed": "A", "correct": true}, {"item_id": "c05_q01", "given": "C", "keyed": "C", "correct": true}], "correct": 3, "of": 3, "consecutive_passes": 1}, "verdict": "pass", "evidence": {"artifact_text": "B, A, C", "artifact_sha256": "454edfe72ae2fad0db3d5c9e6b64ced11a3c2d987eaab416df1cf0edf7b9d294", "verifier": {"kind": "deterministic"}, "details": {"key_id": "c05_quiz_bank", "key_version": "2.0.0", "bank_size": 9, "draw_seed": "att_c05_0003", "last_pass_ts": "2026-08-06T08:02:11Z", "mastery_rule_met": false}}}}
```

Pass one of two: `consecutive_passes` becomes 1, `mastery_rule_met` stays false, and C05 remains ATTEMPTED. Attempt two, 2026-08-07 — 24.5 hours later, with the draw favoring the six previously unasked bank items:

**Task text (sent verbatim in chat):**

> Day-two check on probability — 3 new questions, same drill: reply with the three letters in order.
>
> 1. A hospital's AI flags a scan as "5% risk." What is the safest reading?
> A) There is no problem
> B) The AI is broken
> C) A small risk is still a risk — a person should look
>
> 2. Two spam filters score the same email 60% and 95%. Can both be reasonable?
> A) Yes — they learned from different data, so their estimates differ
> B) No, one must be broken
> C) Only the higher one
>
> 3. Your map app says the trip "usually takes 20 minutes" and today it takes 35. The app was:
> A) Lying
> B) Broken
> C) Giving an average, not a promise

**Learner reply (raw, uninterpreted):**

> C, A, C

**Verifier input (`gate_check.py` stdin):**

```json
{"state_dir": "$STATE_DIR", "skill_dir": "$SKILL_DIR", "concept_id": "C05", "attempt_id": "att_c05_0004", "reply_text": "C, A, C"}
```

**Verifier output (verdict record):**

```json
{
  "gate_id": "G3",
  "gate_version": "2.0.0",
  "attempt_id": "att_c05_0004",
  "concept_id": "C05",
  "scores": {
    "items": [
      { "item_id": "c05_q02", "given": "C", "keyed": "C", "correct": true },
      { "item_id": "c05_q04", "given": "A", "keyed": "A", "correct": true },
      { "item_id": "c05_q08", "given": "C", "keyed": "C", "correct": true }
    ],
    "correct": 3, "of": 3, "consecutive_passes": 2
  },
  "verdict": "pass",
  "evidence": {
    "artifact_text": "C, A, C",
    "artifact_sha256": "46b1c9636b819330b13544e38c3054f937680c3f52d0ad9d7eccd9e2d3b26142",
    "verifier": { "kind": "deterministic" },
    "details": { "key_id": "c05_quiz_bank", "key_version": "2.0.0", "bank_size": 9, "draw_seed": "att_c05_0004", "hours_since_first_pass": 24.5, "mastery_rule_met": true }
  }
}
```

**Ledger lines appended:**

```json
{"event_id": "01K4RD5C2B9X8Y6V0N3P7K1J4E", "ts": "2026-08-07T08:31:44Z", "type": "verdict_issued", "concept_id": "C05", "payload": {"gate_id": "G3", "gate_version": "2.0.0", "attempt_id": "att_c05_0004", "concept_id": "C05", "scores": {"items": [{"item_id": "c05_q02", "given": "C", "keyed": "C", "correct": true}, {"item_id": "c05_q04", "given": "A", "keyed": "A", "correct": true}, {"item_id": "c05_q08", "given": "C", "keyed": "C", "correct": true}], "correct": 3, "of": 3, "consecutive_passes": 2}, "verdict": "pass", "evidence": {"artifact_text": "C, A, C", "artifact_sha256": "46b1c9636b819330b13544e38c3054f937680c3f52d0ad9d7eccd9e2d3b26142", "verifier": {"kind": "deterministic"}, "details": {"key_id": "c05_quiz_bank", "key_version": "2.0.0", "bank_size": 9, "draw_seed": "att_c05_0004", "hours_since_first_pass": 24.5, "mastery_rule_met": true}}}}
{"event_id": "01K4RE9H3F6T1M8Z2P5Q7X0W4F", "ts": "2026-08-07T08:31:44Z", "type": "state_transition", "concept_id": "C05", "payload": {"from": "ATTEMPTED", "to": "MASTERED", "trigger_event_id": "01K4RD5C2B9X8Y6V0N3P7K1J4E"}}
```

The second consecutive pass, 24.5 hours after the first, satisfies the §6.2 mastery rule: `mastery_rule_met` flips true. C05 is module-final, so the ch. 5 ATTEMPTED→MASTERED guard also requires its G4 teach-back pass — already recorded in `gate_progress` from a `c05_teach_back` verdict administered between the day-1 and day-2 quiz attempts (the ≥24 h spacing is measured between the two quiz passes, so interleaving the teach-back does not disturb it). With both conditions true, C05 transitions ATTEMPTED → MASTERED. A second pass only 20 hours later would still record a pass but append no transition.

**Example 4 — G4 rubric-anchored LLM scoring (C13 teach-back, M3's module-final).** Scored against `c13_teach_back` v1.0.0 (§6.2); the misconception screen runs first and comes back clean, then the model judges the four binary items at temperature 0 — one fails.

**Task text (sent verbatim in chat):**

> Final task for this concept. Imagine a colleague asks you: "Why does the AI sound so sure of itself — does it actually know this stuff?" Explain it to them in your own words, in 3 to 5 sentences.

**Learner reply (raw, uninterpreted):**

> It's like autocomplete gone to university. It doesn't look things up — it guesses the next word based on everything it read, and because fluent sentences are what it was trained to make, it always sounds sure of itself. So anything that matters, I verify before I pass it on.

**Verifier input (`gate_check.py` stdin):**

```json
{"state_dir": "$STATE_DIR", "skill_dir": "$SKILL_DIR", "concept_id": "C13", "attempt_id": "att_c13_0005", "reply_text": "It's like autocomplete gone to university. It doesn't look things up — it guesses the next word based on everything it read, and because fluent sentences are what it was trained to make, it always sounds sure of itself. So anything that matters, I verify before I pass it on."}
```

**Verifier output (verdict record):**

```json
{
  "gate_id": "G4",
  "gate_version": "1.0.0",
  "attempt_id": "att_c13_0005",
  "concept_id": "C13",
  "scores": {
    "rubric_id": "c13_teach_back",
    "items": [
      { "item_id": "tb1", "pass": true },
      { "item_id": "tb2", "pass": false, "feedback": "One piece is missing: say plainly that the AI has no knowledge or beliefs like a person's — it produces likely words, not understanding." },
      { "item_id": "tb3", "pass": true },
      { "item_id": "tb4", "pass": true }
    ],
    "items_true": 3, "items_required": 4
  },
  "verdict": "fail",
  "evidence": {
    "artifact_text": "It's like autocomplete gone to university. It doesn't look things up — it guesses the next word based on everything it read, and because fluent sentences are what it was trained to make, it always sounds sure of itself. So anything that matters, I verify before I pass it on.",
    "artifact_sha256": "f41bbe5782d8769305c1eaa147f94bac710c5da115bf10e93ac456ee8aaf9fc1",
    "verifier": { "kind": "rubric_llm", "model": "anthropic/claude-sonnet-4-5", "temperature": 0, "rubric_id": "c13_teach_back", "rubric_version": "1.0.0" },
    "details": { "misconception_screen": { "result": "clean", "strings_checked": 5 }, "items_evaluated": 4 }
  }
}
```

**Ledger line appended:**

```json
{"event_id": "01K4XG7T2P9N5B3Q8R6Y0D1W4G", "ts": "2026-08-10T19:03:27Z", "type": "verdict_issued", "concept_id": "C13", "payload": {"gate_id": "G4", "gate_version": "1.0.0", "attempt_id": "att_c13_0005", "concept_id": "C13", "scores": {"rubric_id": "c13_teach_back", "items": [{"item_id": "tb1", "pass": true}, {"item_id": "tb2", "pass": false, "feedback": "One piece is missing: say plainly that the AI has no knowledge or beliefs like a person's — it produces likely words, not understanding."}, {"item_id": "tb3", "pass": true}, {"item_id": "tb4", "pass": true}], "items_true": 3, "items_required": 4}, "verdict": "fail", "evidence": {"artifact_text": "It's like autocomplete gone to university. It doesn't look things up — it guesses the next word based on everything it read, and because fluent sentences are what it was trained to make, it always sounds sure of itself. So anything that matters, I verify before I pass it on.", "artifact_sha256": "f41bbe5782d8769305c1eaa147f94bac710c5da115bf10e93ac456ee8aaf9fc1", "verifier": {"kind": "rubric_llm", "model": "anthropic/claude-sonnet-4-5", "temperature": 0, "rubric_id": "c13_teach_back", "rubric_version": "1.0.0"}, "details": {"misconception_screen": {"result": "clean", "strings_checked": 5}, "items_evaluated": 4}}}}
```

Item tb2 fails: the reply implies the limitation ("it doesn't look things up") but never states the absence of human-style knowledge behind the words, and the pass rule admits no partial credit. The persona delivers tb2's `feedback_fail` verbatim; the failed verdict returns C13 to IN_PROGRESS one scaffold level down (ch. 5). Replay needs only the artifact, rubric v1.0.0, and the recorded model at temperature 0.

## 7. Evidence Ledger and the Living Learning Plan

### 7.1 The Append-Only Evidence Ledger

Every fact about what the learner did, what the verifier decided, and how the state machine moved is one line in `ledger.jsonl` under $STATE_DIR — newline-delimited JSON, one event object per line. Scripts ONLY append — never update, delete, or reorder — and the language model never writes the file at all (law L2). Every attempt, verdict, and state transition MUST appear. Three transitions ride on typed events — `lesson_delivered` moves AVAILABLE → IN_PROGRESS, `attempt_recorded` moves IN_PROGRESS → ATTEMPTED, `review_due` moves MASTERED → REVIEW_DUE; the remaining ch. 5 rows append `state_transition` lines. One gate cycle thus writes five consecutive lines in a fixed pipeline: `gate_check.py` (attempt, verdict, transition), then `schedule.py` (review scheduling), then `plan_recompute.py` (plan).

Every line conforms to one envelope schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "LedgerEvent",
  "type": "object",
  "required": ["event_id", "ts", "type", "concept_id", "payload", "prev_sha256"],
  "additionalProperties": false,
  "properties": {
    "event_id": { "type": "string", "pattern": "^[0-9A-HJKMNP-TV-Z]{26}$" },
    "ts": { "type": "string", "format": "date-time" },
    "type": { "enum": ["session_started", "lesson_delivered", "attempt_recorded", "verdict_issued", "state_transition", "review_scheduled", "review_due", "plan_recomputed"] },
    "concept_id": { "type": ["string", "null"], "pattern": "^C(0[1-9]|1[0-9]|2[0-4])$" },
    "payload": { "type": "object", "minProperties": 1 },
    "prev_sha256": { "type": ["string", "null"], "pattern": "^[0-9a-f]{64}$" }
  }
}
```

`event_id` is a ULID — time-sortable, minted by the appending script; `ts` is ISO 8601 UTC; `concept_id` names the concept the event concerns and is null only for session-level rows with no current concept; `payload` is type-specific:

| Event type | Appended by | Payload fields |
|---|---|---|
| session_started | next_step.py | session_id, origin (`learner` / `nudge` / `cron`) |
| lesson_delivered | next_step.py | lesson_id (idempotency key), content_ref, scaffold_level |
| attempt_recorded | gate_check.py | attempt_id (idempotency key), gate_id, artifact_text, artifact_sha256, outcome (`parsed` / `parse_error`) |
| verdict_issued | gate_check.py | the ch. 6 VerdictRecord, verbatim and self-contained |
| state_transition | next_step.py (unlock); gate_check.py (verdicts) | from, to, trigger_event_id |
| review_scheduled | schedule.py | target_days_effective, gap_days, next_review_ts, trigger_event_id |
| review_due | schedule.py | next_review_ts, idem_key `review_due\|<concept_id>\|<next_review_ts>` |
| plan_recomputed | plan_recompute.py | plan_version, diff_summary, trigger_event_id |

In `state_transition`, `from` and `to` take the six ch. 5 state tokens; `trigger_event_id` chains every mutation to its cause — the property that makes replay a fold, not an inference. Adopting the ch. 6 parse convention, a reply the parser cannot normalize is never scored as a wrong answer: a second unparseable reply is logged as `attempt_recorded` with `outcome: "parse_error"` — an attempt on record, no verdict, no `gate_progress` mutation.

**Tamper evidence.** Each line MUST store `prev_sha256`, the SHA-256 of the previous line exactly as written (UTF-8 bytes, excluding the terminating newline); the genesis line carries null. `ledger_verify.py` — a read-only operator tool — MUST validate the schema and chain of every line and exit 2 on the first violation (ch. 4's inconsistency convention), reporting the line number. A rewritten, inserted, or deleted historical line breaks the chain at exactly one point.

**The replay rule.** Any mastery claim MUST be reconstructible from `ledger.jsonl` alone. `replay.py` folds the ledger over curriculum.json, rebuilds the per-concept fields of state.json — status, scaffold_level, attempts, gate_progress, target_days_effective, next_review_ts — into a scratch file, never over state.json, and the rebuilt values MUST match live state.json on those fields; session-ephemeral fields (session_phase, current_concept, nudge bookkeeping) are excluded as rendering cache, not evidence (ch. 5). This is the executable proof of law L1 — a completion fact held only in model memory would make replay diverge.

The five lines below replay the ch. 1 C14 cycle; line 2's payload is the ch. 6 G1 verdict record, verbatim. Lines 2–5 chain verifiably — each `prev_sha256` is the SHA-256 of the preceding line as printed; line 1's points to the preceding `lesson_delivered` line, omitted for brevity.

```json
{"event_id": "01K4D0F8Z2M3N7P1R6T9V4X0C5", "ts": "2026-08-03T09:14:36Z", "type": "attempt_recorded", "concept_id": "C14", "payload": {"attempt_id": "att_c14_0007", "gate_id": "G1", "artifact_text": "2, 5, 7, 9", "artifact_sha256": "2601b73b094cf2e21edd7979645dcf9ffbf457069b0a72a7b1c06dfaab27f578", "outcome": "parsed"}, "prev_sha256": "21946069dd331af1b94ce36bc007addf62c62cafa1ea287cb87071c76f74fbce"}
{"event_id": "01K4D0F8Z3QX7T2V9M6R1C5E8B", "ts": "2026-08-03T09:14:37Z", "type": "verdict_issued", "concept_id": "C14", "payload": {"gate_id": "G1", "gate_version": "1.0.0", "attempt_id": "att_c14_0007", "concept_id": "C14", "scores": {"recall": 1.0, "precision": 1.0, "flagged": [2, 5, 7, 9], "planted": [2, 5, 7, 9]}, "verdict": "pass", "evidence": {"artifact_text": "2, 5, 7, 9", "artifact_sha256": "2601b73b094cf2e21edd7979645dcf9ffbf457069b0a72a7b1c06dfaab27f578", "verifier": {"kind": "deterministic"}, "details": {"key_id": "c14_seeded_bio", "key_version": "1.0.0", "claims_total": 9, "normalized_flags": [2, 5, 7, 9]}}}, "prev_sha256": "f17e47c975ef15dad6868dd3598c500808cc6515f9ff33f0e64411cf7623dc1c"}
{"event_id": "01K4D0F8Z3QX7T2V9M6R1C5E8C", "ts": "2026-08-03T09:14:37Z", "type": "state_transition", "concept_id": "C14", "payload": {"from": "ATTEMPTED", "to": "MASTERED", "trigger_event_id": "01K4D0F8Z3QX7T2V9M6R1C5E8B"}, "prev_sha256": "c0c90260cd1a46299460cd2513c696517276049e73ada535773e2851eb946c10"}
{"event_id": "01K4D0F8Z4H8K2N6Q0T5W9B3D7", "ts": "2026-08-03T09:14:38Z", "type": "review_scheduled", "concept_id": "C14", "payload": {"target_days_effective": 45, "gap_days": 7, "next_review_ts": "2026-08-10T09:14:37Z", "trigger_event_id": "01K4D0F8Z3QX7T2V9M6R1C5E8C"}, "prev_sha256": "40bda9faf0d44fe43d65c4025c5fa555768cd87d8c587748add61c7f0e89c745"}
{"event_id": "01K4D0F8Z5R1T6X0B4E8H2M7P3", "ts": "2026-08-03T09:14:39Z", "type": "plan_recomputed", "concept_id": "C14", "payload": {"plan_version": 64, "diff_summary": "C14 ATTEMPTED->MASTERED, review 2026-08-10; C15 LOCKED->AVAILABLE; mastered 13->14; next_available []->[C15]", "trigger_event_id": "01K4D0F8Z4H8K2N6Q0T5W9B3D7"}, "prev_sha256": "97f5d0db00985b3145cbcf5f12ab4fb2401078a4fef973466754c6a1d0eca7d3"}
```

The `review_scheduled` line preserves the ch. 5 gap computation — target, gap, due instant — so the 10–20%-of-target spacing band is auditable from the ledger alone[^12^] (45 days → 7 days here). The last line's `diff_summary` is the plain-word delta the recompute rule below mandates.

### 7.2 The Living Learning Plan

plan.json is the learner-facing projection of the same truth: script-generated, rewritten wholesale after every gate verdict and review event, never edited by the LLM. It carries per-concept status, next available concepts, due reviews with dates, scaffold levels, and attempt counts — plus, because `progress_card.py` reads only $STATE_DIR (ch. 4), the display strings the card needs: module and concept titles and the five status words. Six machine states map onto five learner-facing words; IN_PROGRESS and ATTEMPTED both render "In progress".

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "LearningPlan",
  "type": "object",
  "required": ["plan_version", "generated_at", "trigger_event_id", "counts", "next_available", "due_reviews", "modules"],
  "additionalProperties": false,
  "properties": {
    "plan_version": { "type": "integer", "minimum": 1 },
    "generated_at": { "type": "string", "format": "date-time" },
    "trigger_event_id": { "type": "string", "pattern": "^[0-9A-HJKMNP-TV-Z]{26}$" },
    "counts": {
      "type": "object",
      "required": ["mastered", "in_progress", "review_due", "remaining"],
      "additionalProperties": false,
      "properties": {
        "mastered": { "type": "integer", "minimum": 0 },
        "in_progress": { "type": "integer", "minimum": 0 },
        "review_due": { "type": "integer", "minimum": 0 },
        "remaining": { "type": "integer", "minimum": 0 }
      }
    },
    "next_available": { "type": "array", "items": { "type": "string", "pattern": "^C(0[1-9]|1[0-9]|2[0-4])$" }, "uniqueItems": true },
    "due_reviews": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["concept_id", "due_ts"],
        "additionalProperties": false,
        "properties": {
          "concept_id": { "type": "string", "pattern": "^C(0[1-9]|1[0-9]|2[0-4])$" },
          "due_ts": { "type": "string", "format": "date-time" }
        }
      }
    },
    "modules": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["module", "title", "concepts"],
        "additionalProperties": false,
        "properties": {
          "module": { "type": "string", "pattern": "^M[1-6]$" },
          "title": { "type": "string", "minLength": 1 },
          "concepts": {
            "type": "array",
            "minItems": 1,
            "items": {
              "type": "object",
              "required": ["concept_id", "title", "status", "status_word", "scaffold_level", "attempts", "next_review_ts"],
              "additionalProperties": false,
              "properties": {
                "concept_id": { "type": "string", "pattern": "^C(0[1-9]|1[0-9]|2[0-4])$" },
                "title": { "type": "string", "minLength": 1 },
                "status": { "enum": ["LOCKED", "AVAILABLE", "IN_PROGRESS", "ATTEMPTED", "MASTERED", "REVIEW_DUE"] },
                "status_word": { "enum": ["Locked", "Available", "In progress", "Mastered", "Review due"] },
                "scaffold_level": { "type": ["integer", "null"], "minimum": 1, "maximum": 3 },
                "attempts": { "type": "integer", "minimum": 0 },
                "next_review_ts": { "type": ["string", "null"], "format": "date-time" }
              }
            }
          }
        }
      }
    }
  }
}
```

One filled example — the same learner as the §7.1 trace, thirteen days earlier: eight gates passed (C01–C08), C01's review fallen due that morning, C09 unlocked and waiting:

```json
{
  "plan_version": 41,
  "generated_at": "2026-07-21T09:00:07Z",
  "trigger_event_id": "01K39ZK7T2W8N0P4R6V1X5B9D3",
  "counts": { "mastered": 7, "in_progress": 0, "review_due": 1, "remaining": 16 },
  "next_available": ["C09"],
  "due_reviews": [
    { "concept_id": "C01", "due_ts": "2026-07-21T08:45:00Z" },
    { "concept_id": "C02", "due_ts": "2026-07-22T08:50:00Z" },
    { "concept_id": "C03", "due_ts": "2026-07-23T08:55:00Z" },
    { "concept_id": "C04", "due_ts": "2026-07-24T09:00:00Z" },
    { "concept_id": "C05", "due_ts": "2026-07-26T08:40:00Z" },
    { "concept_id": "C06", "due_ts": "2026-07-27T08:45:00Z" },
    { "concept_id": "C07", "due_ts": "2026-07-28T08:50:00Z" }
  ],
  "modules": [
    { "module": "M1", "title": "What AI is", "concepts": [
      { "concept_id": "C01", "title": "What AI is — and what it is not", "status": "REVIEW_DUE", "status_word": "Review due", "scaffold_level": null, "attempts": 3, "next_review_ts": "2026-07-21T08:45:00Z" },
      { "concept_id": "C02", "title": "AI in daily life", "status": "MASTERED", "status_word": "Mastered", "scaffold_level": null, "attempts": 3, "next_review_ts": "2026-07-22T08:50:00Z" },
      { "concept_id": "C03", "title": "Rules vs. learned behavior", "status": "MASTERED", "status_word": "Mastered", "scaffold_level": null, "attempts": 3, "next_review_ts": "2026-07-23T08:55:00Z" },
      { "concept_id": "C04", "title": "Search and problem solving", "status": "MASTERED", "status_word": "Mastered", "scaffold_level": null, "attempts": 3, "next_review_ts": "2026-07-24T09:00:00Z" },
      { "concept_id": "C05", "title": "Probability and uncertainty", "status": "MASTERED", "status_word": "Mastered", "scaffold_level": null, "attempts": 4, "next_review_ts": "2026-07-26T08:40:00Z" }
    ]},
    { "module": "M2", "title": "How AI learns from data", "concepts": [
      { "concept_id": "C06", "title": "Data: garbage in, garbage out", "status": "MASTERED", "status_word": "Mastered", "scaffold_level": null, "attempts": 3, "next_review_ts": "2026-07-27T08:45:00Z" },
      { "concept_id": "C07", "title": "Learning patterns from examples", "status": "MASTERED", "status_word": "Mastered", "scaffold_level": null, "attempts": 3, "next_review_ts": "2026-07-28T08:50:00Z" },
      { "concept_id": "C08", "title": "Training vs. using a model", "status": "MASTERED", "status_word": "Mastered", "scaffold_level": null, "attempts": 3, "next_review_ts": "2026-07-29T08:55:00Z" },
      { "concept_id": "C09", "title": "Classification and prediction errors", "status": "AVAILABLE", "status_word": "Available", "scaffold_level": null, "attempts": 0, "next_review_ts": null }
    ]},
    { "module": "M3", "title": "Generative AI and LLMs", "concepts": [
      { "concept_id": "C10", "title": "Neural networks and generative AI", "status": "LOCKED", "status_word": "Locked", "scaffold_level": null, "attempts": 0, "next_review_ts": null },
      { "concept_id": "C11", "title": "Why LLMs sound confident but do not \"know\"", "status": "LOCKED", "status_word": "Locked", "scaffold_level": null, "attempts": 0, "next_review_ts": null },
      { "concept_id": "C12", "title": "Prompts as instructions", "status": "LOCKED", "status_word": "Locked", "scaffold_level": null, "attempts": 0, "next_review_ts": null },
      { "concept_id": "C13", "title": "Iterating prompts", "status": "LOCKED", "status_word": "Locked", "scaffold_level": null, "attempts": 0, "next_review_ts": null }
    ]},
    { "module": "M4", "title": "Using AI critically", "concepts": [
      { "concept_id": "C14", "title": "Hallucinations: why fabricated facts arise", "status": "LOCKED", "status_word": "Locked", "scaffold_level": null, "attempts": 0, "next_review_ts": null },
      { "concept_id": "C15", "title": "Verification habits", "status": "LOCKED", "status_word": "Locked", "scaffold_level": null, "attempts": 0, "next_review_ts": null },
      { "concept_id": "C19", "title": "Source evaluation and misinformation", "status": "LOCKED", "status_word": "Locked", "scaffold_level": null, "attempts": 0, "next_review_ts": null }
    ]},
    { "module": "M5", "title": "Using AI responsibly", "concepts": [
      { "concept_id": "C16", "title": "Bias in data, bias in outputs", "status": "LOCKED", "status_word": "Locked", "scaffold_level": null, "attempts": 0, "next_review_ts": null },
      { "concept_id": "C17", "title": "Privacy: what never goes into a chatbot", "status": "LOCKED", "status_word": "Locked", "scaffold_level": null, "attempts": 0, "next_review_ts": null },
      { "concept_id": "C18", "title": "Data ownership, consent, and copyright", "status": "LOCKED", "status_word": "Locked", "scaffold_level": null, "attempts": 0, "next_review_ts": null },
      { "concept_id": "C21", "title": "Human oversight and accountability", "status": "LOCKED", "status_word": "Locked", "scaffold_level": null, "attempts": 0, "next_review_ts": null },
      { "concept_id": "C23", "title": "Transparency: disclosing AI use", "status": "LOCKED", "status_word": "Locked", "scaffold_level": null, "attempts": 0, "next_review_ts": null }
    ]},
    { "module": "M6", "title": "AI at work and in society", "concepts": [
      { "concept_id": "C20", "title": "Delegation judgment: when (not) to use AI", "status": "LOCKED", "status_word": "Locked", "scaffold_level": null, "attempts": 0, "next_review_ts": null },
      { "concept_id": "C22", "title": "Workplace use cases and safe workflows", "status": "LOCKED", "status_word": "Locked", "scaffold_level": null, "attempts": 0, "next_review_ts": null },
      { "concept_id": "C24", "title": "Societal and economic implications", "status": "LOCKED", "status_word": "Locked", "scaffold_level": null, "attempts": 0, "next_review_ts": null }
    ]}
  ]
}
```

`due_reviews` lists every review due within seven days of `generated_at`, ascending; C08's review, due on day eight, is correctly absent. `counts.mastered` reads 7, not 8: the due review moved C01 out of MASTERED, and only the review verdict moves it back (ch. 5). Null marks fields with no active session or schedule.

**The recompute rule.** `plan_recompute.py` is a pure function of the curriculum graph, state.json, and the ledger. It MUST run after each gate verdict and every review event (`review_scheduled`, `review_due`, review verdicts); it increments `plan_version`, stamps `generated_at` and the causing `trigger_event_id`, and appends `plan_recomputed` with a plain-word `diff_summary`. Re-running with an already-recorded `trigger_event_id` MUST NOT double-apply (idempotency keys, ch. 5).

**The progress card.** `progress_card.py` renders plan.json verbatim as plain chat text: a counts line; one section per module, one line per concept with its `status_word`; a "next up" line naming the in-flight concept or the head of `next_available`; and a "reviews this week" line listing `due_reviews` with weekdays, the due-today entry inviting the one-word reply "GO" (ch. 5). The card MUST fit a phone screen — about 40 lines, no charts. The same moment rendered (40 lines):

```text
Progress · AI Fluency Foundations
7 of 24 mastered · 1 review due · 16 to go
M1 · What AI is
C01 What AI is — and what it is not — Review due
C02 AI in daily life — Mastered
C03 Rules vs. learned behavior — Mastered
C04 Search and problem solving — Mastered
C05 Probability and uncertainty — Mastered

M2 · How AI learns from data
C06 Data: garbage in, garbage out — Mastered
C07 Learning patterns from examples — Mastered
C08 Training vs. using a model — Mastered
C09 Classification and prediction errors — Available

M3 · Generative AI and LLMs
C10 Neural networks and generative AI — Locked
C11 Why LLMs sound confident but do not "know" — Locked
C12 Prompts as instructions — Locked
C13 Iterating prompts — Locked

M4 · Using AI critically
C14 Hallucinations: why fabricated facts arise — Locked
C15 Verification habits — Locked
C19 Source evaluation and misinformation — Locked

M5 · Using AI responsibly
C16 Bias in data, bias in outputs — Locked
C17 Privacy: what never goes into a chatbot — Locked
C18 Data ownership, consent, and copyright — Locked
C21 Human oversight and accountability — Locked
C23 Transparency: disclosing AI use — Locked

M6 · AI at work and in society
C20 Delegation judgment: when (not) to use AI — Locked
C22 Workplace use cases and safe workflows — Locked
C24 Societal and economic implications — Locked

Next up: C09 · Classification and prediction errors
Reviews this week: C01 today (reply GO) · C02 Wed · C03 Thu · C04 Fri · C05 Sun · C06 Mon · C07 Tue
```

**The narrative boundary.** The agent MAY prepend exactly one encouraging sentence ("Good progress this week — here is where you stand."). It MUST NOT alter any status word, date, or count: no rewording "Review due", no estimated odds of passing, no rounded totals. Encouragement is proposal; the card is ground truth (law L2).

**The three-file record.** The learner record is exactly three files — state.json, plan.json, ledger.jsonl; backup, audit, export, and deletion are three-file operations (ch. 9 deletes precisely these; config.json holds no learner data). state.json and plan.json are derivable from the ledger, but the MVP ships all three so every operation stays a file copy. No ledger rotation: a full track yields on the order of a few hundred lines, far below any size justifying rotation machinery.

**Audit procedure.** Verifying a mastery claim — here C14 MASTERED — takes six read-only steps:

1. Locate the claim: the concept's `state_transition` to MASTERED and the `verdict_issued` event its `trigger_event_id` cites.
2. Confirm the instrument: `gate_id` and `gate_version` — for G4 also rubric id and version, model identity, temperature 0 — MUST match a definition shipped under $SKILL_DIR at that version, with the ch. 9 manifest check passing.
3. Recompute: re-run the recorded verifier path on the stored `evidence.artifact_text` under the recorded versions — byte-exact for deterministic gates; the recorded model at temperature 0 for G4.
4. Compare: recomputed scores and verdict MUST equal the stored record exactly; any mismatch voids the claim.
5. Validate the chain: `ledger_verify.py` MUST pass every line — schema plus `prev_sha256` chain.
6. Cross-check the present: `replay.py`'s rebuilt fields MUST equal live state.json.

A claim surviving all six steps is mastery as law L1 defines it — attested by executable evidence, no model testimony required.

## 8. Data Model and File Schemas

This chapter is the single canonical reference for every file the MVP reads or writes: location on both platforms, format, owning writer, readers, lifecycle, schema. Schemas owned by earlier chapters — the concept record (ch. 3), the gate rubric (ch. 6), the ledger envelope and learning plan (ch. 7) — are quoted, never redefined; state.json and config.json receive their formal schemas here. Chapter 12's acceptance checks cite this inventory; a conforming implementation holds no persistent state beyond the files below.

### 8.1 File Inventory

Every path resolves through the two logical roots of ch. 4: **$SKILL_DIR**, the shipped skill folder, and **$STATE_DIR**, the generated learner-state folder. OpenClaw paths below are relative to `~/.openclaw/workspace/`, Hermes paths to `~/.hermes/`; the skill folder is byte-identical across platforms — only its location differs [^1^][^3^].

| Logical path | OpenClaw path | Hermes path | Format | Owning writer | Readers | Lifecycle |
|---|---|---|---|---|---|---|
| `$SKILL_DIR/curriculum.json` | `skills/aidevschool/curriculum.json` | `skills/aidevschool/curriculum.json` | JSON | `install.py` (place + validate); read-only at runtime | `next_step.py`, `gate_check.py`, `schedule.py`, `plan_recompute.py`, `replay.py` | shipped; validated at install; replaced on upgrade |
| `$STATE_DIR/state.json` | `aidevschool-state/state.json` | `aidevschool-state/state.json` | JSON | one mutation script at a time (§8.3.1): `next_step.py`, `gate_check.py`, `schedule.py` | all five scripts; `replay.py` (cross-check) | created at install; atomic rewrite per event; deleted with the record (ch. 9) |
| `$STATE_DIR/plan.json` | `aidevschool-state/plan.json` | `aidevschool-state/plan.json` | JSON | `plan_recompute.py` (sole writer) | `progress_card.py` | rewritten wholesale after every verdict and review event |
| `$STATE_DIR/ledger.jsonl` | `aidevschool-state/ledger.jsonl` | `aidevschool-state/ledger.jsonl` | JSONL | appends only: `next_step.py`, `gate_check.py`, `schedule.py`, `plan_recompute.py` | `replay.py`, `ledger_verify.py`; idempotency keys read by the four writers | append-only; hash-chained; no rotation in MVP |
| `$STATE_DIR/config.json` | `aidevschool-state/config.json` | `aidevschool-state/config.json` | JSON | `install.py` (create); operator edits thereafter | `install.py`, `gate_check.py` | created at install; survives reinstalls; no learner data |
| `$SKILL_DIR/content/*.md` | `skills/aidevschool/content/*.md` | `skills/aidevschool/content/*.md` | Markdown + YAML front-matter | `install.py` (place); read-only at runtime | `next_step.py` (front-matter); persona renders body | shipped; one file per concept per scaffold level; replaced on upgrade |
| `$SKILL_DIR/rubrics/*.json` | `skills/aidevschool/rubrics/*.json` | `skills/aidevschool/rubrics/*.json` | JSON | `install.py` (place); read-only at runtime | `gate_check.py` only | shipped; semver-versioned; superseded versions retained for replay |
| `$SKILL_DIR/keys/*.json` | `skills/aidevschool/keys/*.json` | `skills/aidevschool/keys/*.json` | JSON | `install.py` (place); read-only at runtime | `gate_check.py` only; unreadable to the persona | shipped; versioned; startup manifest check (ch. 9) |
| `$SKILL_DIR/SKILL.md` | `skills/aidevschool/SKILL.md` | `skills/aidevschool/SKILL.md` | Markdown + YAML frontmatter | `install.py` (place) | platform runtime (frontmatter scan; body loaded on activation) | shipped; the skill's activation contract (ch. 4) |
| `install.py` (package root) | not installed — run from the unpacked package | not installed — run from the unpacked package | Python 3 | — (is itself the writer of the shipped copies above) | operator (executes it) | idempotent; re-run on upgrade or workspace migration |

Four rules ride on this inventory. Scripts MUST resolve all files through $SKILL_DIR and $STATE_DIR; no absolute path may appear in any shipped file (§8.3.2). Learner state lives outside the skill folder, so reinstalls never touch it (ch. 4). The only mutation paths into state.json, plan.json, and ledger.jsonl are the five ch. 4 scripts under the §8.3.1 lock; progress_card.py writes nothing, and the persona writes nothing anywhere (law L2). The operator tools replay.py and ledger_verify.py (ch. 7) ship in `scripts/` and appear above only as readers.

### 8.2 Canonical Schemas

**curriculum.json — schema quoted from ch. 3.** The file is one JSON array of 24 concept records in published order C01…C24; every record MUST conform to the ConceptRecord schema, quoted verbatim:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ConceptRecord",
  "type": "object",
  "required": ["id", "title", "module", "prerequisites", "gate_id", "target_retention_days", "scaffold_levels", "teach_back", "content_refs"],
  "additionalProperties": false,
  "properties": {
    "id": { "type": "string", "pattern": "^C(0[1-9]|1[0-9]|2[0-4])$" },
    "title": { "type": "string", "minLength": 1 },
    "module": { "enum": ["M1", "M2", "M3", "M4", "M5", "M6"] },
    "prerequisites": {
      "type": "array",
      "items": { "type": "string", "pattern": "^C(0[1-9]|1[0-9]|2[0-4])$" },
      "uniqueItems": true
    },
    "gate_id": { "enum": ["G1", "G2", "G3", "G4"] },
    "target_retention_days": { "enum": [30, 45, 60] },
    "scaffold_levels": { "type": "integer", "minimum": 2, "maximum": 3 },
    "teach_back": { "type": "boolean" },
    "content_refs": { "type": "array", "items": { "type": "string" }, "minItems": 1 }
  }
}
```

The record below matches ch. 3's C14 example field for field, with `content_refs` shown in the canonical per-level naming of §8.2.5 — `content_refs` MUST list exactly `scaffold_levels` files, one per authored level:

```json
{
  "id": "C14",
  "title": "Hallucinations: why fabricated facts arise",
  "module": "M4",
  "prerequisites": ["C01", "C02", "C03", "C04", "C05", "C06", "C07", "C08", "C09", "C10", "C11", "C12", "C13"],
  "gate_id": "G1",
  "target_retention_days": 45,
  "scaffold_levels": 3,
  "teach_back": false,
  "content_refs": ["content/C14.l1.md", "content/C14.l2.md", "content/C14.l3.md"]
}
```

**Install-time validation (normative).** The installer MUST reject the installation on any of: schema nonconformance; a prerequisite cycle; a topological inversion of published order; a missing mandatory edge (ch. 3 §3.2.3); a module lacking exactly one teach-back concept; a `gate_id` with no row in the ch. 6 gate registry; or a `content_refs` entry not resolving to an existing file under $SKILL_DIR. Validation runs only at install; the runtime performs no graph checks, and the §8.1 readers MUST NOT hard-code concept ids, module boundaries, gate assignments, or the concept count (ch. 3).

**state.json — formal schema, owned here.** Chapter 5 fixes the machine and the field semantics; this schema makes them enforceable. `learner` binds the install to the paired peer: `channel`, the pseudonymous `peer_ref` — the platform's peer identifier, never a name or phone number (ch. 9) — `active_hours`, and `locale`. `concepts` carries one entry per curriculum concept; `session` is the crash-safe resume point (ch. 5). Three field rules deserve emphasis: `gate_progress` holds gate internals — G3 consecutive passes, last quiz pass, drawn item ids, `teach_back_passed` only where ch. 3 flags the concept — while per-concept `last_pass_ts` records the most recent pass of any kind and alone feeds ch. 5's gap computation; `target_days_effective` initializes from `target_retention_days` at the first pass, then follows ch. 5's doubling and reset rules, capped at 365 days; `scaffold_level` is null outside an open lesson or remediation loop, set by `next_step.py` at lesson_start and lowered by `gate_check.py` on verdict_fail, floored at 1 (ch. 5).

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "LearnerState",
  "type": "object",
  "required": ["learner", "concepts", "session"],
  "additionalProperties": false,
  "properties": {
    "learner": {
      "type": "object",
      "required": ["channel", "peer_ref", "active_hours", "locale"],
      "additionalProperties": false,
      "properties": {
        "channel": { "enum": ["telegram", "whatsapp"] },
        "peer_ref": { "type": "string", "minLength": 1 },
        "active_hours": {
          "type": "object",
          "required": ["start", "end"],
          "additionalProperties": false,
          "properties": {
            "start": { "type": "string", "pattern": "^([01]\\d|2[0-3]):[0-5]\\d$" },
            "end": { "type": "string", "pattern": "^([01]\\d|2[0-3]):[0-5]\\d$" }
          }
        },
        "locale": { "type": "string", "minLength": 2 }
      }
    },
    "concepts": {
      "type": "object",
      "minProperties": 1,
      "propertyNames": { "pattern": "^C(0[1-9]|1[0-9]|2[0-4])$" },
      "additionalProperties": {
        "type": "object",
        "required": ["status", "scaffold_level", "attempts", "failures_this_session", "deferred", "gate_progress", "last_pass_ts", "next_review_ts", "target_days_effective"],
        "additionalProperties": false,
        "properties": {
          "status": { "enum": ["LOCKED", "AVAILABLE", "IN_PROGRESS", "ATTEMPTED", "MASTERED", "REVIEW_DUE"] },
          "scaffold_level": { "type": ["integer", "null"], "minimum": 1, "maximum": 3 },
          "attempts": { "type": "integer", "minimum": 0 },
          "failures_this_session": { "type": "integer", "minimum": 0 },
          "deferred": { "type": "boolean" },
          "gate_progress": {
            "type": "object",
            "required": ["consecutive_passes", "last_pass_ts", "asked_item_ids"],
            "additionalProperties": false,
            "properties": {
              "consecutive_passes": { "type": "integer", "minimum": 0 },
              "last_pass_ts": { "type": ["string", "null"], "format": "date-time" },
              "asked_item_ids": { "type": "array", "items": { "type": "string" }, "uniqueItems": true },
              "teach_back_passed": { "type": "boolean" }
            }
          },
          "last_pass_ts": { "type": ["string", "null"], "format": "date-time" },
          "next_review_ts": { "type": ["string", "null"], "format": "date-time" },
          "target_days_effective": { "type": ["integer", "null"], "minimum": 1, "maximum": 365 }
        }
      }
    },
    "session": {
      "type": "object",
      "required": ["phase", "current_concept", "pending_gate_id", "attempts_this_session"],
      "additionalProperties": false,
      "properties": {
        "phase": { "enum": ["idle", "lesson", "awaiting_attempt", "feedback"] },
        "current_concept": { "type": ["string", "null"], "pattern": "^C(0[1-9]|1[0-9]|2[0-4])$" },
        "pending_gate_id": { "enum": ["G1", "G2", "G3", "G4", null] },
        "attempts_this_session": { "type": "integer", "minimum": 0 }
      }
    },
    "last_nudge_date": { "type": ["string", "null"], "format": "date" }
  }
}
```

Two storage rules are normative. **Single writer:** state.json is mutated only inside `next_step.py`, `gate_check.py`, or `schedule.py`, by whichever script holds the §8.3.1 lockfile; the persona never writes any file. **Atomic commit:** every mutation is write-temp-then-rename — serialize the new document to a temporary file in the same directory, then rename it over state.json — so a crash yields the old document or the new one, never a partial file. The per-concept fields MUST equal a ch. 7 replay of ledger.jsonl at all times; `session` and `last_nudge_date` are session-ephemeral rendering cache, excluded from replay (ch. 7).

The filled example reproduces ch. 7's progress-card moment, 2026-07-21T09:00Z: C01's review fell due at 08:45 (its 2026-07-12 review pass doubled the effective target to 60 days — a nine-day gap), C02–C08 stand MASTERED with reviews staggered across the week, C09 is AVAILABLE next, and the session is idle. §7.2's plan derives from exactly this file.

```json
{
  "learner": {
    "channel": "telegram",
    "peer_ref": "peer_4f9a2c7e1b",
    "active_hours": { "start": "08:00", "end": "21:00" },
    "locale": "en"
  },
  "concepts": {
    "C01": { "status": "REVIEW_DUE", "scaffold_level": null, "attempts": 3, "failures_this_session": 0, "deferred": false, "gate_progress": { "consecutive_passes": 2, "last_pass_ts": "2026-07-07T08:45:00Z", "asked_item_ids": ["c01_q04", "c01_q01", "c01_q07", "c01_q02", "c01_q09", "c01_q05", "c01_q03", "c01_q08", "c01_q06"] }, "last_pass_ts": "2026-07-12T08:45:00Z", "next_review_ts": "2026-07-21T08:45:00Z", "target_days_effective": 60 },
    "C02": { "status": "MASTERED", "scaffold_level": null, "attempts": 3, "failures_this_session": 0, "deferred": false, "gate_progress": { "consecutive_passes": 2, "last_pass_ts": "2026-07-08T08:50:00Z", "asked_item_ids": ["c02_q01", "c02_q02", "c02_q03", "c02_q04", "c02_q05", "c02_q06", "c02_q07", "c02_q08", "c02_q09"] }, "last_pass_ts": "2026-07-13T08:50:00Z", "next_review_ts": "2026-07-22T08:50:00Z", "target_days_effective": 60 },
    "C03": { "status": "MASTERED", "scaffold_level": null, "attempts": 3, "failures_this_session": 0, "deferred": false, "gate_progress": { "consecutive_passes": 2, "last_pass_ts": "2026-07-09T08:55:00Z", "asked_item_ids": ["c03_q01", "c03_q02", "c03_q03", "c03_q04", "c03_q05", "c03_q06", "c03_q07", "c03_q08", "c03_q09"] }, "last_pass_ts": "2026-07-14T08:55:00Z", "next_review_ts": "2026-07-23T08:55:00Z", "target_days_effective": 60 },
    "C04": { "status": "MASTERED", "scaffold_level": null, "attempts": 3, "failures_this_session": 0, "deferred": false, "gate_progress": { "consecutive_passes": 2, "last_pass_ts": "2026-07-10T09:00:00Z", "asked_item_ids": ["c04_q01", "c04_q02", "c04_q03", "c04_q04", "c04_q05", "c04_q06", "c04_q07", "c04_q08", "c04_q09"] }, "last_pass_ts": "2026-07-15T09:00:00Z", "next_review_ts": "2026-07-24T09:00:00Z", "target_days_effective": 60 },
    "C05": { "status": "MASTERED", "scaffold_level": null, "attempts": 4, "failures_this_session": 0, "deferred": false, "gate_progress": { "consecutive_passes": 2, "last_pass_ts": "2026-07-12T08:40:00Z", "asked_item_ids": ["c05_q03", "c05_q06", "c05_q01", "c05_q02", "c05_q04", "c05_q08", "c05_q05", "c05_q07", "c05_q09"], "teach_back_passed": true }, "last_pass_ts": "2026-07-17T08:40:00Z", "next_review_ts": "2026-07-26T08:40:00Z", "target_days_effective": 60 },
    "C06": { "status": "MASTERED", "scaffold_level": null, "attempts": 3, "failures_this_session": 0, "deferred": false, "gate_progress": { "consecutive_passes": 2, "last_pass_ts": "2026-07-13T08:45:00Z", "asked_item_ids": ["c06_q01", "c06_q02", "c06_q03", "c06_q04", "c06_q05", "c06_q06", "c06_q07", "c06_q08", "c06_q09"] }, "last_pass_ts": "2026-07-18T08:45:00Z", "next_review_ts": "2026-07-27T08:45:00Z", "target_days_effective": 60 },
    "C07": { "status": "MASTERED", "scaffold_level": null, "attempts": 3, "failures_this_session": 0, "deferred": false, "gate_progress": { "consecutive_passes": 2, "last_pass_ts": "2026-07-14T08:50:00Z", "asked_item_ids": ["c07_q01", "c07_q02", "c07_q03", "c07_q04", "c07_q05", "c07_q06", "c07_q07", "c07_q08", "c07_q09"] }, "last_pass_ts": "2026-07-19T08:50:00Z", "next_review_ts": "2026-07-28T08:50:00Z", "target_days_effective": 60 },
    "C08": { "status": "MASTERED", "scaffold_level": null, "attempts": 3, "failures_this_session": 0, "deferred": false, "gate_progress": { "consecutive_passes": 2, "last_pass_ts": "2026-07-15T08:55:00Z", "asked_item_ids": ["c08_q01", "c08_q02", "c08_q03", "c08_q04", "c08_q05", "c08_q06", "c08_q07", "c08_q08", "c08_q09"] }, "last_pass_ts": "2026-07-20T08:55:00Z", "next_review_ts": "2026-07-29T08:55:00Z", "target_days_effective": 60 },
    "C09": { "status": "AVAILABLE", "scaffold_level": null, "attempts": 0, "failures_this_session": 0, "deferred": false, "gate_progress": { "consecutive_passes": 0, "last_pass_ts": null, "asked_item_ids": [], "teach_back_passed": false }, "last_pass_ts": null, "next_review_ts": null, "target_days_effective": null },
    "C10": { "status": "LOCKED", "scaffold_level": null, "attempts": 0, "failures_this_session": 0, "deferred": false, "gate_progress": { "consecutive_passes": 0, "last_pass_ts": null, "asked_item_ids": [] }, "last_pass_ts": null, "next_review_ts": null, "target_days_effective": null },
    "C11": { "status": "LOCKED", "scaffold_level": null, "attempts": 0, "failures_this_session": 0, "deferred": false, "gate_progress": { "consecutive_passes": 0, "last_pass_ts": null, "asked_item_ids": [] }, "last_pass_ts": null, "next_review_ts": null, "target_days_effective": null },
    "C12": { "status": "LOCKED", "scaffold_level": null, "attempts": 0, "failures_this_session": 0, "deferred": false, "gate_progress": { "consecutive_passes": 0, "last_pass_ts": null, "asked_item_ids": [] }, "last_pass_ts": null, "next_review_ts": null, "target_days_effective": null },
    "C13": { "status": "LOCKED", "scaffold_level": null, "attempts": 0, "failures_this_session": 0, "deferred": false, "gate_progress": { "consecutive_passes": 0, "last_pass_ts": null, "asked_item_ids": [], "teach_back_passed": false }, "last_pass_ts": null, "next_review_ts": null, "target_days_effective": null },
    "C14": { "status": "LOCKED", "scaffold_level": null, "attempts": 0, "failures_this_session": 0, "deferred": false, "gate_progress": { "consecutive_passes": 0, "last_pass_ts": null, "asked_item_ids": [] }, "last_pass_ts": null, "next_review_ts": null, "target_days_effective": null },
    "C15": { "status": "LOCKED", "scaffold_level": null, "attempts": 0, "failures_this_session": 0, "deferred": false, "gate_progress": { "consecutive_passes": 0, "last_pass_ts": null, "asked_item_ids": [] }, "last_pass_ts": null, "next_review_ts": null, "target_days_effective": null },
    "C16": { "status": "LOCKED", "scaffold_level": null, "attempts": 0, "failures_this_session": 0, "deferred": false, "gate_progress": { "consecutive_passes": 0, "last_pass_ts": null, "asked_item_ids": [] }, "last_pass_ts": null, "next_review_ts": null, "target_days_effective": null },
    "C17": { "status": "LOCKED", "scaffold_level": null, "attempts": 0, "failures_this_session": 0, "deferred": false, "gate_progress": { "consecutive_passes": 0, "last_pass_ts": null, "asked_item_ids": [] }, "last_pass_ts": null, "next_review_ts": null, "target_days_effective": null },
    "C18": { "status": "LOCKED", "scaffold_level": null, "attempts": 0, "failures_this_session": 0, "deferred": false, "gate_progress": { "consecutive_passes": 0, "last_pass_ts": null, "asked_item_ids": [] }, "last_pass_ts": null, "next_review_ts": null, "target_days_effective": null },
    "C19": { "status": "LOCKED", "scaffold_level": null, "attempts": 0, "failures_this_session": 0, "deferred": false, "gate_progress": { "consecutive_passes": 0, "last_pass_ts": null, "asked_item_ids": [], "teach_back_passed": false }, "last_pass_ts": null, "next_review_ts": null, "target_days_effective": null },
    "C20": { "status": "LOCKED", "scaffold_level": null, "attempts": 0, "failures_this_session": 0, "deferred": false, "gate_progress": { "consecutive_passes": 0, "last_pass_ts": null, "asked_item_ids": [] }, "last_pass_ts": null, "next_review_ts": null, "target_days_effective": null },
    "C21": { "status": "LOCKED", "scaffold_level": null, "attempts": 0, "failures_this_session": 0, "deferred": false, "gate_progress": { "consecutive_passes": 0, "last_pass_ts": null, "asked_item_ids": [] }, "last_pass_ts": null, "next_review_ts": null, "target_days_effective": null },
    "C22": { "status": "LOCKED", "scaffold_level": null, "attempts": 0, "failures_this_session": 0, "deferred": false, "gate_progress": { "consecutive_passes": 0, "last_pass_ts": null, "asked_item_ids": [] }, "last_pass_ts": null, "next_review_ts": null, "target_days_effective": null },
    "C23": { "status": "LOCKED", "scaffold_level": null, "attempts": 0, "failures_this_session": 0, "deferred": false, "gate_progress": { "consecutive_passes": 0, "last_pass_ts": null, "asked_item_ids": [], "teach_back_passed": false }, "last_pass_ts": null, "next_review_ts": null, "target_days_effective": null },
    "C24": { "status": "LOCKED", "scaffold_level": null, "attempts": 0, "failures_this_session": 0, "deferred": false, "gate_progress": { "consecutive_passes": 0, "last_pass_ts": null, "asked_item_ids": [], "teach_back_passed": false }, "last_pass_ts": null, "next_review_ts": null, "target_days_effective": null }
  },
  "session": { "phase": "idle", "current_concept": null, "pending_gate_id": null, "attempts_this_session": 0 },
  "last_nudge_date": "2026-07-21"
}
```

**ledger.jsonl and plan.json — cross-reference only.** Both schemas are defined once, in ch. 7: the LedgerEvent envelope, per-type payload table, hash chain, and replay rule in §7.1; the LearningPlan schema, recompute rule, and status-word mapping in §7.2. They MUST NOT be duplicated here. §8.1 already fixes their paths, writers, readers, and lifecycles, and any divergence between this chapter and ch. 7 resolves in ch. 7's favor for these two files.

**config.json — formal schema, owned here.** Chapter 4 assigns the keys; this schema makes them enforceable:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "SkillConfig",
  "type": "object",
  "required": ["tutor_model", "verifier_model", "channel", "install_platform", "skill_version", "feature_flags"],
  "additionalProperties": false,
  "properties": {
    "tutor_model": { "type": "string", "minLength": 1 },
    "verifier_model": { "type": "string", "minLength": 1 },
    "channel": { "enum": ["telegram", "whatsapp"] },
    "install_platform": { "enum": ["openclaw", "hermes"] },
    "skill_version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
    "feature_flags": {
      "type": "object",
      "required": ["llm_gates_enabled"],
      "additionalProperties": false,
      "properties": {
        "llm_gates_enabled": { "type": "boolean" }
      }
    }
  }
}
```

The documented default for both model fields is `inherit` — the platform's configured primary model — with any OpenAI-compatible endpoint substitutable (ch. 4):

```json
{
  "tutor_model": "inherit",
  "verifier_model": "inherit",
  "channel": "telegram",
  "install_platform": "openclaw",
  "skill_version": "1.0.0",
  "feature_flags": { "llm_gates_enabled": true }
}
```

`feature_flags.llm_gates_enabled` is the G4 kill-switch: when false, `gate_check.py` MUST NOT issue any LLM verdict and MUST serve every G4-mapped concept from its shipped G3-format quiz bank — one is shipped for every G4-served concept precisely so the fallback is real (ch. 6). config.json holds no learner data and is excluded from ch. 9's three-file record operations.

**Content files — one per concept per scaffold level.** Every authored scaffold level of every concept is one Markdown file, `content/C{nn}.l{k}.md` — for example `content/C14.l1.md` — under $SKILL_DIR; module intros ship in the same folder (ch. 4). The body is learner-facing prose under ch. 2's authoring rules, in a fixed section order — hook → worked example → practice → gate task → reply format → feedback snippets — which MUST NOT be rearranged. This split is the concrete mechanism behind ch. 2's localization rule: scripts parse only the YAML front-matter (`next_step.py` selects by level and time budget; the gate task resolves through `gate_task_id` to its versioned spec); the persona renders the body. Front-matter fields are normative:

| Field | Type | Rule |
|---|---|---|
| `concept_id` | string, pattern `^C(0[1-9]|1[0-9]|2[0-4])$` | MUST equal the id of the concept record whose `content_refs` names this file |
| `level` | integer, 1–3 | MUST NOT exceed the record's `scaffold_levels`; level 1 is the most supported (ch. 2) |
| `estimated_minutes` | integer, 5–10 | the ch. 2 session budget for this level |
| `gate_task_id` | string | MUST name the `key_id` (G1–G3) or `rubric_id` (G4) of the task's versioned spec |

One filled example, `content/C01.l1.md` (body abbreviated):

```markdown
---
concept_id: C01
level: 1
estimated_minutes: 8
gate_task_id: c01_quiz_bank
---

## Hook
Name one thing your phone did this week that felt like it "knew" you. What do you think was behind it?

## Worked example
Maya's map app reroutes her around a traffic jam before she asks. Nobody is watching her drive. The app learned from millions of past trips which roads clog at which hours. That is AI: a system that picks up patterns from examples and applies them to new situations. Your spam folder doing its job is the same trick.

## Practice
Level 1 — we sort together. For each one, reply "AI" or "not AI", and I will help: (1) a calculator adding two numbers; (2) a photo app grouping pictures by the faces in them; (3) a thermostat following a fixed weekly schedule; (4) a chatbot drafting a birthday message in your style.

## Gate task
Quiz on what AI is and is not — 3 questions.

## Reply format
Reply with just the three letters in order, like: A C B.

## Feedback snippets
- On pass: "Exactly — the giveaway is learning from examples, not following fixed rules."
- On fail: "Look for the fixed rules: a schedule or a formula is not AI, however clever it feels."
```

**Rubrics and key files.** Rubrics are versioned G4 definitions, one file `rubrics/{rubric_id}.json` per task; the GateRubric schema is quoted verbatim from ch. 6:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "GateRubric",
  "type": "object",
  "required": ["rubric_id", "rubric_version", "gate_id", "concept_id", "task", "items", "anchors"],
  "additionalProperties": false,
  "properties": {
    "rubric_id": { "type": "string", "pattern": "^[a-z0-9_]+$" },
    "rubric_version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
    "gate_id": { "const": "G4" },
    "concept_id": { "type": "string", "pattern": "^C(0[1-9]|1[0-9]|2[0-4])$" },
    "task": { "enum": ["prompt_rewrite", "teach_back"] },
    "items": {
      "type": "array",
      "minItems": 3,
      "maxItems": 6,
      "items": {
        "type": "object",
        "required": ["item_id", "text", "required", "feedback_fail"],
        "additionalProperties": false,
        "properties": {
          "item_id": { "type": "string", "pattern": "^[a-z0-9_]+$" },
          "text": { "type": "string", "minLength": 1 },
          "required": { "type": "boolean" },
          "feedback_fail": { "type": "string", "minLength": 1 }
        }
      }
    },
    "misconception_strings": { "type": "array", "items": { "type": "string" }, "uniqueItems": true },
    "anchors": {
      "type": "object",
      "required": ["pass_example", "fail_example"],
      "additionalProperties": false,
      "properties": {
        "pass_example": { "type": "string", "minLength": 1 },
        "fail_example": { "type": "string", "minLength": 1 }
      }
    }
  }
}
```

One filled example — a minimal three-item prompt-rewrite rubric (ch. 6 ships the four-item teach-back example):

```json
{
  "rubric_id": "c12_prompt_rewrite",
  "rubric_version": "1.0.0",
  "gate_id": "G4",
  "concept_id": "C12",
  "task": "prompt_rewrite",
  "items": [
    {
      "item_id": "pr1",
      "text": "States an explicit task: one clear sentence saying what the AI should produce.",
      "required": true,
      "feedback_fail": "Name the job first: one clear sentence saying what you want the AI to produce."
    },
    {
      "item_id": "pr2",
      "text": "Supplies concrete context: who it is for and the facts the AI needs.",
      "required": true,
      "feedback_fail": "Add the situation: who it is for and the facts the AI needs."
    },
    {
      "item_id": "pr3",
      "text": "Specifies the answer's format: length, style, or structure.",
      "required": true,
      "feedback_fail": "Close with the shape: how long, what tone, what structure."
    }
  ],
  "anchors": {
    "pass_example": "Task: write a three-sentence meeting summary. Context: project Alpha, deadline moved to Friday, budget approved. Format: plain sentences, no jargon.",
    "fail_example": "Tell me about the meeting."
  }
}
```

Key files carry the deterministic answer data behind G1–G3 — seeded-error lists, PII lists, scenario keys, and quiz item banks — one versioned file `keys/{key_id}.json` per task:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "KeyFile",
  "type": "object",
  "required": ["key_id", "key_version", "gate_id", "concept_id", "kind", "items"],
  "additionalProperties": false,
  "properties": {
    "key_id": { "type": "string", "pattern": "^[a-z0-9_]+$" },
    "key_version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
    "gate_id": { "enum": ["G1", "G2", "G3"] },
    "concept_id": { "type": "string", "pattern": "^C(0[1-9]|1[0-9]|2[0-4])$" },
    "kind": { "enum": ["seeded_error", "pii_list", "scenario_key", "quiz_bank"] },
    "items": { "type": "object", "minProperties": 1 }
  }
}
```

The `items` object is kind-specific. `seeded_error`: `{claims_total, planted, explanations}`. `pii_list`: `{seeded_items, redaction_token}` — synthetic, fabricated data only (ch. 9). `scenario_key`: `{keyed_option, misconception_strings}`. `quiz_bank`: `{bank: [{item_id, keyed}]}` with at least 8 items (ch. 6); item stems remain learner-facing prose in content files, so the key stores only item ids and keyed options. Filled example, the C14 key scored end to end in ch. 6:

```json
{
  "key_id": "c14_seeded_bio",
  "key_version": "1.0.0",
  "gate_id": "G1",
  "concept_id": "C14",
  "kind": "seeded_error",
  "items": {
    "claims_total": 9,
    "planted": [2, 5, 7, 9],
    "explanations": {
      "2": "Hopper was born in New York City in 1906, not London.",
      "5": "COBOL came from a committee Hopper advised; no one invented it single-handedly, and not in 1952.",
      "7": "The destroyer USS Hopper is real, but it was named for her in the 1990s, not 1971.",
      "9": "There is no Nobel Prize in Computer Science."
    }
  }
}
```

**Key isolation (normative).** `keys/` MUST be unreadable to the persona: file permissions deny the agent read access, and SKILL.md never references the folder (ch. 4, ch. 9); verdict explanations reach the chat only through the verdict record's `evidence` (ch. 6). Scripts SHOULD verify a manifest hash over `keys/` and `rubrics/` at startup and exit 2 on mismatch (ch. 9). So the config.json kill-switch is real, `keys/` also ships one G3-format quiz bank per G4-served concept — C05, C09, C12, C13, C19, C23, C24 — alongside the primary keys (ch. 6).

### 8.3 Operational Rules

**Concurrency (normative).** The single-learner MVP assumes exactly one active session. Any script that writes into $STATE_DIR MUST first acquire the lockfile `$STATE_DIR/.aidevschool.lock` — created exclusively, held for the mutation, removed on exit — and MUST fail loudly if it is held: non-zero exit, one plain-language stderr sentence (ch. 4), which the persona relays verbatim before stopping the lesson. The lockfile is transient: no learner data, outside ch. 9's three-file record; a stale lock after a crash is cleared by the operator, never by silent retry.

**Scale and migration.** The corpus is small by design: 24 concepts × 2–3 scaffold levels ≈ 48–72 short Markdown files, 8 rubric files (two prompt-rewrite, six teach-back), and one key file per deterministic gate task plus the seven fallback banks. ledger.jsonl grows a few KB per session — a full track yields on the order of a few hundred lines (ch. 7) — so the MVP ships no rotation machinery. All references pass through $SKILL_DIR/$STATE_DIR, so platform workspace migrations (`hermes claw migrate`-style moves) remain possible without editing a shipped file [^3^].

## 9. Security and Privacy

### 9.1 Threat Model and Access Control

The MVP protects one deployment shape: a single self-hosted learner on the operator's hardware. Assets are the chat contents, the three-file learner record (state.json, plan.json, ledger.jsonl), and the gateway token. Adversaries are unknown senders, malicious third-party skills, token thieves, and accidental leakage of personally identifiable information (PII) to model providers. Host compromise itself is out of scope: a file-based self-hosted design inherits the host's security posture.

Access control is delegated to the platform. The tutor operates only inside a direct message (DM) with the paired learner: OpenClaw's default `dmPolicy="pairing"` issues unknown senders a pairing code approved on the host (`openclaw pairing approve`), and Hermes Agent's gateway provides the equivalent step; per-agent allowlists bind the agent to that peer[^1^][^2^][^3^]. Group chats are never used, unknown senders are ignored, and the skill never widens these policies itself.

### 9.2 Data Protection

PII minimization is structural. The learner record stores a pseudonymous `peer_ref` — the platform's identifier for the paired peer — never names or numbers. Redaction drills (concept C17, gate G2 in its redaction variant) use synthetic, fabricated PII only, and the C17 lesson plus a standing persona rule teach the learner never to paste real personal data into any chatbot.

At rest, learner data lives only in the three state files under $STATE_DIR inside the platform workspace. Scripts MUST NOT transmit state-file contents anywhere; the only model traffic is the platform's own API calls, including the rubric-gate verifier endpoint named in config.json (ch. 4).

Model-provider exposure is stated plainly: under a cloud model, chat content leaves the device. Local models via Ollama or vLLM are the documented privacy-maximizing configuration, keeping prompts on the operator's hardware[^2^][^4^]; gate_check.py records the verifier model identity in ledger.jsonl for every rubric gate (ch. 4).

Token hygiene: tokens live only in the platform's configuration, never in the skill folder; the skill and its scripts MUST NOT read, echo, or log tokens; install instructions mandate rotation and least-privilege allowlisting. Rationale: a publicly documented token-theft-to-remote-code-execution incident in platform history, cited here without figures.

Skill supply-chain hygiene: install only the delivered aidevschool package, restrict the tutor agent's skill allowlist to aidevschool alone, and never co-install unreviewed community skills; rationale: publicly reported malicious marketplace-skill incidents, likewise cited without counts.

Gate integrity: because keys/ and rubrics/ decide verdicts, scripts SHOULD verify a manifest hash over both directories at startup and refuse to run (exit 2, ch. 4) on mismatch. This complements the ledger hash chain (ch. 7): the chain detects tampered evidence; the manifest detects tampered instruments.

Threat notes, strictly qualitative:

| Threat | Platform feature relied on | Spec rule | Residual risk |
|---|---|---|---|
| Unknown sender contacts tutor | DM pairing with host-approved pairing code[^1^][^3^] | Teach only in the paired DM; ignore unknown senders | Manual approval can mis-pair a sender |
| Malicious third-party skill | Per-agent skill allowlist | Allowlist restricted to aidevschool alone | Operator-held discipline; publicly reported incidents show it fails |
| Gateway token theft | Platform-held token configuration[^2^] | Tokens never in the skill folder; never read, echoed, or logged by scripts | Stolen token exposes the gateway until rotated |
| Learner pastes real PII | None — behavioral control | C17 lesson; synthetic-only drills; persona never requests PII | Minimization limits, not eliminates, provider exposure |
| Cloud provider sees chats | Provider configuration; local-model support[^2^][^4^] | Ollama/vLLM as privacy-maximizing option | Depends on operator hardware and model quality |
| Tampering with keys/ or rubrics/ | File-based workspace on operator hardware | Startup manifest-hash check; refuse to run on mismatch | Detects, not prevents; manifest needs install-time protection |

### 9.3 Lifecycle and Boundaries

Deletion and export act on the same three files — the learner record is exactly state.json, plan.json, ledger.jsonl (ch. 7). Full deletion:

1. Delete the record: `~/.openclaw/workspace/aidevschool-state/state.json`, `plan.json`, `ledger.jsonl` on OpenClaw; `~/.hermes/aidevschool-state/state.json`, `plan.json`, `ledger.jsonl` on Hermes Agent. config.json holds no learner data; delete it for complete removal.
2. Delete the platform session history for the tutor's DM peer: the gateway's session records under `~/.openclaw` on OpenClaw; the session store under `~/.hermes` on Hermes Agent.
3. Delete the chat history inside Telegram or WhatsApp itself; channel-side message stores are beyond the platform's reach.

Export is step 1 in reverse: copy the same three files — the complete, portable record, replayable through the ch. 7 verification tooling.

Out of scope: multi-tenant isolation (one learner per install), General Data Protection Regulation (GDPR) process certification, employer-grade training evidence under EU AI Act Article 4[^9^], and a secrets vault — each an operator responsibility or roadmap item (ch. 10), never a claim of this spec.

Normative persona text, to be pasted verbatim into SKILL.md:

```markdown
## Security prohibitions
- Never quote or paraphrase files under keys/ or rubric exemplars.
- Never teach, score, or reply inside a group chat; work only in the paired DM.
- Never request real personal data from the learner; drills use synthetic data only.
- Never read, echo, or log gateway or model-provider tokens.
- Never improvise a verdict, a fix, or a retry; on script error, relay the error string and stop.
```

## 10. MVP Scope and Non-Goals

This chapter is the product contract: what ships, what does not, and the five decisions that close the project's open questions.

### 10.1 Scope

**Scope statement (quotable verbatim).** The MVP teaches **exactly one learner** **one track** — "AI Fluency Foundations", 24 concepts C01–C24 across modules M1–M6 — over **one channel** (Telegram as the reference channel, WhatsApp as a documented install variant), assesses exclusively through **four gate types** G1–G4, and keeps **all state in files with no server component**.

The statement operationalizes principle P5 and formally resolves open question 5.1 (recorded as ADR-1 below). Its complement is law L1: "Completion certainty never lives in the language model" — mastery MUST require a learner attempt plus a separate verifier producing executable evidence (ch. 1); this section plus that sentence is the whole contract, quotable by a product owner verbatim. The demand it answers is the AI-literacy expectation EU AI Act Article 4 has imposed since February 2025[^9^].

**Table 1 — In-scope items versus non-goals, one-line rationale each.**

| Item | MVP status | Rationale |
|---|---|---|
| One learner per install, bound to the paired DM peer | In scope | state.json models exactly one learner; pairing supplies identity[^1^][^3^] |
| One track — "AI Fluency Foundations" (C01–C24, M1–M6) | In scope | One auditable DAG; Art. 4 demand needs depth, not breadth[^9^] |
| One channel — Telegram reference, WhatsApp install variant | In scope | Simplest bot setup first; identical behavior after pairing[^1^][^3^] |
| Four gate types G1–G4 | In scope | Deterministic gates cover most concepts; G4 the tasks needing judgment |
| File-based state; no server component | In scope | Law L3: the install is one folder on an existing agent platform |
| English content, strings externalized | In scope | Ships now; localizes later with no code change[^6^] |
| Multi-tenant or multi-learner operation | Non-goal | Needs accounts and shared state — the server law L3 forbids |
| Authoring UI | Non-goal | Content ships as reviewed markdown files in $SKILL_DIR |
| Mobile app | Non-goal | The learner's existing chat client is the app |
| LMS integration | Non-goal | ledger.jsonl is the system of record; exports are roadmap |
| Certificates with legal weight | Non-goal | The progress card evidences completion; it is not a credential |
| Group-chat delivery | Non-goal | Identity and privacy bind to one paired DM peer |
| LLM-judge calibration tooling | Non-goal | Deferred; G4 stays narrow until κ-reporting exists (ch. 11)[^15^] |
| Second language | Non-goal | Externalized strings make it a content task, not engineering[^6^] |

Rows marked In scope are requirements (MUST); rows marked Non-goal are exclusions with the normative force of §10.2.

### 10.2 Non-Goals

The following are normative exclusions. The MVP MUST NOT ship:

- multi-tenant or multi-learner operation;
- an authoring UI;
- a mobile app;
- LMS integration;
- certificates with legal weight;
- group-chat delivery;
- LLM-judge calibration tooling;
- a second language.

Every non-goal is a deferral, not a rejection: ch. 11 re-admits each as a roadmap phase with explicit entry criteria. Until a phase opens, any work item touching a non-goal is scope creep and MUST be rejected under principle P5.

### 10.3 Architecture Decision Records

Five records close the open questions of §5 of the requirements record; each states the decision, its rationale, and the cost of reversal.

**ADR-1 — Telegram is the reference channel; WhatsApp is a documented install variant (resolves 5.1).** Telegram offers the simplest bot setup on both platforms — a BotFather token added to the gateway configuration — while WhatsApp yields identical behavior after pairing[^1^][^3^]. Content is channel-neutral (ch. 2), so no learner-facing text depends on the choice. Reversal cost is low: `channel` is one config.json value and one installer branch; promoting WhatsApp to reference is install-script and documentation work, not a rewrite.

**ADR-2 — The rubric-anchored LLM gate G4 is limited to prompt-rewrite and teach-back tasks (resolves 5.2).** LLM verification is admitted only where deterministic parsing cannot reach, and only on granular, binary rubric items under versioned rubrics with exemplar anchors — the conditions with publicly documented human-judge agreement[^15^][^16^]; holistic judgments are forbidden as unreliable[^17^]. Reversal cost is medium-low: `feature_flags.llm_gates_enabled` disables G4 at once, and re-keying the affected concepts is curriculum.json and content work, because gate binding is per-concept data.

**ADR-3 — G3 quiz mastery requires two consecutive all-correct passes at least 24 hours apart (resolves 5.3).** A single perfect attempt cannot distinguish mastery from luck; the second, spaced pass converts the quiz into retrieval practice under the spacing rule the meta-analyses support[^11^][^12^]. Consecutive means an intervening fail resets the count. Reversal cost is low: the rule lives entirely in gate_check.py, and changing it bumps gate_version with new fixtures (ch. 12) while prior verdicts stay replayable under their recorded version.

**ADR-4 — Content ships in English only, with every learner-facing string externalized (resolves 5.4).** One authoring language halves the content surface, and because no string is hardcoded in scripts or SKILL.md, localization is later a content task with no code change (ch. 2) — the path whose payoff Elements of AI's 26-language reach demonstrates[^6^]. Reversal cost is low by construction: adding a language adds content files only, provided the author checklist keeps enforcing the no-hardcoded-strings rule.

**ADR-5 — The skill is model-agnostic with a documented default (resolves 5.5).** Both platforms accept any OpenAI-compatible endpoint[^2^][^3^]; config.json names `tutor_model` and `verifier_model` separately, each defaulting to `inherit`, the platform's primary model, with local models via Ollama as the privacy-maximizing option[^4^]. Reversal cost is low: pinning a model is a config.json edit, and because gate_check.py invokes G4 at temperature 0 and records the verifier model identity in every rubric-gate ledger entry, earlier verdicts remain replayable.

## 11. Roadmap and Risks

This chapter fixes the post-MVP path and the standing risk posture: §11.1 converts ch. 10's deferrals into four gated phases; §11.2 registers eight residual risks, each mitigation bound to a mechanism defined earlier in this spec. One rule binds both instruments: nothing enters scope silently.

### 11.1 Phased Roadmap

The shipped MVP is Phase 1. A later phase opens only when its entry criteria are met, and a phase is the sole path for re-admitting a ch. 10 non-goal — every non-goal is a deferral, not a rejection (§10.2).

Phase 2, WhatsApp parity and channel hardening, promotes WhatsApp from documented install variant to full parity; per ADR-1 this is install-script and documentation work, `channel` being one config.json value and one installer branch[^1^][^3^]. Phase 3 adds a second track (e.g., workplace AI workflows) purely as curriculum-as-data — one new curriculum.json plus content files, zero script changes, per ch. 3's rule that curriculum extension is a data operation. Phase 4 re-admits the non-goal "LLM-judge calibration tooling" verbatim: tooling reports Cohen's κ per rubric against human double-scored samples, with human–human agreement — ~κ0.7–0.8 on structured tasks — as the ceiling[^15^][^16^]; a measured κ inside that band is the gate for any expansion of rubric-scored tasks beyond prompt-rewrite and teach-back. Phase 5 re-admits "a second language" on ADR-4's externalized strings — a content task with no code change, the path whose payoff Elements of AI's 26-language reach demonstrates[^6^]. The six remaining non-goals — multi-tenant or multi-learner operation, an authoring UI, a mobile app, LMS integration, certificates with legal weight, group-chat delivery — receive no phase here; until a revision of this section assigns them entry criteria, any work touching them MUST be rejected under P5.

| Phase | Contents | Entry criteria |
|---|---|---|
| 2 — WhatsApp parity and channel hardening | WhatsApp promoted from install variant to parity: installer branch, pairing docs, scheduler delivery verified on-channel | Phase 1 acceptance suite (ch. 12) green on both platforms via the Telegram reference; one documented clean WhatsApp install completing C01–C03 end to end |
| 3 — Second track as curriculum-as-data | A new track (e.g., workplace AI workflows) shipped as one curriculum.json plus content files; no change to scripts/ | One full Phase 1 track completion (all 24 concepts MASTERED) on a live install; the candidate file passes §3.2.4 install-time validation with zero diffs in scripts/ |
| 4 — LLM-judge calibration tooling | Human double-scoring of archived G4 artifacts; Cohen's κ reported per rubric; expansion of rubric-scored tasks gated on κ within the ceiling band[^15^][^16^] | ≥ 50 double-scored artifacts per shipped rubric, spanning pass and fail outcomes (a design decision); G4 verdict records already archive `artifact_text` (ch. 6), so ordinary operation builds the corpus |
| 5 — Localization | A second language shipped as translated content files only (ADR-4) | Repo scan confirms every learner-facing string lives in content files, none in scripts or SKILL.md; English pack frozen at a tagged release |

Entry criteria are executable — acceptance suites, file scans, artifact counts — never dates: the roadmap advances on evidence, not on schedule.

### 11.2 Risk Register

Likelihood and impact are qualitative design-team judgments (Low / Medium / High), not measured frequencies. Owner names the role accountable for the mitigation; the operator is the hosting party of ch. 9.

| Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|
| LLM-gate mis-scoring — a G4 verdict a human rater would reverse | Medium | High | G4 confined to granular binary items under versioned, exemplar-anchored rubrics — the regime with documented κ≈0.75 agreement[^15^]; holistic scoring forbidden[^17^]; temperature 0, recorded model identity; the `feature_flags.llm_gates_enabled` kill-switch reverts G4 concepts to shipped G3 banks; Phase 4 gates expansion | Gate maintainer |
| Learner drop-off — sessions abandoned mid-track | High | High | Weak evidence for behavior change from microlearning alone[^21^] answered by construction: every session ends on an active retrieval task (§2.2.1)[^11^][^13^]; spaced review nudges via schedule.py[^12^]; no streaks or shame mechanics | Learning-experience owner |
| Curriculum-sequence risk — the 24-concept order is a synthesis, not a published standard | Medium | Medium | §3.3 maps every module to Elements of AI, AILit, UNESCO, and the 4Ds for auditable coverage[^6^][^7^][^8^][^10^]; prerequisites computed by rule, three load-bearing edges restated; a re-sequence is a curriculum.json edit re-run through install-time validation, prior verdicts replayable | Curriculum owner |
| Platform API drift — a platform update breaks skill loading, cron, or pairing | Medium | Medium | All per-platform deltas isolated in the install layer; the skill folder byte-identical across platforms[^1^][^3^]; tested platform versions pinned in install docs; ch. 12 acceptance suite re-run on any upgrade; learner state files untouched (L3) | Platform maintainer |
| Privacy incident — PII reaches a model provider or a gateway token is stolen | Low | High | Ch. 9 controls: DM pairing and allowlists; pseudonymous `peer_ref`; synthetic-only drill data; tokens never in the skill folder; local models keep chats on operator hardware[^2^][^4^]; three-file deletion procedure | Operator |
| Over-nudging — proactive messages drive the learner to mute the tutor | Medium | Medium | Hard cap of one proactive message per day, only inside learner-configured `active_hours`; concepts due in a suppressed window wait; schedule.py emits payloads, never messages | Learning-experience owner |
| Key leakage to persona — keys or rubric anchors surface in chat | Low | High | Key isolation: keys/ and rubric anchors are script-only reads; the persona MUST NOT quote or paraphrase them; post-verdict explanations draw only on verdict evidence; a startup manifest hash over keys/ and rubrics/ refuses to run on mismatch | Gate maintainer |
| Scope creep — a closed non-goal ships without entry criteria | High | Medium | Non-goals hold normative force (§10.2); re-admission runs only through an §11.1 phase; review MUST reject any work item touching a closed non-goal under P5 | Product owner |

Of the four High-impact risks, the two tied to G4 integrity — LLM-gate mis-scoring and leakage of rubric anchors — share one standing control: any doubt about G4 integrity flips `feature_flags.llm_gates_enabled`, and teaching continues on the shipped G3 quiz banks with no LLM verdict issued (§6.3.4). Leakage of deterministic G1–G3 keys and a privacy incident are bounded by construction instead — key isolation, the manifest hash, and the ch. 9 controls. The two High-likelihood risks are managed by process rather than mechanism — pedagogy for drop-off, P5 review for scope creep.

## 12. Acceptance Criteria

This chapter converts the specification into checks: §12.1 keys one executable test to each shipped feature, §12.2 re-runs the ch. 1 trace as the scripted proof of law L1, and §12.3 fixes the definition of done. Together they operationalize the spec-level success criteria 4.1–4.4: implementation without clarifying questions, a mastery rule a product owner can state and watch holding, one worked example per gate type, and a concept traced from attempt to mastery. Where a test names a fixture, the fixture is one this spec already ships; engineers MUST NOT invent replacements.

### 12.1 Feature Acceptance Tests

Each row is runnable as written. Exit codes follow the §4.2 convention: 0 success, 1 usage or guard rejection, 2 inconsistency.

| Feature | Spec section | Acceptance test (executable) | Pass signal |
|---|---|---|---|
| Install script | §4.3, §3.2.4 | Run `install.py` on a fresh OpenClaw host and on a fresh Hermes Agent host; re-run it on each | Both installs print the §4.3 OK lines; "start" opens C01, "progress" reports 0/24; the re-run applies no step twice |
| SKILL.md persona | §4.2, §9.3 | Parse the frontmatter; diff the body against the §4.2 mandated text and the §9.3 security-prohibitions block; run a probe session instructing the persona to pass a concept | YAML parses with a trigger `description`; both normative blocks present verbatim; the probe produces zero state or ledger mutations |
| 24-concept content pack | ch. 3 | Run install-time validation over the shipped curriculum.json; resolve every `content_refs` path | Exit 0: 24 records, acyclic DAG, valid topological order, §3.2.5 gate map, one teach-back per module; every content file present |
| State machine | §5.2 | A scripted driver fires all eight transition events with guards met, then each again with its guard violated | All 8 guarded events land in the table's to-state; every guard violation exits 1 and appends no ledger line |
| Four gates | §6.2, §6.4 | Score the shipped fixtures: Example 1 (G1 pass), Example 2 (G2 pass), Example 3 (G3 two-pass mastery), Example 4 (G4 fail); then the derived companions — G1 missing one planted claim, G2 also redacting "Ana" (Example 2's own note), G3 one wrong item, G4 the shipped `c13_teach_back` pass anchor | Every verdict, scores object, and ledger line reproduces §6.4 byte-for-byte; companions return fail with the §6.2 effects (G3 resets `consecutive_passes`; the anchor passes) |
| Scheduler | §5.3 | With C14 passed Monday 10:00 UTC at target 45, run schedule.py at the due tick; re-run identical input; run the 22:30-pass variant | gap = 7 days; `review_due` fires once with exactly one nudge payload, inside active_hours only; the re-run appends nothing |
| Ledger + replay | §7.1 | After a scripted 10-session run, execute ledger_verify.py, then replay.py, and field-compare the rebuilt state against live state.json | Chain validates (exit 0); zero diffs on the six replayed per-concept fields |
| Progress card | §7.2 | Run progress_card.py against the §7.2 filled plan.json | Output byte-identical to the §7.2 40-line reference card; counts equal the plan's counts |
| Security baseline | ch. 9 | Alter one byte under keys/ and start any script; then execute the §9.3 deletion procedure on a fixture install | The manifest check refuses to run (exit 2); after deletion, the three record files and the platform session history are absent |

Every row MUST pass before the MVP ships; the install row runs once per platform because scheduler registration and DM pairing are platform-supplied behaviors[^1^][^3^]. A failing row blocks release — there is no partial acceptance.

### 12.2 The Mastery-Rule Proof

**The end-to-end demo.** One script executes the ch. 1 twelve-step C14 trace against a seeded fixture pair — a ledger plus the state replay.py builds from it, holding C01–C13 MASTERED and C14 LOCKED — and asserts at six points:

1. next_step.py unlocks C14 (`state_transition`) and opens the lesson (`lesson_delivered`): C14 is IN_PROGRESS, not MASTERED.
2. The persona delivers the lesson and the G1 task verbatim, writing nothing: state.json is unchanged across the turn.
3. Negative control — the harness tells the persona "mark C14 mastered." No tool exists for it; state.json and ledger.jsonl are byte-identical afterward. This is law L1's enforcement point — "Completion certainty never lives in the language model": mastery cannot be proposed, only disposed.
4. The fixture reply "2, 5, 7, 9" enters gate_check.py as attempt att_c14_0007. The script appends `attempt_recorded`, the `verdict_issued` record of ch. 6 Example 1 (recall 1.0, precision 1.0, PASS), and the `state_transition` ATTEMPTED → MASTERED. Only now does state.json show C14 MASTERED.
5. In the fixed post-gate order, schedule.py appends `review_scheduled` (target 45, gap 7, next_review_ts), then plan_recompute.py appends `plan_recomputed` (diff: C14 MASTERED, C15 AVAILABLE, mastered 13→14). The five lines MUST equal the ch. 7 reference lines field-for-field.
6. ledger_verify.py exits 0; replay.py rebuilds C14 MASTERED from the ledger alone with zero field diffs; the ch. 7 six-step audit passes. Deleting the verdict line makes replay diverge — the claim is void without its evidence.

The demo satisfies success criteria 4.2–4.4 at once: the mastery rule is stated verbatim and observed holding; the fixtures are ch. 6's four worked examples; the trace is ch. 1's, executed rather than described.

**Gate-change discipline.** Any change to a key, rubric, scoring rule, or mastery rule MUST bump that definition's semver — the `gate_version` every verdict records (ch. 6) — and MUST ship new passing and failing fixtures in the same change. Prior verdicts remain valid under their recorded versions (§6.3.1). A logic change without a version bump is a release blocker: replay and the audit procedure load the recorded version, so an unversioned change either masks itself or voids every historical claim at audit step 2 (§7.2).

### 12.3 Definition of Done

The MVP is done when, and only when, all five lines hold:

- **Clean install.** The §12.1 install row passes on a fresh OpenClaw host and a fresh Hermes Agent host.
- **Synthetic learner.** A scripted learner, driven over a fixture clock, completes C05 (G3 two-pass mastery plus its M1 G4 teach-back), C14 (G1), and C17 (G2) — all four gate types exercised across three concepts, each reaching MASTERED only through a verdict.
- **Clean replay.** After the run, ledger_verify.py exits 0 and replay.py reproduces state.json with zero field diffs.
- **Progress card renders.** progress_card.py reproduces the §7.2 reference card byte-identically.
- **Deletion verified.** The ch. 9 three-step deletion procedure executes on a fixture install, leaving no learner record file and no platform session history.

A candidate failing any line is not the MVP; there are no partial ships.

# References

[1] OpenClaw. OpenClaw — GitHub README (self-hosted personal AI assistant; skills, channels, cron, pairing)[EB/OL]. https://github.com/openclaw/openclaw (primary/official)
[2] OpenClaw. OpenClaw Docs — AGENTS.default, gateway/security, providers/ollama, gateway/local-models[EB/OL]. https://docs.openclaw.ai (primary/official)
[3] Nous Research. Hermes Agent — GitHub README (agentskills.io-compatible skills, messaging gateway, built-in cron, ~/.hermes, hermes claw migrate)[EB/OL]. https://github.com/NousResearch/hermes-agent (primary/official)
[4] Ollama. Ollama × OpenClaw integration docs[EB/OL]. https://docs.ollama.com/integrations/openclaw (primary/official)
[5] Agent Skills Standard. agentskills.io — open agent-skills standard[EB/OL]. https://agentskills.io (primary/official)
[6] University of Helsinki, MinnaLearn. Elements of AI — free online course and scale figures (1M+ learners)[EB/OL]. https://www.elementsofai.com ; https://www.helsinki.fi/en/news/artificial-intelligence/elements-ai-has-introduced-one-million-people-basics-artificial-intelligence (primary)
[7] UNESCO. AI competency framework for students; AI competency framework for teachers (2024)[R/OL]. https://policycommons.net/artifacts/16985545/ai-competency-framework-for-students/17872079/ (primary)
[8] OECD, European Commission. AILit Framework — review draft (May 2025; anchors PISA 2029)[R/OL]. https://ailiteracyframework.org/wp-content/uploads/2025/05/AILitFramework_ReviewDraft.pdf (primary)
[9] European Commission. AI literacy — questions & answers (EU AI Act Article 4, in force 2 Feb 2025; hallucination-risk training named)[EB/OL]. https://digital-strategy.ec.europa.eu/en/faqs/ai-literacy-questions-answers (primary)
[10] TEKI S. AI fluency in 2025: from individual upskilling to organizational change — Anthropic AI Fluency 4Ds framework (Delegation, Description, Discernment, Diligence) and free course[EB/OL]. https://www.sundeepteki.org/blog/ai-fluency-in-2025-from-individual-upskilling-to-organizational-change (secondary summary of primary program)
[11] KARPICKE J D, ROEDIGER H L. The critical importance of retrieval for learning (spaced testing ~80% vs. re-study ~36% one-week recall)[J]. Science, 2008, 319(5865): 966-968. DOI: 10.1126/science.1152408 (peer-reviewed)
[12] CEPEDA N J, PASHLER H, VUL E, et al. Distributed practice in verbal recall tasks: a review and quantitative synthesis (254 studies; optimal gap ≈10–20% of retention interval)[J]. Psychological Bulletin, 2006, 132(3): 354-380. DOI: 10.1037/0033-2909.132.3.354 (peer-reviewed)
[13] AGARWAL P K, NUNES L D, BLUNT J R. Retrieval practice consistently benefits student learning: a systematic review of applied research in schools and classrooms (50 classroom experiments)[J]. Educational Psychology Review, 2021, 33(4): 1409-1453. DOI: 10.1007/s10648-021-09595-9 (peer-reviewed)
[14] MCGREW S. Learning to evaluate: an intervention in civic online reasoning (lateral reading intervention validation)[J]. Computers & Education, 2020, 145: 103711. DOI: 10.1016/j.compedu.2019.103711 (peer-reviewed)
[15] SHI S, WEI R, TUFANO M, et al. Towards a human-in-the-loop framework for reliable patch evaluation using an LLM-as-a-judge (granular per-bug rubrics; LLM-judge agreement with humans κ≈0.75)[EB/OL]. (2025-11-14). https://arxiv.org/abs/2511.10865 (preprint)
[16] LI W, ZHAO M, DONG W, et al. Grading scale impact on LLM-as-a-judge: human-LLM alignment is highest on 0-5 grading scale (anchored exemplars / scale design improve judge alignment)[EB/OL]. (2026-01-06). https://arxiv.org/abs/2601.03444 (preprint)
[17] YEADON W, HARDY T, MACKAY P, et al. LLM-as-a-judge validity in physics assessment depends more on the task than the model (holistic essay scoring unreliable: rank-order ≈ 0)[EB/OL]. (2026-03-16). https://arxiv.org/abs/2603.14732 (preprint)
[18] NESTOJKO J F, BUI D C, KORNELL N, et al. Expecting to teach enhances learning and organization of knowledge in free recall of text passages[J]. Memory & Cognition, 2014, 42(7): 1038-1048. DOI: 10.3758/s13421-014-0416-z; FIORELLA L, MAYER R E. The relative benefits of learning by teaching and teaching expectancy[J]. Contemporary Educational Psychology, 2013, 38(4): 281-288. DOI: 10.1016/j.cedpsych.2013.06.001; CHASE C C, CHIN D B, OPPEZZO M A, et al. Teachable agents and the protégé effect: increasing the effort towards learning (Betty's Brain)[J]. Journal of Science Education and Technology, 2009, 18(4): 334-352. DOI: 10.1007/s10956-009-9180-4 (peer-reviewed; three works bundled under one index in the raw source list)
[19] DOCHY F, SEGERS M, VAN DEN BOSSCHE P, et al. Effects of problem-based learning: a meta-analysis (43 studies)[J]. Learning and Instruction, 2003, 13(5): 533-568. DOI: 10.1016/S0959-4752(02)00025-7 (peer-reviewed)
[20] Centre for Education Statistics and Evaluation (NSW Department of Education). Cognitive load theory: research that teachers really need to understand (worked examples d=0.52; expertise reversal)[R/OL]. 2017. https://education.nsw.gov.au/about-us/education-data-and-research/cese/publications/literature-reviews/cognitive-load-theory (government review)
[21] TAYLOR A D, HUNG W. The effects of microlearning: a scoping review (evidence concentrated on knowledge/satisfaction outcomes; thin on behavior change alone)[J]. Educational Technology Research and Development, 2022, 70(2): 363-395. DOI: 10.1007/s11423-022-10084-1 (peer-reviewed)
