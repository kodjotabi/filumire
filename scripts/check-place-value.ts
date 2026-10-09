import { AUTHORED_CONTENT as items } from "../services/content-store/authored-index";

let problems = 0;

function fail(message: string) {
  problems++;
  console.log("PROBLEM:", message);
}

for (const c of items) {
  const m = c.metadata ?? {};
  if (!m.options) continue;

  const options: string[] = JSON.parse(m.options);
  const rules: Record<string, unknown> = JSON.parse(m.diagnosticRules ?? "{}");

  if (new Set(options).size !== options.length) {
    fail(`${c.id}: duplicate options`);
  }
  if (!options.includes(m.expectedResponse)) {
    fail(`${c.id}: answer is not in the options`);
  }
  for (const key of Object.keys(rules)) {
    if (!options.includes(key)) fail(`${c.id}: rule for missing option ${key}`);
    if (key === m.expectedResponse) fail(`${c.id}: rule on the correct answer`);
  }
  for (const option of options) {
    if (option !== m.expectedResponse && !rules[option]) {
      fail(`${c.id}: no rule for wrong option ${option}`);
    }
  }
}

for (const c of items) {
  if (/[\uFFFD\u00C3]/.test(c.title + c.body)) fail(`${c.id}: broken accents`);
}

const en = items.filter((c) => c.language === "en").length;
const fr = items.filter((c) => c.language === "fr").length;
if (en !== fr) fail(`English has ${en} items but French has ${fr}`);

const ids = new Set(items.map((c) => c.id));
if (ids.size !== items.length) fail("duplicate content ids");

console.log(`${items.length} items (${en} English, ${fr} French), ${problems} problems`);