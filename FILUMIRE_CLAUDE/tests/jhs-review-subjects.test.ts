/*
 * Curriculum Review subject cards on the learner home (junior-high only).
 * Presentation-only checks: the sourced CCP list, no duplicates with
 * server subjects, an icon for every card, and guards that the cards are
 * not links and leave the active subject cards and gating unchanged.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

/* tsx compiles the components' JSX with the classic transform (React.createElement). */
(globalThis as { React?: typeof React }).React = React;
const { createElement } = React;

const { REVIEW_COPY, reviewSubjectsFor } = await import("../apps/learner/components/filumire/subjectCatalogue");
const { SubjectIcon } = await import("../apps/learner/components/filumire/SubjectIcon");
const { SUBJECT_PRESENTATION } = await import("../apps/learner/components/filumire/subjects");

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8").replaceAll("\r\n", "\n");
let checks = 0;
const check = (fn: () => void) => {
  fn();
  checks += 1;
};

const CCP_REVIEW_KEYS = [
  "ghanaian-language",
  "french",
  "arabic",
  "creative-arts-design",
  "career-technology",
  "social-studies",
  "rme",
  "physical-health-education",
];
const active = ["english", "mathematics", "science", "computing"].map((discipline) => ({ discipline }));

/* ---- the list ---- */
check(() => assert.deepEqual(reviewSubjectsFor("primary", active), [], "Basic 4-6 has no review cards until its list is sourced."));
check(() => assert.deepEqual(reviewSubjectsFor("junior-high", active).map((s) => s.key), CCP_REVIEW_KEYS));
check(() => assert.deepEqual(reviewSubjectsFor("junior-high", null).map((s) => s.key), CCP_REVIEW_KEYS));
check(() =>
  assert.deepEqual(
    reviewSubjectsFor("junior-high", [...active, { discipline: "french" }]).map((s) => s.key),
    CCP_REVIEW_KEYS.filter((key) => key !== "french"),
    "A subject the server offers is never also shown as a review card.",
  ),
);
for (const key of CCP_REVIEW_KEYS) {
  check(() => assert.ok(!(key in SUBJECT_PRESENTATION), `${key} must not be an active presentation key.`));
}
for (const subject of reviewSubjectsFor("junior-high", active)) {
  check(() => assert.ok(subject.name.en.length > 0 && subject.name.fr.length > 0));
  check(() => {
    const markup = renderToStaticMarkup(createElement(SubjectIcon, { name: subject.key }));
    assert.match(markup, /<g>/, `${subject.key} needs an icon.`);
  });
}
check(() => assert.equal(REVIEW_COPY.en.status, "Curriculum Review"));
check(() => assert.ok(REVIEW_COPY.fr.status.length > 0));

/* ---- the home page wiring ---- */
const page = read("apps/learner/app/dashboard/page.tsx");
const start = page.indexOf('<div className="homeReview">');
const end = page.indexOf("</ul>", start);
const block = page.slice(start, end);
check(() => assert.ok(start > 0, "Review block is rendered on the home."));
check(() => assert.ok(!/<Link|href=|onClick|tabIndex/.test(block), "Review cards are not links or controls."));
check(() => assert.match(block, /<li key=\{subject\.key\} className=\{`homeSubject review/));
check(() => assert.ok(page.indexOf('<div className="homeReview">') < page.indexOf('<section className="homeTiles">'), "Subjects come before the tiles."));
check(() => assert.match(page, /subjects\.length > 0 && reviewSubjects\.length > 0/));
check(() => assert.match(page, /reviewSubjectsFor\(ageBand, overview\?\.availableSubjects\)/));
check(() => assert.match(page, /const subjects = toFilumireSubjects\(overview\?\.availableSubjects\);/, "Active subjects still come only from the server."));
check(() => assert.match(page, /href=\{`\/dashboard\?lang=\$\{language\}&view=learning&subjectId=\$\{subject\.subjectId\}`\}\n\s+className=\{`homeSubject \$\{subject\.key\}`\}/, "Active cards keep their links."));

console.log(`jhs-review-subjects: ${checks} checks passed`);
