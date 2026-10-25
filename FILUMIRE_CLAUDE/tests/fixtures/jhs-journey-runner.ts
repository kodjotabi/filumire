import assert from "node:assert/strict";
import fs from "node:fs";
import { basename, dirname, join } from "node:path";
import { mock } from "node:test";
import { SignJWT } from "jose";
import { createPrincipalAuthSession } from "../../services/auth-session";
import { GET, POST } from "../../apps/learner/app/api/learning/route";
import { getCompetency } from "../../packages/curriculum";
import { getContentForCompetency } from "../../services/content-store";
import { getEvidence } from "../../services/evidence-store";
import { createInitialLearnerState, saveLearnerState, getLearnerState } from "../../services/learner-state";
import { createSession } from "../../services/session";
import { persistenceStore } from "../../services/persistence-provider";
import { createPrincipalLearnerAccess } from "../../services/principal";
import { getLearnerLearningContext, saveLearnerLearningContext } from "../../services/learner-context";
import { evaluateMastery } from "../../services/mastery";
import { correctionFor } from "../../apps/learner/services/learning-presentation";
import { jhsValidationFingerprint } from '../../services/content-store/jhs-validation-fingerprint';


import type { CompetencyDefinition } from "../../packages/curriculum";
import type { FrameworkCompetencyRegistration } from "../../packages/curriculum-framework";

export async function runJhsJourneys({ competencies: MATERIALS_COMPETENCIES, sources: MATERIALS_SOURCES, install, output, afterSignIn }: {competencies: CompetencyDefinition[]; sources: FrameworkCompetencyRegistration[]; install: () => void; output: string; afterSignIn?: (sessionId: string) => Promise<void>}) {
assert(process.env.FILUMIRE_PERSISTENCE === "memory" ||
  (process.env.FILUMIRE_PERSISTENCE === "postgres" && process.env.FILUMIRE_JHS_PG_TEST_VERIFIED === "true"),
  "Only memory or the verified fresh local PostgreSQL fixture");
const secret = "fictional-jhs-materials-batch-test-auth-secret-at-least-32-characters";
process.env.FILUMIRE_AUTH_JWT_SECRET = secret;
Object.defineProperty(process.env, "NODE_ENV", {value:"test",writable:true,configurable:true,enumerable:true});
process.env.FILUMIRE_BASIC7_PILOT = "test-only";
process.env.FILUMIRE_JHS_PREVIEW = "test-only";
install();
// This journey explicitly exercises a delayed return. Isolated legacy JHS
// installers do not always advertise complete grade coverage, so opt into the
// existing time-aware policy rather than assuming an immediate check is due again.
process.env.FILUMIRE_TIME_AWARE_RETENTION = "on";
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
  await afterSignIn?.(sessionId);
  const sign = () => new SignJWT({ sid: sessionId, learner_id: learnerId }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setAudience("filumire-learner-api").setExpirationTime("1d").setIssuedAt().setIssuer("filumire-learner").setSubject(principalId).sign(new TextEncoder().encode(secret));
  let token = await sign();
  await createPrincipalLearnerAccess(`access-${learnerId}`, teacherId, learnerId, "teacher");
  await createSession(sessionId, learnerId);
  await saveLearnerLearningContext({learnerId,curriculumVersionId:MATERIALS_SOURCES[0].curriculumVersionId,gradeId:competency.learningLevelId,activeSubjectId:competency.subjectId,activeCompetencyId:competency.id,updatedAt:new Date().toISOString()});
  // Fixture (Step 0): a prerequisite linked by NaCCA content standard counts as completed earlier,
  // so this journey exercises the topic itself. Prerequisite repair is tested in jhs-automatic-journeys.
  for (const prerequisiteId of competency.prerequisiteCompetencyIds) {
    const done = createInitialLearnerState(learnerId, prerequisiteId);
    done.competencies = done.competencies.map(c => c.competencyId !== prerequisiteId ? c : { ...c, masteryEstimate: 0.9, confidence: 0.9, evidenceCount: 9,
      retentionState: { status: "retained", confidence: 0.9, evidenceIds: [] }, transferState: { status: "demonstrated", confidence: 0.9, evidenceIds: [] },
      readinessState: { readyForAdvancement: true, confidence: 0.9, reasonCode: "FIXTURE_PREREQUISITE_COMPLETED", evaluatedAt: new Date().toISOString() } });
    await saveLearnerState(done);
  }
  await saveLearnerState(createInitialLearnerState(learnerId, competency.id));
  let preferredLanguage: string = language;
  const headers = () => ({ "content-type": "application/json", cookie: `filumire_auth_session=${token}`, "x-filumire-language": preferredLanguage, origin: "http://localhost" });
  async function read(r: Response) { const body = await r.json(); assert.equal(r.status, 200, JSON.stringify(body)); return body; }
  const get = () => GET(new Request(`http://localhost/api/learning?sessionId=${sessionId}&subjectId=${competency.subjectId}`, { headers: headers() })).then(read);
  const post = (body: Record<string, unknown>) => POST(new Request("http://localhost/api/learning", { method: "POST", headers: headers(), body: JSON.stringify({ sessionId, competencyId: competency.id, ...body }) })).then(read);
  const answer = (step: any, response: string, interactionType = "assessment") => post({ interactionType, competencyId: step.content.competencyId, interventionId: step.decision.interventionId, assessmentItemId: step.content.assessmentItemId, response, clientRequestId: crypto.randomUUID() });
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
  // Step 0: every question on the adaptive path is marked automatically; no teacher is involved.
  let misconceptionChecked = false;
  for (let n = 0; n < 45; n++) {
    step = await get();
    if (step.content?.assessmentItemId) {
      const content = getContentForCompetency(competency.id).find(c => c.id === step.content.id)!;
      assert.notEqual(content.metadata?.evaluationMethod, "trusted_rubric_evaluation", `${spec.code}: no teacher-reviewed item on the adaptive path`);
      assert.equal(content.metadata?.evidenceRole, undefined, `${spec.code}: no retired or optional item is served`);
      if (!misconceptionChecked && content.metadata?.assessmentPurpose === "diagnostic") {
        // One wrong independent answer: the specific misconception is recorded automatically.
        misconceptionChecked = true;
        const wrongOption = (JSON.parse(content.metadata.options) as string[]).find(o => o !== content.metadata!.expectedResponse)!;
        const rules = JSON.parse(content.metadata.diagnosticRules) as Record<string, { errorPattern: string }>;
        await answer(step, wrongOption);
        const recorded = (await getEvidence(learnerId, competency.id)).find(e => e.assessmentItemId === content.assessmentItemId)!;
        assert.equal(recorded.outcome, "incorrect");
        assert.equal(recorded.errorPattern, rules[wrongOption].errorPattern, `${spec.code}: wrong answer maps to its misconception`);
        assert(competency.misconceptions.includes(recorded.errorPattern!), `${spec.code}: misconception is listed on the competency`);
      } else await answer(step, content.metadata!.expectedResponse);
    } else if (step.content) {
      await post({ interactionType: "acknowledge", interventionId: step.decision.interventionId });
    } else break;
    const state = (await getLearnerState(learnerId, competency.id))?.competencies.find(c => c.competencyId === competency.id);
    if (state && state.masteryEstimate >= 0.8 && state.confidence >= 0.8 && state.transferState?.status === "demonstrated") break;
  }
  const final = (await getLearnerState(learnerId, competency.id))!.competencies.find(c => c.competencyId === competency.id)!;
  assert(final.masteryEstimate >= 0.8 && final.confidence >= 0.8, `${spec.code} ${language}: independent automatic mastery; fixture state ${JSON.stringify(final)}`);
  assert.equal(final.transferState?.status, "demonstrated");
  assert(misconceptionChecked, `${spec.code} ${language}: a diagnostic question was served`);
  const independent = (await getEvidence(learnerId, competency.id)).filter(e => e.purpose === "mastery" && e.independence === "independent");
  assert(independent.length > 0 && independent.every(e => e.evaluatorType === "system_exact_match"), `${spec.code}: mastery evidence is automatic`);
  assert.equal((await persistenceStore.getPendingTeacherReviews(learnerId)).length, 0, `${spec.code}: no teacher review was needed`);
  mock.timers.enable({ apis: ["Date"], now: Date.now() + 31 * 86400000 });
  try {
    // A returning learner signs in again; never extend an expired real session.
    sessionId = `session-revision-${learnerId}`;
    await createSession(sessionId, learnerId);
    await createPrincipalAuthSession(sessionId, principalId, new Date(Date.now() + 86400000).toISOString());
    await afterSignIn?.(sessionId);
    token = await sign();
    // Mastery may legitimately move the active context to a successor. This
    // fixture returns to the topic whose delayed retention it is checking.
    // Keep its evidence/state intact; do not change progression policy.
    const returningContext = await getLearnerLearningContext(learnerId);
    assert(returningContext);
    await saveLearnerLearningContext({ ...returningContext, activeCompetencyId: competency.id, updatedAt: new Date().toISOString() });
    // A persisted composite row may have the successor first after advance.
    // Re-focus the fixture's view without resetting any competency or evidence.
    const returningState = (await getLearnerState(learnerId, competency.id))!;
    const target = returningState.competencies.find(c => c.competencyId === competency.id)!;
    await saveLearnerState({ ...returningState, competencies: [target, ...returningState.competencies.filter(c => c !== target)] });
    step = await get();
    // The source-backed sequence can also leave an older prerequisite due on
    // this first return. Honour that review rather than looking up its content
    // in the target competency or suppressing the scheduler's evidence queue.
    for(let other=0;step.content?.competencyId!==competency.id&&other<128;other++){
      assert.equal(step.decision.action,'retention_check',JSON.stringify(step.decision));
      const dueItem=getContentForCompetency(step.content.competencyId).find(c=>c.id===step.content.id);
      assert(dueItem?.metadata?.expectedResponse!==undefined,'Due prerequisite has an authored answer');
      await answer(step,dueItem.metadata.expectedResponse);
      step=await get();
    }
    assert.equal(step.content?.competencyId,competency.id,'Target due revision is eventually served without losing prerequisite evidence');
    assert.equal(step.decision.action, "retention_check", `${spec.code} ${language}: returning to the topic delivers its due revision`);
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
    } else {
      if (state.retentionState?.status !== "retained") {
        // One correct return is provisional. Return again through the real API
        // to meet the unchanged two-observation retention rule.
        mock.timers.tick(31 * 86400000);
        sessionId = `session-second-revision-${learnerId}`;
        await createSession(sessionId, learnerId);
        await createPrincipalAuthSession(sessionId, principalId, new Date(Date.now() + 86400000).toISOString());
        await afterSignIn?.(sessionId);
        token = await sign();
        const context = (await getLearnerLearningContext(learnerId))!;
        await saveLearnerLearningContext({ ...context, activeCompetencyId: competency.id, updatedAt: new Date().toISOString() });
        const composite = (await getLearnerState(learnerId, competency.id))!;
        const focus = composite.competencies.find(c => c.competencyId === competency.id)!;
        await saveLearnerState({ ...composite, competencies: [focus, ...composite.competencies.filter(c => c !== focus)] });
        let again = await get();
        // An older prerequisite can also be due at this later date. Complete
        // its legitimate revision rather than suppressing the review queue.
        for (let other = 0; again.content?.competencyId !== competency.id && other < 12; other++) {
          assert.equal(again.decision.action, "retention_check", JSON.stringify(again.decision));
          const dueItem = getContentForCompetency(again.content.competencyId).find(c => c.id === again.content.id)!;
          assert(dueItem, JSON.stringify(again.content));
          await answer(again, dueItem.metadata!.expectedResponse);
          again = await get();
        }
        assert.equal(again.decision.action, "retention_check");
        assert.equal(again.content.competencyId, competency.id, "target revision is not starved by other due topics");
        const nextItem = getContentForCompetency(competency.id).find(c => c.id === again.content.id)!;
        await answer(again, nextItem.metadata!.expectedResponse);
      }
      const confirmed = (await getLearnerState(learnerId, competency.id))!.competencies.find(c => c.competencyId === competency.id)!;
      assert.equal(confirmed.readinessState?.readyForAdvancement, true, `${spec.code} ${language}: independent mastery, retention and transfer are all required`);
      assert.equal(confirmed.readinessState?.reasonCode, "MASTERY_RETENTION_TRANSFER_CONFIRMED");
    }
  } finally { mock.timers.reset(); }
  results.push({ competencyId: competency.id, gradeId: competency.learningLevelId, subjectId: competency.subjectId, contentFingerprint: jhsValidationFingerprint(competency, getContentForCompetency(competency.id)), code: spec.code, language, retentionOutcome, passed: true, scope: `${process.env.FILUMIRE_PERSISTENCE} API; fictional learners, automatic assessment; no educational approval` });
  console.log(`PASS ${spec.code} ${language} revision ${retentionOutcome}: teaching, interruption, language switch, wrong answer, guided retry, misconception recorded, automatic mastery without a teacher, transfer, due knowledge revision`);
}
const destination = process.env.FILUMIRE_JHS_JOURNEY_OUTPUT_DIR
  ? join(process.env.FILUMIRE_JHS_JOURNEY_OUTPUT_DIR, `${basename(dirname(output))}-${basename(output)}`) : output;
fs.mkdirSync(dirname(destination), { recursive: true });
fs.writeFileSync(destination, JSON.stringify(results, null, 2));

}
