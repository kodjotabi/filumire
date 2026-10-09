import {
  createInitialLearnerState,
} from "../services/learner-state";

import {
  seedContent,
} from "../services/content-store/seed";

import {
  selectLearningContent,
} from "../services/content-selection";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

seedContent();

const state =
  createInitialLearnerState(
    "learner-content-selection-test",
    "competency-test-005",
  );

function test(
  name: string,
  action:
    | "diagnose"
    | "teach"
    | "practice"
    | "scaffold"
    | "remediate"
    | "reassess"
    | "advance",
  expectedType: string,
  usedAssessmentItemIds: string[] = [],
): void {
  const content =
    selectLearningContent(
      state,
      action,
      usedAssessmentItemIds,
    );

  console.log({
    test: name,
    action,
    contentType:
      content?.type,
    contentTitle:
      content?.title,
    assessmentItemId:
      content?.assessmentItemId,
  });

  assert(
    Boolean(content),
    `${name}: content must be selected`,
  );

  assert(
    content?.type === expectedType,
    `${name}: expected ${expectedType}, got ${content?.type}`,
  );

  assert(
    content?.competencyId ===
      "competency-test-005",
    `${name}: content must belong to competency-test-005`,
  );
}

test(
  "diagnostic selection",
  "diagnose",
  "assessment",
);

test(
  "teaching selection",
  "teach",
  "lesson",
);

test(
  "practice selection",
  "practice",
  "practice",
);

test(
  "scaffold selection",
  "scaffold",
  "scaffold",
);

test(
  "remediation selection",
  "remediate",
  "remediation",
);

test(
  "reassessment selection",
  "reassess",
  "assessment",
);

test(
  "advance selection",
  "advance",
  "lesson",
);

const diagnostic =
  selectLearningContent(
    state,
    "diagnose",
    [
      "item-applying-number-pattern-rules-diagnostic-001",
    ],
  );

console.log({
  test:
    "diagnostic avoids used assessment",
  selected:
    diagnostic?.assessmentItemId,
});

assert(
  diagnostic?.assessmentItemId !==
    "item-applying-number-pattern-rules-diagnostic-001",
  "diagnostic selection must avoid an already-used assessment item",
);

const reassessment =
  selectLearningContent(
    state,
    "reassess",
    [
      "item-applying-number-pattern-rules-diagnostic-001",
      "item-applying-number-pattern-rules-reassessment-001",
    ],
  );

console.log({
  test:
    "reassessment falls back when assessments exhausted",
  selectedType:
    reassessment?.type,
  selectedTitle:
    reassessment?.title,
});

assert(
  Boolean(reassessment),
  "reassessment must return available content",
);

console.log({
  contentSelectionTest:
    "PASS",
});