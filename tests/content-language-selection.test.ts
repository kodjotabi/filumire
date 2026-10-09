import {
  saveContent,
} from "../services/content-store";

import {
  selectLearningContent,
} from "../services/content-selection";

import type {
  LearnerState,
} from "../packages/domain";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

const now =
  new Date().toISOString();

saveContent({
  id: "bilingual-en-lesson",
  competencyId: "bilingual-test-001",
  type: "lesson",
  title: "Number Patterns",
  body: "Find the rule in the sequence.",
  language: "en",
  version: "1",
  createdAt: now,
  updatedAt: now,
});

saveContent({
  id: "bilingual-fr-lesson",
  competencyId: "bilingual-test-001",
  type: "lesson",
  title: "Suites numériques",
  body: "Trouve la règle de la suite.",
  language: "fr",
  version: "1",
  createdAt: now,
  updatedAt: now,
});

function makeState(
  language: "en" | "fr",
): LearnerState {
  return {
    learnerId: `learner-${language}`,
    language,
    competencies: [
      {
        learnerId: `learner-${language}`,
        competencyId: "bilingual-test-001",
        masteryEstimate: 0,
        evidenceCount: 0,
        confidence: 0,
        diagnosticState: "unknown",
        diagnosticConfidence: 0,
        errorPatterns: [],
        interventionHistory: [],
        prerequisiteState: {},
        retentionState: {
          status: "not_tested",
          confidence: 0,
          evidenceIds: [],
        },
        transferState: {
          status: "not_tested",
          confidence: 0,
          evidenceIds: [],
        },
        readinessState: {
          readyForAdvancement: false,
          confidence: 0,
          evaluatedAt: now,
        },
        lastUpdated: now,
        stateVersion: "test",
      },
    ],
    stateVersion: "test",
    updatedAt: now,
  };
}

const englishContent =
  selectLearningContent(
    makeState("en"),
    "teach",
  );

assert(
  englishContent?.language === "en",
  "English learner must receive English content",
);

assert(
  englishContent?.id ===
    "bilingual-en-lesson",
  "English learner must receive the English lesson",
);

const frenchContent =
  selectLearningContent(
    makeState("fr"),
    "teach",
  );

assert(
  frenchContent?.language === "fr",
  "French learner must receive French content",
);

assert(
  frenchContent?.id ===
    "bilingual-fr-lesson",
  "French learner must receive the French lesson",
);

console.log({
  bilingualContentSelection: "PASS",
  englishContent:
    englishContent?.id,
  frenchContent:
    frenchContent?.id,
});