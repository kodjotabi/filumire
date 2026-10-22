import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const directory = 'docs/jhs-development/preview-snapshot';
const manifest = JSON.parse(fs.readFileSync(`${directory}/manifest.json`));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
if (hash(fs.readFileSync(`${directory}/tracked.patch`)) !== manifest.patchSha256 || hash(fs.readFileSync(`${directory}/additions.tar`)) !== manifest.additionsTarSha256) throw Error('Snapshot artifact hash mismatch');
const names = execFileSync('tar.exe', ['-tf', `${directory}/additions.tar`], {encoding:'utf8',windowsHide:true}).split(/\r?\n/).filter(Boolean);
if (new Set(names).size !== manifest.source.length || names.length !== manifest.source.length) throw Error('Archive file count mismatch');
for (const file of manifest.source) {
  if (path.isAbsolute(file.path) || file.path.split('/').includes('..') || !names.includes(file.path)) throw Error('Unexpected archive path');
  if (hash(fs.readFileSync(file.path)) !== file.sha256) throw Error(`Working source changed after capture: ${file.path}`);
  // bsdtar treats positional member names as patterns, including Next.js [id].
  const memberPattern = file.path.replace(/[\[\]]/g, '?');
  const archived = execFileSync('tar.exe', ['-xOf', `${directory}/additions.tar`, memberPattern], { maxBuffer:32*1024*1024, windowsHide:true });
  if (hash(archived) !== file.sha256) throw Error(`Archive byte mismatch: ${file.path}`);
}
execFileSync('git', ['apply', '--numstat', `${directory}/tracked.patch`], {windowsHide:true});
const result = { passed:true, sourceFiles:manifest.source.length, exactArchiveBytesVerified:true, patchSyntaxVerified:true, head:manifest.head,
  inheritedOriginsStillMatch:manifest.inheritedSourceOrigins.filter(r=>r.unchangedFromCarriedHash).length, inheritedOriginCount:manifest.inheritedSourceOrigins.length,
  scope:'Read-only verification of archive bytes and source hashes; no restore into another worktree or commit performed' };
fs.writeFileSync(`${directory}/verification.json`, JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
