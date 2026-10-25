import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { JHS_PREVIEW_COMPETENCIES, JHS_REPRESENTATIVE_CONTENT } from '../services/content-store/jhs-representative-preview';
import { automateJhsCompetencies } from '../services/content-store/jhs-automatic-assessment';
const archive = 'docs/jhs-development/preview-snapshot/additions.tar';
const manifest = JSON.parse(fs.readFileSync('docs/jhs-development/preview-snapshot/manifest.json', 'utf8'));
assert.equal(createHash('sha256').update(fs.readFileSync(archive)).digest('hex'), manifest.additionsTarSha256);
const original = execFileSync('tar.exe', ['-xOf', archive, 'services/content-store/jhs-representative-preview.ts'], { encoding: 'utf8' });
// Evaluate the preserved pre-completion authoring module in memory. No restore,
// backup, second worktree, shared dependency edit or historical evidence mutation.
const bundle = await build({ stdin: { contents: original, loader: 'ts', resolveDir: path.resolve('services/content-store'), sourcefile: 'preserved-preview.ts' },
  bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
  // Freeze the imported materials too: resolving that dependency from today's
  // workspace would silently compare the old preview against Step 0 records.
  plugins: [{ name: 'preserved-materials', setup(builder) {
    builder.onLoad({ filter: /ghana-b7-science-materials-batch\.ts$/ }, () => ({
      contents: execFileSync('tar.exe', ['-xOf', archive, 'services/content-store/ghana-b7-science-materials-batch.ts'], { encoding: 'utf8' }),
      loader: 'ts', resolveDir: path.resolve('services/content-store'),
    }));
  } }],
});
const preserved = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const stable = (items: any[]) => items.map(({ createdAt, updatedAt, ...item }) => item);
assert.deepEqual(JHS_PREVIEW_COMPETENCIES, automateJhsCompetencies(preserved.JHS_PREVIEW_COMPETENCIES));
const historical = JHS_REPRESENTATIVE_CONTENT.filter(c => !c.id.includes('-ccp-auto-')).map(c => {
  const { evidenceRole, ...metadata } = c.metadata!;
  return { ...c, metadata };
});
assert.deepEqual(stable(historical), stable(preserved.JHS_REPRESENTATIVE_CONTENT));
assert.equal(historical.length, 364);
assert.equal(JHS_REPRESENTATIVE_CONTENT.length, 616);
console.log('PASS all 14 definitions have only the Step 0 policy additions; all 364 original bilingual records retain IDs, text, answers, rubrics and provenance');
