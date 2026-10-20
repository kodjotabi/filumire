import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { seedContent } from "../services/content-store/seed";
import { getAllContent, getContentForCompetency, saveContent } from "../services/content-store";
import { PILOT_REVIEWS } from "../services/outline-visuals/pilot";
import { selectActivityVisuals, selectVerifiedReflectionVisuals } from "../services/outline-visuals";
import { buildVisualCoverage, aggregateVisualCoverage } from "../services/outline-visuals/coverage";
import { safeTeachingVisualReferences, validOutlineModel, validOutlineVisual } from "../packages/contracts/outline-visual";
import { OutlineVisual, OutlineVisuals } from "../apps/learner/components/filumire/OutlineVisual";
import { GET, POST } from "../apps/learner/app/api/learning/route";
import { createSession } from "../services/session";
import { saveLearnerLearningContext } from "../services/learner-context";
import { getDefaultLearnerLearningContext } from "../packages/curriculum-framework";
import { getCompetency } from "../packages/curriculum";
import { getEvidenceForLearner } from "../services/evidence-store";
import { getLearnerState } from "../services/learner-state-store";
import { getLessonClosure } from "../services/lesson-closure";

assert.equal(process.env.FILUMIRE_PERSISTENCE, "memory");
seedContent();
const inventory = buildVisualCoverage();
assert.equal(inventory.length, 862); assert.equal(new Set(inventory.map(r => r.competencyId)).size, 862);
assert.equal(new Set(inventory.map(r => r.subjectId)).size, 12);
assert.equal(inventory.filter(r => r.status === "Complete").length, 6);
assert.equal(inventory.filter(r => r.status === "Unreviewed").length, 856);
assert.equal(aggregateVisualCoverage(["Text-first", "Text-first"]), "Text-first");
assert.equal(aggregateVisualCoverage(["Complete", "Required"]), "Required");
assert.equal(aggregateVisualCoverage(["Complete", "Unreviewed"]), "Required");
assert.deepEqual(buildVisualCoverage("unregistered-future-curriculum"), [], "never invent future curriculum coverage");
for (const row of inventory.filter(r => r.status === "Complete")) for (const cells of Object.values(row.languages)) {
  assert.equal(cells.Understand.status, "Complete"); assert.equal(cells.Reflect.status, "Complete");
  for (const stage of ["Practise", "Apply", "Check"] as const) {assert.equal(cells[stage].status, "Text-first"); assert(cells[stage].reason);}
}
let bindings = 0;
for (const review of PILOT_REVIEWS) for (const content of getContentForCompetency(review.competencyId)) {
  const visuals = selectActivityVisuals(content, content.language, "teach");
  if (content.assessmentItemId) { assert.deepEqual(visuals, []); continue; }
  bindings++; assert(visuals.length);
  for (const v of visuals) {
    assert(validOutlineVisual(v)); assert.equal(v.contentId, content.id); assert.equal(v.language, content.language);
    assert.equal(v.competencyId, content.competencyId);
    assert.deepEqual(safeTeachingVisualReferences([v], true), []);
    assert.equal(safeTeachingVisualReferences([v], false)[0].id, v.id);
    const html = renderToStaticMarkup(React.createElement(OutlineVisual, { visual: v }));
    assert(html.includes('role="img"')); assert(html.includes('<title')); assert(html.includes('<desc')); assert(html.includes('<figcaption'));
    assert(!html.includes('foreignObject')); assert(!html.includes('onload='));
    assert(!JSON.stringify(v).includes('expectedResponse')); assert(!JSON.stringify(v).includes(review.digest));
    assert.equal(renderToStaticMarkup(React.createElement(OutlineVisuals, { visuals: [v], contentId: "other-content", competencyId: content.competencyId, language: v.language, stage: "Understand" })), "");
    assert.equal(renderToStaticMarkup(React.createElement(OutlineVisuals, { visuals: [v], contentId: content.id, competencyId: "other-topic", language: v.language, stage: "Understand" })), "");
    assert.equal(validOutlineVisual({ ...v, hiddenAnswer: "private" }), false);
    assert.equal(validOutlineVisual({ ...v, model: { ...v.model, answer: "private" } }), false);
    assert.equal(validOutlineVisual({ ...v, title: '<script>alert(1)</script>' }), false);
    assert.equal(renderToStaticMarkup(React.createElement(OutlineVisual, { visual: { ...v, hiddenAnswer: "private" } as typeof v })), "");
  }
  assert.deepEqual(selectActivityVisuals(content, content.language === "en" ? "fr" : "en", "teach"), []);
  for (const action of ["practice", "scaffold", "diagnose", "reassess", "retention_check", "transfer_check", "teacher_review", "advance", "complete", "unknown"]) assert.deepEqual(selectActivityVisuals(content, content.language, action), []);
  assert.deepEqual(selectActivityVisuals({ ...content, assessmentItemId: "scored-even-while-teaching" }, content.language, "teach"), []);
  assert.deepEqual(selectActivityVisuals({ ...content, version: "stale" }, content.language, "teach"), []);
  assert(selectVerifiedReflectionVisuals(content, content.language).every(v => v.stage === "Reflect"));
}
assert.equal(bindings, 48);
for (const content of getAllContent().filter(i => i.assessmentItemId)) {
  assert.deepEqual(selectActivityVisuals(content, content.language, "teach"), []);
  assert.deepEqual(selectActivityVisuals({ ...content, assessmentItemId: undefined }, content.language, "teach"), [], "a forged unscored copy cannot bypass the canonical source");
  assert.deepEqual(selectVerifiedReflectionVisuals(content, content.language), []);
}
assert(!validOutlineModel({ kind: "part-whole", relation: "equivalent", fractions: [{ numerator: 1, denominator: 2 }, { numerator: 1, denominator: 4 }] }));
assert(validOutlineModel({ kind: "part-whole", relation: "compare", fractions: [{ numerator: 1, denominator: 2 }, { numerator: 1, denominator: 4 }] }), "part-whole geometry is reusable beyond equivalence");
assert(!validOutlineModel({ kind: "part-whole", relation: "equivalent", fractions: [{ numerator: 1, denominator: 0 }] }));
assert(validOutlineModel({ kind: "number-line", start: -5, end: 5, format: "number", divisions: 10, marked: 3 }), "number lines are not confined to fractions or a school grade");
assert(!validOutlineModel({ kind: "number-line", divisions: Infinity, marked: 2 }));
assert(!validOutlineModel({ kind: "labelled-diagram", shapes: [{ kind: "rect", x: 0, y: 0, width: 900, height: 10 }], labels: [{ x: 10, y: 10, text: "label" }] }));

// Real learning API: all six pilots and both languages, with unchanged engine decisions.
for (const review of PILOT_REVIEWS) for (const language of ["en", "fr"] as const) {
  const learnerId = `outline-${randomUUID()}`, sessionId = randomUUID(), c = getCompetency(review.competencyId)!;
  await createSession(sessionId, learnerId);
  await saveLearnerLearningContext({ learnerId, ...getDefaultLearnerLearningContext(), gradeId: c.learningLevelId, activeSubjectId: c.subjectId, activeCompetencyId: c.id, updatedAt: new Date().toISOString() });
  const headers = { "content-type": "application/json", origin: "http://localhost", "x-filumire-learner-id": learnerId, "x-filumire-language": language };
  const read = async (r: Response) => { assert.equal(r.status, 200); return r.json(); };
  const initial = await GET(new Request(`http://localhost/api/learning?subjectId=${c.subjectId}&competencyId=${c.id}&sessionId=${sessionId}`, { headers })).then(read);
  assert.equal(initial.decision.reasonCode, "NEW_TOPIC_INSTRUCTION"); assert(initial.visuals.length);
  assert(initial.visuals.every((v: any) => v.contentId === initial.content.id && v.language === language));
  const before = JSON.stringify({ state: await getLearnerState(learnerId, c.id), evidence: await getEvidenceForLearner(learnerId) });
  const next = (step: any) => POST(new Request("http://localhost/api/learning", { method: "POST", headers,
    body: JSON.stringify({ sessionId, interactionType: "acknowledge", interventionId: step.decision.interventionId, competencyId: c.id }) })).then(read);
  const example = await next(initial);
  assert.equal(example.decision.reasonCode, "NEW_TOPIC_WORKED_EXAMPLE"); assert(example.visuals.length);
  assert(example.visuals.every((v: any) => v.contentId === example.content.id));
  const closure = await getLessonClosure(learnerId, initial.lessonReceipt, language);
  assert(closure.summary.visuals?.length); assert(closure.summary.visuals.every(v => v.stage === "Reflect" && v.contentId === initial.content.id));
  const practice = await next(example);
  assert(practice.content.assessmentItemId); assert.deepEqual(practice.visuals, []);
  assert.deepEqual((await getLessonClosure(learnerId, initial.lessonReceipt, language)).summary.visuals, [], "an old receipt cannot retrieve diagrams during the current scored task");
  assert.equal(JSON.stringify({ state: await getLearnerState(learnerId, c.id), evidence: await getEvidenceForLearner(learnerId) }), before, "visual display and teaching acknowledgements create no assessment evidence or mastery");
}
// Source changes are not silently blessed by a metadata version left unchanged.
const source = getContentForCompetency(PILOT_REVIEWS[0].competencyId, "fr").find(i => i.type === "lesson")!;
saveContent({ ...source, body: source.body + " Source changed." });
assert.deepEqual(selectActivityVisuals(source, "fr", "teach"), []);
assert.equal(buildVisualCoverage().find(r => r.competencyId === source.competencyId)?.status, "Required");
saveContent(source);
assert.equal(buildVisualCoverage().find(r => r.competencyId === source.competencyId)?.status, "Complete");
saveContent({ ...source, language: "en" });
assert.equal(buildVisualCoverage().find(r => r.competencyId === source.competencyId)?.status, "Required", "a missing French variant cannot count as Complete");
saveContent(source);
// Computing equipment: recognisable line drawings from the renderer library, never DTO geometry.
const allDevices = ["monitor", "system-unit", "keyboard", "mouse", "printer"] as const;
const equipment = { kind: "equipment", devices: allDevices.map(device => ({ device, label: device + " label" })) };
assert(validOutlineModel(equipment));
assert(!validOutlineModel({ kind: "equipment", devices: [{ device: "scanner", label: "x" }] }), "only library devices");
assert(!validOutlineModel({ kind: "equipment", devices: [{ device: "mouse", label: "a" }, { device: "mouse", label: "b" }] }), "each device once");
assert(!validOutlineModel({ kind: "equipment", devices: [{ device: "mouse", label: "a", path: "M0 0" }] }), "no geometry or raw SVG from data");
assert(!validOutlineModel({ kind: "equipment", devices: [] }));
assert(validOutlineModel({ kind: "process", steps: ["a", "b"], icons: ["open-page", "printer-output"] }));
assert(!validOutlineModel({ kind: "process", steps: ["a", "b"], icons: ["open-page"] }), "one icon per step");
assert(!validOutlineModel({ kind: "process", steps: ["a", "b"], icons: ["open-page", "<svg>"] }));
const computerReview = PILOT_REVIEWS.find(r => r.family === "computer")!;
const printingReview = PILOT_REVIEWS.find(r => r.family === "printing")!;
const { pilotVisuals } = await import("../services/outline-visuals/pilot");
for (const language of ["en", "fr"] as const) {
  const [computer] = pilotVisuals(computerReview, "lesson", language);
  assert.equal(computer.model.kind, "equipment");
  const visual = { id: "outline/fictional/0", revision: 1, contentId: "fictional", contentVersion: "1", competencyId: computerReview.competencyId, language, stage: "Understand" as const, ...computer };
  const html = renderToStaticMarkup(React.createElement(OutlineVisual, { visual }));
  for (const device of allDevices) assert(html.includes(`data-device="${device}"`), `${language}: ${device} is drawn`);
  assert.equal((html.match(/class="[^"]*markerText/g) ?? []).length, 5, "one numbered marker per device");
  assert.equal((html.match(/<li>/g) ?? []).length, 5, "the numbered list under the drawing is kept");
  assert.equal((html.match(/class="[^"]*cable/g) ?? []).length, 4, "each peripheral is shown connected to the system unit");
  const [printing] = pilotVisuals(printingReview, "lesson", language);
  const steps = renderToStaticMarkup(React.createElement(OutlineVisual, { visual: { ...visual, ...printing } }));
  assert.equal((steps.match(/data-icon=/g) ?? []).length, 5, `${language}: every printing step has a drawing`);
  assert.equal((steps.match(/<li>/g) ?? []).length, 5);
}
console.log("PASS: 862-topic coverage; 48 bilingual content bindings; six-topic API teaching/closure/practice journey; all scored content denied; safe contracts, geometry, equipment line drawings, context isolation and unchanged progress");
