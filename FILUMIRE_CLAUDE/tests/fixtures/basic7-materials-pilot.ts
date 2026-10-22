import { getAllCompetencies, registerIsolatedBasic7TestCurriculum } from "../../packages/curriculum";
import { getAvailableSubjectsForGrade, getCurriculumVersion, getFrameworkGrade, getSubjectCapability } from "../../packages/curriculum-framework";
import { CURRICULUM_VERSION_GHANA_CCP_2020_ID as versionId } from "../../packages/curriculum-framework/ghana-b7-ccp";
import { competency, pilotContent, observationContent, source } from "../../services/content-store/ghana-b7-materials-pilot";
import { saveContent } from "../../services/content-store";
import { seedContent } from "../../services/content-store/seed";
import { saveLearnerLearningContext } from "../../services/learner-context";

export function assertPilotEnvironment() {
  if (process.env.NODE_ENV !== "test" || process.env.FILUMIRE_PERSISTENCE !== "memory" || process.env.FILUMIRE_BASIC7_PILOT !== "test-only" || process.env.VERCEL) {
    throw new Error("Basic 7 pilot requires an explicitly enabled, non-deployed test process with in-memory persistence");
  }
}

// This is test infrastructure, never imported by app code. It changes only this
// process's in-memory registry. There is no production route, flag or DB write.
export function installPilot() {
  assertPilotEnvironment();
  if (getAllCompetencies().some((item) => item.id === source.id)) return;
  if (getAvailableSubjectsForGrade(versionId, source.gradeId).length) throw new Error("Basic 7 unexpectedly public before pilot installation");
  seedContent();
  registerIsolatedBasic7TestCurriculum(competency,
    { id: source.subjectId, learningLevelId: source.gradeId, name: "Science", code: "GH-B7-SCI" },
    { id: source.gradeId, educationSystemId: competency.educationSystemId, name: "Basic 7", order: 7 });
  getCurriculumVersion(versionId)!.isActive = true;
  // The historical adapter deliberately uses the primary runtime, only in this test process.
  getCurriculumVersion(versionId)!.runtimeFrameworkId = competency.curriculumFrameworkId;
  const grade = getFrameworkGrade(source.gradeId)!;
  grade.learnerVisibility = "visible";
  delete grade.supportStatus;
  getSubjectCapability(source.subjectId)!.status = "partial";
  for (const content of [...pilotContent, ...observationContent]) saveContent(content);
}

export async function pilotContext(learnerId: string) {
  assertPilotEnvironment();
  const context = { learnerId, curriculumVersionId: versionId, gradeId: source.gradeId,
    activeSubjectId: source.subjectId, activeCompetencyId: source.id, updatedAt: new Date().toISOString() };
  await saveLearnerLearningContext(context);
  return context;
}
