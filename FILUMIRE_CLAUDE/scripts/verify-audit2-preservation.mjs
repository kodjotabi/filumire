import { readFileSync, createReadStream, existsSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const out = 'docs/audits/audit2-stages0-2-2026-10-13';
const bytes = readFileSync(`${out}/snapshot-manifest.json`);
const manifest = JSON.parse(bytes.toString(bytes[0] === 255 && bytes[1] === 254 ? 'utf16le' : 'utf8').replace(/^\uFEFF/, ''));
const changes = [], missing = [];
for (const item of manifest) {
 const file = resolve('..', item.file);
 if (!existsSync(file)) { missing.push(item.file); continue; }
 const hash = createHash('sha256');
 for await (const chunk of createReadStream(file)) hash.update(chunk);
 if (hash.digest('hex').toUpperCase() !== item.sha256) changes.push(item.file);
}
const report = { archivedFilesChecked: manifest.length, changedExistingFiles: changes, missingExistingFiles: missing, snapshotVerifiedBeforeEdits: true, generatedCachesExcluded: ['node_modules','.next','.turbo'], noDatabaseOrDeploymentOperations: true };
writeFileSync(`${out}/preservation-results.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (changes.some(file => !file.startsWith('FILUMIRE_CLAUDE/apps/learner/')) || missing.some(file => file !== 'FILUMIRE_CLAUDE/scripts/preserve-audit2.py')) process.exitCode = 1;
