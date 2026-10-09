# FILUMIRE MASTER ARCHITECTURE AND ADAPTIVE INTELLIGENCE SPECIFICATION

**Status:** Canonical pre-audit engineering specification  
**Scope:** Consolidation of FILUMIRE architecture work completed through Lumps 1–30  
**Next phase:** Repository Truth Audit, beginning with Lump 31  
**Repository:** `C:\Users\tabi\Desktop\filumire\FILUMIRE_CORE`

---

## 1. Canonical Product Definition

FILUMIRE is an **EduTutor and adaptive learning infrastructure for African children**. It is not a generic AI tutor, chatbot, content library, quiz application, or fixed-course platform.

FILUMIRE is a continuously updating learning intelligence system. Its adaptive intelligence layer is the brain. FILU is an instructional interface operating under the decisions and constraints of that intelligence.

The governing learning loop is:

> understand learner → understand competency → identify current state → identify what is unknown → identify why learner struggles → select intervention → deliver → measure → verify mastery → verify retention → verify transfer → update learner model → select next best action

FILUMIRE optimises for durable, transferable capability rather than activity completion, scores, engagement, or dependence on the platform.

---

## 2. FILUMIRE Constitutional Laws

1. Curriculum defines the learning domain.
2. Evidence drives learner understanding.
3. Diagnosis is revisable.
4. Mastery requires credible, increasingly independent evidence.
5. Intervention responds to diagnosed need.
6. Adaptive Policy owns the Next Best Action.
7. FILU teaches under decisions made by the learning intelligence.
8. Mastery, retention, and transfer are distinct.
9. Teachers and other authorised humans remain in the loop.
10. Educational truth remains separate from commercial access.
11. Adaptive decisions must be traceable and correctable.
12. FILUMIRE optimises for durable learner capability, not platform dependence.

---

## 3. Core Non-Negotiable Invariants

- Content does not determine progression.
- An assessment result is not a diagnosis.
- One correct response cannot establish mastery.
- Supported performance is not independent performance.
- Mastery is not retention.
- Mastery is not transfer.
- Retention failure does not mean the learner never learned.
- Transfer failure does not automatically erase core mastery.
- Grade placement is not learner ability.
- Inactivity is not inability.
- Technical failure is not learner failure.
- FILU cannot declare mastery or independently choose progression.
- Adaptive Policy cannot invent evidence or declare mastery.
- Payment state cannot mutate educational truth.
- Entitlement expiry never deletes learning history.
- Teacher overrides preserve prior decision history.
- Offline state cannot overwrite authoritative derived state using last-write-wins semantics.
- AI-generated content is not automatically trusted.
- Institutional access does not equal ownership of the learner's educational history.
- Adaptation must never silently lower the required educational standard.

---

# PART I: LEARNING INTELLIGENCE

## 4. Learner Journey and Core Behaviour

At entry, FILUMIRE should inspect prior activity, mastery, errors, retention, prerequisites, unfinished work, confidence, and available evidence. If evidence is insufficient, it should collect a short diagnostic rather than guessing.

Diagnosis is not an examination. The system should distinguish independent and supported correctness, partial knowledge, misconceptions, procedural and conceptual weakness, prerequisite weakness, repeated mistakes, support dependence, language-access issues, retention weakness, transfer weakness, and insufficient evidence.

The Next Best Action may include:

- introduce a competency;
- collect evidence;
- run a diagnostic probe;
- repair a prerequisite;
- address a misconception;
- reteach;
- change representation;
- increase support;
- fade support;
- guided practice;
- independent practice;
- mastery verification;
- retention check;
- transfer check;
- advance;
- enrich;
- escalate to a teacher;
- pause an unreliable path.

Instruction follows the broad learning sequence:

> Understand → Practise → Apply → Check

Mastery is established from multiple credible evidence sources, followed later by retention and transfer verification.

---

## 5. Learner Competency State

The conceptual state vocabulary includes:

- UNKNOWN
- PREREQUISITE_GAP
- EMERGING
- DEVELOPING
- PROFICIENT
- MASTERED
- RETENTION_DUE
- RETAINED
- TRANSFER_DUE
- TRANSFER_VERIFIED

Implementation caution: mastery, retention, and transfer should preferably remain separate internal projections rather than being collapsed into one irreversible enum ladder. A derived user-facing state may combine them.

State regression and confidence changes are allowed when credible evidence warrants them.

---

## 6. Learner Model

The Learner Model is a structured projection of current educational understanding, not a giant opaque JSON object and not an independent hidden reasoning authority.

It should include:

- learner identity and education context;
- per-competency state;
- subskill state;
- prerequisite state;
- misconception lifecycle;
- support gradient and independence trajectory;
- intervention history and effectiveness;
- learning trajectory;
- mastery result and confidence;
- retention state;
- transfer state;
- uncertainty;
- behaviour distinguished from knowledge;
- bottlenecks;
- teacher evidence;
- offline/sync context;
- audit and version references.

It should answer what FILUMIRE currently knows, what it does not know, and how confidently it knows it.

---

## 7. Competency Graph

FILUMIRE preserves official curriculum hierarchy while adding machine-operational learning structure.

For Ghana Basic 4, official NaCCA structure must preserve:

> Subject → Strand → Substrand → Content Standard → Indicator

Machine-operational structures include:

- stable competency IDs;
- subskills;
- prerequisite relationships;
- related competencies;
- misconception definitions;
- evidence requirements;
- transfer requirements;
- graph integrity;
- curriculum/version provenance.

Subskills should exist only when they are adaptively useful.

Prerequisite graphs must be validated for missing references, cycles, and other integrity failures.

---

# PART II: EVIDENCE, DIAGNOSIS, MASTERY, INTERVENTION

## 8. Evidence Engine V1

### Purpose

Convert raw learner interaction into structured, trustworthy educational evidence while preserving what actually happened.

### Fundamental separation

> Learner Interaction → Raw Response → Scoring/Observation → Evidence Interpretation → EvidenceRecord → Diagnosis/Mastery/Learner Model

Raw responses are immutable source facts. Evidence interpretation is derived and versioned.

### Canonical EvidenceRecord

Conceptually includes:

- evidenceId
- learnerId
- competencyId
- subskillIds
- taskId
- responseId
- attemptId
- sessionId
- assessmentPurpose
- outcome
- independence
- supportLevel
- difficultyProfile
- representation
- errorClassifications
- misconceptionCandidates
- prerequisiteSignals
- evidenceStrength
- provenance
- occurredAt
- recordedAt
- interpretationVersion
- status

### Outcomes

- CORRECT
- PARTIALLY_CORRECT
- INCORRECT
- INCOMPLETE
- SKIPPED
- UNSCORABLE
- INSUFFICIENT

Partial knowledge is first-class evidence.

### Support and independence

The system must preserve how success was achieved. V1 may use a gradient such as:

0. INDEPENDENT
1. ATTENTION_CUE
2. CONCEPTUAL_PROMPT
3. STRATEGIC_HINT
4. PARTIAL_SCAFFOLD
5. GUIDED_SOLUTION
6. WORKED_EXAMPLE

Supported success is positive learning evidence but is not equivalent to independent mastery evidence.

### Error classification

V1 classes may include:

- CONCEPTUAL
- PROCEDURAL
- PREREQUISITE
- MISCONCEPTION_PATTERN
- REPRESENTATION
- LANGUAGE_COMPREHENSION
- CALCULATION
- INCOMPLETE_REASONING
- SUPPORT_DEPENDENCE
- POSSIBLE_CARELESS_ERROR
- UNKNOWN

An error classification is not automatically a diagnosis.

### Exposure

Evidence should distinguish:

- FRESH
- RELATED_EXPOSURE
- EQUIVALENT_EXPOSURE
- EXACT_EXPOSURE
- HEAVILY_EXPOSED

Repeated exposure reduces novelty and therefore can reduce evidential value.

### Evidence strength

WEAK / MODERATE / STRONG refers to evidential value, not learner ability.

### Integrity rules

- Technical failure never becomes incorrect academic evidence.
- Timeout or abandonment is not automatically academic failure.
- Attempts remain separate.
- Self-correction before feedback differs from correction after feedback.
- Teacher evidence is structured and provenance-preserving.
- FILU observations are evidence candidates, not automatically authoritative evidence.
- AI interpretation records model/config/version and uncertainty.
- Invalid evidence can be invalidated without deleting history.
- Reinterpretation preserves prior interpretation lineage.
- Offline evidence uses the same semantics and idempotent merge behaviour.

---

## 9. Diagnosis Engine V1

### Purpose

Produce evidence-based, revisable hypotheses explaining why the learner is struggling.

Diagnosis is not a permanent label.

### Canonical diagnosis types

- INSUFFICIENT_EVIDENCE
- KNOWLEDGE_GAP
- PREREQUISITE_GAP
- MISCONCEPTION
- PROCEDURAL_WEAKNESS
- APPLICATION_DIFFICULTY
- LANGUAGE_ACCESS_DIFFICULTY
- SUPPORT_DEPENDENCE
- RETENTION_FAILURE
- TRANSFER_FAILURE

### DiagnosisResult

Conceptually includes:

- diagnosisId
- learnerId
- competencyId
- hypotheses[]
- primaryDiagnosis
- confidence
- supportingEvidenceIds[]
- contradictingEvidenceIds[]
- unresolvedQuestions[]
- recommendedEvidenceNeeds[]
- status
- diagnosisModelVersion
- createdAt

### Rules

- Insufficient evidence is a valid diagnosis outcome.
- Scores alone never diagnose.
- Multiple competing hypotheses may coexist.
- A primary diagnosis is selected only when sufficiently supported.
- Every diagnosis preserves supporting and contradicting evidence.
- Confidence should initially be LOW / MODERATE / HIGH rather than fake probability precision.
- A prerequisite gap requires evidence that a prerequisite materially blocks the target.
- A misconception requires a systematic incorrect model or rule, not merely repeated wrong answers.
- Procedural weakness means conceptual/strategic understanding exists but execution fails.
- Application difficulty means direct performance is stronger than contextual application.
- Language-access difficulty concerns incidental language blocking demonstration of the target. It cannot remove language demand when language itself is the target.
- Support dependence means supported/guided success but weak independent performance.
- Retention failure requires credible prior mastery plus delayed retrieval failure.
- Transfer failure requires credible mastery and fair changed-context failure.
- Cultural/context novelty and accessibility barriers must not be misdiagnosed as knowledge weakness.
- Invalid or ambiguous tasks cannot support diagnosis.
- No psychological or ability labels such as "lazy", "low ability", or "slow learner".

### Misconception lifecycle

> SUSPECTED → SUPPORTED → CONFIRMED → UNDER_INTERVENTION → APPARENTLY_RESOLVED → RESOLUTION_VERIFIED

Regression is allowed when evidence warrants it.

### Diagnosis and Policy handshake

> Diagnosis identifies likely cause and uncertainty → Policy requests discriminating evidence → Assessment supplies probe → Evidence Engine interprets → Diagnosis revises.

Diagnosis may recommend intervention families but does not select the Next Best Action.

---

## 10. Mastery Engine V1

### Purpose

Determine how strongly evidence supports current possession of a competency.

Mastery means credible evidence that the learner can perform the competency correctly, consistently, at appropriate challenge, with sufficient independence and variation.

### MasteryResult

Conceptually includes:

- estimate
- confidence
- recommendedState
- usedEvidence
- excludedEvidence
- independentEvidence
- supportedEvidence
- variation
- difficultyCoverage
- consistency
- positiveEvidence
- contradictoryEvidence
- unmetRequirements
- reasonCodes
- version
- evaluatedAt

Estimate and confidence are distinct.

### Seven primary dimensions

1. correctness;
2. independence;
3. consistency;
4. evidence strength;
5. task variation;
6. difficulty;
7. recency.

### Mastery blockers

Potential hard blockers include:

- no independent evidence;
- insufficient task variation;
- difficulty below required level;
- unresolved strong contradiction;
- active material misconception;
- assessment integrity failure;
- insufficient evidence.

### Rules

- One correct response cannot establish mastery.
- Repeated identical success is weaker than varied success.
- Hinted or guided correctness contributes learning evidence but less independent mastery evidence.
- Independence trajectory matters.
- Task purpose and provenance matter.
- Difficulty is multidimensional.
- One hard success is insufficient.
- Contradictory evidence is represented, not hidden.
- One anomalous failure should not violently regress mastery.
- Repeated fresh failures should trigger reassessment.
- Invalidated evidence is excluded and downstream results recomputed.
- Competency-specific evidence requirements are preferred to a universal "three questions" rule.
- Historical mastery is not silently erased by inactivity.
- Inactivity can reduce certainty or make retention due.
- Learning speed is not mastery.
- Intervention history does not permanently penalise a learner.
- Mastery is separate from retention and transfer.
- FILU and Adaptive Policy cannot declare mastery.

Mastery should be deterministic, transparent, versioned, recomputable, competency-aware, and thoroughly tested before statistical sophistication is added.

---

## 11. Intervention Engine V1

### Purpose

Convert diagnosed need into a deliberate, bounded instructional response.

Intervention is structured as:

> Target → Strategy → Delivery → Evaluation

### InterventionPlan

Conceptually includes:

- originalTarget
- interventionTarget
- diagnosis
- interventionFamily
- objective
- supportLevel
- representations
- steps
- successCriteria
- failureCriteria
- exitCriteria
- returnTarget
- maximumCycles
- status
- version

### Families

- conceptual reteach
- prerequisite repair
- misconception correction
- procedural guidance
- representation change
- language support
- guided practice
- scaffold fade
- independent practice
- retrieval
- transfer
- extension

### Core rule

The original target must be preserved so remediation does not become a trap.

### Misconception intervention

> elicit → contrast/counterexample → reconstruct → guided application → fresh independent verification

### Scaffold fading

> WORKED_EXAMPLE → GUIDED_SOLUTION → PARTIAL_SCAFFOLD → STRATEGIC_HINT → CONCEPTUAL_PROMPT → ATTENTION_CUE → INDEPENDENT

### Rules

- Intervention success is tied to targeted learner change, not content completion.
- Completion does not establish mastery.
- Retention retrieval uses residual mastery rather than treating the learner as a novice.
- Transfer intervention changes context fairly.
- Intervention cycles are bounded.
- Repeated failure can trigger escalation.
- FILU delivers within the plan but cannot independently change intervention family or progression authority.

Statuses may include PLANNED, ACTIVE, PAUSED, COMPLETED, FAILED, SUPERSEDED, ESCALATED.

---

# PART III: ADAPTIVE POLICY

## 12. Adaptive Policy V1

### Purpose

Adaptive Policy is the sole authoritative owner of the Next Best Action.

FILU, content, UI, and assessment components do not independently determine progression.

### Inputs

Policy consumes, as available:

- LearnerContext
- CompetencyDefinition
- learner competency state
- evidence summary
- DiagnosisResult
- MasteryResult
- active/history intervention
- prerequisite state
- misconception state
- support state
- retention state
- transfer state
- teacher constraints
- session context
- connectivity context
- entitlement constraints

### PolicyDecision

Conceptually includes:

- candidateActions
- selectedAction
- target
- reasonCodes
- confidence
- constraints
- policyVersion
- inputSnapshot/version references
- decidedAt

### Action vocabulary

- COLLECT_EVIDENCE
- RUN_DIAGNOSTIC_PROBE
- INTRODUCE_COMPETENCY
- CONTINUE_PRACTICE
- RETEACH_CONCEPT
- REPAIR_PREREQUISITE
- ADDRESS_MISCONCEPTION
- CHANGE_REPRESENTATION
- INCREASE_SUPPORT
- FADE_SUPPORT
- VERIFY_MASTERY
- RUN_RETENTION_CHECK
- RUN_TRANSFER_CHECK
- ADVANCE
- ENRICH
- ESCALATE_TO_TEACHER
- PAUSE_UNRELIABLE_PATH

### Priority hierarchy

1. integrity and reliability;
2. hard teacher constraints;
3. evidence reliability;
4. blocking prerequisite;
5. confirmed misconception;
6. intervention continuity;
7. support/independence;
8. mastery verification;
9. retention;
10. transfer;
11. progression;
12. enrichment.

### Candidate processing

Policy should:

1. generate candidate actions;
2. apply hard disqualifiers;
3. rank remaining candidates using explicit ordinal priorities;
4. break ties using:
   - uncertainty reduction;
   - least intrusive effective action;
   - continuity;
   - increasing independence.

Avoid fake precision in V1.

### Important rules

- Unreliable state or technical failure must not become learner failure.
- Insufficient evidence leads to evidence collection or diagnostic probing.
- Blocking prerequisites can temporarily redirect learning but must return to the original target.
- Suspected misconception may require a discriminator before targeted correction.
- Active interventions should not be abandoned without reason.
- Supported success should normally lead toward scaffold fading.
- Mastery verification requires fresh, appropriate evidence.
- Retention and transfer obligations are distinct from progression.
- Grade does not equal ability/state.
- Inactivity does not equal inability.
- Policy should avoid both over-remediation and under-remediation.
- Contradictory evidence should increase information-seeking when useful.
- Policy should avoid unnecessary testing.
- Offline decisions must remain within bounded authority.
- Entitlement can control access but not educational truth.
- Loop detection must prevent repeated ineffective actions.

### Reason codes

Examples:

- INSUFFICIENT_EVIDENCE
- COMPETING_DIAGNOSES
- BLOCKING_PREREQUISITE
- CONFIRMED_MISCONCEPTION
- ACTIVE_INTERVENTION_CONTINUE
- SUPPORTED_SUCCESS_NEEDS_FADE
- READY_FOR_MASTERY_VERIFICATION
- RETENTION_DUE
- TRANSFER_DUE
- INTERVENTION_FAILURE
- TEACHER_HARD_CONSTRAINT
- POLICY_LOOP_DETECTED
- UNRELIABLE_STATE

Policy confidence is distinct from diagnosis confidence and mastery confidence.

V1 should be rules-based, deterministic, versioned, inspectable, replayable, and testable. It should not be an LLM policy.

---

# PART IV: ASSESSMENT, CONTENT, FILU

## 13. Assessment and Task Architecture

Assessment is continuous and purpose-aware.

A task should identify:

- competency;
- subskill;
- indicator;
- prerequisite where applicable;
- assessment purpose;
- task type;
- difficulty profile;
- representation;
- expected evidence;
- scoring model;
- support allowed;
- language/context;
- provenance;
- exposure/equivalence group;
- validation status.

Task purposes may include:

- initial probe;
- prerequisite probe;
- misconception discriminator;
- guided practice;
- independent practice;
- mastery verification;
- retention;
- transfer.

Task difficulty is multidimensional rather than a single arbitrary number.

AI-generated tasks require validation appropriate to educational risk.

---

## 14. Content Orchestration

Adaptive Policy decides the educational action. Content Orchestration decides how to fulfil that action using available instructional assets.

Content must carry metadata for:

- purpose;
- competency;
- representation;
- language;
- difficulty;
- provenance;
- validation;
- exposure;
- offline availability;
- effectiveness history where available.

Content may be authored, teacher-created, validated AI-generated, or dynamically assembled.

Nothing reaches a learner merely because it exists in the content repository.

AI-generated content is a candidate until validated according to risk.

---

## 15. FILU: AI Instructional Engine

FILU answers **how to teach**, not **what the learner should do next**.

Structured modes may include explanation, questioning, worked example, guided practice, hinting, reflection, and feedback.

FILU must:

- operate under Policy and Intervention constraints;
- use progressive hints;
- ask purposeful questions;
- simplify access without silently lowering standards;
- distinguish session conversation from persistent learner truth;
- emit observations only as evidence candidates;
- respect multilingual and translation safeguards;
- respect child-safety rules;
- never impersonate teachers or other people;
- validate outputs where educational risk warrants it;
- fail safely when AI is unavailable.

FILU success should reduce learner dependence over time.

---

# PART V: DURABLE LEARNING

## 16. Retention Engine

Mastery and retention are separate.

After mastery, FILUMIRE should create future retrieval obligations based on:

- competency importance;
- evidence strength;
- prior retention history;
- prerequisite centrality;
- elapsed time;
- learner response to previous retrieval;
- opportunity for interleaving.

Suggested retention states:

- NOT_APPLICABLE
- NOT_DUE
- DUE
- CHECK_IN_PROGRESS
- RETAINED
- REINFORCEMENT_REQUIRED

Forgetting does not mean the learner never learned.

Retention failure should lead to appropriate retrieval/relearning rather than a full novice reset.

Long inactivity preserves historical mastery while increasing uncertainty or creating a retention obligation.

---

## 17. Transfer Engine

Transfer asks whether learning can be applied beyond the exact form in which it was learned.

A progression may include:

> same structure → varied form → different representation/context → combined competency → unfamiliar context

Transfer evidence may include recognition, near transfer, far transfer, and integrated application.

Language and contextual novelty must be controlled so that transfer failure is not falsely inferred from irrelevant access barriers.

Transfer failure does not automatically erase core mastery.

Suggested states:

- NOT_READY
- ELIGIBLE
- DUE
- CHECK_IN_PROGRESS
- VERIFIED
- SUPPORT_REQUIRED

---

# PART VI: HUMAN ECOSYSTEM

## 18. Teacher-in-the-Loop

Teachers require actionable rather than merely descriptive information.

Teacher functionality should support:

- class and learner views;
- priority queues;
- evidence submission;
- teacher observations;
- assignments;
- hard and soft constraints;
- overrides;
- contradiction handling;
- group patterns;
- grouping;
- workload-sensitive alerts;
- explainability.

Teacher evidence and teacher hypotheses must preserve provenance.

A teacher override overlays the original Policy decision and preserves history rather than rewriting it.

---

## 19. Parent Experience

Parents require a separate, appropriately limited experience.

Parent views should focus on:

- understandable progress;
- current learning priorities;
- strengths;
- areas needing support;
- retention/practice obligations where appropriate;
- constructive home support;
- access/entitlement information where relevant.

Parents do not author mastery or diagnosis.

---

## 20. Institution and Multi-Tenant Model

FILUMIRE should distinguish:

- learner;
- person/principal;
- household;
- class;
- school;
- organisation;
- programme;
- academic year.

A learner's educational history should remain longitudinal across class or institutional changes.

Grade placement and adaptive repair target are separate.

Teacher access is relationship- and scope-based.

Institutional access does not imply ownership of the learner's educational truth.

Tenant isolation and lifecycle management are required.

---

# PART VII: AFRICAN LEARNING INTELLIGENCE

## 21. African Learning Intelligence Layer

FILUMIRE is Africa-focused but must not treat Africa as one generic curriculum, language, culture, or learning context.

The platform must be jurisdiction-aware.

Requirements include:

- country/curriculum configuration;
- multilingual support;
- code-switching awareness;
- translation safeguards;
- contemporary local contexts;
- avoidance of stereotypes;
- local foods, environments, names, and situations used only when educationally relevant;
- device/resource/connectivity awareness;
- shared-device realities;
- opportunity-to-learn awareness;
- configurable deployment modes;
- research validation of assumptions.

Localization must not contaminate the construct being assessed.

---

# PART VIII: OFFLINE, SECURITY, PAYMENTS

## 22. Offline and Low-Bandwidth Architecture

FILUMIRE should support meaningful bounded adaptation offline.

Distinguish:

1. cached website;
2. offline activities;
3. offline adaptive learning.

Cloud/device responsibilities must be explicit.

Offline design should support:

- versioned snapshots;
- bounded likely learning branches;
- local raw interaction/evidence capture;
- globally unique IDs;
- idempotent sync;
- careful time semantics;
- source-event merge;
- server recomputation of derived state;
- conflict/reconciliation rules;
- FILU degradation/fallback;
- connectivity states;
- shared-device security;
- unknown versus unsynced state.

Offline clients must never overwrite server-derived mastery using last-write-wins semantics.

---

## 23. Security, Privacy, and Data Integrity

Principles:

- minimise data;
- separate identity from learning data where appropriate;
- role- and relationship-based access control;
- child-safe defaults;
- encryption;
- secure sessions;
- shared-device protections;
- careful handling of sensitive conversations;
- educational observations rather than permanent personal labels;
- immutable raw evidence;
- auditability;
- log minimisation;
- backups;
- retention/deletion controls;
- research-data governance;
- payment isolation;
- third-party risk management;
- prompt-injection defences;
- safe content publishing;
- fail-closed behaviour where appropriate;
- incident response;
- export controls;
- model/version integrity;
- security and privacy testing.

---

## 24. Access, Entitlements, and Payment Adapter

Commercial access must be separated from educational truth.

Canonical flow:

> Payment Provider → Payment Adapter → Transaction/Subscription → Entitlement Engine → Access

Potential entitlement sources include:

- individual;
- family;
- school;
- sponsor;
- government;
- promotion;
- scholarship;
- trial;
- administration.

Requirements include:

- payment-provider abstraction;
- transaction persistence;
- verification;
- webhook verification;
- idempotency;
- subscription state;
- grace periods;
- entitlement derivation;
- payment/learner-data separation.

Expiry never deletes learning history.

FILUMIRE's learning infrastructure should support multiple commercial and sponsored access models without contaminating adaptive learning logic.

---

# PART IX: PLATFORM AND DATA ARCHITECTURE

## 25. Platform Posture

Initial recommended posture:

- modular deployable application;
- avoid premature microservices;
- PostgreSQL as primary relational store;
- selective JSON only where justified;
- object storage/analytics added where needed;
- typed contracts;
- stable IDs;
- explicit domain ownership;
- versioned educational configuration;
- idempotent jobs and external events.

---

## 26. Identity

Principals and learner profiles are distinct concepts.

Roles and relationships may include:

- learner;
- parent/guardian;
- teacher;
- school administrator;
- organisation administrator;
- platform administrator;
- system/AI actor.

A child learner profile need not be identical to a login principal.

Permissions must be server-enforced and relationship-aware.

---

## 27. Commands, Events, and Queries

- **Commands** request an action.
- **Events** state that something happened.
- **Queries** read state.

Critical commands should be idempotent where appropriate.

---

## 28. Facts, Interpretations, and Projections

FILUMIRE must preserve three different categories:

> OBSERVED FACT → DERIVED INTERPRETATION → CURRENT PROJECTION

Examples:

- raw learner response = fact;
- EvidenceRecord = interpretation;
- DiagnosisResult = interpretation;
- MasteryResult = interpretation;
- LearnerCompetencyState = projection.

The Learner Model is a projection/aggregate, not a second hidden reasoning engine.

---

## 29. Domain Event Canon

Recommended architecture:

> durable domain events + authoritative current-state projections

Do not introduce pure event sourcing unless actual repository conditions justify it.

Canonical DomainEvent envelope conceptually includes:

- eventId
- eventType
- aggregateType
- aggregateId
- learnerId?
- competencyId?
- occurredAt
- recordedAt
- actorType
- actorId?
- correlationId
- causationId?
- payload
- schemaVersion

Actor types may include learner, teacher, parent, admin, system, AI, payment, sync.

Correlation joins the learning chain. Causation identifies the direct trigger.

Events are immutable historical facts. Corrections occur through invalidation, reinterpretation, or supersession events.

---

## 30. State Ownership

Authoritative writers should be bounded:

| State | Authoritative owner |
|---|---|
| Raw response | Interaction domain |
| Evidence | Evidence Engine |
| Diagnosis | Diagnosis Engine |
| Mastery | Mastery Engine |
| Intervention | Intervention Engine |
| Next Best Action | Adaptive Policy |
| Entitlement | Entitlement Engine |
| Payment transaction | Payment Adapter |

No other component should silently mutate these truths.

---

## 31. Invalidation Cascade

If a task or evidence item is invalidated:

> task/evidence invalidation → evidence recomputation → diagnosis/mastery recomputation → learner projection update → Policy reevaluation

History remains preserved.

---

## 32. Response-First Reliability

A learner response should be preserved even if downstream interpretation fails.

Technical failure must not become educational failure.

Critical educational processing may be synchronous initially, while analytics, research, scheduling, and other non-critical work may be asynchronous.

---

# PART X: RELIABILITY AND OPERATIONS

## 33. Reliability Principles

Technical failure must not become educational conclusion or learning-data loss.

The system should address:

- failure domains;
- response persistence;
- safe degradation;
- AI provider/model versioning;
- retries;
- idempotency;
- background jobs;
- dead-letter handling where needed;
- backups;
- migrations;
- disaster recovery;
- environments;
- kill switches;
- rollback;
- incident handling;
- rate limits;
- cost controls;
- secrets;
- observability.

Educational correctness is part of production reliability.

---

## 34. Observability

Technical metrics alone are insufficient.

Observe both:

### Technical health
- latency;
- errors;
- job failures;
- database health;
- sync failures;
- AI failures;
- payment failures.

### Educational health
- diagnosis distributions;
- diagnosis reversals;
- mastery anomalies;
- intervention success/failure;
- policy loops;
- excessive remediation;
- suspiciously rapid mastery;
- support dependence;
- retention failure;
- transfer failure;
- teacher contradiction.

A technically healthy system can still be educationally broken.

---

# PART XI: RESEARCH, EVALUATION, AND IMPROVEMENT

## 35. Research Architecture

FILUMIRE requires two improvement loops:

### Learner loop
Improve learning for the individual learner.

### System loop
Improve FILUMIRE's educational decisions over time.

Research should evaluate:

- intervention effectiveness;
- Policy decisions;
- diagnosis validity;
- mastery validity;
- competency graph quality;
- retention outcomes;
- transfer outcomes;
- fairness;
- teacher feedback;
- product friction versus learning difficulty.

Later psychometric sophistication must be earned through evidence rather than introduced as decorative complexity.

Research must support reproducibility, raw evidence preservation, governed change, rollback, longitudinal evaluation, and external validation where appropriate.

Engagement is not the primary learning outcome.

---

# PART XII: QUALITY, TESTING, AND RELEASE

## 36. Quality Model

FILUMIRE quality includes:

- software quality;
- curriculum quality;
- educational quality;
- adaptive quality;
- safety;
- security;
- privacy;
- reliability.

Testing includes:

- static checks;
- unit tests;
- contract tests;
- integration tests;
- curriculum validation;
- adaptive-engine tests;
- end-to-end journeys;
- security/privacy tests;
- offline tests;
- payment tests;
- AI/FILU tests;
- monitoring.

Regression tests are institutional memory.

---

## 37. Educational Test Canon

Tests should use:

> GIVEN / WHEN / THEN + prohibited conclusion

Core test families include:

### Evidence
EVD-001 onward, including:
- independent correct;
- supported correct;
- partial;
- procedural;
- careless;
- misconception candidate;
- language confound;
- skipped;
- technical failure;
- exposure;
- conflicting evidence;
- invalidation;
- teacher evidence;
- support trajectory.

### Diagnosis
DIA-001 onward:
- insufficient evidence;
- prerequisite;
- knowledge;
- misconception;
- procedural;
- support dependence;
- application;
- language;
- competing hypotheses;
- revisability;
- teacher contradiction.

### Mastery
MST-001 onward:
- one correct insufficient;
- repeated identical versus varied;
- independent;
- supported;
- fading;
- exposure;
- verification;
- contradiction;
- easy ceiling;
- invalidation;
- inactivity;
- learning speed;
- language confound;
- memorised task;
- anomalous failure;
- repeated fresh failures.

### Intervention
INT-001 onward:
- correct family;
- preserved original target;
- bounded remediation;
- scaffold fading;
- misconception correction;
- failure/escalation;
- return path.

### Policy
POL-001 onward:
- insufficient evidence;
- prerequisite;
- misconception;
- intervention continuity;
- support fading;
- mastery verification;
- retention;
- transfer;
- teacher constraint;
- unreliable state;
- loop detection;
- offline bounds;
- entitlement separation.

### Retention
RET-001 onward.

### Transfer
TRF-001 onward.

### FILU
FILU-001 onward.

### Teacher
TCH-001 onward.

### Offline
OFF-001 onward.

### Payments
PAY-001 onward.

### Golden journeys
GOLD-001 onward.

---

## 38. Release Governance

Educationally high-risk changes require stronger review and validation.

Release gates should consider:

- requirement traceability;
- curriculum integrity;
- adaptive-engine tests;
- golden journeys;
- security/privacy;
- migrations;
- rollback;
- observability;
- configuration/version changes.

P0 canon violations are release blockers for affected functionality.

---

# PART XIII: FIRST ADAPTIVE VERTICAL SLICE

## 39. Objective

The first decisive proof is not a polished page. It is:

> Can FILUMIRE observe similar learner mistakes, infer different needs, intervene differently, verify learning, and later verify retention and transfer?

Use a small Ghana Basic 4 Mathematics competency cluster after repository audit confirms the real IDs and curriculum readiness.

Conceptual structure:

> A prerequisite → B target → C extension + misconception M1

Do not invent final IDs before audit.

---

## 40. Initial Task Inventory

- T1 target probe
- T2 second target probe
- T3 prerequisite probe
- T4 misconception discriminator
- T5 guided intervention
- T6 scaffold-fade task
- T7 fresh independent task
- T8 mastery verification
- T9 varied mastery verification
- T10 delayed retention
- T11 near transfer
- T12 changed-context transfer

---

## 41. Seven Synthetic Learners

### L1 Clean progression
No unnecessary remediation. Learner progresses to mastery verification.

### L2 Hidden prerequisite gap
Initial wrong response does not immediately trigger a prerequisite diagnosis. Evidence collection confirms the prerequisite gap, repairs A, then returns to B.

### L3 Misconception
Candidate misconception is discriminated, confirmed, corrected, and independently verified. Misconception resolution does not automatically equal mastery.

### L4 Support dependence
Independent failure plus supported success is preserved. FILUMIRE fades scaffolding before mastery verification.

### L5 Uncertain/contradictory
Competing hypotheses remain low confidence. Policy selects the highest-information-value probe rather than guessing.

### L6 Retention weakness
Prior credible mastery plus delayed failure yields retention response rather than novice reset.

### L7 Transfer weakness
Mastery and retention remain preserved while changed-context failure triggers transfer support.

---

## 42. Critical System Scenarios

The slice must also prove:

- technical failure does not become learner failure;
- invalid task evidence can be invalidated;
- teacher contradiction is preserved and handled;
- entitlement expiry affects access, not learning truth;
- FILU unavailable has a safe instructional fallback;
- replay produces deterministic V1 decisions.

---

## 43. Adaptive Demonstration

A decisive FILUMIRE demonstration is:

> several learners give the same wrong answer to the same target competency, but FILUMIRE produces different defensible next actions because their evidence histories differ.

Possible outcomes:

- prerequisite repair;
- misconception discriminator/correction;
- procedural support;
- scaffold fading;
- more evidence;
- retention retrieval;
- transfer support.

That is materially different from a quiz engine.

---

# PART XIV: IMPLEMENTATION PROGRAMME

## 44. Dependency Order

Canonical dependency sequence:

> FOUNDATION → CURRICULUM/COMPETENCY → EVIDENCE → LEARNER MODEL → DIAGNOSIS → MASTERY → INTERVENTION → POLICY → CONTENT/FILU → RETENTION → TRANSFER → TEACHER/PARENT/SCHOOL → OFFLINE/SYNC → PAYMENTS/ENTITLEMENTS → RESEARCH

Interaction/task capture is required before evidence and should be placed appropriately in the actual repository implementation sequence.

---

## 45. Build Phases

0. Repository Truth Audit
1. Adaptive Foundation
2. Curriculum/Competency
3. Interaction/Task
4. Evidence
5. Learner Model
6. Diagnosis/Mastery
7. Intervention
8. Adaptive Policy/Decision Audit
9. Instruction/Content/FILU
10. Retention/Transfer
11. Teacher/Parent/Institution
12. Offline/Sync
13. Entitlements/Payment Adapter
14. Research/Scale

Payments may progress commercially in parallel but must not displace the adaptive core or contaminate educational truth.

---

## 46. Build Unit

A build unit is a capability with:

> contract + persistence + implementation + tests + acceptance

Not simply a page or file.

Every feature should answer:

> Which part of the FILUMIRE learning loop does this implement?

---

## 47. Minimum Truthful Adaptive Claim

Before FILUMIRE can truthfully claim meaningful adaptive learning, it should demonstrate:

- structured competencies;
- learner state;
- structured evidence;
- diagnosis;
- mastery;
- Next Best Action;
- targeted intervention;
- support fading;
- retention;
- transfer.

---

# PART XV: REQUIREMENTS AND TRACEABILITY

## 48. Requirement Families

Formal requirement IDs should use the `REQ-` prefix to distinguish them from test IDs.

Families include:

- REQ-CUR
- REQ-CMP
- REQ-INTX
- REQ-TSK
- REQ-EVD
- REQ-LRN
- REQ-DIA
- REQ-MST
- REQ-INT
- REQ-POL
- REQ-DEC
- REQ-INS
- REQ-FILU
- REQ-RET
- REQ-TRF
- REQ-TCH
- REQ-PAR
- REQ-IDN
- REQ-ORG
- REQ-OFF
- REQ-ENT
- REQ-PAY
- REQ-SEC
- REQ-REL
- REQ-OBS
- REQ-AUD
- REQ-VER
- REQ-QA
- REQ-GOV
- REQ-RES
- REQ-AFR
- REQ-ACC
- REQ-CNT

Traceability principle:

> product principle → requirement → architecture → implementation → test → production evidence

---

## 49. Repository Status Vocabulary

During audit use:

- MISSING
- PARTIAL
- IMPLEMENTED
- VALIDATED
- CONTRADICTED
- DEFERRED
- UNKNOWN

Production readiness is assessed separately.

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

---

# PART XVI: FAILURE-MODE CANON

## 50. Major Failure Modes to Prevent

FILUMIRE must be red-teamed against:

- quiz-engine drift;
- FILU becoming the brain;
- false mastery;
- endless remediation;
- shallow remediation;
- self-reinforcing diagnosis;
- one-error misconception confirmation;
- language confounding;
- translation corruption;
- stereotypes and contextual contamination;
- hidden support dependence;
- AI answer leakage;
- AI hallucination;
- curriculum errors;
- graph errors;
- giant opaque learner score;
- offline/sync corruption;
- teacher/admin overreach;
- privacy leakage;
- engagement optimisation replacing learning;
- false retention conclusions;
- false transfer conclusions;
- payment contaminating educational state;
- provider/model drift;
- technically healthy but educationally broken releases;
- research harm;
- premature microservices;
- documentation-only architecture;
- unnecessary rewrite;
- breadth before adaptive depth;
- scale before educational validity.

Educational incidents may use an educational severity model such as SEV-E1 / E2 / E3.

---

# PART XVII: REPOSITORY TRUTH AUDIT

## 51. Audit Principle

The repository audit asks:

1. What exists?
2. What is actually runtime-connected?
3. What satisfies the canon?
4. What contradicts it?
5. What is the first dependency to implement or repair?

The first pass is read-only.

No refactoring, deletion, migration, renaming, or agentic coding before repository truth is established.

---

## 52. Evidence Hierarchy

Repository conclusions should prefer:

> passing behavioural tests > runtime path > persisted schema > typed contracts > validation > implementation code > documentation > comments/TODO > filename

A filename never proves a capability.

---

## 53. Audit Dimensions

For each capability inspect:

- EXISTS
- INTEGRATED
- CANON_ALIGNED
- DATA_READY
- CONTRACT_READY
- TESTED
- AUDITABLE
- VERSIONED
- FAILURE_SAFE
- SECURE
- VERTICAL_SLICE_READY

---

## 54. Audit Outputs

The audit must produce:

1. Repository Map
2. Capability Matrix
3. Requirement Matrix
4. Database/Data Map
5. Contract/Dependency Map
6. Test/Validation Map
7. P0 Contradiction Register
8. Preserve Register
9. Vertical Slice Readiness
10. Prioritised Gap Register
11. First Implementation Backlog

---

## 55. Audit Finding Format

Each significant finding should include:

- Requirement
- Repository evidence
- Current behaviour
- Required behaviour
- Status
- Confidence
- Risk
- Dependencies
- Blocks
- Action

No invented percentages.

Unknown remains UNKNOWN until evidence resolves it.

---

## 56. P0 Contradictions

Specifically test whether the repository allows:

- one correct → mastery;
- supported → independent;
- technical error → learner incorrect;
- FILU → direct progression;
- payment → educational state;
- teacher override → history erased;
- offline final state → server overwrite.

Actual occurrences are high-priority contradictions.

---

## 57. Preserve Register

Good existing architecture must be explicitly protected.

Current Ghana Basic 4 curriculum/adaptive work should be audited, not discarded.

Possible decisions:

- KEEP
- KEEP + TEST
- STRENGTHEN

Rewrite is not the default.

---

## 58. Database Truth

For each relevant table determine:

- owner domain;
- purpose;
- authoritative versus derived;
- keys;
- relationships;
- versioning;
- history preservation;
- adaptive role;
- requirements served.

Classify important values as:

- SOURCE FACT
- DERIVED INTERPRETATION
- CURRENT PROJECTION
- CONFIGURATION
- AUDIT DATA
- COMMERCIAL STATE

---

## 59. State Writer Audit

Identify every code path capable of changing:

- mastery;
- diagnosis;
- competency state;
- misconception state;
- intervention state;
- entitlement state.

Compare current writers with canonical domain ownership.

---

## 60. Runtime Trace

Trace at least one real learner submission:

> Learner UI → submit handler → API/server action → domain function → database write → interpretation → next action → learner response

Record exact files and symbols.

This is stronger evidence than architectural naming.

---

## 61. AI Authority Audit

Every actual AI call should be classified as:

- PRESENTATION ONLY
- INSTRUCTIONAL DELIVERY
- CONTENT GENERATION
- EVIDENCE CANDIDATE
- ASSESSMENT ASSISTANCE
- UNSAFE EDUCATIONAL AUTHORITY
- UNKNOWN

Determine what it knows, what it can decide, what it can mutate, and how failure is handled.

---

## 62. Payment Audit

Explicitly determine:

- whether Payment Adapter exists;
- providers;
- coupling;
- transaction persistence;
- webhook verification;
- idempotency;
- entitlement derivation;
- whether payment can mutate educational state.

Payment architecture remains an explicit FILUMIRE requirement.

---

## 63. Offline Audit

Distinguish browser caching from offline learning and offline adaptive learning.

Inspect IDs, local persistence, queueing, sync, timestamps, merge semantics, recomputation, and shared-device security.

---

## 64. Debt Registers

Keep separate:

### Architecture debt
Structural system limitations.

### Educational debt
Insufficient educational modelling or evidence.

### Curriculum debt
Incomplete or weak curriculum representation.

### Technical debt
Code-level maintainability issues.

Do not allow cosmetic technical debt to outrank educational correctness.

---

## 65. Vertical Slice Selection After Audit

Select one real Basic 4 Mathematics cluster using actual repository IDs and evidence.

Selection considers:

- curriculum confidence;
- competency quality;
- clear prerequisite;
- useful misconception;
- task/content coverage;
- adaptive demonstration value;
- implementation effort.

Once selected, freeze the slice unless repository evidence gives a substantive reason to change it.

---

## 66. First Code Change Rule

The audit must identify one singular first implementation target:

> the earliest P0 missing or contradicted upstream dependency blocking the selected adaptive slice.

The first-code package then specifies:

- requirement(s);
- exact files;
- new files only if necessary;
- database impact;
- contract impact;
- tests;
- validation command;
- acceptance condition.

For `/TRUTH` code changes, provide exact file paths, complete replacement contents where applicable, and exact validation commands.

---

# PART XVIII: PHASE 0 EXECUTION

## 67. Repository

Actual repository to audit:

`C:\Users\tabi\Desktop\filumire\FILUMIRE_CORE`

First audit establishes:

1. Git truth
2. Repository topology
3. package/workspace truth
4. database/schema truth
5. Ghana B4 curriculum/adaptive file truth
6. existing tests and validation truth

Subsequent passes are targeted from those results.

---

## 68. Audit Command Philosophy

- Use PowerShell and Git first.
- Exclude irrelevant generated folders such as `node_modules`, `.next`, `dist`, `build`, and coverage output.
- Do not dump the entire repository indiscriminately.
- Run grouped passes.
- Analyse output before issuing the next command.
- Conserve Copilot Pro+ credits.
- Use agentic execution only when complex multi-file implementation or debugging genuinely warrants it.

---

# PART XIX: SYSTEM BLUEPRINT

## 69. Six Logical Layers

### 1. Experience
Learner, teacher, parent, school/admin interfaces.

### 2. Learning Intelligence
Learner Model, Competency Graph, Evidence, Diagnosis, Mastery, Intervention, Adaptive Policy, Retention, Transfer, Explainability.

### 3. Learning Operations
Assessment/tasks, Content Orchestration, FILU, teacher workflows.

### 4. Platform and Identity
Principals, learners, households, classes, schools, organisations, permissions, entitlements.

### 5. Infrastructure and Integration
Database, offline/sync, AI providers, payment providers, jobs, deployment, observability.

### 6. Governance, Research, and Assurance
Testing, release governance, privacy, security, research, evaluation, audit, continuous improvement.

---

## 70. Four Critical Separations

1. **Curriculum:** what should be learned.
2. **Adaptive Intelligence:** what the learner needs next.
3. **Instruction:** how to teach it.
4. **Experience:** how it is presented.

Blurring these boundaries is a major architectural risk.

---

# PART XX: CURRENT DEVELOPMENT BOUNDARY

## 71. Completed Pre-Audit Work

The architecture programme has established:

- learner journey;
- competency state model;
- evidence semantics;
- diagnosis taxonomy and V1 engine;
- intervention architecture and V1 engine;
- mastery architecture and V1 engine;
- Adaptive Policy V1;
- full adaptive intelligence architecture;
- Learner Model;
- Competency Graph;
- assessment architecture;
- retention;
- transfer;
- content orchestration;
- FILU;
- teacher-in-the-loop;
- explainability/audit;
- African Learning Intelligence;
- offline/sync;
- security/privacy/data integrity;
- research/evaluation;
- payment adapter/entitlements;
- platform/data/identity;
- curriculum publishing;
- production runtime;
- institutional/multi-tenant architecture;
- reliability/deployment;
- QA/governance;
- unified blueprint;
- implementation sequence;
- requirements matrix;
- code control map;
- data/contract canon;
- development gates;
- failure-mode canon;
- canonical specification;
- repository audit protocol;
- first adaptive vertical slice;
- educational test canon;
- domain event/state-transition canon;
- repository audit execution methodology.

---

## 72. Next Authoritative Phase

No further speculative architecture lump should precede repository inspection.

The next substantive engineering artifact is:

# FILUMIRE Lump 31: Repository Truth Audit, Pass 1

It must contain actual evidence from `FILUMIRE_CORE`.

The repository, not this specification, determines what is already implemented.

This specification determines how that implementation is judged.

---

## 73. Final Engineering Principle

FILUMIRE should not be measured by how much code exists, how many pages exist, or how many subjects have content.

The primary engineering question is:

> **How much of the FILUMIRE learning loop is executable, trustworthy, explainable, and tested?**

That is the standard against which the repository audit and subsequent implementation should proceed.
