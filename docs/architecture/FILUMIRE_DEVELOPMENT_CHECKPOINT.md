# FILUMIRE DEVELOPMENT CHECKPOINT

**Checkpoint:** End of pre-audit architecture programme  
**Next action:** Repository Truth Audit, Pass 1  
**Repository:** `C:\Users\tabi\Desktop\filumire\FILUMIRE_CORE`

## Canonical definition

FILUMIRE is an EduTutor and adaptive learning infrastructure for African children. It is a continuously updating learning intelligence system, not a generic chatbot, content library, quiz app, or fixed course.

Adaptive Intelligence is the brain. FILU is the instructional interface operating under its decisions and constraints.

Governing loop:

> understand learner → understand competency → current state → unknowns → why struggle → intervention → delivery → measure → mastery → retention → transfer → learner-model update → next best action

## Completed specification

Architecture work through Lumps 1–30 has been consolidated into:

`FILUMIRE_MASTER_ARCHITECTURE_AND_ADAPTIVE_INTELLIGENCE_SPECIFICATION.md`

It covers the Learner Model, Competency Graph, Evidence Engine V1, Diagnosis Engine V1, Mastery Engine V1, Intervention Engine V1, Adaptive Policy V1, assessment/tasks, content orchestration, FILU, retention, transfer, teacher/parent/institutional systems, African Learning Intelligence, offline/sync, security/privacy, entitlements/payment adapter, reliability, research, QA/release, event/state canon, requirements, tests, first vertical slice, and repository-audit protocol.

## Hard boundary

Do not continue producing speculative architecture before inspecting the repository.

Next substantive artifact:

**Lump 31: Repository Truth Audit, Pass 1**

## Audit objective

Determine from actual repository evidence:

1. what exists;
2. what is runtime-connected;
3. what satisfies the canon;
4. what contradicts the canon;
5. what the earliest missing/contradicted dependency is.

## First audit pass

Establish:

1. Git branch, commit, working-tree status;
2. repository topology;
3. package/workspace/build/test scripts;
4. database schema, relations, migrations;
5. Ghana Basic 4 Mathematics, Science, and English curriculum/adaptive files;
6. existing tests and validation.

Do not edit files during the first audit pass.

## Repository audit statuses

- MISSING
- PARTIAL
- IMPLEMENTED
- VALIDATED
- CONTRADICTED
- DEFERRED
- UNKNOWN

Confidence:

- HIGH
- MEDIUM
- LOW

Actions:

- KEEP
- KEEP + TEST
- STRENGTHEN
- REFACTOR
- ADD
- REMOVE
- DEFER
- INVESTIGATE

## First adaptive vertical slice

After audit, select one real Ghana Basic 4 Mathematics competency cluster using actual repository IDs:

> prerequisite A → target B → extension C + misconception M1

Prove seven learner patterns:

1. clean progression;
2. hidden prerequisite gap;
3. misconception;
4. support dependence;
5. uncertain/contradictory evidence;
6. retention weakness;
7. transfer weakness.

The decisive demonstration is that similar wrong answers can lead to different defensible next actions because learner evidence histories differ.

## Critical architecture boundaries

- Curriculum defines what should be learned.
- Adaptive Intelligence decides what the learner needs next.
- Instruction/FILU decides how to teach under those constraints.
- Experience/UI presents the result.
- Evidence, diagnosis, mastery, intervention, and policy remain separate authorities.
- FILU cannot declare mastery or progression.
- Payment/entitlement cannot mutate educational truth.
- Technical failure cannot become learner failure.
- Raw evidence is preserved.
- Derived interpretations are versioned and recomputable.
- Teacher overrides preserve history.
- Offline state cannot overwrite authoritative derived state using last-write-wins.

## Payment Adapter

Do not forget the payment adapter. Canonical commercial flow:

> Provider → Payment Adapter → Transaction/Subscription → Entitlement Engine → Access

Commercial state remains separate from learning state.

## Coding workflow after audit

For `/TRUTH` code changes:

1. exact file path;
2. complete replacement file contents where applicable;
3. exact validation command.

Do not use vague "find this section" instructions.

Conserve GitHub Copilot Pro+ credits. Use PowerShell/Git and ChatGPT reasoning for inspection, validation, and simple changes. Reserve agentic execution for genuinely complex multi-file work or difficult debugging.

## First-code rule

Do not choose the first implementation task until the audit identifies the selected Math slice and the earliest P0 missing or contradicted upstream dependency blocking it.

That one dependency becomes the first code task.
