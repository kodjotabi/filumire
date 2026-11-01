import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { outlineSubjectsForGrade } from "../apps/learner/components/filumire/subjectCatalogue";
import { SubjectOutlineCards } from "../apps/learner/components/filumire/SubjectOutlineCards";
import { toFilumireSubjects } from "../apps/learner/components/filumire/subjects";
import { getSubjectsForGrade, getAvailableSubjectsForGrade } from "../packages/curriculum-framework";

const core = ["english", "mathematics", "science", "computing"];
const availableSubjects = core.map((discipline) => ({ id: discipline, discipline }));
const primary = ["history", "creative-arts", "rme", "physical-education", "french", "ghanaian-language"];
const jhs = ["ghanaian-language", "french", "arabic", "creative-arts-design", "career-technology", "social-studies", "rme", "physical-health-education"];

for (const grade of [4, 5, 6, 7, 8, 9]) {
  const overview = { gradeId: `level-gh-basic-${grade}-${grade <= 6 ? "pilot" : "ccp"}`, availableSubjects };
  const subjects = outlineSubjectsForGrade(overview);
  assert.deepEqual(subjects.map((s) => s.key), grade <= 6 ? primary : jhs);
  assert.ok(subjects.every((s) => s.grade === grade));
  assert.deepEqual(outlineSubjectsForGrade({ gradeName: `Basic ${grade}` }), subjects);
  if (grade >= 7) assert.deepEqual(outlineSubjectsForGrade({ gradeName: `JHS ${grade - 6}` }), subjects);

  for (const language of ["en", "fr"] as const) {
    const markup = renderToStaticMarkup(createElement(SubjectOutlineCards, { subjects, language }));
    assert.equal((markup.match(/<details/g) ?? []).length, grade <= 6 ? 6 : 8);
    assert.equal((markup.match(/<summary/g) ?? []).length, subjects.length);
    assert.equal((markup.match(/<a /g) ?? []).length, subjects.length * 2);
    for (const subject of subjects) {
      assert.ok(markup.includes(subject.name[language]));
      assert.ok(markup.includes(`Basic ${grade}`));
      assert.ok(markup.includes(subject.outlineUrl));
      const url = new URL(subject.outlineUrl);
      assert.equal(url.origin, "https://nacca.gov.gh");
      assert.ok(url.pathname.endsWith(".pdf"));
    }
    assert.match(markup, language === "en" ? /Outline only/ : /Aperçu uniquement/);
    assert.match(markup, language === "en" ? /not yet available/ : /pas encore disponibles/);
    assert.match(markup, /target="_blank" rel="noopener noreferrer"/);
    assert.doesNotMatch(markup, /\/learn\?|subjectId=|<progress|<button|[0-9]+%/);
  }

  // Outlines cannot add adaptive subjects, mastery goals or available activities.
  assert.deepEqual(toFilumireSubjects(availableSubjects).map((s) => s.key), core);
  assert.deepEqual(toFilumireSubjects(subjects.map((s) => ({ id: s.key, discipline: s.key }))), []);
  const registered = getSubjectsForGrade(overview.gradeId);
  if (grade <= 6 || process.env.FILUMIRE_JHS_MODE === "private-presentation") {
    assert.deepEqual(registered.map((s) => s.discipline).sort(), [...core].sort());
  }
  assert.ok(registered.every((s) => core.includes(s.discipline)));
  assert.ok(getAvailableSubjectsForGrade(overview.gradeId).every((s) => core.includes(s.discipline)));
  assert.deepEqual(outlineSubjectsForGrade({ ...overview, availableSubjects: [...availableSubjects, { id: "french", discipline: "french" }] }).map((s) => s.key), subjects.filter((s) => s.key !== "french").map((s) => s.key));
}

for (const grade of [0, 1, 2, 3, 10, 12, 45]) {
  assert.deepEqual(outlineSubjectsForGrade({ gradeName: `Basic ${grade}` }), []);
}
assert.deepEqual(outlineSubjectsForGrade(), []);
assert.deepEqual(outlineSubjectsForGrade(null), []);
assert.deepEqual(outlineSubjectsForGrade({ gradeName: "Unknown" }), []);
// The registered ID takes precedence over a stale name.
assert.deepEqual(outlineSubjectsForGrade({ gradeId: "level-gh-basic-7-pilot", gradeName: "Basic 4" }).map((s) => s.key), jhs);
// The same subject uses distinct primary and JHS curriculum documents.
for (const key of ["french", "ghanaian-language", "rme"]) {
  assert.notEqual(outlineSubjectsForGrade({ gradeName: "Basic 4" }).find((s) => s.key === key)?.outlineUrl,
    outlineSubjectsForGrade({ gradeName: "Basic 7" }).find((s) => s.key === key)?.outlineUrl);
}
console.log("additional-subject-catalogue: Basic 4–9 visibility, bilingual cards, grade boundaries and progression isolation passed");
