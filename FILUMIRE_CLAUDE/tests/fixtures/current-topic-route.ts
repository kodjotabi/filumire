import assert from "node:assert/strict";
import { GET } from "../../apps/learner/app/api/learning/route";
import { getCompetency } from "../../packages/curriculum";
import { persistenceStore } from "../../services/persistence-provider";
import { createPrincipalLearnerAccess } from "../../services/principal";
import { issueSessionForPrincipal } from "../../services/identity";
import { getOrCreateLearnerLearningContext, saveLearnerLearningContext } from "../../services/learner-context";

// Resume the persisted current topic through the real cookie-authenticated path.
// competencyId is intentionally reserved for explicit selection/revisit.
export async function currentTopicRoute(learnerId: string, competencyId: string) {
  assert.equal(process.env.FILUMIRE_PERSISTENCE, "memory");
  process.env.FILUMIRE_AUTH_JWT_SECRET ??= "fictional-route-regression-signing-key-at-least-32";
  const competency = getCompetency(competencyId)!;
  const principalId = `principal-route-${crypto.randomUUID()}`;
  await persistenceStore.createPrincipal(principalId);
  await persistenceStore.ensureLearnerExists(learnerId);
  await createPrincipalLearnerAccess(crypto.randomUUID(), principalId, learnerId, "self");
  const context = await getOrCreateLearnerLearningContext(learnerId);
  await saveLearnerLearningContext({ ...context, gradeId: competency.learningLevelId, activeSubjectId: competency.subjectId, activeCompetencyId: competencyId });
  const session = await issueSessionForPrincipal(principalId, learnerId);
  return {
    get: (selectedTopic?: string) => GET(new Request(`http://localhost/api/learning?subjectId=${competency.subjectId}${selectedTopic ? `&competencyId=${selectedTopic}` : ""}`, {
      headers: { cookie: `filumire_auth_session=${session.token}`, origin: "http://localhost" },
    })),
  };
}
