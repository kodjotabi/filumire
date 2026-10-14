import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { LearningOverview } from "../apps/learner/services/learning-client";

// Existing TSX components rely on Next's JSX transform. Provide its equivalent
// React binding in this local SSR test, without changing application config.
Object.assign(globalThis, { React });
const { ProgressPage } = await import("../apps/learner/components/filumire/ProgressPage");
const { SubjectPage } = await import("../apps/learner/components/filumire/SubjectPage");
const { ChallengesPage } = await import("../apps/learner/components/filumire/ChallengesPage");
const { AskFiluPage } = await import("../apps/learner/components/filumire/AskFiluPage");
const { default: ProfilePage } = await import("../apps/learner/components/filumire/ProfilePage");
const { toFilumireSubjects } = await import("../apps/learner/components/filumire/subjects");
const overview: LearningOverview = {
  gradeId: "basic-4", gradeName: "Basic 4", activeSubjectId: "math", areasSubjectId: "math",
  availableSubjects: [{ id: "math", name: "Mathematics", code: "M", discipline: "mathematics" }],
  subjects: { math: { total: 10, completed: 2, tracked: 3, started: true } },
  areas: [
    { id: "mastered", title: "Mastered topic", description: "Preserved", status: "completed" },
    { id: "current", title: "Current topic", description: "Current", status: "inprogress" },
    { id: "new", title: "New topic", description: "New", status: "new" },
  ],
};
const original = structuredClone(overview);
const renderIcon = () => null;
for (const language of ["en", "fr"] as const) {
  const mastery = renderToStaticMarkup(React.createElement(ProgressPage, {
    language, overview, renderIcon,
    current: { subjectName: "Mathematics", title: "Current topic", mastery: .95, confidence: .3, evidenceCount: 3, readiness: false, learnHref: "/learn" },
  }));
  assert(mastery.includes("20%"));
  assert(mastery.includes("95%") && mastery.includes("30%"));
  assert(mastery.includes(language === "en" ? "Estimated current topic mastery" : "Estimation de la maîtrise"));
  assert(mastery.includes(language === "en" ? "Confidence in this estimate" : "Confiance dans cette estimation"));
  assert(mastery.includes(language === "en" ? "Still building" : "En construction"), "high estimated mastery must not imply readiness");
  const subject = renderToStaticMarkup(React.createElement(SubjectPage, { language, overview, subject: toFilumireSubjects(overview.availableSubjects)[0], currentTitle: "Mastered topic", learnHref: "/learn", icon: null, footer: null }));
  assert(subject.includes("20%"));
  assert(subject.includes(language === "en" ? "Mastered" : "Maîtrisé"));
  assert(subject.includes("Current topic"), "remediation must not rename another topic or erase its status");
  const challenge = renderToStaticMarkup(React.createElement(ChallengesPage, { language, overview, renderIcon, current: { subjectId: "math", subjectName: "Mathematics", title: "Current topic", done: 1, total: 1, startHref: "/learn" } }));
  assert(challenge.includes('aria-valuenow="20"'), "challenge must use whole subject totals, not tracked 1/1 state");
  const filu = renderToStaticMarkup(React.createElement(AskFiluPage, { language, subjectName: "Mathematics", topic: "Current topic", done: 1, total: 1, subjectProgress: overview.subjects.math, elements: [] }));
  assert(filu.includes('aria-valuenow="20"'));
  const unknown = renderToStaticMarkup(React.createElement(AskFiluPage, { language, subjectName: "Mathematics", topic: "Current topic", done: 1, total: 1, elements: [] }));
  assert(!unknown.includes('role="progressbar"'), "unknown totals must not display a completion bar");
  const missing = renderToStaticMarkup(React.createElement(ProgressPage, { language, overview: null, renderIcon, overviewState: "unavailable" }));
  assert(!missing.includes("0%"), "unavailable is not zero completion");
  const profile = renderToStaticMarkup(React.createElement(ProfilePage, { language, overview, name: "Learner", onRename: () => {}, onLanguage: () => {} }));
  assert(profile.includes("20%"));
  assert(profile.includes(language === "en" ? "Curriculum goals mastered" : "Objectifs du programme maîtrisés"));
  const unavailableProfile = renderToStaticMarkup(React.createElement(ProfilePage, { language, overview: null, name: "Learner", onRename: () => {}, onLanguage: () => {} }));
  assert(!unavailableProfile.includes("<b>0%</b>"));
  console.log(`PASS: ${language} authoritative progress, mastery/confidence labels, remediation and unavailable states`);
}
assert.deepEqual(overview, original, "presentation must preserve server data");
