import { registerIsolatedBasic7TestCurriculum, getAllCompetencies } from "../../packages/curriculum";
import { getFrameworkGrade, getCurriculumVersion, getSubjectCapability } from "../../packages/curriculum-framework";
import { MATERIALS_COMPETENCIES, MATERIALS_SOURCES, MATERIALS_BATCH_CONTENT } from "../../services/content-store/ghana-b7-science-materials-batch";
import { seedContent } from "../../services/content-store/seed";
import { saveContent } from "../../services/content-store";
import { assertPilotEnvironment } from "./basic7-materials-pilot";

export function installMaterialsBatch() {
  assertPilotEnvironment();
  seedContent();
  const source = MATERIALS_SOURCES[0];
  for (const competency of MATERIALS_COMPETENCIES) {
    if (getAllCompetencies().some(c => c.id === competency.id)) throw new Error("Materials batch already installed");
    registerIsolatedBasic7TestCurriculum(competency,
      { id: source.subjectId, learningLevelId: source.gradeId, name: "Science", code: "GH-B7-SCI" },
      { id: source.gradeId, educationSystemId: competency.educationSystemId, name: "Basic 7", order: 7 });
  }
  getCurriculumVersion(source.curriculumVersionId)!.isActive = true;
  // Preserve the legacy adapter independently of the real, inactive CCP runtime identity.
  getCurriculumVersion(source.curriculumVersionId)!.runtimeFrameworkId = MATERIALS_COMPETENCIES[0].curriculumFrameworkId;
  const grade = getFrameworkGrade(source.gradeId)!;
  grade.learnerVisibility = "visible";
  delete grade.supportStatus;
  getSubjectCapability(source.subjectId)!.status = "partial";
  for (const item of MATERIALS_BATCH_CONTENT) saveContent(item);
}
