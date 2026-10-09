import { seedContent } from "../services/content-store/seed";
import { getAllContent } from "../services/content-store/index";
import { getAllCompetencies, getCompetency } from "../packages/curriculum/index";

/*
 * TRANCHE 4E: whole-bank content integrity (from the audit of 7 October).
 * For every multiple-choice question of every pilot subject:
 * - the expected answer is one of the options, options are distinct;
 * - at least 3 options;
 * - diagnostic rules (when present) cover every wrong option and only
 *   name real options;
 * - no two questions of one competency are identical (text and options);
 * - every English question has a French version, except the original
 *   B4 number-pattern pilot items (their topics have full FR content);
 * - every competency has >= 5 mastery questions and retention and
 *   transfer questions (or is a test competency).
 *
 * Run: npx tsx --env-file=.env.local tests/content-integrity-4e.test.ts
 */

seedContent();

const EN_ONLY_PILOT = /^content-gh-b4-patterns-00[123]-(assessment|practice)-en$/;

const failures: string[] = [];
let checked = 0;
const fail = (message: string) => { if (failures.length < 25) failures.push(message); };

const all = getAllContent().filter((item) => getCompetency(item.competencyId)?.subjectId !== "subject-test-mathematics");
const translated = new Set(all.filter((item) => item.language === "fr").map((item) => item.translationOfContentId));
const seen = new Map<string, string>();

for (const item of all) {
  if (!item.assessmentItemId || !item.metadata?.options) continue;
  checked += 1;
  let options: string[];
  try { options = JSON.parse(item.metadata.options); } catch { fail(`${item.id}: options not JSON`); continue; }
  const answer = item.metadata.expectedResponse;
  if (!options.includes(answer)) fail(`${item.id}: answer not among options`);
  if (new Set(options).size !== options.length) fail(`${item.id}: duplicate options`);
  if (options.length < 3) fail(`${item.id}: fewer than 3 options`);
  if (item.metadata.diagnosticRules) {
    const rules = JSON.parse(item.metadata.diagnosticRules) as Record<string, unknown>;
    if (!options.filter((option) => option !== answer).every((option) => option in rules)) fail(`${item.id}: a wrong option has no diagnostic rule`);
    if (Object.keys(rules).some((key) => !options.includes(key))) fail(`${item.id}: diagnostic rule for a non-option`);
  }
  const key = `${item.competencyId}|${item.language}|${item.body.trim()}|${[...options].sort().join("|")}`;
  if (seen.has(key)) fail(`${item.id}: identical to ${seen.get(key)}`);
  seen.set(key, item.id);
  if (item.language !== "fr" && !translated.has(item.id) && !EN_ONLY_PILOT.test(item.id)) fail(`${item.id}: no French version`);
}

for (const competency of getAllCompetencies()) {
  if (competency.subjectId === "subject-test-mathematics") continue;
  const questions = all.filter((item) => item.competencyId === competency.id && item.assessmentItemId && item.language !== "fr");
  const purpose = (p: string) => questions.filter((item) => item.metadata?.assessmentPurpose === p).length;
  const mastery = questions.length - purpose("retention") - purpose("transfer");
  if (mastery < 5) fail(`${competency.id}: ${mastery} mastery questions (< 5)`);
  if (purpose("retention") === 0) fail(`${competency.id}: no retention question`);
  if (purpose("transfer") === 0) fail(`${competency.id}: no transfer question`);
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  console.error(`FAIL content-integrity-4e (${failures.length}${failures.length === 25 ? "+" : ""} problems)`);
  process.exit(1);
}

console.log(`PASS content-integrity-4e (${checked} questions, ${getAllCompetencies().length} competencies)`);
process.exit(0);
