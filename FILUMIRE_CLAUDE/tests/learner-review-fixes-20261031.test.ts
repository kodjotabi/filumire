import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

/*
 * Website review corrections (31 Oct 2026), learner app side:
 * - Issue 06: from 1024px the sidebar collapses to icons or slides out of
 *   view; labels stay in the accessibility tree; the bottom bar below
 *   1024px is unchanged; content widens into the recovered space.
 * - Issue 05: the current topic's full title is shown once in full (the
 *   Current Topic card); its row in the topic list is one line.
 * - Issue 04: the home footer slogan uses the brand sans font.
 *
 * Run: node scripts/run-offline-suites.mjs learner-review-fixes-20261031
 */

Object.assign(globalThis, { React });
const { LearnerBottomNav } = await import("../apps/learner/components/filumire/LearnerBottomNav");

const css = readFileSync(new URL("../apps/learner/app/globals.css", import.meta.url), "utf8");

// Issue 06: sidebar controls, labelled and wired to the nav, in both languages.
for (const language of ["en", "fr"] as const) {
  const html = renderToStaticMarkup(React.createElement(LearnerBottomNav, { active: "learning", language }));
  assert.match(html, /<nav id="filumire-learner-nav"/);
  assert.match(html, /aria-current="page"/, "active item still marked");
  assert.equal((html.match(/class="filumireNavLabel"/g) ?? []).length, 5, "every item keeps its text label");
  assert.match(html, /aria-controls="filumire-learner-nav"/);
  assert.match(html, language === "en" ? /Collapse menu/ : /Réduire le menu/);
  assert.match(html, language === "en" ? /Hide menu/ : /Masquer le menu/);
  assert.match(html, /id="filumire-learner-nav-reveal"[^>]*hidden=""/, "reveal button exists, hidden until the sidebar is hidden");
}
// The inline bar (sign-in page) has no sidebar controls.
const inline = renderToStaticMarkup(React.createElement(LearnerBottomNav, { active: "home", language: "en", variant: "inline" }));
assert.doesNotMatch(inline, /filumireNavControls|filumire-learner-nav-reveal/);

// Controls are hidden by default and shown only in the 1024px sidebar block.
assert.match(css, /\.filumireNavControls,\s*\.filumireNavReveal \{\s*display: none;/);
const sidebarBlock = css.slice(css.indexOf("Collapsible learner sidebar"));
assert.match(sidebarBlock, /@media \(min-width: 1024px\) \{\s*:root\[data-learner-nav="collapsed"\] \{\s*--filumire-sidebar-width: 84px;/);
assert.match(sidebarBlock, /:root\[data-learner-nav="hidden"\] \{\s*--filumire-sidebar-width: 0px;\s*--filumire-content-max: 1368px;/);
assert.match(sidebarBlock, /visibility: hidden;\s*transform: translateX\(-100%\);/, "a hidden sidebar leaves the tab order");
// Collapsed labels are clipped, not display:none, so links keep their accessible names.
assert.match(sidebarBlock, /\.filumireNavLabel,[\s\S]*?clip: rect\(0 0 0 0\);/);
assert.doesNotMatch(sidebarBlock, /\.filumireNavLabel[^{]*\{\s*display: none/);
console.log("PASS learner sidebar collapse/hide (Issue 06)");

// Issue 05: one-line current row; the full title stays in the data and the Current Topic card.
const subjectPage = readFileSync(new URL("../apps/learner/components/filumire/SubjectPage.tsx", import.meta.url), "utf8");
assert.match(subjectPage, /className=\{current && topicTitle \? "subjectAreaShort" : undefined\} title=\{current && topicTitle \? area\.title : undefined\}/);
assert.match(subjectPage, /<h2>\{withSlashBreaks\(topicTitle\)\}<\/h2>/);
assert.match(subjectPage, /!sameText\(topic\.description, topicTitle\)/, "a description equal to the title is not repeated");
assert.match(css, /strong\.subjectAreaShort \{ display: -webkit-box; -webkit-line-clamp: 1;/);
console.log("PASS current topic title shown once in full (Issue 05)");

// Issue 04: the home footer slogan no longer uses the handwritten accent font.
const handFooter = css.match(/\.homeScreen \.homeFooter\.hand p \{[^}]*\}/)?.[0] ?? "";
assert.ok(handFooter, "home footer rule found");
assert.doesNotMatch(handFooter, /font-hand|cursive/);
console.log("PASS footer slogan in the brand font (Issue 04)");
