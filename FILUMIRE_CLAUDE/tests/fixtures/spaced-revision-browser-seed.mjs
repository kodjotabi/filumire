// Loaded only by the isolated browser runner, before its server starts.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { revisionFixture } from "./spaced-revision.ts";
if (process.env.FILUMIRE_PERSISTENCE !== "memory" || !process.env.FILUMIRE_NAVIGATION_ARTIFACTS ||
    new URL(process.env.DATABASE_URL).port !== "1") throw Error("Isolated revision seed configuration required");
const fixtures = [];
for (const width of [320, 1280]) for (const language of ["en", "fr"]) {
  fixtures.push({ width, language, ...await revisionFixture(language, `${language}.${width}`) });
}
writeFileSync(join(process.env.FILUMIRE_NAVIGATION_ARTIFACTS, "revision-fixtures.json"), JSON.stringify(fixtures, null, 2), { flag: "wx" });
