import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
Object.assign(globalThis, { React });

/*
 * First-time setup class field, English and French: no editable
 * dropdown while loading or when the guardian chose the class;
 * subjects follow the class being chosen. Server-rendered markup
 * only (not real-browser validation).
 */

const {
  SETUP_CLASS_TEXT,
  SetupClassField,
  setupClassMode,
  setupGradeValue,
  setupSubjectsFor,
} = await import("../apps/learner/components/filumire/SetupClassField");

const B4 = "level-gh-basic-4-pilot";
const B5 = "level-gh-basic-5-pilot";
const B6 = "level-gh-basic-6-pilot";
const subjectsOf = (grade: string) => ["math", "eng", "sci"].map((d) => ({ id: `${grade}:${d}`, discipline: d }));
const overview = (gradeSetByGuardian: boolean) => ({
  gradeId: B5,
  gradeSetByGuardian,
  availableSubjects: subjectsOf(B5),
  gradeSubjects: { [B4]: subjectsOf(B4), [B5]: subjectsOf(B5), [B6]: subjectsOf(B6) },
});

const render = (mode: Parameters<typeof SetupClassField>[0]["mode"], language: "en" | "fr", value = "", gradeName = "Basic 5") =>
  renderToStaticMarkup(React.createElement(SetupClassField, { mode, language, value, gradeName, onChange: () => undefined }));

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// 1. Mode: nothing editable until account and class are known.
assert.equal(setupClassMode({ accountPending: true, signedIn: false, overviewPending: true, overview: null }), "loading");
assert.equal(setupClassMode({ accountPending: false, signedIn: true, overviewPending: true, overview: null }), "loading");
assert.equal(setupClassMode({ accountPending: false, signedIn: true, overviewPending: false, overview: overview(true) }), "locked");
assert.equal(setupClassMode({ accountPending: false, signedIn: true, overviewPending: false, overview: overview(false) }), "choose");
assert.equal(setupClassMode({ accountPending: false, signedIn: true, overviewPending: false, overview: null }), "choose", "failed overview: choose; server still enforces");
assert.equal(setupClassMode({ accountPending: false, signedIn: false, overviewPending: false, overview: overview(false) }), "readonly");
console.log("PASS: class field mode: loading until account and overview are known, then locked/choose/readonly");

// 2. Value: guardian's class wins; new learner must pick.
assert.equal(setupGradeValue({ mode: "loading", picked: B6, overview: overview(true), onboardingComplete: false }), "");
assert.equal(setupGradeValue({ mode: "locked", picked: B6, overview: overview(true), onboardingComplete: false }), B5);
assert.equal(setupGradeValue({ mode: "choose", picked: "", overview: overview(false), onboardingComplete: false }), "", "default class is never preselected");
assert.equal(setupGradeValue({ mode: "choose", picked: "", overview: overview(false), onboardingComplete: true }), B5);
assert.equal(setupGradeValue({ mode: "choose", picked: B6, overview: overview(false), onboardingComplete: false }), B6);
console.log("PASS: saved class: guardian's class preselected and fixed; automatic default never preselected");

// 3. Subjects follow the class being chosen.
assert.deepEqual(setupSubjectsFor(overview(false), ""), subjectsOf(B5));
assert.deepEqual(setupSubjectsFor(overview(false), B5), subjectsOf(B5));
assert.deepEqual(setupSubjectsFor(overview(false), B6), subjectsOf(B6));
assert.deepEqual(setupSubjectsFor({ ...overview(false), gradeSubjects: undefined }, B6), subjectsOf(B5), "older payload falls back to stored subjects");
assert.deepEqual(setupSubjectsFor(null, B6), []);
console.log("PASS: setup subjects are those of the class being chosen");

// 4. Markup in English and French.
for (const language of ["en", "fr"] as const) {
  const text = SETUP_CLASS_TEXT[language];

  const loading = render("loading", language);
  assert.doesNotMatch(loading, /<select/, `${language}: no dropdown while loading`);
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, new RegExp(escape(text.levelLoading)));
  assert.doesNotMatch(loading, /Basic 5/);

  const locked = render("locked", language, B5);
  assert.doesNotMatch(locked, /<select/, `${language}: no dropdown when the guardian chose`);
  assert.match(locked, /data-class-mode="locked"/);
  assert.match(locked, /Basic 5/);
  assert.match(locked, new RegExp(escape(text.levelGuardian)));
  assert.match(locked, new RegExp(`>${text.level}<`));

  const choose = render("choose", language);
  assert.match(choose, /<select id="setupLevel"/);
  assert.match(choose, new RegExp(escape(text.levelPlaceholder)));
  assert.match(choose, new RegExp(escape(text.levelChoose)));
  assert.match(choose, new RegExp(`value="${B4}"`));
  assert.doesNotMatch(choose, new RegExp(escape(text.levelGuardian)));

  const readonly = render("readonly", language, "", "");
  assert.doesNotMatch(readonly, /<select/);
  assert.match(readonly, new RegExp(escape(text.levelUnknown)));
}
assert.notEqual(SETUP_CLASS_TEXT.en.levelGuardian, SETUP_CLASS_TEXT.fr.levelGuardian);
assert.match(SETUP_CLASS_TEXT.fr.levelGuardian, /parent ou tuteur/);
assert.match(SETUP_CLASS_TEXT.fr.levelLoading, /Chargement/);
console.log("PASS: English and French markup for loading, locked, choose and readonly class fields");

// 5. The setup screen uses the field and its guards.
const page = readFileSync(new URL("../apps/learner/app/dashboard/page.tsx", import.meta.url), "utf8");
assert.match(page, /<SetupClassField/);
assert.doesNotMatch(page, /<select\s+id="setupLevel"/, "setup page has no dropdown of its own");
assert.match(page, /setupClass === "loading"/, "setup cannot be finished while the class is loading");
assert.match(page, /gradeId: chosenGrade/);
assert.match(page, /setupSubjectsFor\(overview, chosenGrade\)/);
console.log("PASS: setup page renders the class field, blocks saving while loading, saves and shows the chosen class");
