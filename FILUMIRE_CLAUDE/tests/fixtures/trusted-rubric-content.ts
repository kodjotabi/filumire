import type { LearningContent } from "../../packages/content";
import { saveContent } from "../../services/content-store";

// A test-only oral assessment: keep teacher-review contracts independent of
// the production curriculum's generated/authored content selection.
export function seedTrustedRubricContent(): void {
  const content: LearningContent = {
    id: "content-test-trusted-oral-review",
    competencyId: "competency-gh-english-b4-1-1-1-1",
    type: "assessment",
    title: "Test-only oral performance",
    body: "Demonstrate an oral performance for an authorized teacher to review.",
    language: "en",
    assessmentItemId: "item-test-trusted-oral-review",
    assessmentStrategy: "oral_response",
    metadata: {
      assessmentPurpose: "diagnostic",
      responseMode: "oral_response",
      evaluationMethod: "trusted_rubric_evaluation",
      expectedResponse: "rubric_evaluated_performance",
      rubricCriteria: JSON.stringify(["Teacher confirms the demonstrated performance"]),
      curriculumSource: "FILUMIRE test fixture; not an official curriculum statement",
    },
    version: "test-trusted-rubric-1",
    createdAt: "2026-10-12T00:00:00.000Z",
    updatedAt: "2026-10-12T00:00:00.000Z",
  };
  saveContent(content);
}
