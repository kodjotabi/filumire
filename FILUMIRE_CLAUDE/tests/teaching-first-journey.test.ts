import { GET, POST } from "../apps/learner/app/api/learning/route";
import { seedContent } from "../services/content-store/seed";
import { getContentForCompetency } from "../services/content-store";
import { createSession } from "../services/session";
import { getEvidence } from "../services/evidence-store/index";
import { acknowledgeIntervention, cancelIntervention, createIntervention, getIntervention, getLearnerInterventions } from "../services/intervention-store/index";
import { SUBJECT_GHANA_BASIC4_MATH_ID } from "../packages/curriculum-framework";
import { getAllSubjects, getCompetenciesForSubject } from "../packages/curriculum/index";
import { createInitialLearnerState } from "../services/learner-state/index";
import { makeAdaptiveDecision } from "../services/adaptive-engine/index";
import { persistenceStore } from "../services/persistence-provider";

/*
 * Teaching-first (Phase 1) regression, through the learning API.
 *
 * A new Basic 4 Mathematics topic is taught before it is tested:
 * explanation -> worked example -> guided practice -> check. Wrong
 * guided practice leads to corrective teaching the learner has not
 * seen; the hand-over card is the next topic's first teaching step;
 * "Check my knowledge first" skips the introduction without
 * recording evidence; a learner already being asked questions is
 * left on them; answer keys stay on the server; French is served.
 *
 * Run: node scripts/run-offline-suites.mjs teaching-first-journey
 */

seedContent();

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

type Step = {
  decision: { action: string; reasonCode: string; competencyId: string; interventionId?: string };
  content?: { id: string; competencyId: string; type: string; assessmentItemId?: string; language?: string; metadata?: Record<string, string> };
  lessonReceipt?: string;
  learnerState: { competencies: { competencyId: string; masteryEstimate: number; evidenceCount: number }[] };
};

let run = 0;

async function newLearner(language: "en" | "fr" = "en") {
  run += 1;
  const learnerId = `learner-teaching-first-${Date.now()}-${run}`;
  const sessionId = `session-teaching-first-${Date.now()}-${run}`;
  await createSession(sessionId, learnerId);
  const headers = {
    "content-type": "application/json",
    "x-filumire-learner-id": learnerId,
    "x-filumire-language": language,
    origin: "http://localhost",
  };
  const url = `http://localhost/api/learning?sessionId=${sessionId}&subjectId=${SUBJECT_GHANA_BASIC4_MATH_ID}`;

  async function read(response: Response): Promise<Step> {
    const body = await response.json();
    assert(response.status === 200, `expected 200, got ${response.status}: ${JSON.stringify(body).slice(0, 200)}`);
    return body as Step;
  }

  const api = {
    learnerId,
    sessionId,
    get: async () => read(await GET(new Request(url, { headers }))),
    post: (body: Record<string, unknown>) =>
      POST(new Request("http://localhost/api/learning", { method: "POST", headers, body: JSON.stringify({ sessionId, ...body }) })),
    next: async (step: Step) => {
      // The learner app's Next: acknowledge a card with an intervention, otherwise reload.
      if (!step.decision.interventionId) return api.get();
      return read(await api.post({ interactionType: "acknowledge", interventionId: step.decision.interventionId, competencyId: step.decision.competencyId }));
    },
    answer: async (step: Step, correct: boolean) => {
      const item = getContentForCompetency(step.decision.competencyId, language).find((c) => c.assessmentItemId === step.content!.assessmentItemId)!;
      const expected = item.metadata!.expectedResponse!;
      const options: string[] = JSON.parse(item.metadata!.options ?? "[]");
      const response = correct ? expected : options.find((o) => o !== expected)!;
      return read(await api.post({
        interactionType: "assessment", interventionId: step.decision.interventionId, competencyId: step.decision.competencyId,
        assessmentItemId: step.content!.assessmentItemId, response, clientRequestId: `answer-${Math.random()}`,
      }));
    },
    checkFirst: (competencyId: string) => api.post({ interactionType: "check_first", competencyId }),
  };
  return api;
}

const isCard = (step: Step) => Boolean(step.content) && !step.content!.assessmentItemId;
const isQuestion = (step: Step) => Boolean(step.content?.assessmentItemId);

async function introductionThenGuidedPractice() {
  const learner = await newLearner();
  const lesson = await learner.get();
  const topic = lesson.decision.competencyId;

  assert(lesson.decision.action === "teach" && lesson.decision.reasonCode === "NEW_TOPIC_INSTRUCTION", `new topic opens with its explanation (got ${lesson.decision.action} ${lesson.decision.reasonCode})`);
  assert(isCard(lesson) && lesson.content!.type === "lesson", `explanation is a lesson card (got ${lesson.content?.type})`);
  assert(lesson.decision.interventionId, "explanation is delivered under an intervention");

  const refreshed = await learner.get();
  assert(refreshed.content!.id === lesson.content!.id && refreshed.decision.interventionId === lesson.decision.interventionId, "refreshing keeps the same explanation and intervention");

  const example = await learner.next(lesson);
  assert(example.decision.action === "teach" && example.decision.reasonCode === "NEW_TOPIC_WORKED_EXAMPLE", `explanation is followed by the worked example (got ${example.decision.reasonCode})`);
  assert(isCard(example) && example.content!.type === "example", `worked example is the authored example card (got ${example.content?.type})`);

  const practice = await learner.next(example);
  assert(practice.decision.action === "practice" && practice.decision.reasonCode === "GUIDED_PRACTICE", `worked example is followed by guided practice (got ${practice.decision.action} ${practice.decision.reasonCode})`);
  assert(isQuestion(practice) && practice.content!.type === "practice", `guided practice is the topic's practice question (got ${practice.content?.type})`);
  assert(practice.decision.interventionId === example.decision.interventionId, "guided practice checks the worked example's teaching");
  assert(practice.content!.metadata?.expectedResponse === undefined && practice.content!.metadata?.diagnosticRules === undefined, "answer key and diagnostic rules are not sent to the learner");

  assert((await getEvidence(learner.learnerId, topic)).length === 0, "teaching records no evidence");

  const check = await learner.answer(practice, true);
  assert(check.decision.action === "diagnose" && isQuestion(check), `after guided practice the check begins (got ${check.decision.action})`);
  assert((await getEvidence(learner.learnerId, topic)).length === 1, "the guided practice answer is recorded as evidence");
}

async function wrongGuidedPracticeGetsUnseenCorrectiveTeaching() {
  const learner = await newLearner();
  const lesson = await learner.get();
  const example = await learner.next(lesson);
  const practice = await learner.next(example);

  const correction = await learner.answer(practice, false);
  assert(["teach", "scaffold", "remediate"].includes(correction.decision.action) && isCard(correction), `a wrong guided practice answer leads to corrective teaching, not another question (got ${correction.decision.action} ${correction.decision.reasonCode})`);
  assert(correction.decision.reasonCode !== "INEFFECTIVE_INTERVENTION", "guided practice is not treated as failed teaching");
  assert(![lesson.content!.id, example.content!.id].includes(correction.content!.id), `corrective teaching is a card the learner has not seen (got ${correction.content!.type})`);

  const recheck = await learner.next(correction);
  assert(recheck.decision.action === "reassess" && recheck.decision.reasonCode === "INSTRUCTION_CHECK" && isQuestion(recheck), `corrective teaching is checked (got ${recheck.decision.action} ${recheck.decision.reasonCode})`);
}

async function handOverCardIsTheNextTopicsFirstStep() {
  const learner = await newLearner();
  let step = await learner.get();
  const firstTopic = step.decision.competencyId;

  for (let i = 0; i < 20 && step.decision.action !== "advance"; i += 1) {
    step = isQuestion(step) ? await learner.answer(step, true) : await learner.next(step);
  }

  assert(step.decision.action === "advance" && step.decision.competencyId !== firstTopic, `a mastered topic hands over to the next one (got ${step.decision.action})`);
  assert(isCard(step) && step.content!.type === "lesson" && step.content!.competencyId === step.decision.competencyId, "the hand-over card is the next topic's explanation");
  assert(step.decision.interventionId, "the hand-over card is delivered under an intervention");
  const handOver = await getIntervention(step.decision.interventionId);
  assert(handOver?.type === "teach" && handOver.competencyId === step.decision.competencyId, "the hand-over intervention is teaching on the next topic");

  const example = await learner.next(step);
  assert(example.decision.competencyId === step.decision.competencyId && example.decision.reasonCode === "NEW_TOPIC_WORKED_EXAMPLE", `after the hand-over the next topic continues with its worked example (got ${example.decision.reasonCode})`);
  assert(example.content!.id !== step.content!.id, "the hand-over explanation is not shown again");
}

async function checkMyKnowledgeFirst() {
  const learner = await newLearner();
  const lesson = await learner.get();
  const topic = lesson.decision.competencyId;

  const response = await learner.checkFirst(topic);
  assert(response.status === 200, `check first is accepted (${response.status})`);
  const check = (await response.json()) as Step;
  assert(check.decision.action === "diagnose" && isQuestion(check), `check first starts the diagnostic check (got ${check.decision.action})`);
  assert((await getEvidence(learner.learnerId, topic)).length === 0, "check first records no evidence");
  assert(check.learnerState.competencies.find((c) => c.competencyId === topic)!.masteryEstimate === 0, "check first does not change mastery");
  assert((await getIntervention(lesson.decision.interventionId!))?.status === "cancelled", "the skipped explanation is closed, not left open");

  const reloaded = await learner.get();
  assert(reloaded.decision.action === "diagnose" && reloaded.content!.assessmentItemId === check.content!.assessmentItemId, "the choice persists: reloading keeps the same check question");

  const answered = await learner.answer(check, true);
  const late = (await (await learner.checkFirst(topic)).json()) as Step;
  assert(late.decision.action === answered.decision.action && late.decision.action !== "teach", "check first has no effect once the topic has answers");

  const unopened = await learner.checkFirst("competency-gh-math-b4-equivalent-fractions-001");
  assert(unopened.status === 409, `check first on a topic the learner never opened is refused (${unopened.status})`);
}

async function learnerAlreadyBeingAskedStaysOnTheCheck() {
  // A learner from before teaching-first, put a diagnostic question that is not answered yet.
  const learner = await newLearner();
  const topic = (await learner.get()).decision.competencyId;
  const opened = await getLearnerInterventions(learner.learnerId, topic);
  for (const item of opened) await cancelIntervention(item.interventionId);
  await createIntervention({ learnerId: learner.learnerId, competencyId: topic, sessionId: learner.sessionId, decisionId: "legacy-diagnose", type: "diagnose" });

  const step = await learner.get();
  assert(step.decision.action === "diagnose" && isQuestion(step), `a learner already put a question is not moved back to teaching (got ${step.decision.action})`);
}

async function frenchIntroduction() {
  const learner = await newLearner("fr");
  const lesson = await learner.get();
  assert(lesson.decision.reasonCode === "NEW_TOPIC_INSTRUCTION" && lesson.content!.language === "fr", `French learners are taught in French (got ${lesson.content?.language})`);
  const example = await learner.next(lesson);
  assert(example.content!.type === "example" && example.content!.language === "fr", "the French worked example follows");
}

/*
 * Every subject: a new learner on each topic without prerequisites
 * reaches a question within the introduction's three steps, and is
 * never shown the same card twice on the way.
 */
async function everySubjectIntroductionReachesAQuestion() {
  const problems: string[] = [];
  let total = 0;
  for (const subject of getAllSubjects()) {
    if (subject.id === "subject-test-mathematics") continue;
    for (const root of getCompetenciesForSubject(subject.id).filter((item) => item.prerequisiteCompetencyIds.length === 0)) {
      total += 1;
      const learnerId = `learner-teaching-first-census-${crypto.randomUUID()}`;
      await persistenceStore.ensureLearnerExists(learnerId);
      const learnerState = createInitialLearnerState(learnerId, root.id);
      const shown: string[] = [];
      let reached = false;
      for (let step = 0; step < 3; step += 1) {
        const result = await makeAdaptiveDecision({ learnerId, sessionId: `${learnerId}-session`, learnerState });
        if (result.content?.assessmentItemId) { reached = true; break; }
        if (!result.content || !result.decision.interventionId) break;
        if (shown.includes(result.content.id)) { problems.push(`${root.id}: card repeated`); break; }
        shown.push(result.content.id);
        await acknowledgeIntervention({ interventionId: result.decision.interventionId, learnerId, competencyId: root.id });
      }
      if (!reached) problems.push(`${root.id}: no question after the introduction`);
    }
  }
  assert(problems.length === 0, `${problems.length}/${total} topics: ${problems.slice(0, 5).join("; ")}`);
  console.log(`  census: ${total} topics introduce then reach a question`);
}

for (const [name, test] of Object.entries({
  introductionThenGuidedPractice,
  wrongGuidedPracticeGetsUnseenCorrectiveTeaching,
  handOverCardIsTheNextTopicsFirstStep,
  checkMyKnowledgeFirst,
  learnerAlreadyBeingAskedStaysOnTheCheck,
  frenchIntroduction,
  everySubjectIntroductionReachesAQuestion,
})) {
  await test();
  console.log(`PASS ${name}`);
}
