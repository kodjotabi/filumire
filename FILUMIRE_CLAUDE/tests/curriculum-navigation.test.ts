import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { GET, POST } from "../apps/learner/app/api/learning/route";
import { POST as register } from "../apps/learner/app/api/account/register/route";
import { POST as addLearner } from "../apps/learner/app/api/account/learners/route";
import { POST as login } from "../apps/learner/app/api/session/login/route";
import { seedContent } from "../services/content-store/seed";
import { getContentForCompetency } from "../services/content-store";
import { createSession } from "../services/session";
import { getEvidenceForLearner } from "../services/evidence-store";
import { createInitialLearnerState } from "../services/learner-state";
import { getLearnerLearningContext } from "../services/learner-context";
import { makeAdaptiveDecision } from "../services/adaptive-engine";
import { subjectTopics } from "../services/curriculum-navigation";
import { getAllSubjects, getCompetenciesForSubject } from "../packages/curriculum";
import { SUBJECT_GHANA_BASIC4_MATH_ID, SUBJECT_GHANA_BASIC5_MATHEMATICS_ID } from "../packages/curriculum-framework";
import type { LearningOverview, LearningResponse } from "../apps/learner/services/learning-client";
import type { buildLearningOverview } from "../apps/learner/app/api/learning/overview-data";

type ServerOverview = Awaited<ReturnType<typeof buildLearningOverview>>;

/*
 * Phase 2 regression: structured curriculum navigation and
 * independent topic selection, through the learning API.
 *
 * Topics are listed strand -> sub-strand -> topic with official
 * titles in English and French; a learner can open any topic
 * directly and begin with its teaching, the choice becomes the
 * current topic, a mastered topic is revisited from its
 * explanation, a due review does not replace a chosen topic, and
 * topics outside the learner's grade stay unreachable.
 *
 * Run: node scripts/run-offline-suites.mjs curriculum-navigation
 */

assert.equal(process.env.FILUMIRE_PERSISTENCE, "memory");
seedContent();

const B4 = SUBJECT_GHANA_BASIC4_MATH_ID;
const PATTERNS_1 = "competency-gh-math-b4-number-patterns-001";
const PATTERNS_2 = "competency-gh-math-b4-number-patterns-002";
const FRACTIONS = "competency-gh-math-b4-equivalent-fractions-001";

/* Development identity (memory persistence), as the local app uses. */
async function developmentLearner(language: "en" | "fr" = "en") {
  const learnerId = `learner-navigation-${randomUUID()}`;
  const sessionId = `session-navigation-${randomUUID()}`;
  await createSession(sessionId, learnerId);
  const headers = { "content-type": "application/json", "x-filumire-learner-id": learnerId, "x-filumire-language": language, origin: "http://localhost" };
  const get = async (query: string) => {
    const response = await GET(new Request(`http://localhost/api/learning?sessionId=${sessionId}&${query}`, { headers }));
    return { status: response.status, body: await response.json() as LearningResponse };
  };
  const post = async (body: Record<string, unknown>) => {
    const response = await POST(new Request("http://localhost/api/learning", { method: "POST", headers, body: JSON.stringify({ sessionId, ...body }) }));
    assert.equal(response.status, 200, `POST ${body.interactionType}`);
    return await response.json() as LearningResponse;
  };
  const next = async (step: LearningResponse, query: string) => {
    if (step.content?.assessmentItemId) {
      const item = getContentForCompetency(step.decision.competencyId, "en").find((c) => c.assessmentItemId === step.content!.assessmentItemId)!;
      return post({ interactionType: "assessment", interventionId: step.decision.interventionId, competencyId: step.decision.competencyId,
        assessmentItemId: item.assessmentItemId, response: item.metadata!.expectedResponse, clientRequestId: randomUUID() });
    }
    if (step.decision.interventionId) return post({ interactionType: "acknowledge", interventionId: step.decision.interventionId, competencyId: step.decision.competencyId });
    return (await get(query)).body;
  };
  return { learnerId, sessionId, get, post, next };
}

async function overview(language: "en" | "fr") {
  const learner = await developmentLearner(language);
  return (await learner.get(`overview=1&subjectId=${B4}`)).body as unknown as ServerOverview;
}

// 1. Basic 4 Mathematics is listed as the official curriculum: 4 strands, 11 sub-strands, every topic placed and in sequence.
{
  const view = await overview("en");
  const areas = view.areas;
  assert.equal(areas.length, getCompetenciesForSubject(B4).length, "every topic is listed");
  assert.deepEqual(areas.map((area) => area.sequence), areas.map((_, index) => index + 1), "topics keep the learning sequence");
  assert.deepEqual([...new Set(areas.map((area) => area.strand.title))].sort(), ["Algebra", "Data", "Geometry and Measurement", "Number"], "the four official strands");
  assert.equal(new Set(areas.map((area) => area.subStrand.key)).size, 11, "the eleven official sub-strands");
  const fractions = areas.find((area) => area.id === FRACTIONS)!;
  assert.equal(fractions.strand.title, "Number");
  assert.equal(fractions.subStrand.title, "Fractions");
  assert.equal(fractions.subStrand.code, "B4.1.3");
  assert(areas.every((area) => area.strand.title && area.subStrand.title && !/^B\d(\.\d+)*$/.test(area.subStrand.title)), "no placeholder titles");
  assert(areas.every((area) => area.status === "new"), "a new learner has not started any topic");
  console.log("PASS official Basic 4 Mathematics structure");
}

// 2. French: strands, sub-strands and topic titles in French, each marked with its language.
{
  const view = await overview("fr");
  const fractions = view.areas.find((area) => area.id === FRACTIONS)!;
  assert.equal(fractions.strand.title, "Nombres");
  assert.equal(fractions.strand.language, "fr");
  assert.equal(fractions.subStrand.title, "Fractions");
  const frenchLesson = getContentForCompetency(FRACTIONS, "fr").find((item) => !item.assessmentItemId && item.type === "lesson")!;
  assert.equal(fractions.title, frenchLesson.title, "topic title comes from its French lesson");
  assert(view.areas.every((area) => area.strand.language === "fr" && area.subStrand.language === "fr"), "every Mathematics strand and sub-strand has a French title");
  console.log("PASS French curriculum titles");
}

// 3. Every subject: every topic sits under a named strand and sub-strand.
{
  for (const subject of getAllSubjects()) {
    const topics = subjectTopics(subject.id);
    assert(topics.every((topic) => topic.strand.title && topic.subStrand.title), `${subject.id}: every topic placed`);
  }
  console.log("PASS every subject's topics are placed");
}

// 4. Independent selection: open Fractions directly and start with its explanation, nothing else required.
{
  const learner = await developmentLearner();
  const opened = await learner.get(`subjectId=${B4}&competencyId=${FRACTIONS}`);
  assert.equal(opened.status, 200);
  assert.equal(opened.body.decision.competencyId, FRACTIONS, "the chosen topic is learnt");
  assert.equal(opened.body.decision.reasonCode, "NEW_TOPIC_INSTRUCTION", "it starts with its explanation");
  assert.equal(opened.body.content?.competencyId, FRACTIONS);
  const example = await learner.next(opened.body, `subjectId=${B4}`);
  assert.equal(example.decision.competencyId, FRACTIONS, "the topic continues after Next");
  assert.equal(example.decision.reasonCode, "NEW_TOPIC_WORKED_EXAMPLE");
  assert.equal((await getEvidenceForLearner(learner.learnerId)).length, 0, "no unrelated topic was required or answered");
  console.log("PASS open a topic directly");
}

// 5. Through a real signed-in session: the choice becomes the current topic, and is kept on return.
{
  const previousNodeEnv = process.env.NODE_ENV;
  Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true, configurable: true, enumerable: true });
  process.env.FILUMIRE_AUTH_JWT_SECRET = "test-only-navigation-signing-secret-at-least-32-chars";
  process.env.FILUMIRE_ACCOUNT_REGISTRATION = "open";
  const run = randomUUID().slice(0, 8);
  const request = (path: string, body: unknown, cookie?: string) =>
    new Request(`http://localhost${path}`, { method: "POST", headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });
  const cookieOf = (response: Response) => `filumire_auth_session=${response.headers.get("set-cookie")!.match(/filumire_auth_session=([^;]*)/)![1]}`;
  const guardian = await register(request("/api/account/register", {
    email: `navigation-${run}@example.test`, password: "test-guardian-password", displayName: "Fictional Guardian", preferredLanguage: "en", confirmsGuardian: true, acceptsNotice: true,
  }));
  assert.equal(guardian.status, 201);
  const added = await addLearner(request("/api/account/learners", { displayName: "Fictional Learner", username: `navigation.${run}`, password: "test-learner-password", preferredLanguage: "en", consentsToLearnerData: true }, cookieOf(guardian)));
  assert.equal(added.status, 201);
  const { learnerId } = await added.json() as { learnerId: string };
  const signedIn = await login(request("/api/session/login", { login: `navigation.${run}`, password: "test-learner-password" }));
  assert.equal(signedIn.status, 200);
  const cookie = cookieOf(signedIn);
  const learn = async (query: string) => {
    const response = await GET(new Request(`http://localhost/api/learning?${query}`, { headers: { cookie } }));
    return { status: response.status, body: await response.json() as LearningResponse };
  };

  const chosen = await learn(`subjectId=${B4}&competencyId=${FRACTIONS}`);
  assert.equal(chosen.status, 200);
  assert.equal(chosen.body.decision.competencyId, FRACTIONS);
  assert.equal((await getLearnerLearningContext(learnerId))?.activeCompetencyId, FRACTIONS, "the chosen topic becomes the current topic");
  const resumed = await learn(`subjectId=${B4}`);
  assert.equal(resumed.body.decision.competencyId, FRACTIONS, "returning continues the chosen topic");
  assert.equal(resumed.body.decision.interventionId, chosen.body.decision.interventionId, "the same explanation, not a second one");

  const otherGrade = getCompetenciesForSubject(SUBJECT_GHANA_BASIC5_MATHEMATICS_ID)[0].id;
  assert.equal((await learn(`subjectId=${B4}&competencyId=${otherGrade}`)).status, 404, "a topic of another subject or grade cannot be chosen");
  assert.equal((await learn(`subjectId=${SUBJECT_GHANA_BASIC5_MATHEMATICS_ID}&competencyId=${otherGrade}`)).status, 404, "another grade's subject cannot be opened");
  console.log("PASS signed-in selection is kept and bounded by grade");
  Object.defineProperty(process.env, "NODE_ENV", { value: previousNodeEnv, writable: true, configurable: true, enumerable: true });
}

// 6. A mastered topic chosen again is revisited from its explanation; a due review does not replace a chosen topic.
{
  const learner = await developmentLearner();
  let step = (await learner.get(`subjectId=${B4}`)).body;
  for (let index = 0; index < 20 && step.decision.action !== "advance"; index += 1) step = await learner.next(step, `subjectId=${B4}`);
  assert.equal(step.decision.action, "advance", "the first topic is completed");
  assert.equal(step.decision.competencyId, PATTERNS_2);

  // Weeks later the first topic's review is due; the learner opens Fractions from the topic list.
  const later = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  const fractionsState = createInitialLearnerState(learner.learnerId, FRACTIONS);
  const due = await makeAdaptiveDecision({ learnerId: learner.learnerId, sessionId: learner.sessionId, learnerState: fractionsState }, { timeAwareRetention: true, now: later });
  assert.equal(due.decision.action, "retention_check", `fixture: a review is due (got ${due.decision.action})`);
  assert.equal(due.decision.competencyId, PATTERNS_1, "fixture: the due review is the first topic");
  const chosen = await makeAdaptiveDecision({ learnerId: learner.learnerId, sessionId: learner.sessionId, learnerState: fractionsState }, { timeAwareRetention: true, now: later, selectedTopic: true });
  assert.equal(chosen.decision.competencyId, FRACTIONS, "a due review does not replace the chosen topic");
  assert.equal(chosen.decision.reasonCode, "NEW_TOPIC_INSTRUCTION", "the chosen topic starts with its explanation");

  const revisit = await learner.get(`subjectId=${B4}&competencyId=${PATTERNS_1}`);
  assert.equal(revisit.body.decision.competencyId, PATTERNS_1, "the mastered topic is opened, not skipped");
  assert.equal(revisit.body.decision.reasonCode, "TOPIC_REVISIT");
  assert.equal(revisit.body.content?.type, "lesson", "it is revisited from its explanation");
  const evidenceBefore = (await getEvidenceForLearner(learner.learnerId)).length;
  const example = await learner.next(revisit.body, `subjectId=${B4}`);
  assert.equal(example.decision.reasonCode, "NEW_TOPIC_WORKED_EXAMPLE", "a mastered-topic revisit includes its worked example");
  assert.equal(example.content?.type, "example");
  const check = await learner.next(example, `subjectId=${B4}`);
  assert.equal(check.decision.reasonCode, "GUIDED_PRACTICE");
  assert(check.content?.assessmentItemId && check.decision.competencyId === PATTERNS_1, "the revisit is checked on the same topic");
  assert.equal((await getEvidenceForLearner(learner.learnerId)).length, evidenceBefore, "reading the revisit records no evidence");
  console.log("PASS due review waits for a chosen topic; mastered topic revisited");
}

// 7. The subject page shows the browsable tree: strands, sub-strands, and a link per topic that opens it directly.
{
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  Object.assign(globalThis, { React });
  const { SubjectPage } = await import("../apps/learner/components/filumire/SubjectPage");
  const { toFilumireSubjects } = await import("../apps/learner/components/filumire/subjects");
  for (const language of ["en", "fr"] as const) {
    const view = await overview(language);
    const fractions = view.areas.find((area) => area.id === FRACTIONS)!;
    const html = renderToStaticMarkup(React.createElement(SubjectPage, {
      language, overview: view as unknown as LearningOverview, subject: toFilumireSubjects(view.availableSubjects).find((item) => item.subjectId === B4)!,
      currentTitle: fractions.title, learnHref: "/learn", icon: null, footer: null,
    }));
    assert.equal((html.match(/<h3 /g) ?? []).length, 4, `${language}: one heading per strand`);
    assert.equal((html.match(/<details/g) ?? []).length, 11, `${language}: one group per sub-strand`);
    assert.equal((html.match(/competencyId=/g) ?? []).length, view.areas.length, `${language}: every topic can be opened directly`);
    assert(html.includes(`competencyId=${encodeURIComponent(FRACTIONS)}`), `${language}: Fractions links to itself`);
    assert(html.includes(language === "en" ? "Your current topic" : "Ton thème actuel"), `${language}: the current topic is marked`);
    assert(html.includes(language === "en" ? ">Number<" : ">Nombres<"), `${language}: strand titles in the page language`);
  }
  console.log("PASS subject page lists every topic by strand and sub-strand");
}
