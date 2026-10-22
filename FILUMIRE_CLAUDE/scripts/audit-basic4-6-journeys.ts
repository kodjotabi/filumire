import assert from "node:assert/strict";
import { mock } from "node:test";
import fs from "node:fs";
import { GET, POST } from "../apps/learner/app/api/learning/route";
import { getAllSubjects, getCompetenciesForSubject } from "../packages/curriculum";
import { getContentForCompetency } from "../services/content-store";
import { getLearnerState, saveLearnerState } from "../services/learner-state";
import { getEvidence } from "../services/evidence-store";
import { createSession } from "../services/session";
import { persistenceStore } from "../services/persistence-provider";
import { buildRevisionSummary, unansweredActivities } from "../services/learner-path/revision";
import { correctionFor } from "../apps/learner/services/learning-presentation";

assert.equal(process.env.FILUMIRE_PERSISTENCE, "memory");
const scenario = process.argv.includes("--perfect") ? "perfect" : "repeated_mistakes";
const destination = "docs/audits/basic4-6-completion/journey-results.json";
const results: any[] = fs.existsSync(destination) ? JSON.parse(fs.readFileSync(destination, "utf8")).results.map((r: any) => ({ ...r, scenario: r.scenario ?? "repeated_mistakes" })).filter((r: any) => r.scenario !== scenario) : [];
for (const subject of getAllSubjects().filter((s) => /^level-gh-basic-[456]-pilot$/.test(s.learningLevelId))) for (const language of ["en", "fr"] as const) {
  const competency = getCompetenciesForSubject(subject.id).find((c) => !c.prerequisiteCompetencyIds.length)!;
  const result: any = { scenario, grade: Number(subject.learningLevelId.match(/basic-(\d)/)![1]), subject: subject.name, subjectId: subject.id, language, competencyId: competency.id,
    scope: "one prerequisite-free topic per subject/grade/language, actual in-memory learning API, not all competencies or database/browser verification", checks: {}, observations: [] };
  try {
    const learnerId = `learner-b46-audit-${crypto.randomUUID()}`, sessionId = `session-${learnerId}`;
    await persistenceStore.ensureLearnerExists(learnerId); await createSession(sessionId, learnerId);
    const headers = { "content-type": "application/json", "x-filumire-learner-id": learnerId, "x-filumire-language": language, origin: "http://localhost" };
    async function read(response: Response) { const body = await response.json(); assert.equal(response.status, 200, JSON.stringify(body)); return body; }
    const get = () => GET(new Request(`http://localhost/api/learning?sessionId=${sessionId}&subjectId=${subject.id}`, { headers })).then(read);
    const post = (body: Record<string, unknown>) => POST(new Request("http://localhost/api/learning", { method: "POST", headers, body: JSON.stringify({ sessionId, competencyId: competency.id, ...body }) })).then(read);
    const next = (step: any) => post({ interactionType: "acknowledge", interventionId: step.decision.interventionId });
    const answer = (step: any, correct = true, interactionType = "assessment", clientRequestId = crypto.randomUUID()) => {
      const item = getContentForCompetency(competency.id).find((c) => c.assessmentItemId === step.content?.assessmentItemId)!;
      assert(item?.metadata?.expectedResponse !== undefined);
      const options: string[] = JSON.parse(item.metadata.options ?? "[]");
      const wrong = options.find((o) => o !== item.metadata!.expectedResponse) ?? "incorrect-audit-response";
      return post({ interactionType, interventionId: step.decision.interventionId, assessmentItemId: item.assessmentItemId, response: correct ? item.metadata.expectedResponse : wrong, clientRequestId });
    };
    let step = await get();
    assert.equal(step.content.type, "lesson"); assert.equal(step.content.language, language);
    result.checks.explanation = "verified";
    const refreshed = await get(); assert.equal(refreshed.content.id, step.content.id); assert.equal(refreshed.decision.interventionId, step.decision.interventionId);
    result.checks.interrupted_explanation_resume = "verified";
    step = await next(step); assert.equal(step.content.type, "example"); result.checks.worked_example = "verified";
    step = await next(step); assert.equal(step.decision.action, "practice"); assert(step.content.assessmentItemId); result.checks.guided_practice = "verified";
    const practice = step;
    const questionAgain = await get(); assert.equal(questionAgain.content.assessmentItemId, practice.content.assessmentItemId); result.checks.unanswered_question_resume = "verified";
    if (scenario === "repeated_mistakes") {
    const wrong = await answer(practice, false);
    const correction = correctionFor(wrong, practice.content.assessmentItemId);
    assert(correction?.concept?.body && correction?.explanation?.body);
    result.checks.incorrect_answer_correction = "verified";
    const retry = await answer(practice, false, "corrective_retry");
    assert.equal(retry.correction?.retryOutcome, "incorrect");
    const evidence = await getEvidence(learnerId, competency.id);
    assert(evidence.some((e) => e.independence === "guided"));
    assert.equal(evidence.filter((e) => e.independence === "independent" && e.outcome === "correct").length, 0);
    result.checks.repeated_mistake_guided_evidence_integrity = "verified";
    } else {
      await answer(practice, true);
      result.checks.correct_guided_answer = "verified";
    }
    step = await get();
    const actions: string[] = [];
    for (let n = 0; n < 65; n++) {
      const state = (await getLearnerState(learnerId, competency.id))!.competencies.find((c) => c.competencyId === competency.id)!;
      if (state.masteryEstimate >= 0.8 && state.confidence >= 0.8 && state.transferState?.status === "demonstrated") break;
      actions.push(`${step.decision.action}/${step.decision.reasonCode}`);
      if (step.decision.competencyId !== competency.id) { result.observations.push(`advanced_or_repaired_to_${step.decision.competencyId}`); break; }
      step = step.content?.assessmentItemId ? await answer(step) : await next(step);
    }
    const stored = (await getLearnerState(learnerId, competency.id))!;
    const state = stored.competencies.find((c) => c.competencyId === competency.id)!;
    const acquired = state.masteryEstimate >= 0.8 && state.confidence >= 0.8;
    result.checks.mastery_after_correction = acquired ? "verified" : "not_reached";
    result.checks.transfer = state.transferState?.status === "demonstrated" ? "verified" : "not_reached";
    result.finalState = { mastery: state.masteryEstimate, confidence: state.confidence, evidenceCount: state.evidenceCount, transfer: state.transferState?.status, retention: state.retentionState?.status };
    result.actions = [...new Set(actions)];
    if (acquired && state.transferState?.status === "demonstrated") {
      mock.timers.enable({ apis: ["Date"], now: Date.now() + 31 * 86400000 });
      try {
        // Review boundary focus only, preserving earned scores and historical deliveries.
        await saveLearnerState({ ...stored, competencies: [state, ...stored.competencies.filter((c) => c.competencyId !== competency.id)] });
        const summary = await buildRevisionSummary(learnerId, subject.learningLevelId, subject.id, competency.id);
        assert(summary?.due.some((d) => d.competencyId === competency.id));
        result.checks.retention_scheduling = "verified";
        const review = await get();
        result.checks.due_retention_delivery = review.decision.action === "retention_check" ? "verified" : "failed";
        result.retentionDecision = review.decision.action;
        result.pendingActivities = (await unansweredActivities(learnerId, subject.id, competency.id)).map((i) => ({ type: i.type, status: i.status, outcome: i.outcome, evidenceIds: i.evidenceIds }));
        if (review.decision.action === "retention_check") {
          const checked = await answer(review);
          result.checks.retention_scoring = checked.assessment.result.correct ? "verified" : "failed";
        } else result.checks.retention_scoring = "blocked_by_delivery";
      } finally { mock.timers.reset(); }
    } else { result.checks.due_retention_delivery = "unverified_mastery_not_reached"; result.checks.retention_scoring = "unverified"; }
  } catch (error) { result.error = String(error); }
  results.push(result);
  console.log(JSON.stringify({ grade: result.grade, subject: result.subject, language, checks: result.checks, error: result.error }));
  fs.writeFileSync("docs/audits/basic4-6-completion/journey-results.json", JSON.stringify({ generatedAt: new Date().toISOString(), baseline: "main snapshot, without Phase 8E retention repair", results }, null, 2) + "\n");
}
