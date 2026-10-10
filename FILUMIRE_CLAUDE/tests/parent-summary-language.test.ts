import assert from "node:assert/strict";
import { createInitialLearnerState, saveLearnerState, getLearnerState } from "../services/learner-state";
import { updateActiveCompetency } from "../services/learner-context";
import { buildAdultLearnerSummary } from "../services/adult-summary";
import { persistenceStore } from "../services/persistence-provider";
import { createPrincipalLearnerAccess } from "../services/principal";
import { createIntervention } from "../services/intervention-store";
import { GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID } from "../packages/curriculum";
import { GET } from "../apps/learner/app/api/adult/summary/route";
import type { DiagnosticState } from "../packages/domain";

async function run() {
  assert.equal(process.env.FILUMIRE_PERSISTENCE, "memory", "Run this test with in-memory persistence");
  const learnerId = `parent-fr-${crypto.randomUUID()}`;
  const principalId = `guardian-fr-${crypto.randomUUID()}`;
  const competencyId = GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID;
  await persistenceStore.ensureLearnerExists(learnerId);
  await persistenceStore.createPrincipal(principalId);
  await createPrincipalLearnerAccess(crypto.randomUUID(), principalId, learnerId, "guardian");
  const state = createInitialLearnerState(learnerId, competencyId);
  const competency = state.competencies[0];
  competency.retentionState = { status: "not_retained", confidence: 0.8, evidenceIds: [] };
  competency.transferState = { status: "not_demonstrated", confidence: 0.8, evidenceIds: [] };
  await updateActiveCompetency(learnerId, competencyId);
  await createIntervention({ learnerId, competencyId, sessionId: "fr-test", decisionId: "fr-test", type: "teach" });
  const diagnostics: DiagnosticState[] = ["prerequisite_gap", "conceptual_misunderstanding", "procedural_error", "misconception", "forgotten_knowledge", "transfer_failure", "persistent_difficulty"];
  for (const diagnostic of diagnostics) {
    competency.diagnosticState = diagnostic;
    await saveLearnerState(state);
    const en = await buildAdultLearnerSummary(learnerId);
    const fr = await buildAdultLearnerSummary(learnerId, "fr");
    assert.notEqual(fr.needsSupport, en.needsSupport);
    assert.notEqual(fr.nextFocus, en.nextFocus);
    assert.notEqual(fr.retentionStatus, en.retentionStatus);
    assert.notEqual(fr.transferStatus, en.transferStatus);
    assert.equal(fr.competencyTitle, en.competencyTitle);
    assert.equal(fr.subjectName, en.subjectName);
    assert.deepEqual(fr.recentActivity, en.recentActivity);
    assert.deepEqual(fr.progress, en.progress);
    assert.equal(fr.masteryPercent, en.masteryPercent);
    assert.equal(fr.evidenceCount, en.evidenceCount);
    assert.equal(fr.readyForAdvancement, en.readyForAdvancement);
    assert.equal(fr.homeSupport?.length, 3);
    assert.equal(fr.alerts?.length, 3);
    for (let i = 0; i < 3; i++) {
      assert.notEqual(fr.homeSupport![i].guidance, en.homeSupport![i].guidance);
      assert.notEqual(fr.homeSupport![i].boundary, en.homeSupport![i].boundary);
      assert.notEqual(fr.alerts![i].message, en.alerts![i].message);
      assert.equal(fr.alerts![i].type, en.alerts![i].type);
    }
    if (diagnostic === "prerequisite_gap") assert.ok(fr.homeSupport![0].guidance.includes(`\u00ab ${fr.competencyTitle} \u00bb`));
    assert.deepEqual(await getLearnerState(learnerId, competencyId), state);
  }
  competency.retentionState.status = "retained";
  competency.transferState.status = "demonstrated";
  competency.readinessState = { readyForAdvancement: true, confidence: 0.9, reasonCode: "TEST", evaluatedAt: new Date().toISOString() };
  await saveLearnerState(state);
  const positive = await buildAdultLearnerSummary(learnerId, "fr");
  assert.equal(positive.strengths?.length, 3);
  assert.ok(positive.strengths?.every(text => !text.startsWith("The learner") && !text.startsWith("Current learning")));
  assert.equal(positive.alerts?.[0].title, "Bons progr\u00e8s");
  for (const language of ["fr", "en", "invalid", ""]) {
    const response = await GET(new Request(`http://localhost/api/adult/summary?learnerId=${learnerId}`, { headers: { "x-filumire-principal-id": principalId, "x-filumire-language": language } }));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body.summary, await buildAdultLearnerSummary(learnerId, language === "fr" ? "fr" : "en"));
  }
  competency.retentionState.status = "pending";
  competency.transferState.status = "pending";
  competency.readinessState.readyForAdvancement = false;
  competency.diagnosticState = "forgotten_knowledge";
  await saveLearnerState(state);
  await createIntervention({ learnerId, competencyId, sessionId: "review-test", decisionId: "review-test", type: "teacher_review" });
  const pending = await buildAdultLearnerSummary(learnerId, "fr");
  assert.ok(pending.retentionStatus?.startsWith("FILUMIRE"));
  assert.ok(pending.transferStatus?.startsWith("FILUMIRE"));
  assert.ok(pending.nextFocus?.startsWith("Un examen"));
  assert.ok(pending.alerts?.some(alert => alert.type === "teacher_review" && alert.message.includes("Aucune action")));
  assert.deepEqual(await getLearnerState(learnerId, competencyId), state);
  const denied = await GET(new Request("http://localhost/api/adult/summary?learnerId=unlinked", { headers: { "x-filumire-principal-id": principalId, "x-filumire-language": "fr" } }));
  assert.equal(denied.status, 403);
  assert.equal((await buildAdultLearnerSummary("no-activity", "fr")).hasActivity, false);
  console.log("French parent summary service and API: PASS; authorization and learning state preserved");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
