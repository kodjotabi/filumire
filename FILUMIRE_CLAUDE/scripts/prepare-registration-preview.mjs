// Local package preparation only. Never calls deployment or database commands.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, sep } from "node:path";
const checkpoint = "a59b9fdf12380bc261f364fbafe1b03d41a02741";
function command(executable, args) {
  const result = spawnSync(executable, args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) throw new Error("local_preparation_command_failed");
  return result.stdout;
}
try {
  if (process.argv.length !== 2) throw new Error("unexpected_arguments");
  if (command("git", ["rev-parse", "HEAD"]).trim() !== checkpoint) throw new Error("incorrect_checkpoint");
  const link = JSON.parse(readFileSync(".vercel/project.json", "utf8"));
  if (link.projectId !== "prj_jozdDNN1pW1q5Ez66e32RvXhbYwC" || link.orgId !== "team_ZGp9TfdK3M45ks3ViQZ9WgSW") throw new Error("incorrect_vercel_target");
  const destination = resolve(".vercel/prepared-registration-a59b9fdf-verified");
  const archive = resolve(".vercel/prepared-registration-a59b9fdf-verified.tar");
  if (existsSync(destination) || existsSync(archive)) throw new Error("existing_release_preserved");
  command("git", ["-c", "core.autocrlf=false", "-c", "core.eol=lf", "archive", "--format=tar", `--output=${archive}`, checkpoint, ".gitignore", "FILUMIRE_CLAUDE"]);
  mkdirSync(destination);
  command("tar", ["-xf", archive, "-C", destination]);
  const entries = command("git", ["ls-tree", "-r", "-z", checkpoint, ".gitignore", "FILUMIRE_CLAUDE"]).split("\0").filter(Boolean);
  let verifiedFiles = 0;
  for (const entry of entries) {
    const match = /^(\d+) blob ([a-f0-9]+)\t([\s\S]+)$/.exec(entry);
    if (!match || !["100644", "100755"].includes(match[1])) throw new Error("unsupported_archive_entry");
    const file = resolve(destination, match[3]);
    if (!file.startsWith(destination + sep)) throw new Error("unsafe_archive_path");
    if (/(^|\/)(node_modules|\.next|\.vercel)(\/|$)/.test(match[3]) || /(^|\/)\.env(?:$|\.)/.test(match[3]) && !match[3].endsWith(".env.example")) throw new Error("unexpected_generated_or_environment_file");
    const data = readFileSync(file);
    const hash = createHash("sha1").update(`blob ${data.length}\0`).update(data).digest("hex");
    if (hash !== match[2]) throw new Error("archive_content_mismatch");
    verifiedFiles++;
  }
  mkdirSync(resolve(destination, ".vercel"));
  writeFileSync(resolve(destination, ".vercel/project.json"), JSON.stringify(link) + "\n", { flag: "wx" });
  const manifest = { checkpoint, project: "filumire-learner", projectId: link.projectId, teamId: link.orgId, previewGitBranch: "filumire-interface-testing", applicationRoot: "FILUMIRE_CLAUDE/apps/learner", destination, verifiedFiles, archiveSha256: createHash("sha256").update(readFileSync(archive)).digest("hex"), containsLocalEnvironmentFiles: false, externalDeploymentPerformed: false, remotePrerequisitesVerified: false };
  writeFileSync(".vercel/registration-preview-package.json", JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify(manifest, null, 2));
} catch (error) {
  console.error(JSON.stringify({ preparationFailed: true, reason: error.message }));
  process.exitCode = 1;
}
