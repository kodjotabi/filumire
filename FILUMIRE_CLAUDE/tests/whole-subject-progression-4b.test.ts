import { seedContent } from "../services/content-store/seed";
import {
  getAllSubjects,
  getCompetenciesForSubject,
  getCompetency,
  getInitialCompetencyForCurriculumSubjectLevel,
} from "../packages/curriculum/index";
import { createInitialLearnerState } from "../services/learner-state/index";
import { createPathCurriculum } from "../services/learner-path/curriculum";
import {
  chooseNextCompetency,
  isCompetencyCompleted,
  CONTENT_EXHAUSTED_NEEDS_SUPPORT,
} from "../services/learner-path/progression";
import { CONTENT_EXHAUSTED_REASON_CODE } from "../services/adaptive-engine/index";
import type { LearnerCompetencyState, LearnerState } from "../packages/domain";
import { assert, newLearner, decide, answer, isQuestion, openCompetency, useTinyPilotPool } from "./repro-4a-helpers";
import { acknowledgeIntervention } from "../services/intervention-store/index";

/*
 * TRANCHE 4B STEP 4: whole-subject progression.
 *
 * Replaces the CURRENT-behaviour assertions of repro-4a-short-paths
 * (premature LEARNING_PATH_COMPLETE after a short successor chain)
 * with regression coverage:
 * - forward progression covers the WHOLE subject and grade, across
 *   independent prerequisite chains, never another subject or grade;
 * - prerequisites are always completed first;
 * - exhausted / support-needed competencies are not re-entered and
 *   their dependants are not opened; no loops;
 * - "complete" only when the subject and grade are genuinely done.
 *
 * Run: npx tsx --env-file=.env.local tests/whole-subject-progression-4b.test.ts
 */

seedContent();
/* Tranche 4C: number-patterns-001 now has full content; keep a genuine two-item pool for the tiny-pool checks. */
useTinyPilotPool("competency-gh-math-b4-number-patterns-001");

let passed = 0;
function check(condition: unknown, message: string): void {
  assert(condition, message);
  passed += 1;
}

const NOW = new Date().toISOString();

function baseState(competencyId: string): LearnerCompetencyState {
  return createInitialLearnerState("learner-4b-path", competencyId).competencies[0];
}

function completedState(competencyId: string): LearnerCompetencyState {
  return {
    ...baseState(competencyId),
    masteryEstimate: 0.95,
    confidence: 0.9,
    evidenceCount: 8,
    diagnosticState: "probable_mastery",
    masteredAt: NOW,
    retentionState: { status: "retained", confidence: 0.9 } as LearnerCompetencyState["retentionState"],
    transferState: { status: "demonstrated", confidence: 0.9 } as LearnerCompetencyState["transferState"],
    readinessState: { readyForAdvancement: true, confidence: 0.9, reasonCode: "MASTERY_RETENTION_TRANSFER_CONFIRMED", evaluatedAt: NOW },
  };
}

function exhaustedState(competencyId: string): LearnerCompetencyState {
  return {
    ...baseState(competencyId),
    evidenceCount: 6,
    confidence: 0.5,
    readinessState: { readyForAdvancement: false, confidence: 0.5, reasonCode: CONTENT_EXHAUSTED_NEEDS_SUPPORT, evaluatedAt: NOW },
  };
}

function initialOf(subjectId: string): string {
  const competencies = getCompetenciesForSubject(subjectId);
  return getInitialCompetencyForCurriculumSubjectLevel(competencies[0].curriculumFrameworkId, subjectId, competencies[0].learningLevelId)!.id;
}

/*
 * A learner who completes (or, where exhaust() says so, runs out of
 * content on) every competency the progression serves.
 */
function walk(subjectId: string, exhaust: (step: number, id: string) => boolean = () => false) {
  const start = initialOf(subjectId);
  const startDef = getCompetency(start)!;
  const scope = createPathCurriculum(startDef.subjectId, startDef.learningLevelId).listCompetencyIds();
  const states = new Map<string, LearnerCompetencyState>();
  const visited: string[] = [];
  const exhausted = new Set<string>();
  let current = start;
  let last: ReturnType<typeof chooseNextCompetency> | undefined;

  for (let step = 0; step <= scope.length + 1; step += 1) {
    check(!visited.includes(current), `${subjectId}: ${current} served only once (no loop)`);
    visited.push(current);
    const definition = getCompetency(current)!;
    check(definition.subjectId === startDef.subjectId && definition.learningLevelId === startDef.learningLevelId, `${subjectId}: ${current} stays in subject and grade`);
    check(definition.prerequisiteCompetencyIds.every((id) => isCompetencyCompleted(states.get(id))), `${subjectId}: ${current} entered with all prerequisites completed`);

    const ranOut = exhaust(step, current);
    states.set(current, ranOut ? exhaustedState(current) : completedState(current));
    if (ranOut) exhausted.add(current);

    last = chooseNextCompetency({ currentCompetencyId: current, states: [...states.values()], currentCompleted: !ranOut });
    if (!last.competencyId) break;
    current = last.competencyId;
  }
  return { scope, visited, exhausted, states, final: last! };
}

function partA(): void {
  /* Every pilot subject and grade is walked to genuine completion. */
  const subjects = getAllSubjects().filter((subject) => getCompetenciesForSubject(subject.id).length > 0 && subject.id !== "subject-test-mathematics");
  const totals: Record<string, number> = {};
  for (const subject of subjects) {
    const result = walk(subject.id);
    totals[subject.id] = result.visited.length;
    check(result.final.pathComplete && result.final.reasonCode === "LEARNING_PATH_COMPLETE", `${subject.id}: complete only at the end (${result.final.reasonCode})`);
    check(result.visited.length === result.scope.length, `${subject.id}: all ${result.scope.length} competencies served (${result.visited.length})`);
    const roots = result.visited.filter((id) => getCompetency(id)!.prerequisiteCompetencyIds.length === 0).length;
    check(roots > 1 || result.scope.length < 3, `${subject.id}: crosses independent prerequisite chains (${roots} chain starts)`);
  }
  check(totals["subject-gh-basic5-english-pilot"] === 134, `B5 English 134/134 (${totals["subject-gh-basic5-english-pilot"]})`);
  check(totals["subject-gh-basic6-english-pilot"] === 134, `B6 English 134/134 (${totals["subject-gh-basic6-english-pilot"]})`);
  check(totals["subject-gh-basic5-english-pilot"] + totals["subject-gh-basic6-english-pilot"] === 268, "English 268/268");
  check(totals["subject-gh-basic-4-mathematics-pilot"] === getCompetenciesForSubject("subject-gh-basic-4-mathematics-pilot").length, "B4 Maths whole subject (array-order inversion handled by prerequisites)");
  check(totals["subject-gh-basic5-computing-pilot"] === 82, "B5 Computing 82/82");

  /* B5 English is NOT complete after 2/134. */
  const b5 = initialOf("subject-gh-basic5-english-pilot");
  const afterOne = chooseNextCompetency({ currentCompetencyId: b5, states: [completedState(b5)], currentCompleted: true });
  const second = afterOne.competencyId!;
  const afterTwo = chooseNextCompetency({ currentCompetencyId: second, states: [completedState(b5), completedState(second)], currentCompleted: true });
  check(!afterTwo.pathComplete && afterTwo.competencyId && getCompetency(afterTwo.competencyId)!.subjectId === "subject-gh-basic5-english-pilot", `B5 English not complete after 2/134 (${afterTwo.reasonCode})`);

  /* Successor first when its prerequisites are met. */
  const withSuccessor = getCompetenciesForSubject("subject-gh-basic5-english-pilot").find((item) => item.successorCompetencyIds.some((id) => getCompetency(id)!.prerequisiteCompetencyIds.length === 1))!;
  const successor = withSuccessor.successorCompetencyIds.find((id) => getCompetency(id)!.prerequisiteCompetencyIds.length === 1)!;
  const viaSuccessor = chooseNextCompetency({ currentCompetencyId: withSuccessor.id, states: [completedState(withSuccessor.id)], currentCompleted: true });
  check(viaSuccessor.reasonCode === "SUCCESSOR_PREREQUISITES_MET" && viaSuccessor.competencyId === successor, "successor chosen when its prerequisites are met");

  /* A multi-prerequisite competency waits for all its prerequisites. */
  const multi = getCompetenciesForSubject("subject-gh-basic5-english-pilot").concat(getCompetenciesForSubject("subject-gh-basic-4-mathematics-pilot")).find((item) => item.prerequisiteCompetencyIds.length > 1);
  if (multi) {
    const [firstPre] = multi.prerequisiteCompetencyIds;
    const choice = chooseNextCompetency({ currentCompetencyId: firstPre, states: [completedState(firstPre)], currentCompleted: true });
    check(choice.competencyId !== multi.id, `${multi.id}: not entered with only one of ${multi.prerequisiteCompetencyIds.length} prerequisites`);
  }

  /* Already mastered competencies are not forward progression. */
  const masteredOnly = { ...baseState(second), masteryEstimate: 0.95, confidence: 0.9, evidenceCount: 6 };
  const skipMastered = chooseNextCompetency({ currentCompetencyId: b5, states: [completedState(b5), masteredOnly], currentCompleted: true });
  check(skipMastered.competencyId !== second, "already-mastered competency not chosen as forward progression");

  /* Exhausted competencies: not re-entered, dependants not opened, no loop, not "complete". */
  const exhaustedWalk = walk("subject-gh-basic5-english-pilot", (step) => step % 5 === 2);
  check(exhaustedWalk.exhausted.size > 0, "exhausted walk: some competencies ran out of content");
  check(!exhaustedWalk.final.pathComplete && exhaustedWalk.final.reasonCode === "NO_ELIGIBLE_COMPETENCY_NEEDS_SUPPORT", `exhausted walk: blocked, not complete (${exhaustedWalk.final.reasonCode})`);
  for (const id of exhaustedWalk.visited) {
    check(!getCompetency(id)!.prerequisiteCompetencyIds.some((pre) => exhaustedWalk.exhausted.has(pre)), `exhausted walk: ${id} does not depend on an exhausted competency`);
  }
  check(exhaustedWalk.visited.length < 134, `exhausted walk: dependants held back (${exhaustedWalk.visited.length}/134)`);

  /* Everything exhausted from the start: immediate stop, never "complete". */
  const allBlocked = walk("subject-gh-basic4-computing-pilot", () => true);
  check(!allBlocked.final.pathComplete, "all exhausted: never reported complete");
}

/* ---------- Part B: the real engine ---------- */

function stateOf(learnerId: string, competencies: LearnerCompetencyState[]): LearnerState {
  return { ...createInitialLearnerState(learnerId, competencies[0].competencyId), competencies };
}

async function partB(): Promise<void> {
  const B5 = "subject-gh-basic5-english-pilot";
  const b5Initial = initialOf(B5);
  const b5Scope = new Set(getCompetenciesForSubject(B5).map((item) => item.id));

  /* A B5 English learner with a stale B4 Maths state is never sent to B4 Maths. */
  {
    const { learnerId } = await newLearner("p4b-cross", b5Initial);
    const b4Maths = baseState("competency-gh-math-b4-number-patterns-001");
    const state = stateOf(learnerId, [completedState(b5Initial), b4Maths]);
    const d = await decide(learnerId, state);
    check(d.decision.action === "advance", `engine: completed B5 English competency advances (${d.decision.action}/${d.decision.reasonCode})`);
    check(b5Scope.has(d.decision.competencyId), `engine: next stays in B5 English (${d.decision.competencyId})`);
    check(d.nextCompetency === d.decision.competencyId, "engine: nextCompetency matches decision");
  }

  /* Genuinely complete subject: LEARNING_PATH_COMPLETE. */
  {
    const all = getCompetenciesForSubject(B5).map((item) => item.id);
    const last = all[all.length - 1];
    const { learnerId } = await newLearner("p4b-done", last);
    const state = stateOf(learnerId, [completedState(last), ...all.filter((id) => id !== last).map(completedState)]);
    const d = await decide(learnerId, state);
    check(d.decision.action === "complete" && d.decision.reasonCode === "LEARNING_PATH_COMPLETE", `engine: whole subject done -> complete (${d.decision.reasonCode})`);
  }

  /* Remaining competencies all exhausted: stop, but NOT "learning path complete". */
  {
    const all = getCompetenciesForSubject(B5).map((item) => item.id);
    const { learnerId } = await newLearner("p4b-blocked", b5Initial);
    const state = stateOf(learnerId, [completedState(b5Initial), ...all.filter((id) => id !== b5Initial).map(exhaustedState)]);
    const d = await decide(learnerId, state);
    check(d.decision.action === "complete" && d.decision.reasonCode === "NO_ELIGIBLE_COMPETENCY_NEEDS_SUPPORT", `engine: blocked subject is not complete (${d.decision.action}/${d.decision.reasonCode})`);
  }

  /* Content exhaustion moves on without breaking prerequisites. */
  {
    const TINY = "competency-gh-math-b4-number-patterns-001";
    let { learnerId, state } = await newLearner("p4b-tiny", TINY);
    let final;
    for (let i = 0; i < 20 && !final; i++) {
      const d = await decide(learnerId, state);
      if (d.decision.action === "advance" || d.decision.action === "complete") { final = d; break; }
      if (!isQuestion(d.content)) { await acknowledgeIntervention({ interventionId: d.decision.interventionId!, learnerId, competencyId: TINY }); continue; }
      state = (await answer(learnerId, state, TINY, d.content!, "zz-not-the-answer", d.decision.interventionId)).state;
    }
    check(final?.decision.reasonCode === CONTENT_EXHAUSTED_REASON_CODE, "engine: tiny pool exhausts");
    const next = final!.decision.action === "advance" ? getCompetency(final!.decision.competencyId) : undefined;
    check(!next || !next.prerequisiteCompetencyIds.includes(TINY), `engine: exhausted competency's dependants not opened (${next?.id})`);
    check(!next || next.subjectId === getCompetency(TINY)!.subjectId, "engine: exhaustion move stays in subject");
    if (next) {
      const moved = openCompetency(state, next.id);
      const again = await decide(learnerId, moved);
      check(again.decision.competencyId !== TINY || again.decision.action === "retention_check", "engine: does not loop back into the exhausted competency");
    }
  }

  /* Real all-correct learner: several advances in B5 English, never complete early. */
  {
    let { learnerId, state } = await newLearner("p4b-walk", b5Initial);
    const visited = [b5Initial];
    for (let step = 0; step < 200 && visited.length < 4; step++) {
      const d = await decide(learnerId, state);
      check(d.decision.action !== "complete", `engine walk: no early complete (${d.decision.reasonCode})`);
      if (d.decision.action === "advance") {
        const next = d.decision.competencyId;
        check(b5Scope.has(next) && !visited.includes(next), `engine walk: ${next} new and in B5 English`);
        check(getCompetency(next)!.prerequisiteCompetencyIds.every((id) => visited.includes(id)), `engine walk: ${next} prerequisites done`);
        visited.push(next);
        state = openCompetency(state, next);
        continue;
      }
      if (!isQuestion(d.content)) { await acknowledgeIntervention({ interventionId: d.decision.interventionId!, learnerId, competencyId: state.competencies[0].competencyId }); continue; }
      const competencyId = state.competencies[0].competencyId;
      state = (await answer(learnerId, state, competencyId, d.content!, d.content!.metadata!.expectedResponse, d.decision.interventionId)).state;
    }
    check(visited.length === 4, `engine walk: 3 advances inside B5 English (${visited.length})`);
  }
}

(async () => {
  partA();
  await partB();
  console.log(`PASS whole-subject-progression-4b (${passed} checks)`);
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
