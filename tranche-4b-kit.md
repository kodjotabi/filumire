# Tranche 4B kit

Four parts: (1) what to paste into ChatGPT, (2) CLAUDE.md, (3) Session A/B/C prompts.
All paths are relative to `C:\Users\tabi\Desktop\filumire\FILUMIRE_CLAUDE`.

---

## 1. What to paste into ChatGPT (mastery design prompt)

| Slot in the ChatGPT prompt | What to copy |
|---|---|
| RECORDED DECISION | `docs/handoff/ENGLISH_NEXT_SESSION.md` lines **564–570** ("Decision (Tabi, 7 October): mastery option B") |
| CURRENT MASTERY / CONFIDENCE CODE | the **whole** of `services/mastery/index.ts` (383 lines; `MASTERY_V1_POLICY` at line 7, `evaluateMastery` at line 235) |
| EVIDENCE TYPE DEFINITION | `packages/domain/index.ts`: lines **21–60** (EvidenceOutcome, EvidencePurpose, EvidenceIndependence), **220–320** (InterventionOutcome, InterventionResponseSummary, LearningEvidence), **349–375** (LearnerInterventionRecord) |

Add this line to the ChatGPT prompt just above "RECORDED DECISION":

```
NOTE: The recorded decision is specific: after an intervention is evaluated
effective (a correct answer under teach/remediate/scaffold), mastery is
estimated mainly from evidence since that point, and earlier pre-instruction
errors stop counting toward CURRENT mastery. They stay stored. Design to that
rule; you choose only details such as whether pre-instruction CORRECT answers
still count, how "effective" is detected from existing fields, and what
happens on a second remediation or a later regression.
```

Save ChatGPT's reply as `docs/handoff/4B_mastery_design.md`.

---

## 2. CLAUDE.md (put in the FILUMIRE_CLAUDE root; none exists yet)

```markdown
# FILUMIRE_CLAUDE: standing rules

- Work only inside FILUMIRE_CLAUDE. Never read from or write to FILUMIRE_CORE.
- Files on disk are the source of truth; verify before changing code.
- Do not stage files, change staging state, or commit to Git.
- Back up edited production files in the established handoff backup structure.
- Preserve the shared FILUMIRE architecture; engine fixes are shared, not subject-specific.
- Never weaken mastery thresholds or tests to get a pass.
- Out of scope unless asked: UI redesign, payments, deployment, pilot configuration.
- Handoff: docs/handoff/ENGLISH_NEXT_SESSION.md. Keep it current-state only; history goes to an archive file.

## Credit discipline
- Write test/build/validation output to a log file; show only the summary and failures.
- Between steps run targeted + directly affected tests only; full suite, production build,
  TypeScript check and auth/security checks once at the end of a tranche.
- No subagents unless asked.
- If approaching usage limits: stop at the end of the current step, make sure the code compiles
  and targeted tests pass, update the handoff, then stop.
- Final reports: under 40 lines; details go in the handoff.
```

---

## 3. Session prompts

### Session A: Steps 1 + 2 (Sonnet 5.5, medium effort)

```
TRANCHE 4B, SESSION A of 3: Steps 1 and 2 only.
Work from C:\Users\tabi\Desktop\filumire\FILUMIRE_CLAUDE. Rules: CLAUDE.md.

Read first: docs/handoff/ENGLISH_NEXT_SESSION.md (sections "Tranche 4A" and the
Option B decision) and tests/repro-4a-*.ts.

Starting checkpoint to confirm cheaply (targeted, not full suite): B5/B6 English
134/134, validate-all baseline 62/62 per latest log, TS baseline 118 errors all in
handoff/backup folders.

STEP 1: content selection and policy (no new learner state)
- Practice can serve an appropriate unused question when assessment evidence is needed.
- A question-seeking action never falls back to a lesson/example/remediation card while
  an eligible question remains.
- Preserve purpose semantics: diagnostic for diagnosis, practice/mastery for practice,
  reassessment after teaching, retention and transfer kept for retention/transfer.
- A diagnostic wrong answer is not treated as a failed intervention.
- Preserve misconception mapping and authored expected responses.
- Fix the unscoped chooseFocus/retention planner call (must filter grade + subject)
  only if the fix is clear and small.
Tests: convert the applicable repro-4a cases into regression tests; English + one
non-English subject. Validate before Step 2.

STEP 2: card acknowledgement / intervention lifecycle
- Card returned -> learner presses Next -> explicit acknowledgement recorded ->
  existing intervention marked delivered/completed -> next decision can serve a question
  -> the answer is associated with that intervention.
- Displaying a card is not evidence. Refresh or dropped connection is not acknowledgement.
- Do not use the "observed" outcome for acknowledgement. Acknowledgement does not change mastery.
- Reuse/close the open intervention; repeated GET must not create new active interventions.
- Minimal API/UI change so the existing Next control sends the acknowledgement. No redesign.
Tests: card -> Next -> question; refresh without Next is not acknowledgement; no false
evidence; repeated GET does not create interventions; answer linked to intervention;
struggling learner not trapped. English + one non-English subject.

END OF SESSION
- Run full validate-all once (log to file, summary only).
- Update the handoff: what changed, tests added, current count, anything Session B must know.
- Report in under 40 lines. STOP. Do not start Step 3.
```

### Session B: Step 3 (Opus 5.5, medium effort; high only if the mastery logic goes wrong)

```
TRANCHE 4B, SESSION B of 3: Step 3 only.
Work from C:\Users\tabi\Desktop\filumire\FILUMIRE_CLAUDE. Rules: CLAUDE.md.

Read first: docs/handoff/ENGLISH_NEXT_SESSION.md (Session A results + Option B decision),
docs/handoff/4B_mastery_design.md (design spec from an outside reviewer: verify its
description of the current code against services/mastery/index.ts and
packages/domain/index.ts and list mismatches BEFORE implementing).

A. Purpose-safe pools: keep diagnostic, practice/reassessment, retention and transfer
   separate. No consuming retention/transfer items because another pool is empty, unless
   the architecture already defines a safe fallback.
B. Controlled reuse when fresh mastery items are exhausted: never repeat the item just
   answered; require teaching/remediation or meaningful spacing before reuse; use
   exposureCount/attemptCount; repeated answers are identifiable and weigh less; avoid
   loops between one or two items.
C. Option B mastery (services/mastery): after an intervention is evaluated effective,
   current mastery comes mainly from evidence since then; earlier errors stay stored but
   stop counting toward current mastery. Unchanged: masteryThreshold 0.8,
   confidenceThreshold 0.8, at least 3 independent correct, retention + transfer required,
   assisted and repeated evidence count less. One remediation + one correct must not
   reach mastery.
D. Tiny pools: test B4 Maths number-patterns-001 (2 items). No deadlock; confidence stays
   honestly limited; no manufactured mastery.
E. Do not author new curriculum questions. List thin topics for a later authoring tranche.

Tests: perfect learner; one early error; two early errors; remediation; repeated-item
evidence; tiny pool; retention; transfer; thresholds unchanged. English + non-English.

END OF SESSION: full validate-all once (logged), update handoff (mastery before/after,
reuse rules, thin-topic list), report under 40 lines, STOP. Do not start Step 4.
```

### Session C: Step 4 + final regression (Sonnet 5.5 first; switch to Opus if the planner work stalls)

```
TRANCHE 4B, SESSION C of 3: Step 4, final regression, handoff.
Work from C:\Users\tabi\Desktop\filumire\FILUMIRE_CLAUDE. Rules: CLAUDE.md.

Read first: docs/handoff/ENGLISH_NEXT_SESSION.md, tests/repro-4a-short-paths.test.ts,
services/learner-path/index.ts.

STEP 4: whole-subject progression
1. If the current competency has a successor whose prerequisites are met: choose it.
2. Otherwise ask the existing learner-path planner for the next eligible unfinished
   competency, filtered to the learner's current grade AND subject.
3. Eligibility uses ALL stored learner competency states, not just the current chain.
4. Never choose a competency with incomplete prerequisites, or an already mastered one
   as forward progression.
5. "Learning path complete" only when no eligible unfinished competency remains in that
   subject and grade (legitimate retention/review allowed).
6. Never cross subject or grade automatically. Keep adaptive choice among eligible options.
Tests: multiple independent chains; B5 English, B6 English, a B4 subject, Maths or
Computing; B5 English is not complete after 2/134; B5 English learner never sent to B4
Maths; prerequisites respected; "complete" only when the curriculum is actually done.

Cold-start timeout (live 10s validation request): measure 2-3 times and document. Do not
raise the timeout unless the measurement shows that is the correct fix.

FINAL REGRESSION (once): full validate-all with fixed repro-4a cases added to normal
validation; B5 134/134, B6 134/134, English 268/268; grade-aware subject tests; B5/B6
runtime; adaptive, card acknowledgement, reuse/mastery, cross-chain path tests; Maths,
Computing, Science regressions; no duplicate IDs or broken references; production learner
build; auth/security; no new live TypeScript errors.

HANDOFF: trim ENGLISH_NEXT_SESSION.md to current state (move history to an archive file);
record path algorithm, final count, remaining content/engine risks, exact next tranche.

REPORT (under 40 lines): items 1-16 from the original Tranche 4B final report list.
Confirm FILUMIRE_CORE untouched, staging unchanged, no Git commit. STOP.
```
