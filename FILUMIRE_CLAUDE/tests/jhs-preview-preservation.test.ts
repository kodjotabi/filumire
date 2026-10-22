import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { JHS_PREVIEW_COMPETENCIES, JHS_REPRESENTATIVE_CONTENT } from '../services/content-store/jhs-representative-preview';
const archive = 'docs/jhs-development/preview-snapshot/additions.tar';
const manifest = JSON.parse(fs.readFileSync('docs/jhs-development/preview-snapshot/manifest.json', 'utf8'));
assert.equal(createHash('sha256').update(fs.readFileSync(archive)).digest('hex'), manifest.additionsTarSha256);
const original = execFileSync('tar.exe', ['-xOf', archive, 'services/content-store/jhs-representative-preview.ts'], { encoding: 'utf8' });
// Evaluate the preserved pre-completion authoring module in memory. No restore,
// backup, second worktree, shared dependency edit or historical evidence mutation.
const bundle = await build({ stdin: { contents: original, loader: 'ts', resolveDir: path.resolve('services/content-store'), sourcefile: 'preserved-preview.ts' },
  bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
const preserved = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const stable = (items: any[]) => items.map(({ createdAt, updatedAt, ...item }) => item);
assert.deepEqual(JHS_PREVIEW_COMPETENCIES, preserved.JHS_PREVIEW_COMPETENCIES);
assert.deepEqual(stable(JHS_REPRESENTATIVE_CONTENT), stable(preserved.JHS_REPRESENTATIVE_CONTENT));
assert.equal(JHS_REPRESENTATIVE_CONTENT.length, 364);
console.log('PASS all 14 preserved preview definitions and 364 bilingual teaching/assessment records match the verified prior snapshot');
