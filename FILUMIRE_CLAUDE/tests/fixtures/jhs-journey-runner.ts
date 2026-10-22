import assert from "node:assert/strict";
import fs from "node:fs";
import { mock } from "node:test";
import { SignJWT } from "jose";
import { createPrincipalAuthSession } from "../../services/auth-session";
import { GET, POST } from "../../apps/learner/app/api/learning/route";
import { POST as reviewPOST } from "../../apps/learner/app/api/teacher/review/route";
import { getCompetency } from "../../packages/curriculum";
import { getContentForCompetency } from "../../services/content-store";
import { getEvidence } from "../../services/evidence-store";
import { createInitialLearnerState, saveLearnerState, getLearnerState } from "../../services/learner-state";
import { createSession } from "../../services/session";
import { persistenceStore } from "../../services/persistence-provider";
import { createPrincipalLearnerAccess } from "../../services/principal";
import { saveLearnerLearningContext } from "../../services/learner-context";
import { evaluateMastery } from "../../services/mastery";
import { correctionFor } from "../../apps/learner/services/learning-presentation";
import { jhsValidationFingerprint } from '../../services/content-store/jhs-validation-fingerprint';


import type { CompetencyDefinition } from "../../packages/curriculum";
import type { FrameworkCompetencyRegistration } from "../../packages/curriculum-framework";

export async function runJhsJourneys({ competencies: MATERIALS_COMPETENCIES, sources: MATERIALS_SOURCES, install, output }: {competencies: CompetencyDefinition[]; sources: FrameworkCompetencyRegistration[]; install: () => void; output: string}) {
assert.equal(process.env.FILUMIRE_PERSISTENCE, "memory");
const secret = "fictional-jhs-materials-batch-test-auth-secret-at-least-32-characters";
process.env.FILUMIRE_AUTH_JWT_SECRET = secret;
Object.defineProperty(process.env, "NODE_ENV", {value:"test",writable:true,configurable:true,enumerable:true});
process.env.FILUMIRE_BASIC7_PILOT = "test-only";
process.env.FILUMIRE_JHS_PREVIEW = "test-only";
install();
const BATCH_SPECS = MATERIALS_COMPETENCIES.map((c,i) => ({competencyId:c.id,code:MATERIALS_SOURCES[i].officialCode}));
const results: any[] = [];
for (const spec of BATCH_SPECS) for (const language of ["en", "fr"] as const) for (const retentionOutcome of ["correct", "incorrect"] as const) {
  const learnerId = `learner-jhs-materials-batch-${crypto.randomUUID()}`, teacherId = `teacher-${learnerId}`;
  let sessionId = `session-${learnerId}`;
  const competency = getCompetency(spec.competencyId)!;
  await persistenceStore.ensureLearnerExists(learnerId);
  await persistenceStore.createPrincipal(teacherId);
  const principalId = `self-${learnerId}`;
  await persistenceStore.createPrincipal(principalId);
  await createPrincipalLearnerAccess(`self-access-${learnerId}`, principalId, learnerId, "self");
  await createPrincipalAuthSession(sessionId, principalId, new Date(Date.now() + 60 * 86400000).toISOString());
  const sign = () => new SignJWT({ sid: sessionId, learner_id: learnerId }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setAudience("filumire-learner-api").setExpirationTime("1d").setIssuedAt().setIssuer("filumire-learner").setSubject(principalId).sign(new TextEncoder().encode(secret));
  let token = await sign();
  await createPrincipalLearnerAccess(`access-${learnerId}`, teacherId, learnerId, "teacher");
  await createSession(sessionId, learnerId);
  await saveLearnerLearningContext({learnerId,curriculumVersionId:MATERIALS_SOURCES[0].curriculumVersionId,gradeId:competency.learningLevelId,activeSubjectId:competency.subjectId,activeCompetencyId:competency.id,updatedAt:new Date().toISOString()});
  await saveLearnerState(createInitialLearnerState(learnerId, competency.id));
  let preferredLanguage: string = language;
  const headers = () => ({ "content-type": "application/json", cookie: `filumire_auth_session=${token}`, "x-filumire-language": preferredLanguage, origin: "http://localhost" });
  async function read(r: Response) { const body = await r.json(); assert.equal(r.status, 200, JSON.stringify(body)); return body; }
  const get = () => GET(new Request(`http://localhost/api/learning?sessionId=${sessionId}&subjectId=${competency.subjectId}`, { headers: headers() })).then(read);
  const post = (body: Record<string, unknown>) => POST(new Request("http://localhost/api/learning", { method: "POST", headers: headers(), body: JSON.stringify({ sessionId, competencyId: competency.id, ...body }) })).then(read);
  const answer = (step: any, response: string, interactionType = "assessment") => post({ interactionType, interventionId: step.decision.interventionId, assessmentItemId: step.content.assessmentItemId, response, clientRequestId: crypto.randomUUID() });
  let step = await get();
  assert.equal(step.content.type, "lesson");
  assert.equal(step.content.language, language);
  assert.equal((await get()).content.id, step.content.id, "interrupted lesson resumes");
  step = await post({ interactionType: "acknowledge", interventionId: step.decision.interventionId });
  assert.equal(step.content.type, "example");
  step = await post({ interactionType: "acknowledge", interventionId: step.decision.interventionId });
  const practice = getContentForCompetency(competency.id).find(c => c.id === step.content.id)!;
  assert.equal(practice.type, "practice");
  const options = JSON.parse(practice.metadata!.options) as string[];
  const wrong = await answer(step, options.find(o => o !== practice.metadata!.expectedResponse)!);
  assert(correctionFor(wrong, practice.assessmentItemId!)?.explanation?.body);
  preferredLanguage = language === "en" ? "fr" : "en";
  // /learn retains the displayed correction locally when its chrome language
  // changes; it does not GET a replacement activity. Submit that same item.
  assert.equal(step.content.assessmentItemId, practice.assessmentItemId);
  const retry = await answer(step, practice.metadata!.expectedResponse, "corrective_retry");
  preferredLanguage = language;
  assert.equal(retry.correction.retryOutcome, "correct");
  const guided = await getEvidence(learnerId, competency.id);
  assert(guided.every(e => e.independence === "guided"));
  assert.equal(evaluateMastery(guided).distinctIndependentCorrectItems, 0);
  let reviewed = 0;
  for (let n = 0; n < 45; n++) {
    step = await get();
    if (step.content?.assessmentItemId) {
      const content = getContentForCompetency(competency.id).find(c => c.id === step.content.id)!;
      if (content.metadata?.evaluationMethod === "trusted_rubric_evaluation") {
        const before = await getEvidence(learnerId, competency.id);
        const pending = await answer(step, "FICTIONAL TEST WORK ONLY: fixture teacher evaluates supplied task criteria; not a real learner or educator approval.");
        assert.equal(pending.pendingTeacherReview.status, "pending");
        assert.equal((await getEvidence(learnerId, competency.id)).length, before.length, "pending work creates no mastery evidence");
        const review = await reviewPOST(new Request("http://localhost/api/teacher/review", { method: "POST", headers: { "content-type": "application/json", "x-filumire-principal-id": teacherId }, body: JSON.stringify({ reviewId: pending.pendingTeacherReview.id, outcome: reviewed++ === 0 ? "incorrect" : "correct" }) })).then(read);
        assert.equal(review.assessment.evidence.evaluatorType, "teacher");
        assert.equal(review.assessment.evidence.interventionId, step.decision.interventionId, "trusted review preserves the exact delivered intervention");
        assert.equal(review.assessment.evidence.interventionType, step.decision.action);
        assert.equal(review.assessment.evidence.responseMode, content.assessmentStrategy, "productive evidence retains its authored performance mode");
        const scoredCount = (await getEvidence(learnerId, competency.id)).length;
        const duplicateReview = await reviewPOST(new Request("http://localhost/api/teacher/review", { method: "POST", headers: { "content-type": "application/json", "x-filumire-principal-id": teacherId }, body: JSON.stringify({ reviewId: pending.pendingTeacherReview.id, outcome: "correct" }) })).then(read);
        assert.equal(duplicateReview.duplicate, true);
        assert.equal((await getEvidence(learnerId, competency.id)).length, scoredCount, "review retries cannot add evidence or replace the first judgement");
      } else await answer(step, content.metadata!.expectedResponse);
    } else if (step.content) {
      await post({ interactionType: "acknowledge", interventionId: step.decision.interventionId });
    } else break;
    const state = (await getLearnerState(learnerId, competency.id))?.competencies.find(c => c.competencyId === competency.id);
    if (state && state.masteryEstimate >= 0.8 && state.confidence >= 0.8 && state.transferState?.status === "demonstrated") break;
  }
  const final = (await getLearnerState(learnerId, competency.id))!.competencies.find(c => c.competencyId === competency.id)!;
  assert(final.masteryEstimate >= 0.8 && final.confidence >= 0.8, `${spec.code} ${language}: mastery requires genuine reviewed work in deployment; fixture state ${JSON.stringify(final)}`);
  assert.equal(final.transferState?.status, "demonstrated");
  assert((await getEvidence(learnerId, competency.id)).filter(e => e.purpose === "mastery" && e.independence === "independent").every(e => e.evaluatorType === "teacher"));
  mock.timers.enable({ apis: ["Date"], now: Date.now() + 31 * 86400000 });
  try {
    // A returning learner signs in again; never extend an expired real session.
    sessionId = `session-revision-${learnerId}`;
    await createSession(sessionId, learnerId);
    await createPrincipalAuthSession(sessionId, principalId, new Date(Date.now() + 86400000).toISOString());
    token = await sign();
    step = await get();
    assert.equal(step.decision.action, "retention_check", `${spec.code} ${language}: due revision actually delivered`);
    const content = getContentForCompetency(competency.id).find(c => c.id === step.content.id)!;
    const priorRevision = (await getEvidence(learnerId, competency.id)).filter(e => e.interventionType === 'retention_check');
    assert(priorRevision.every(e => e.outcome === 'correct'), 'Earlier revision in this fixture was answered correctly');
    const checked = await answer(step, retentionOutcome === "correct" ? content.metadata!.expectedResponse : (JSON.parse(content.metadata!.options) as string[]).find(o => o !== content.metadata!.expectedResponse)!);
    const state = (await getLearnerState(learnerId, competency.id))!.competencies.find(c => c.competencyId === competency.id)!;
    const totalRevision = priorRevision.length + 1;
    const expectedRevisionConfidence = Number((((priorRevision.length + (retentionOutcome === 'correct' ? 1 : 0)) / totalRevision) * Math.min(1, totalRevision / 2)).toFixed(4));
    const expectedRevisionStatus = totalRevision === 1 ? (retentionOutcome === 'correct' ? 'pending' : 'not_retained') : expectedRevisionConfidence >= 0.8 ? 'retained' : 'not_retained';
    assert.equal(state.retentionState?.status, expectedRevisionStatus, 'Existing two-observation rule includes earlier legitimate revision, not only the returning session');
    assert.equal(state.retentionState?.confidence, expectedRevisionConfidence);
    assert.equal(state.retentionState?.evidenceIds.length, totalRevision, 'Returning revision adds exactly one observation without losing history');
    if (retentionOutcome === "incorrect") {
      assert.equal(state.readinessState?.readyForAdvancement, false);
      assert(correctionFor(checked, content.assessmentItemId!)?.explanation?.body, "failed revision receives authored corrective teaching");
      assert(!["advance", "complete"].includes(checked.decision.action), "failed revision must intervene before advancement");
    }
  } finally { mock.timers.reset(); }
  results.push({ competencyId: competency.id, gradeId: competency.learningLevelId, subjectId: competency.subjectId, contentFingerprint: jhsValidationFingerprint(competency, getContentForCompetency(competency.id)), code: spec.code, language, retentionOutcome, passed: true, scope: "in-memory API; fictional teacher fixtures, no educational approval" });
  console.log(`PASS ${spec.code} ${language} revision ${retentionOutcome}: teaching, interruption, language switch, wrong answer, guided retry, pending review, reviewed correction, mastery, transfer, due knowledge revision`);
}
fs.writeFileSync(output, JSON.stringify(results, null, 2));

}
