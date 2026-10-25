/*
 * Age-appropriate interface (Basic 4-6 Jelly Star feedback, hidden
 * Basic 7-9 presentation). Presentation-only checks: band selection,
 * feedback markup and accessibility, and guards that the answer-outcome
 * logic and learner data paths are unchanged.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { FeedbackOutcome } from "../apps/learner/components/filumire/JellyStarFeedback";

/* tsx compiles the components' JSX with the classic transform (React.createElement). */
(globalThis as { React?: typeof React }).React = React;
const { createElement } = React;

const { ageBandForGrade, basicGradeNumber, JUNIOR_HIGH_INTERFACE_READY, resolveAgeBand } = await import(
  "../apps/learner/components/filumire/ageBand"
);
const { feedbackCopy, isFeedbackOutcome, JellyStarFeedback, soundDefaultFor } = await import(
  "../apps/learner/components/filumire/JellyStarFeedback"
);
const { MasteryGoalsPanel, nextMasteryGoal } = await import("../apps/learner/components/filumire/MasteryGoalsPanel");
const { SUBJECT_PRESENTATION } = await import("../apps/learner/components/filumire/subjects");

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8").replaceAll("\r\n", "\n");
let checks = 0;
const check = (fn: () => void) => {
  fn();
  checks += 1;
};

/* ---- band selection: Basic 7-9 stays hidden ---- */
check(() => assert.equal(JUNIOR_HIGH_INTERFACE_READY, false, "Basic 7-9 interface must stay hidden until its curriculum is ready."));

for (const grade of [4, 5, 6]) {
  check(() => assert.equal(ageBandForGrade(`level-gh-basic-${grade}-pilot`), "primary"));
  check(() => assert.equal(ageBandForGrade(`level-gh-basic-${grade}-pilot`, undefined, true), "primary"));
}
for (const grade of [7, 8, 9]) {
  check(() => assert.equal(ageBandForGrade(`level-gh-basic-${grade}-pilot`), "primary", `Basic ${grade} must see primary while hidden.`));
  check(() => assert.equal(ageBandForGrade(`level-gh-basic-${grade}-pilot`, undefined, true), "junior-high"));
}
check(() => assert.equal(basicGradeNumber(undefined, "Basic 8"), 8));
check(() => assert.equal(basicGradeNumber("", "JHS 1"), 7));
check(() => assert.equal(basicGradeNumber("", ""), null));
check(() => assert.equal(ageBandForGrade(undefined, undefined, true), "primary"));

check(() =>
  assert.equal(
    resolveAgeBand({ gradeId: "level-gh-basic-5-pilot", previewParam: "junior-high", isProduction: true }),
    "primary",
    "The preview parameter must be ignored in production.",
  ),
);
check(() =>
  assert.equal(resolveAgeBand({ gradeId: "level-gh-basic-5-pilot", previewParam: "junior-high", isProduction: false }), "junior-high"),
);
check(() => assert.equal(resolveAgeBand({ gradeId: "level-gh-basic-8-pilot", previewParam: null, isProduction: false }), "primary"));

/* ---- feedback copy: encouraging, never an answer ---- */
const outcomes: FeedbackOutcome[] = ["correct", "incorrect", "partial", "pending-review"];
for (const band of ["primary", "junior-high"] as const) {
  for (const language of ["en", "fr"] as const) {
    for (const outcome of outcomes) {
      const copy = feedbackCopy(band, language, outcome);
      check(() => assert.ok(copy.title && copy.message));
      check(() =>
        assert.doesNotMatch(
          `${copy.title} ${copy.message}`,
          /wrong|failed|bad|stupid|the (correct|right) answer (is|was)|faux|nul|la bonne réponse (est|était)/i,
          `Feedback must not shame or reveal answers (${band}/${language}/${outcome}).`,
        ),
      );
    }
  }
}
check(() => assert.equal(isFeedbackOutcome("correct"), true));
check(() => assert.equal(isFeedbackOutcome(null), false));
check(() => assert.equal(soundDefaultFor("primary"), true));
check(() => assert.equal(soundDefaultFor("junior-high"), false));

/* ---- rendered markup ---- */
function render(outcome: FeedbackOutcome, band: "primary" | "junior-high", withContinue = true, language: "en" | "fr" = "en") {
  return renderToStaticMarkup(
    createElement(JellyStarFeedback, {
      outcome,
      band,
      language,
      onContinue: withContinue ? () => undefined : undefined,
    }),
  );
}

const happy = render("correct", "primary");
check(() => assert.match(happy, /role="status"/));
check(() => assert.match(happy, /aria-live="polite"/));
check(() => assert.match(happy, /class="answerFeedback jelly correct"/));
check(() => assert.match(happy, /class="jellyStar happy"/));
check(() => assert.match(happy, /<svg[^>]*class="jellyStar happy"[^>]*aria-hidden="true"/));
check(() => assert.match(happy, /<button type="button" class="answerFeedbackContinue">Keep going!<\/button>/));
check(() => assert.match(happy, /<button[^>]*class="answerFeedbackSound"[^>]*aria-pressed="false"/));

const sad = render("incorrect", "primary");
check(() => assert.match(sad, /class="answerFeedback jelly incorrect"/));
check(() => assert.match(sad, /class="jellyStar sad"/));
check(() => assert.match(sad, /<button type="button" class="answerFeedbackContinue">Let’s keep learning<\/button>/));
check(() => assert.doesNotMatch(render("incorrect", "primary", false), /answerFeedbackContinue/));

const academic = render("incorrect", "junior-high");
check(() => assert.match(academic, /class="answerFeedback academic incorrect"/));
check(() => assert.doesNotMatch(academic, /jellyStar/, "Basic 7-9 feedback has no cartoon character."));
check(() => assert.match(academic, />Continue</));

/*
 * Same-question retry: the engine never re-serves the item just answered
 * (content-selection controlled reuse), so no feedback text or button may
 * promise the same question again.
 */
for (const band of ["primary", "junior-high"] as const) {
  for (const language of ["en", "fr"] as const) {
    for (const outcome of outcomes) {
      const markup = render(outcome, band, true, language);
      check(() =>
        assert.doesNotMatch(
          markup,
          /try again|another go|have another|réessa|essayons encore/i,
          `No same-question retry promise (${band}/${language}/${outcome}).`,
        ),
      );
    }
  }
}
const selection = read("services/content-selection/index.ts");
check(() => assert.match(selection, /if \(itemId === lastAnsweredItemId\) \{\s*return false;/, "Engine rule this UI relies on."));
check(() => assert.match(selection, /export const MAX_ITEM_EXPOSURES = 2;/));

/* ---- mastery goals ---- */
check(() => assert.deepEqual(nextMasteryGoal(0, 8), { targetPercent: 25, topicsNeeded: 2 }));
check(() => assert.deepEqual(nextMasteryGoal(5, 12), { targetPercent: 50, topicsNeeded: 1 }));
check(() => assert.deepEqual(nextMasteryGoal(10, 10), { targetPercent: 100, topicsNeeded: 0 }));
check(() => assert.deepEqual(nextMasteryGoal(0, 0), { targetPercent: 0, topicsNeeded: 0 }));
const panel = renderToStaticMarkup(
  createElement(MasteryGoalsPanel, {
    subjects: [{ key: "science", subjectId: "s", ...SUBJECT_PRESENTATION.science }],
    counts: { s: { total: 10, completed: 4, started: true } },
    language: "en",
  }),
);
check(() => assert.match(panel, /4 of 10 topics mastered/));
check(() => assert.match(panel, /role="progressbar"[^>]*aria-valuenow="40"/));
check(() => assert.match(panel, /Next goal: master 1 more topic to reach 50%/));

/* ---- source guards ---- */
/*
 * The learn page now derives every outcome through evaluatedFeedback()
 * (learning-presentation) and shows wrong answers through FILU's
 * correction panel, which keeps the answered question on screen.
 * These guards check the same properties against that structure.
 */
const learnPage = read("apps/learner/app/learn/page.tsx");
const presentation = read("apps/learner/services/learning-presentation.ts");
check(() =>
  assert.ok(
    (learnPage.match(/setAssessmentFeedback\(evaluatedFeedback\(/g) ?? []).length >= 3,
    "Outcomes come from the server result on submit and on both restore paths.",
  ),
);
check(() =>
  assert.doesNotMatch(
    learnPage,
    /outcome:\s*"(correct|incorrect|partial)"/,
    "The learn page never decides an outcome itself.",
  ),
);
check(() => {
  const evaluated = /export function evaluatedFeedback\([\s\S]*?\r?\n}\r?\n/.exec(presentation)?.[0] ?? "";
  assert.ok(evaluated, "evaluatedFeedback is defined.");
  assert.match(evaluated, /assessment\.evidence\?\.outcome/, "Server evidence decides the outcome.");
  assert.match(evaluated, /assessment\.result\.correct === true \? "correct" : assessment\.result\.correct === false \? "incorrect"/);
  assert.match(evaluated, /"pending-review"/, "Teacher-review answers stay pending.");
});
const jellyUsages = learnPage.match(/<JellyStarFeedback[\s\S]*?\/>/g) ?? [];
check(() => assert.equal(jellyUsages.length, 2, "Jelly Star on the answer feedback and on FILU's correction."));
for (const usage of jellyUsages) {
  check(() => assert.doesNotMatch(usage, /option|response|answer|content|metadata|chosen/i, "Feedback receives no answer data."));
}
check(() =>
  assert.match(
    learnPage,
    /assessmentFeedback && isFeedbackOutcome\(assessmentFeedback\.outcome\) && \(/,
    "Only known outcomes get the Jelly Star; other outcomes keep the plain card.",
  ),
);
check(() => assert.match(learnPage, /assessmentFeedback && !isFeedbackOutcome\(assessmentFeedback\.outcome\) && \(/));
check(() => assert.match(learnPage, /<main className="page learnerUi"[^>]*data-age-band=\{ageBand\}>/));
check(() => {
  const proceed = /function continueFromFeedback\(\)[\s\S]*?\n  }\n/.exec(learnPage)?.[0] ?? "";
  assert.ok(proceed);
  assert.doesNotMatch(proceed, /submit|fetch|acknowledge|loadLearning|setData/, "Continue sends nothing to the server.");
  assert.match(proceed, /setAssessmentFeedback\(null\)/);
});
check(() => assert.match(learnPage, /onContinue=\{continueFromFeedback\}/));

/* Wrong answers: the question stays on screen with FILU's correction; the star only shows the mood. */
check(() =>
  assert.match(
    learnPage,
    /setCorrection\(\{ value: wrongAnswerCorrection, phase: "explain", next: result \}\);[\s\S]{0,80}return;/,
    "A corrected wrong answer keeps its question; the next step is held, not shown.",
  ),
);
check(() => {
  const star = /\{activeCorrection && activeCorrection\.phase !== "retry" && \(\s*<JellyStarFeedback[\s\S]*?\/>/.exec(learnPage)?.[0] ?? "";
  assert.ok(star, "The correction star is hidden while the learner retries.");
  assert.match(star, /activeCorrection\.phase === "done" && activeCorrection\.value\.retryOutcome === "correct" \? "correct" : "incorrect"/,
    "The retry mood follows the server's retryOutcome.");
  assert.doesNotMatch(star, /onContinue/, "The correction panel keeps its own buttons.");
});
check(() => {
  const proceed = /function continueAfterCorrection\(\)[\s\S]*?\n  }\n/.exec(learnPage)?.[0] ?? "";
  assert.match(proceed, /setData\(correction\.next\)/, "The next step appears only after the learner continues.");
});
check(() =>
  assert.match(
    learnPage,
    /assessmentFeedback\.assessmentItemId !== data\.content\?\.assessmentItemId && <small>\{tr\(language, "The following activity is your next learning step\."\)\}<\/small>/,
    "When the next step is already shown, the feedback says so.",
  ),
);

const component = read("apps/learner/components/filumire/JellyStarFeedback.tsx");
check(() => assert.doesNotMatch(component, /fetch\(|correctAnswer|expectedResponse|answerKey/));

const sound = read("apps/learner/components/filumire/feedbackSound.ts");
check(() => assert.doesNotMatch(sound, /fetch\(|new Audio\(|\.(mp3|wav|ogg)\b/, "Sounds are synthesised locally."));
check(() => assert.match(sound, /catch/));
check(() => assert.match(component, /playFeedbackSound\(isPrimary \? "happy" : "confirm"\)/, "Basic 7-9 get a quiet tone, not the cartoon sound."));
check(() => assert.match(component, /playFeedbackSound\(isPrimary \? "sad" : "notice"\)/));
check(() => assert.match(component, /if \(!readSoundPreference\(soundDefault\)\) return;/, "Sounds respect the learner's choice."));

const css = read("apps/learner/app/age-interface.css");
check(() => assert.match(css, /@media \(prefers-reduced-motion: reduce\)/));
check(() => {
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reduced, /\.answeredOptions \.option\.answered/, "Answered-box motion is removed under reduced motion.");
});
check(() => assert.match(css, /\.answeredOptions \.option\.answered\.correct \{[^}]*var\(--jelly-gold\)[^}]*var\(--jelly-mint\)/));
check(() => assert.match(css, /\.answeredOptions \.option\.answered\.incorrect,[^{]*\{[^}]*var\(--jelly-peach\)/));
for (const page of ["progressPage", "challengesPage", "profilePage", "askPage"]) {
  check(() => assert.match(css, new RegExp(`main\\.learnerPage\\[data-age-band="junior-high"\\] \\.${page} `), `Basic 7-9 styling covers ${page}.`));
}
const themeSection = css.slice(css.indexOf("2. Basic 7-9 theme (hidden until ready) -"));
for (const rule of themeSection.split("}").map((r) => r.trim()).filter((r) => r && !r.startsWith("/*") && !r.startsWith("@"))) {
  const selector = rule.split("{")[0].replace(/\/\*[\s\S]*?\*\//g, "").trim();
  if (!selector || selector.startsWith(".mastery")) continue;
  check(() =>
    assert.ok(
      selector.split(",").every((part) => part.includes('[data-age-band="junior-high"]')),
      `Basic 7-9 rule must be scoped: ${selector}`,
    ),
  );
}

const layout = read("apps/learner/app/layout.tsx");
check(() => assert.match(layout, /import "\.\/age-interface\.css";/));

const dashboard = read("apps/learner/app/dashboard/page.tsx");
check(() => assert.match(dashboard, /\{ageBand === "junior-high" && \(\s*<MasteryGoalsPanel/));

const preview = read("apps/learner/app/dev/age-interface/page.tsx");
check(() => assert.match(preview, /process\.env\.NODE_ENV === "production"\) \{\s*notFound\(\);/));

/*
 * Lesson heading: the old "held answered question" (shownAction) is
 * replaced by the correction flow above, where `data` keeps the answered
 * question until continueAfterCorrection(), so the heading still
 * describes the question on screen. Checked by the correction guards.
 */

/* ---- Basic 7-9 wording: opt-in per band, same data and links ---- */
for (const [file, dict] of [
  ["ProgressPage", "JUNIOR_TEXT"],
  ["ChallengesPage", "JUNIOR_TEXT"],
  ["ProfilePage", "juniorText"],
  ["AskFiluPage", "juniorText"],
] as const) {
  const source = read(`apps/learner/components/filumire/${file}.tsx`);
  check(() => assert.match(source, /band = "primary",/, `${file} defaults to the primary wording.`));
  check(() => assert.match(source, new RegExp(`band === "junior-high" \\? \\{ \\.\\.\\.(TEXT|text)\\[language\\], \\.\\.\\.${dict}\\[language\\] \\} : (TEXT|text)\\[language\\]`)));
  const start = source.indexOf(`const ${dict} = {`);
  const junior = /^[\s\S]*?\r?\n\}( as const)?;/.exec(source.slice(start))?.[0] ?? "";
  check(() => assert.ok(junior.length > 100, `${file} has Basic 7-9 wording.`));
  check(() => assert.doesNotMatch(junior, /!|buddy|ami d|You’ve got this|boost/i, `${file} Basic 7-9 wording stays plain.`));
  check(() => assert.match(dashboard, new RegExp(`<${file}[\\s\\S]{0,90}band=\\{ageBand\\}`), `Dashboard passes the band to ${file}.`));
}
/* Milestones now come from the shared achievements module; the band changes wording only, never criteria. */
const challenges = read("apps/learner/components/filumire/ChallengesPage.tsx");
const achievements = read("apps/learner/components/filumire/achievements.ts");
check(() => {
  const call = /computeAchievements\([\s\S]*?\)/.exec(challenges)?.[0] ?? "";
  assert.ok(call, "Challenges uses computeAchievements.");
  assert.doesNotMatch(call, /band|junior/i, "Milestone criteria do not depend on the age band.");
});
check(() => assert.doesNotMatch(achievements, /band|junior/i));
check(() => assert.match(achievements, /make\("first", done >= 1,/));
check(() => assert.match(achievements, /make\("explorer", started >= 2,/));
check(() => assert.match(achievements, /make\("steady", done >= 5,/));
const nav = read("apps/learner/components/filumire/LearnerBottomNav.tsx");
check(() => assert.match(nav, /junior \? "Goals" : "Chal(?:\\u00AD)?lenges"/));
check(() => assert.match(nav, /junior \? "Subjects" : "My Learning"/));
check(() => assert.match(nav, /band = "primary",/));
check(() => assert.match(dashboard, /<LearnerBottomNav [^>]*band=\{ageBand\}/));
check(() =>
  assert.equal(
    (learnPage.match(/<LearnerBottomNav active="learning" language=\{language\}[^>]*band=\{ageBand\} \/>/g) ?? []).length,
    2,
    "Both learn-page layouts pass the band to the bottom nav.",
  ),
);

console.log(`age-interface: PASS (${checks} checks)`);
