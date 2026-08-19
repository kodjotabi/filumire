import type { LearningContent } from "../../packages/content";
import { saveContent } from "./index";

const initialContent: LearningContent[] = [
  {
    id: "content-number-sequence-lesson-001",
    competencyId: "competency-test-001",
    type: "lesson",
    title: "Understanding Number Sequences",
    body: "A number sequence follows a pattern. Look at how the numbers change from one step to the next. If the same pattern continues, you can predict the next number.",
    version: "content-0.1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "content-number-sequence-practice-001",
    competencyId: "competency-test-001",
    type: "practice",
    title: "Number Sequence Practice",
    body: "Look carefully at the sequence and identify the pattern before choosing the next number.",
    version: "content-0.1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "content-number-sequence-remediation-001",
    competencyId: "competency-test-001",
    type: "remediation",
    title: "Finding the Pattern Step by Step",
    body: "Start by comparing each number with the number immediately before it. Ask whether the same amount is being added or subtracted each time.",
    version: "content-0.1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "content-number-sequence-assessment-001",
    competencyId: "competency-test-001",
    type: "assessment",
    title: "Number Sequence Check",
    body: "Use what you have learned about number patterns to determine the next number.",
    assessmentItemId: "item-test-001",
    version: "content-0.1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function seedContent(): void {
  for (const content of initialContent) {
    saveContent(content);
  }
}