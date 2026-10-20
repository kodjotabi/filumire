import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const css = readFileSync(new URL("../apps/learner/app/learner-interface.css", import.meta.url), "utf8");
// Stylesheet-contract checks, not claims of browser-computed dimensions.
assert.match(css, /--learner-touch:\s*44px/);
assert.match(css, /max-width:\s*359px/); assert.match(css, /max-width:\s*767px/); assert.match(css, /min-width:\s*768px/); assert.match(css, /min-width:\s*1024px/);
assert.match(css, /repeat\(5, minmax\(0, 1fr\)\)/); assert.match(css, /repeat\(2, minmax\(0, 1fr\)\)/);
assert.match(css, /safe-area-inset-bottom/); assert.match(css, /overflow-wrap:\s*break-word/);
assert.doesNotMatch(css, /overflow-wrap:\s*anywhere/, "'anywhere' lets narrow columns split words letter by letter");
assert.match(css, /textarea:focus, input:focus, select:focus/); assert.match(css, /prefers-reduced-motion/);
assert.match(css, /--learner-reading-width:\s*68ch/); assert(!/overflow-x:\s*hidden/.test(css), "do not mask layout defects by clipping horizontal overflow");
const selectors = css.replace(/\/\*[\s\S]*?\*\//g, "").match(/[^{}]+(?=\{)/g) ?? [];
assert(selectors.every((selector) => selector.trim().startsWith("@media") || selector.includes(".learnerUi")), "Phase 6 CSS must not restyle adult or public pages");
function luminance(hex: string) { const rgb = hex.match(/[a-f\d]{2}/gi)!.map((part) => parseInt(part, 16) / 255).map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4); return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2]; }
function contrast(a: string, b: string) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
for (const [foreground, background] of [["0357c3", "ffffff"], ["855000", "ffffff"], ["526575", "ffffff"], ["12304a", "f5a00f"]]) assert(contrast(foreground, background) >= 4.5, `normal text contrast ${foreground}/${background}`);
console.log("PASS: learner-scoped responsive rules, touch/focus/keyboard/reduced-motion contracts and selected contrast pairs; real layout remains unverified");
