import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
Object.assign(globalThis, { React });
const { VoiceSelection } = await import("../apps/learner/components/filumire/VoiceSelection");
for (const language of ["en", "fr"] as const) {
  const markup = renderToStaticMarkup(React.createElement(VoiceSelection, { learnerId: "fictional", language }));
  assert.match(markup, new RegExp(`lang="${language}"`));
  assert.match(markup, language === "en" ? /Voices are marked female or male only when the voice maker publishes it/ : /Une voix est indiquée féminine ou masculine seulement quand son éditeur le publie/);
  assert(!markup.includes("male-presenting"));
  assert.match(markup, /<button type="button" disabled="">/);
  assert.match(markup, /<label for="[^"]+-voice">/);
  assert(!markup.includes("<audio") && !markup.includes("<script"));
}
console.log("PASS: bilingual browser-voice interface, honest gender/accent labels, disabled unavailable playback and accessible controls");
