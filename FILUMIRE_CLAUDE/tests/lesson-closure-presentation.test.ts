import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { closureNextStep, closureReview } from "../apps/learner/services/lesson-closure-presentation";
import type { LessonClosure } from "../packages/contracts/lesson-closure";
import type { LearningResponse } from "../apps/learner/services/learning-client";
Object.assign(globalThis, { React });
const { LessonClosureCard } = await import("../apps/learner/components/filumire/LessonClosureCard");
function decision(action: string, reasonCode = "SERVER_SELECTED"): LearningResponse["decision"] {
  return { id: "decision", sessionId: "session", action, reasonCode, competencyId: "c" };
}
const closure: LessonClosure = { interventionId: "i", competencyId: "c", subjectId: "s", completedAt: new Date().toISOString(), language: "en",
  summary: { available: true, title: "Equal parts", concepts: ["Compare equal parts."], examples: [], narration: "Compare equal parts." },
  evidence: { attempts: 0, correct: 0, partial: 0, incorrect: 0, consecutiveErrors: 0, hasIdentifiedDifficulties: false, acquisition: "emerging", retention: "untested" } };
assert.equal(closureReview(closure), "unknown", "an initial learner-state object alone is not evidence of partial understanding");
assert.equal(closureReview({ ...closure, evidence: { ...closure.evidence, attempts: 1, partial: 1 } }), "partial");
assert.equal(closureReview({ ...closure, evidence: { ...closure.evidence, attempts: 3, consecutiveErrors: 3 } }), "errors");
assert.equal(closureReview({ ...closure, evidence: { ...closure.evidence, attempts: 3, correct: 3, acquisition: "established" } }), "strong");
for (const [action, expected] of [["reassess", "check"], ["scaffold", "targeted"], ["practice", "targeted"], ["remediate", "reinforce"],
  ["teach", "reinforce"], ["retention_check", "retention"], ["transfer_check", "transfer"], ["advance", "progress"], ["teacher_review", "support"]]) {
  assert.equal(closureNextStep(decision(action)), expected);
}
assert.equal(closureNextStep(decision("advance", "PREREQUISITE_REPAIR")), "prerequisite");
assert.equal(closureNextStep(decision("complete", "NO_ELIGIBLE_COMPETENCY_NEEDS_SUPPORT")), "support");
assert.equal(closureNextStep(decision("complete", "LEARNING_PATH_COMPLETE")), "finished");
for (const language of ["en", "fr"] as const) {
  const model = { ...closure, language, summary: { ...closure.summary, title: language === "fr" ? "Parts égales" : "Equal parts", concepts: [language === "fr" ? "Compare des parts égales." : "Compare equal parts."] } };
  const props = { closure: model, decision: decision("reassess"), onPhase: () => {}, onContinue: () => {} };
  const summary = renderToStaticMarkup(React.createElement(LessonClosureCard, { ...props, phase: "summary" }));
  assert.match(summary, new RegExp(`lang="${language}"`));
  assert.match(summary, language === "fr" ? /Cela ne montre pas encore/ : /does not yet show/);
  assert.match(summary, language === "fr" ? /Compare des parts égales/ : /Compare equal parts/);
  assert(!summary.includes("<audio")); assert(!summary.includes("speechSynthesis"));
  const review = renderToStaticMarkup(React.createElement(LessonClosureCard, { ...props, phase: "review" }));
  assert.match(review, language === "fr" ? /Vérifions l’idée/ : /Let’s check the idea/);
  const missing = renderToStaticMarkup(React.createElement(LessonClosureCard, { ...props, closure: { ...model, summary: { ...model.summary, available: false } }, phase: "summary" }));
  assert.match(missing, language === "fr" ? /n’est pas disponible/ : /not available/);
  assert(!missing.includes(model.summary.title));
  const strong = { ...model, evidence: { ...model.evidence, attempts: 3, correct: 3, acquisition: "established" as const, retentionDueAt: new Date(Date.now() + 86400000).toISOString() } };
  const optional = renderToStaticMarkup(React.createElement(LessonClosureCard, { ...props, closure: strong, phase: "review", decision: decision("advance") }));
  assert.match(optional, /<details>/); assert.match(optional, language === "fr" ? /n’est pas évaluée/ : /not scored/);
}
console.log("PASS: completion is distinct from mastery, evidence-aware explanations, authoritative adaptive actions, bilingual rendering, fallback and future audio boundary");
