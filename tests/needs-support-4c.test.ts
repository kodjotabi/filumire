import { useTinyPilotPool } from "./repro-4a-helpers";
import { seedContent } from "../services/content-store/seed";
import { getContentForCompetency } from "../services/content-store/index";
import { getCompetenciesForSubject, getCompetency, getInitialCompetencyForCurriculumSubjectLevel } from "../packages/curriculum/index";
import { createInitialLearnerState, saveLearnerState } from "../services/learner-state/index";
import { saveEvidence } from "../services/evidence-store/index";
import { makeAdaptiveDecision } from "../services/adaptive-engine/index";
import { buildTeacherLearnerSummary } from "../services/teacher-summary/index";
import {
  chooseNextCompetency,
  CONTENT_EXHAUSTED_NEEDS_SUPPORT,
  NEEDS_SUPPORT_RETRY_GAP_MS,
} from "../services/learner-path/progression";
import { persistenceStore } from "../services/persistence-provider";
import { selectLearningContent } from "../services/content-selection/index";
import type { LearnerCompetencyState, LearningEvidence } from "../packages/domain";

/*
 * TRANCHE 4C: the needs-support loop.
 * - An exhausted competency is not retried before NEEDS_SUPPORT_RETRY_GAP_MS.
 * - After the gap it is retried only if it still has a usable mastery question.
 * - A retry comes after finishing/resuming work but before opening new topics,
 *   and it unblocks the competencies that depend on it.
 * - While blocked, the planner reports when the next retry is due.
 * - Teachers see exhausted competencies as needing attention, with the retry time.
 *
 * Run: npx tsx --env-file=.env.local tests/needs-support-4c.test.ts
 */

seedContent();
/* Tranche 4C: number-patterns-001 now has full content; keep a genuine two-item pool for the tiny-pool checks. */
useTinyPilotPool("competency-gh-math-b4-number-patterns-001");

let passed = 0;
function check(condition: unknown, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
  passed += 1;
}

const T0 = Date.parse("2026-10-01T09:00:00.000Z");
const HOUR = 3600 * 1000;
const iso = (ms: number) => new Date(ms).toISOString();

function base(learnerId: string, id: string): LearnerCompetencyState {
  return createInitialLearnerState(learnerId, id).competencies[0];
}

function completed(learnerId: string, id: string): LearnerCompetencyState {
  return {
    ...base(learnerId, id),
    masteryEstimate: 0.95,
    confidence: 0.9,
    evidenceCount: 8,
    diagnosticState: "probable_mastery",
    masteredAt: iso(T0),
    retentionState: { status: "retained", confidence: 0.9 } as LearnerCompetencyState["retentionState"],
    transferState: { status: "demonstrated", confidence: 0.9 } as LearnerCompetencyState["transferState"],
    readinessState: { readyForAdvancement: true, confidence: 0.9, reasonCode: "MASTERY_RETENTION_TRANSFER_CONFIRMED", evaluatedAt: iso(T0) },
  };
}

function exhausted(learnerId: string, id: string, markedAt = T0): LearnerCompetencyState {
  return {
    ...base(learnerId, id),
    evidenceCount: 6,
    confidence: 0.5,
    readinessState: { readyForAdvancement: false, confidence: 0.5, reasonCode: CONTENT_EXHAUSTED_NEEDS_SUPPORT, evaluatedAt: iso(markedAt) },
  };
}

const SUBJECT = "subject-gh-basic4-computing-pilot";
const scope = getCompetenciesForSubject(SUBJECT).map((item) => item.id);

function partA(): void {
  /* Planner: blocked without retryable ids, retry time reported. */
  const L = "learner-4c-plan";
  const target = scope.find((id) => getCompetency(id)!.prerequisiteCompetencyIds.length > 0)!;
  const current = scope.find((id) => id !== target && !getCompetency(target)!.prerequisiteCompetencyIds.includes(id))!;
  const others = scope.filter((id) => id !== target && id !== current);
  const states = [completed(L, current), exhausted(L, target), ...others.map((id) => completed(L, id))];

  const blocked = chooseNextCompetency({ currentCompetencyId: current, states, currentCompleted: true });
  check(!blocked.competencyId && !blocked.pathComplete && blocked.reasonCode === "NO_ELIGIBLE_COMPETENCY_NEEDS_SUPPORT", `planner: exhausted, not retryable -> blocked (${blocked.reasonCode})`);
  check(blocked.retryAt === iso(T0 + NEEDS_SUPPORT_RETRY_GAP_MS), `planner: retry due 24 h after marking (${blocked.retryAt})`);

  const retried = chooseNextCompetency({ currentCompetencyId: current, states, currentCompleted: true, retryable: new Set([target]) });
  check(retried.competencyId === target && retried.reasonCode === "RETURN_TO_NEEDS_SUPPORT_COMPETENCY", `planner: retryable -> return (${retried.reasonCode})`);

  /* A retry never overrides unmet prerequisites. */
  const pre = getCompetency(target)!.prerequisiteCompetencyIds[0];
  const missingPre = states.filter((state) => state.competencyId !== pre);
  const noPre = chooseNextCompetency({ currentCompetencyId: current, states: missingPre, currentCompleted: true, retryable: new Set([target]) });
  check(noPre.competencyId !== target, "planner: retry still needs completed prerequisites");

  /* New topics come after a due retry; resuming work comes before it. */
  const fresh = scope.find((id) => getCompetency(id)!.prerequisiteCompetencyIds.length === 0 && id !== current && id !== target && !getCompetency(current)!.successorCompetencyIds.includes(id) && !getCompetency(target)!.prerequisiteCompetencyIds.includes(id))!;
  const withFresh = states.filter((state) => state.competencyId !== fresh);
  const order = chooseNextCompetency({ currentCompetencyId: current, states: withFresh, currentCompleted: true, retryable: new Set([target]) });
  check(order.competencyId === target, `planner: due retry before opening a new topic (${order.competencyId} ${order.reasonCode})`);
  const learning = { ...base(L, fresh), evidenceCount: 2, masteryEstimate: 0.4, confidence: 0.3 };
  const resume = chooseNextCompetency({ currentCompetencyId: current, states: [...withFresh, learning], currentCompleted: true, retryable: new Set([target]) });
  check(resume.competencyId === fresh && resume.reasonCode === "RESUME_UNFINISHED_COMPETENCY", `planner: unfinished work resumed first (${resume.reasonCode})`);

  /* Whole subject: with retries the blocked chains are reached and the subject can finish. */
  const start = getInitialCompetencyForCurriculumSubjectLevel(getCompetency(scope[0])!.curriculumFrameworkId, SUBJECT, getCompetency(scope[0])!.learningLevelId)!.id;
  const walkStates = new Map<string, LearnerCompetencyState>();
  const exhaustedOnce = new Set<string>();
  let id: string | undefined = start;
  let steps = 0;
  while (id && steps < scope.length * 3) {
    steps += 1;
    const firstVisit = !walkStates.has(id);
    const runsOut = firstVisit && steps % 4 === 2;
    walkStates.set(id, runsOut ? exhausted(L, id) : completed(L, id));
    if (runsOut) exhaustedOnce.add(id);
    const retryable = new Set([...walkStates.values()].filter((s) => s.readinessState?.reasonCode === CONTENT_EXHAUSTED_NEEDS_SUPPORT).map((s) => s.competencyId));
    const choice = chooseNextCompetency({ currentCompetencyId: id, states: [...walkStates.values()], currentCompleted: !runsOut, retryable });
    if (!choice.competencyId && runsOut) {
      /* Blocked on the topic just exhausted: after the gap the engine retries it in place (time-spaced reuse). */
      check(choice.retryAt !== undefined || choice.reasonCode === "NO_ELIGIBLE_COMPETENCY_NEEDS_SUPPORT", "walk: blocked, retry pending");
      continue;
    }
    if (!choice.competencyId) {
      check(choice.pathComplete, `walk with retries ends complete (${choice.reasonCode})`);
      break;
    }
    id = choice.competencyId;
  }
  check(exhaustedOnce.size > 0, "walk: some competencies ran out once");
  check(scope.every((cid) => walkStates.get(cid)?.readinessState?.reasonCode === "MASTERY_RETENTION_TRANSFER_CONFIRMED"), "walk: every competency finished after retries");
}

/* Content selection: when no question may be served, a fallback never hands out an assessment item. */
function partSelection(): void {
  const TINY = "competency-gh-math-b4-number-patterns-001";
  const items = getContentForCompetency(TINY).filter((c) => c.assessmentItemId);
  const state = createInitialLearnerState("learner-4c-select", TINY);
  const answers = items.map((c, i) => ({ assessmentItemId: c.assessmentItemId!, timestamp: iso(T0 + i * 1000) }));
  for (const action of ["diagnose", "practice", "reassess", "retention_check", "transfer_check", "teach", "scaffold", "remediate"] as const) {
    const picked = selectLearningContent(state, action, items.map((c) => c.assessmentItemId!), [], { answers, instructionTimes: [], now: iso(T0 + HOUR) });
    check(!picked?.assessmentItemId, `selection: ${action} fallback is not a question (${picked?.id})`);
  }
  /* After 24 h a once-answered item may be served again (time-spaced reuse), capped at 2 exposures. */
  const spaced = selectLearningContent(state, "practice", items.map((c) => c.assessmentItemId!), [], { answers, instructionTimes: [], now: iso(T0 + 25 * HOUR) });
  check(Boolean(spaced?.assessmentItemId), "selection: time-spaced reuse after 24 h");
  const twice = [...answers, ...answers.map((a, i) => ({ ...a, timestamp: iso(T0 + 2 * HOUR + i * 1000) }))];
  const capped = selectLearningContent(state, "practice", items.map((c) => c.assessmentItemId!), [], { answers: twice, instructionTimes: [], now: iso(T0 + 72 * HOUR) });
  check(!capped?.assessmentItemId, "selection: never beyond 2 exposures");
}

async function partB(): Promise<void> {
  const target = scope.find((id) => getCompetency(id)!.prerequisiteCompetencyIds.length > 0 && getContentForCompetency(id).some((c) => c.assessmentItemId))!;
  const current = scope.find((id) => id !== target && !getCompetency(target)!.prerequisiteCompetencyIds.includes(id))!;

  async function setup(tag: string) {
    const learnerId = `learner-4c-${tag}-${Date.now()}`;
    await persistenceStore.ensureLearnerExists(learnerId);
    const competencies = [completed(learnerId, current), exhausted(learnerId, target), ...scope.filter((id) => id !== target && id !== current).map((id) => completed(learnerId, id))];
    const learnerState = { ...createInitialLearnerState(learnerId, current), competencies };
    return { learnerId, learnerState };
  }

  /* Before the gap: blocked, not complete. */
  {
    const { learnerId, learnerState } = await setup("early");
    const d = await makeAdaptiveDecision({ learnerId, sessionId: `${learnerId}-s`, learnerState }, { now: new Date(T0 + 2 * HOUR) });
    check(d.decision.action === "complete" && d.decision.reasonCode === "NO_ELIGIBLE_COMPETENCY_NEEDS_SUPPORT", `engine: before the gap -> blocked (${d.decision.action}/${d.decision.reasonCode})`);
  }

  /* After the gap with usable questions: the learner is sent back. */
  {
    const { learnerId, learnerState } = await setup("due");
    const d = await makeAdaptiveDecision({ learnerId, sessionId: `${learnerId}-s`, learnerState }, { now: new Date(T0 + 25 * HOUR) });
    check(d.decision.action === "advance" && d.nextCompetency === target, `engine: after the gap -> back to ${target} (${d.decision.action} ${d.nextCompetency})`);
  }

  /* After the gap but every mastery question already used twice: still blocked (no ping-pong). */
  {
    const { learnerId, learnerState } = await setup("used");
    let n = 0;
    for (const content of getContentForCompetency(target).filter((c) => c.assessmentItemId)) {
      for (let k = 0; k < 2; k++) {
        n += 1;
        await saveEvidence({
          id: `ev-4c-${learnerId}-${n}`, learnerId, competencyId: target, source: "assessment", outcome: "incorrect",
          timestamp: iso(T0 - HOUR + n * 1000), policyVersion: "test", assessmentItemId: content.assessmentItemId!, exposureCount: k + 1,
        } as LearningEvidence);
      }
    }
    const d = await makeAdaptiveDecision({ learnerId, sessionId: `${learnerId}-s`, learnerState }, { now: new Date(T0 + 25 * HOUR) });
    check(d.decision.action === "complete" && d.decision.reasonCode === "NO_ELIGIBLE_COMPETENCY_NEEDS_SUPPORT", `engine: no usable question -> still blocked (${d.decision.reasonCode})`);
  }

  /* The current topic ran out and nothing else is open: retried in place after the gap, not before. */
  {
    const TINY = "competency-gh-math-b4-number-patterns-001";
    const maths = getCompetenciesForSubject(getCompetency(TINY)!.subjectId).map((item) => item.id);
    for (const [label, hours, expectQuestion] of [["in-place-early", 2, false], ["in-place-due", 25, true]] as const) {
      const learnerId = `learner-4c-${label}-${Date.now()}`;
      await persistenceStore.ensureLearnerExists(learnerId);
      let n = 0;
      for (const content of getContentForCompetency(TINY).filter((c) => c.assessmentItemId)) {
        n += 1;
        await saveEvidence({
          id: `ev-4c-${learnerId}-${n}`, learnerId, competencyId: TINY, source: "assessment", outcome: "incorrect",
          timestamp: iso(T0 - HOUR + n * 1000), policyVersion: "test", assessmentItemId: content.assessmentItemId!, exposureCount: 1,
        } as LearningEvidence);
      }
      const competencies = [exhausted(learnerId, TINY), ...maths.filter((id) => id !== TINY).map((id) => completed(learnerId, id))];
      const learnerState = { ...createInitialLearnerState(learnerId, TINY), competencies };
      const d = await makeAdaptiveDecision({ learnerId, sessionId: `${learnerId}-s`, learnerState }, { now: new Date(T0 + hours * HOUR) });
      if (expectQuestion) {
        check(d.decision.competencyId === TINY && Boolean(d.content?.assessmentItemId || d.content), `engine: after the gap the exhausted current topic is retried (${d.decision.action}/${d.decision.reasonCode})`);
        check(d.decision.action !== "complete", "engine: retry is not reported as complete");
      } else {
        check(d.decision.action === "complete" && ["NO_ELIGIBLE_COMPETENCY_NEEDS_SUPPORT", "CONTENT_EXHAUSTED_NEEDS_SUPPORT"].includes(d.decision.reasonCode) && d.decision.reasonCode !== "LEARNING_PATH_COMPLETE", `engine: before the gap it stays blocked (${d.decision.action}/${d.decision.reasonCode} ${d.content?.id} ${d.decision.competencyId})`);
      }
    }
  }

  /* Teacher summary shows the exhausted competency and its retry time. */
  {
    const { learnerId, learnerState } = await setup("teacher");
    await saveLearnerState(learnerState);
    const summary = await buildTeacherLearnerSummary(learnerId);
    const item = summary.attentionQueue.find((entry) => entry.competencyId === target);
    check(item?.attentionReasons.includes("content_exhausted_needs_support"), "teacher: exhausted competency in the attention queue");
    check(item?.attentionPriority === "high", `teacher: priority high (${item?.attentionPriority})`);
    check(item?.needsSupportSince === iso(T0) && item?.needsSupportRetryAt === iso(T0 + NEEDS_SUPPORT_RETRY_GAP_MS), "teacher: since / retry times shown");
    const done = summary.attentionQueue.find((entry) => entry.competencyId === current);
    check(!done, "teacher: completed competencies not flagged");
  }
}

(async () => {
  partA();
  partSelection();
  await partB();
  console.log(`PASS needs-support-4c (${passed} checks)`);
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
