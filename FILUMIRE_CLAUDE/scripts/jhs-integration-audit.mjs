import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repository = path.dirname(root);
const baseline = JSON.parse(fs.readFileSync(process.env.FILUMIRE_JHS_BASELINE ?? path.resolve(repository, '../jhs-integration-baseline.json'), 'utf8'));
const output = path.join(root, 'docs/jhs-development/integration');
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const old = new Map(baseline.records.map(row => [row.path, row.sha256]));
const originalChanges = baseline.records.filter(row => {
  const file = path.join(baseline.source, row.path);
  return !fs.existsSync(file) || hash(file) !== row.sha256;
}).map(row => row.path);
if (originalChanges.length) throw new Error(`Original workspace changed: ${originalChanges.join(', ')}`);
const excluded = new Set(['.git', '.next', '.vercel', 'node_modules', '.worktrees']);
const changes = [];
function walk(dir, relative = '') {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (excluded.has(item.name) || /^\.env/.test(item.name) || item.name.endsWith('.tsbuildinfo')) continue;
    const file = path.join(dir, item.name), name = path.posix.join(relative, item.name);
    if (item.isSymbolicLink()) continue;
    if (item.isDirectory()) walk(file, name);
    else if (item.isFile()) {
      const sha256 = hash(file);
      if (old.get(name) !== sha256 && !name.endsWith('/files-changed.json')) changes.push({ path: name, status: old.has(name) ? 'modified' : 'added', beforeSha256: old.get(name) ?? null, sha256 });
    }
  }
}
walk(repository);
fs.writeFileSync(path.join(output, 'files-changed.json'), JSON.stringify({
  baselineHead: baseline.head, branch: 'feat/jhs7-9-development', workingRepository: repository,
  preservedOriginal: { path: baseline.source, filesChecked: baseline.records.length, changed: originalChanges },
  description: 'Delta against the exact inherited working files, including uncommitted work; not against HEAD alone. No commits or remote writes.',
  changes,
}, null, 2) + '\n');
console.log(JSON.stringify({ changedOrAddedFiles: changes.length, originalFilesUnchanged: baseline.records.length }));
