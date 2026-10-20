// Read-only check that a FILUMIRE Demo folder is the accepted build.
// Hashes every file except data/ (the owner's progress, logs and browser
// profile) and compares the result with ACCEPTANCE.md. Changes nothing.
//
//   node filumire-investor-demo/verify-accepted.mjs ["path/to/FILUMIRE Demo"]
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ACCEPTED = "1ff68051e69a25744c9d47d45d9f0e3c8d03bda2a39253e504feda8725f14c0f";
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(process.argv[2] ?? join(here, "dist", "FILUMIRE Demo"));

const files = [];
(function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name), rel = relative(root, path).split(sep).join("/");
    if (rel === "data") continue;
    entry.isDirectory() ? walk(path) : files.push(rel);
  }
})(root);
files.sort();
const fingerprint = createHash("sha256");
for (const file of files) fingerprint.update(`${file}\0${createHash("sha256").update(readFileSync(join(root, file))).digest("hex")}\n`);
const actual = fingerprint.digest("hex");
console.log(`${files.length} files\nfingerprint ${actual}`);
console.log(actual === ACCEPTED ? "MATCH: this is the accepted demo build." : "DIFFERENT: this is not the accepted demo build.");
process.exitCode = actual === ACCEPTED ? 0 : 1;
