import fs from "node:fs";
import path from "node:path";

/** Worktree-safe read access to the existing original PDFs; never copies them. */
export function ccpSourcePath(relative: string) {
  const manifest = JSON.parse(fs.readFileSync("docs/jhs-development/lineage-manifest.json", "utf8"));
  const file = path.join(process.env.FILUMIRE_CCP_SOURCE_ROOT ?? manifest.sourcePdfRoot, path.basename(relative));
  if (!fs.statSync(file).isFile()) throw new Error(`Official source unavailable: ${file}`);
  return file;
}
