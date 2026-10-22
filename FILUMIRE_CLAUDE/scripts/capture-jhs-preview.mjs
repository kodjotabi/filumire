import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'docs/jhs-development/preview-snapshot');
fs.mkdirSync(output, { recursive: true });
const git = args => execFileSync('git', args, { cwd: root, maxBuffer: 32 * 1024 * 1024, windowsHide: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const allowed = file => /^(apps|packages|services|scripts|tests)\//.test(file) || /^(package(-lock)?\.json|tsconfig\.json)$/.test(file) || file.startsWith('docs/curriculum-sources/ghana/ccp-b7-b9/') || ['docs/jhs-development/lineage-manifest.json', 'docs/jhs-development/ARCHITECTURE-DECISION.md', 'docs/jhs-development/MINISTERIAL-PREVIEW.md', 'docs/jhs-development/preview-competency-matrix.json', 'docs/jhs-development/preview-coverage-summary.json', 'docs/jhs-development/preview-validation-summary.json'].includes(file);
const lines = buffer => buffer.toString('utf8').split(/\r?\n/).filter(Boolean);
const tracked = lines(git(['diff', '--name-only', '--relative', '--', '.'])).filter(allowed);
const added = lines(git(['ls-files', '--others', '--exclude-standard', '--', '.'])).filter(allowed);
if ([...tracked, ...added].some(file => file.includes('..') || /(^|\/)\.env/.test(file) || file.endsWith('.pdf'))) throw Error('Unexpected snapshot input');
// This is an authorised reviewable source patch, not a duplicate project folder.
const patch = git(['diff', '--binary', '--relative', '--', ...tracked]);
fs.writeFileSync(path.join(output, 'tracked.patch'), patch);
// Include the exact raw bytes of modified files too: Git patches can normalise
// CRLF. This bounded delta archive preserves mixed Windows line endings.
fs.writeFileSync(path.join(output, 'additions-list.txt'), [...tracked, ...added].join('\n') + '\n');
execFileSync('tar.exe', ['-cf', path.join(output, 'additions.tar'), '-T', path.join(output, 'additions-list.txt')], { cwd: root, windowsHide: true });
const source = [...tracked, ...added].sort().map(file => ({ path: file, state: added.includes(file) ? 'untracked_addition' : 'tracked_modified', sha256: hash(fs.readFileSync(path.join(root, file))) }));
const lineage = JSON.parse(fs.readFileSync(path.join(root, 'docs/jhs-development/lineage-manifest.json')));
const origins = lineage.records.map(r => ({ origin: r.origin, unchangedFromCarriedHash: fs.existsSync(r.origin) && hash(fs.readFileSync(r.origin)) === r.sha256 }));
const manifest = { capturedAt: new Date().toISOString(), head: git(['rev-parse', 'HEAD']).toString().trim(), branch: git(['branch', '--show-current']).toString().trim(), worktree: root, node: process.version,
  source, patchSha256: hash(patch), additionsTarSha256: hash(fs.readFileSync(path.join(output, 'additions.tar'))),
  lockfileSha256: hash(fs.readFileSync(path.join(root, 'package-lock.json'))),
  gitStatus: git(['status', '--porcelain=v1', '--untracked-files=all']).toString(), inheritedSourceOrigins: origins,
  exclusions: ['credentials', 'dependencies', 'build caches', 'official PDFs', 'screenshots and volatile logs'],
  reconstruction: 'Use the recorded HEAD in a separate disposable checkout. Review tracked.patch; extract additions.tar inside FILUMIRE_CLAUDE to restore exact raw modified and added file bytes, including Windows line endings. Verify every source SHA-256. Never extract over another worktree’s uncommitted work.',
};
fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Captured ${tracked.length} modified files and ${added.length} additions at ${manifest.head}; no commit, migration or deployment.`);
