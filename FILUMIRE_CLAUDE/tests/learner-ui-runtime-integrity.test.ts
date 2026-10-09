import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const route = fs.readFileSync(
  path.join(root, "apps/learner/app/api/learning/route.ts"),
  "utf8",
);

const page = fs.readFileSync(
  path.join(root, "apps/learner/app/learn/page.tsx"),
  "utf8",
);

/* Tranche 4E: secret stripping + option shuffling moved to a shared module. */
const learnerContent = fs.readFileSync(
  path.join(root, "services/assessment/learner-content.ts"),
  "utf8",
);

/*
 * The sign-in page is one flowing page; the global bottom nav is sticky for the
 * app screens and floated over the Sign In form on shorter viewports (8 Oct).
 */
const loginPage = fs.readFileSync(
  path.join(root, "apps/learner/app/login/page.tsx"),
  "utf8",
);

assert.match(
  loginPage,
  /.loginPage .filumireBottomNav { position: static;/,
  "Sign-in page bottom navigation must sit in the page flow, not float over the form.",
);

const client = fs.readFileSync(
  path.join(root, "apps/learner/services/learning-client.ts"),
  "utf8",
);

assert.match(
  route,
  /function sanitizeLearnerContent/,
  "Learner API must sanitize content before returning it.",
);

assert.match(
  route,
  /return prepareLearnerContent\(content, learnerId\)/,
  "Learner API sanitizing must go through prepareLearnerContent.",
);

for (const key of ["expectedResponse", "diagnosticRules", "rubricCriteria", "misconceptionPatterns"]) {
  assert.match(
    learnerContent,
    new RegExp(`"${key}",`),
    `Trusted ${key} must be removed from learner-facing metadata.`,
  );
}

assert.match(
  learnerContent,
  /orderOptionsForLearner\(/,
  "Multiple-choice options must be shuffled before they reach the learner.",
);

assert.equal(
  (
    route.match(
      /sanitizeLearnerContent\(adaptiveDecision\.content, learnerId\)/g,
    ) ?? []
  ).length,
  2,
  "Both learner-facing adaptive content paths must be sanitized.",
);

assert.match(
  page,
  /requiresTrustedEvaluation/,
  "Learner UI must distinguish trusted-evaluation activities.",
);

assert.match(
  page,
  /trusted_rubric_evaluation/,
  "Learner UI must recognise trusted rubric evaluation.",
);

assert.match(
  page,
  /rubric_evaluated_performance/,
  "Learner UI must recognise rubric-evaluated performance.",
);

assert.match(
  page,
  /options\.length\s*>\s*0/,
  "Option assessments must remain supported.",
);

assert.match(
  page,
  /!requiresTrustedEvaluation/,
  "Trusted-review activities must not fall through to ordinary progression.",
);

assert.match(
  client,
  /evaluationMethod\?:\s*string/,
  "Learner client must represent evaluation method metadata.",
);

console.log("PASS: learner UI runtime integrity");
