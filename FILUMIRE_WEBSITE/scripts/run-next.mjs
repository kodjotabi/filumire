// Local verification runner; uses the existing installation without changing other projects.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
process.chdir(fileURLToPath(new URL("../", import.meta.url)));
process.env.NEXT_TELEMETRY_DISABLED = "1";
require("next/dist/bin/next");
