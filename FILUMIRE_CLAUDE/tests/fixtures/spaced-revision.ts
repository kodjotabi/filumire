import { registerGuardian, addLearnerForGuardian } from "../../services/account";
import { accountStore } from "../../services/account/store";
import { createInitialLearnerState } from "../../services/learner-state";
import { saveLearnerState } from "../../services/learner-state-store";
import { saveEvidence, getEvidence } from "../../services/evidence-store";
import { evaluateMastery } from "../../services/mastery";
import { getOrCreateLearnerLearningContext, saveLearnerLearningContext } from "../../services/learner-context";
import { getCompetenciesForSubject, getNextCompetency, GHANA_MATH_PILOT_SUBJECT_ID } from "../../packages/curriculum";
import { getContentForCompetency } from "../../services/content-store";
import { seedContent } from "../../services/content-store/seed";

/** Test-only state representing a returning learner; never imported by the app. */
export async function revisionFixture(language: "en" | "fr", suffix: string, subjectId = GHANA_MATH_PILOT_SUBJECT_ID) {
  if (process.env.FILUMIRE_PERSISTENCE !== "memory") throw Error("Revision fixtures require memory persistence");
  seedContent();
  const password = "Fictional-revision-pass-1";
  const username = `revision.${suffix}`;
  const guardian = await registerGuardian({ email: `${username}@example.test`, password, displayName: "Revision Guardian", confirmsGuardian: true, acceptsNotice: true });
  const { learnerId } = await addLearnerForGuardian(guardian.principalId, { username, password, displayName: "Revision Learner", preferredLanguage: language, consentsToLearnerData: true });
  await accountStore.updateLearnerProfile(learnerId, { onboardingCompletedAt: new Date().toISOString() });
  const first = getCompetenciesForSubject(subjectId).find(c => !c.prerequisiteCompetencyIds.length && getNextCompetency(c.id))!;
  const next = getNextCompetency(first.id)!;
  const checkedAt = new Date(Date.now() - 8 * 86400000).toISOString();
  const old = createInitialLearnerState(learnerId, first.id);
  Object.assign(old.competencies[0], { masteryEstimate: 0.95, confidence: 0.95, evidenceCount: 6,
    diagnosticState: "probable_mastery", masteredAt: checkedAt, lastUpdated: checkedAt,
    retentionState: { status: "retained", confidence: 1, lastCheckedAt: checkedAt, evidenceIds: ["old-1", "old-2"] },
    retentionPerformance: { attempts: 2, successfulAttempts: 2, unsuccessfulAttempts: 0, confidence: 1 },
    transferState: { status: "demonstrated", confidence: 1, evidenceIds: [] } });
  for (const index of [1, 2]) await saveEvidence({ id: `${learnerId}-old-${index}`, learnerId, competencyId: first.id,
    source: "assessment", outcome: "correct", timestamp: checkedAt, purpose: "retention", interventionType: "retention_check", policyVersion: "revision-fixture" });
  for (const index of [1, 2, 3, 4]) await saveEvidence({ id: `${learnerId}-mastery-${index}`, learnerId, competencyId: first.id,
    assessmentItemId: `fixture-mastery-${index}`, source: "assessment", outcome: "correct", timestamp: checkedAt,
    purpose: "mastery", independence: "independent", strength: "strong", difficulty: "challenging", representation: index % 2 ? "numeric" : "verbal", policyVersion: "revision-fixture" });
  const history = await getEvidence(learnerId, first.id);
  const mastery = evaluateMastery(history);
  Object.assign(old.competencies[0], { masteryEstimate: mastery.masteryEstimate, confidence: mastery.confidence, evidenceCount: history.length });
  await saveLearnerState(old);
  await saveLearnerState(createInitialLearnerState(learnerId, next.id));
  const context = await getOrCreateLearnerLearningContext(learnerId);
  await saveLearnerLearningContext({ ...context, gradeId: first.learningLevelId, gradeSetBy: "guardian", activeSubjectId: first.subjectId, activeCompetencyId: next.id });
  const answers = Object.fromEntries(getContentForCompetency(first.id).filter(c => c.assessmentItemId && c.metadata?.assessmentPurpose === "retention")
    .map(c => [c.assessmentItemId!, c.metadata!.expectedResponse]));
  // Current-topic titles from the bilingual source data (curriculum, authored French lesson).
  const nextTitle = { en: next.title, fr: getContentForCompetency(next.id, "fr").find(c => !c.assessmentItemId && c.type === "lesson")?.title };
  return { learnerId, username, password, first: first.id, next: next.id, subjectId: first.subjectId, gradeId: first.learningLevelId, answers, nextTitle };
}
