import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PRIVATE_JHS_SCOPE } from "../packages/curriculum/jhs-private-policy";
import { getCompetenciesForSubject, getCompetency } from "../packages/curriculum";
import { getCcpBlockingSourceIssueIds } from "../packages/curriculum/ghana-ccp-runtime";
import {
  CURRICULUM_VERSION_GHANA_PILOT_V1_ID,
  getCurriculumNodesForCompetency,
  getFrameworkCompetencyRegistration,
  getFrameworkCompetencyRegistrationsForSubject,
} from "../packages/curriculum-framework";
import { seedContent } from "../services/content-store/seed";
import { persistenceStore } from "../services/persistence-provider";
import { saveLearnerLearningContext } from "../services/learner-context";
import { subjectCurriculumCoverage, subjectTopics } from "../services/curriculum-navigation";
import { buildLearningOverview } from "../apps/learner/app/api/learning/overview-data";
import type { LearningOverview } from "../apps/learner/services/learning-client";

/*
 * Subject pages show the subject's official curriculum: FILUMIRE
 * topics as links, as before, and official learning goals without a
 * lesson yet as plain "In development" rows. Upcoming goals are read
 * from the curriculum framework only: never registered, never part of
 * mastery totals, never openable. Basic 4-6 subjects, whose every goal
 * has a topic, render exactly as before. Topic titles are shown in full.
 *
 * Run: node scripts/run-offline-suites.mjs subject-curriculum-outline
 */

assert.equal(process.env.FILUMIRE_PERSISTENCE, "memory");
process.env.FILUMIRE_JHS_MODE = "private-presentation";
seedContent();
Object.assign(globalThis, { React });
const { SubjectPage } = await import("../apps/learner/components/filumire/SubjectPage");
const { toFilumireSubjects } = await import("../apps/learner/components/filumire/subjects");

const PRIMARY = [4, 5, 6].flatMap((grade) => ["english", "mathematics", "science", "computing"].map((subject) =>
  grade === 4 && subject === "mathematics" ? "subject-gh-basic-4-mathematics-pilot" : `subject-gh-basic${grade}-${subject}-pilot`));
const JHS = [7, 8, 9].flatMap((grade) => ["english", "mathematics", "science", "computing"].map((subject) => `subject-gh-basic${grade}-${subject}-ccp`));
const B9_SCIENCE = "subject-gh-basic9-science-ccp";
const B9_ENGLISH = "subject-gh-basic9-english-ccp";

const registeredCount = () => [...PRIMARY, ...JHS].reduce((sum, id) => sum + getCompetenciesForSubject(id).length, 0);
const registeredBefore = registeredCount();

// 1. Coverage: every Basic 4-6 goal has a topic; Basic 7-9 lists the rest of the official curriculum, read-only.
{
  for (const subjectId of PRIMARY) {
    const coverage = subjectCurriculumCoverage(subjectId);
    assert(subjectTopics(subjectId).length > 0, `${subjectId}: has topics`);
    assert.equal(coverage.upcoming.length, 0, `${subjectId}: no goal in development`);
    assert.equal(coverage.total, coverage.available);
  }
  const expected: Record<string, [number, number]> = {
    [B9_SCIENCE]: [1, 47], [B9_ENGLISH]: [1, 49], "subject-gh-basic9-mathematics-ccp": [1, 49],
    "subject-gh-basic9-computing-ccp": [1, 35], "subject-gh-basic7-science-ccp": [31, 53],
  };
  let jhsUpcoming = 0;
  for (const subjectId of JHS) {
    const coverage = subjectCurriculumCoverage(subjectId);
    const topics = getCompetenciesForSubject(subjectId);
    assert.equal(coverage.available, topics.length, `${subjectId}: one official goal per JHS topic`);
    assert.equal(coverage.total, coverage.available + coverage.upcoming.length);
    if (expected[subjectId]) assert.deepEqual([coverage.available, coverage.total], expected[subjectId], subjectId);
    const taught = new Set(topics.flatMap((topic) => [topic.learningIndicatorId, ...getCurriculumNodesForCompetency(topic.id).map((node) => node.id)]));
    const blocked = new Set(getFrameworkCompetencyRegistrationsForSubject(subjectId)
      .filter((registration) => getCcpBlockingSourceIssueIds(registration.sourceIssueIds).length)
      .map((registration) => registration.curriculumNodeId));
    assert.equal(coverage.total + blocked.size, getFrameworkCompetencyRegistrationsForSubject(subjectId).length,
      `${subjectId}: every official goal is taught, upcoming, or held back for its source issue`);
    for (const goal of coverage.upcoming) {
      assert(!taught.has(goal.id), `${goal.id}: a taught goal is not also upcoming`);
      assert(!blocked.has(goal.id), `${goal.id}: a goal with an unresolved source issue is held back`);
      assert.equal(getCompetency(goal.id), undefined, `${goal.id}: upcoming goals are not competencies`);
      assert(goal.title && !/\s{2}|\n/.test(goal.title), `${goal.id}: one line of official wording`);
      assert(goal.strand.title && goal.subStrand.title && !/\n/.test(goal.strand.title + goal.subStrand.title));
      assert.equal(goal.language, "en");
    }
    const orders = coverage.upcoming.map((goal) => goal.order);
    assert.deepEqual(orders, [...orders].sort((a, b) => a - b), `${subjectId}: source order`);
    jhsUpcoming += coverage.upcoming.length;
  }
  assert.equal(registeredCount(), registeredBefore, "reading coverage registers nothing");
  assert.equal(JHS.reduce((sum, id) => sum + getCompetenciesForSubject(id).length, 0), PRIVATE_JHS_SCOPE.length, "JHS topics stay the approved 42");
  assert.equal(jhsUpcoming + PRIVATE_JHS_SCOPE.length + 39, 625, "625 official CCP goals: 42 taught, 39 held back, the rest upcoming");
  console.log("PASS coverage: Basic 4-6 complete, Basic 7-9 upcoming goals read-only, held-back source issues excluded");
}

async function learnerIn(subjectId: string) {
  const competency = getCompetenciesForSubject(subjectId)[0];
  const registration = getFrameworkCompetencyRegistration(competency.id);
  const learnerId = `fictional-outline-${crypto.randomUUID()}`;
  await persistenceStore.ensureLearnerExists(learnerId);
  await saveLearnerLearningContext({
    learnerId,
    curriculumVersionId: registration?.curriculumVersionId ?? CURRICULUM_VERSION_GHANA_PILOT_V1_ID,
    gradeId: registration?.gradeId ?? competency.learningLevelId,
    activeSubjectId: subjectId,
    activeCompetencyId: competency.id,
    updatedAt: new Date().toISOString(),
  });
  return learnerId;
}

function page(view: unknown, subjectId: string, language: "en" | "fr", currentTitle = "") {
  const overview = view as LearningOverview;
  return renderToStaticMarkup(React.createElement(SubjectPage, {
    language, overview, subject: toFilumireSubjects(overview.availableSubjects).find((item) => item.subjectId === subjectId)!,
    currentTitle, learnHref: "/learn", icon: null, footer: null,
  }));
}

// 2. Basic 9 Science page: one topic to open, the rest of the curriculum as plain "In development" rows.
{
  const learnerId = await learnerIn(B9_SCIENCE);
  for (const language of ["en", "fr"] as const) {
    const view = await buildLearningOverview(learnerId, B9_SCIENCE, language);
    assert.equal(view.subjects[B9_SCIENCE].total, 1, "mastery denominator stays the authored topics");
    assert.equal(view.areas.length, 1);
    assert.equal(view.curriculumCoverage?.upcoming.length, 46);
    const html = page(view, B9_SCIENCE, language);
    assert.equal((html.match(/<a /g) ?? []).filter(Boolean).length, (html.match(/competencyId=/g) ?? []).length + 1, `${language}: links are the topic and the Start button only`);
    assert.equal((html.match(/competencyId=/g) ?? []).length, 1, `${language}: only the authored topic opens`);
    const rows = html.match(/<li><div class="subjectArea upcoming">[\s\S]*?<\/li>/g) ?? [];
    assert.equal(rows.length, 46, `${language}: one plain row per upcoming goal`);
    for (const row of rows) {
      assert(!/<a |href=|tabindex|role=|<button/.test(row), `${language}: an upcoming row cannot be opened or focused`);
      assert(!/ new| inprogress| completed/.test(row), `${language}: no learning status on an upcoming row`);
      assert(row.includes(language === "en" ? ">In development<" : ">En préparation<"));
      assert(row.includes('lang="en"'), `${language}: official English wording is marked as English`);
    }
    assert(html.includes(language === "en" ? "0 of 1 goals mastered" : "0 sur 1 objectifs maîtrisés"), `${language}: mastery line unchanged`);
    assert(html.includes(language === "en"
      ? "Official curriculum: 1 of 47 learning goals available in FILUMIRE"
      : "Programme officiel : 1 sur 47 objectifs d’apprentissage disponibles dans FILUMIRE"), `${language}: coverage line, apart from mastery`);
    assert(html.includes(language === "en" ? "Goals marked “In development”" : "Les objectifs « En préparation »"));
    assert(html.includes("DIVERSITY OF MATTER") && html.includes("MATERIALS"), `${language}: official strands and sub-strands`);
    assert(html.includes(language === "en" ? "0 of 1 mastered · " : "0 sur 1 maîtrisés · "), `${language}: sub-strand shows both counts`);
    const openGroups = html.match(/<details class="subjectSubStrand" open="">/g) ?? [];
    assert.equal(openGroups.length, 1, `${language}: only the group with the current topic is open`);
  }
  console.log("PASS Basic 9 Science: full official outline, one openable topic, mastery 0 of 1, coverage 1 of 47 (EN/FR)");
}

// 3. Basic 4-6 parity: the page is byte-identical with and without the coverage field.
{
  for (const subjectId of ["subject-gh-basic5-science-pilot", "subject-gh-basic-4-mathematics-pilot", "subject-gh-basic6-english-pilot"]) {
    const learnerId = await learnerIn(subjectId);
    for (const language of ["en", "fr"] as const) {
      const view = await buildLearningOverview(learnerId, subjectId, language);
      assert.deepEqual(view.curriculumCoverage?.upcoming, [], `${subjectId}: nothing upcoming`);
      const withCoverage = page(view, subjectId, language);
      const without = page({ ...view, curriculumCoverage: undefined }, subjectId, language);
      assert.equal(withCoverage, without, `${subjectId} ${language}: page unchanged`);
      assert(!withCoverage.includes("subjectCoverage") && !withCoverage.includes("upcoming"));
      assert.equal((withCoverage.match(/competencyId=/g) ?? []).length, view.areas.length, `${subjectId}: every topic still opens`);
    }
  }
  console.log("PASS Basic 4-6 subject pages unchanged (EN/FR)");
}

// 4. Gating: without the private JHS presentation, a Basic 9 learner sees no JHS topics or outline.
{
  const learnerId = await learnerIn(B9_SCIENCE);
  delete process.env.FILUMIRE_JHS_MODE;
  try {
    const view = await buildLearningOverview(learnerId, B9_SCIENCE, "en");
    assert.equal(view.curriculumCoverage, null, "no outline outside the private presentation");
    assert.deepEqual(view.areas, []);
  } finally {
    process.env.FILUMIRE_JHS_MODE = "private-presentation";
  }
  console.log("PASS outline stays behind the private JHS gate");
}

// 5. Text: full titles, breaks after word slashes only, a description that repeats the title is not shown twice.
{
  const learnerId = await learnerIn(B9_ENGLISH);
  const view = await buildLearningOverview(learnerId, B9_ENGLISH, "en");
  const title = view.areas[0].title;
  assert.equal(view.areas[0].description, title, "fixture: JHS description repeats the title");
  const html = page(view, B9_ENGLISH, "en", title);
  assert(html.includes("topics/<wbr/>texts/<wbr/>issue"), "long slash token may break after each slash");
  assert(!/<p>Use appropriate register/.test(html), "the repeated description is not shown");
  const fraction = { ...view, areas: [{ ...view.areas[0], title: "Add 1/2 and 1/4", description: "Fractions with unlike denominators." }] };
  const fractionHtml = page(fraction, B9_ENGLISH, "en", "Add 1/2 and 1/4");
  assert(fractionHtml.includes("Add 1/2 and 1/4") && !fractionHtml.includes("1/<wbr"), "number slashes stay whole");
  assert(fractionHtml.includes("<p>Fractions with unlike denominators.</p>"), "a real description is still shown");

  const css = readFileSync(new URL("../apps/learner/app/globals.css", import.meta.url), "utf8");
  const strong = css.match(/\.homeScreen \.subjectArea strong \{[^}]*\}/)![0];
  assert(!strong.includes("line-clamp") && strong.includes("hyphens: manual"), "topic titles are not clamped or auto-hyphenated");
  assert(/\.homeScreen \.subjectCurrentBody h2 \{[^}]*hyphens: manual/.test(css));
  assert(/\.homeScreen \.subjectAreaPill \{[^}]*flex: 0 1 auto; max-width: 45%/.test(css), "the pill is as wide as its words");
  assert(/@media \(max-width: 479px\) \{\s*\.homeScreen \.subjectArea \{ flex-wrap: wrap/.test(css), "phones stack the pill under the title");
  const source = readFileSync(new URL("../apps/learner/components/filumire/SubjectPage.tsx", import.meta.url), "utf8");
  assert(!source.includes('style={{ flex: "0 1 45%"'), "no inline pill sizing");
  console.log("PASS full titles, slash breaks, no repeated description, pill sizing");
}

// 6. Current Topic is a topic: a learner without a progress record sees their next topic, not the "Ready to continue" prompt.
{
  const dashboard = readFileSync(new URL("../apps/learner/app/dashboard/page.tsx", import.meta.url), "utf8");
  const subjectPage = dashboard.match(/<SubjectPage[\s\S]*?\/>/)?.[0] ?? dashboard.slice(dashboard.indexOf("<SubjectPage"), dashboard.indexOf("<SubjectPage") + 600);
  assert(/currentTitle=\{[^}]*data\?\.progress\.competencyTitle \?\? ""/.test(subjectPage), "the subject page gets the topic title or nothing");
  assert(!/currentTitle=\{[^}]*\? competencyTitle :/.test(subjectPage), "the prompt fallback never reaches the subject page");
  for (const subjectId of [B9_SCIENCE, "subject-gh-basic-4-mathematics-pilot"]) {
    const learnerId = await learnerIn(subjectId);
    for (const language of ["en", "fr"] as const) {
      const view = await buildLearningOverview(learnerId, subjectId, language);
      const html = page(view, subjectId, language, "");
      const heading = html.match(/<span class="subjectTag">[^<]*<\/span><h2>([\s\S]*?)<\/h2>/)?.[1] ?? "";
      assert.equal(heading.replace(/<wbr\/>/g, ""), view.areas.find((area) => area.status !== "completed")!.title, `${subjectId} ${language}: next topic is the Current Topic`);
      assert(!/Ready to continue|Prêt à continuer/.test(html), `${subjectId} ${language}: no prompt as a topic`);
    }
  }
  console.log("PASS Current Topic shows the next topic when there is no progress record (EN/FR)");
}

console.log("PASS subject curriculum outline");
