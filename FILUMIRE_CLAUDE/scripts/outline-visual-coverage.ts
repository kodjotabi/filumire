import { seedContent } from "../services/content-store/seed";
import { buildVisualCoverage } from "../services/outline-visuals/coverage";
seedContent();
const rows = buildVisualCoverage();
const counts = { Complete: 0, Required: 0, "Text-first": 0, Unreviewed: 0 };
for (const row of rows) counts[row.status]++;
console.log(JSON.stringify(process.argv.includes("--json") ? { counts, topics: rows.length, rows } : {
  topics: rows.length, counts, scope: "Registered learner topics; Phase 1 instructional/verified-reflection coverage. Assessed tasks remain text-first.",
}, null, 2));
