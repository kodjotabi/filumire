// Copy current learner source only. No deployment, environment or database mutation.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
const source = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(source, '..');
const project = JSON.parse(readFileSync(resolve(repo, '.vercel/project.json'), 'utf8'));
if (project.projectId !== 'prj_jozdDNN1pW1q5Ez66e32RvXhbYwC' || project.orgId !== 'team_ZGp9TfdK3M45ks3ViQZ9WgSW') throw new Error('Wrong project/team');
const paths = [];
function walk(relative) {
 for (const entry of readdirSync(resolve(source, relative), { withFileTypes: true })) {
  if (entry.isSymbolicLink()) throw new Error(`Unexpected source link: ${relative}/${entry.name}`);
  if (/^(node_modules|\.next|\.vercel|\.git|\.turbo|coverage|out)$/.test(entry.name) || /^\.env/.test(entry.name)) continue;
  const path = `${relative}/${entry.name}`;
  if (entry.isDirectory()) walk(path);
  else if (entry.isFile() && !/\.(tsbuildinfo|log|sql|csv|bak|dump|sqlite|db)$/.test(entry.name)) paths.push(path);
 }
}
for (const dir of ['apps/learner', 'services', 'packages']) walk(dir);
for (const path of ['package.json', 'package-lock.json', 'tsconfig.json']) paths.push(path);
paths.sort();
const secrets = new Set();
for (const path of [resolve(repo, '.vercel/.env.preview.private.local'), resolve(source, '.env.local'), resolve(source, '.env.preview-accounts.local'), resolve(source, 'apps/learner/.env.local')]) {
 if (!existsSync(path)) continue;
 for (const [key, value] of Object.entries(parseEnv(readFileSync(path, 'utf8')))) {
  if (/SECRET|TOKEN|PASSWORD|DATABASE_URL|POSTGRES_URL|API_KEY/.test(key) && value.length >= 16) secrets.add(value);
  if (/URL/.test(key)) { try { const password = decodeURIComponent(new URL(value).password); if (password.length >= 12) secrets.add(password); } catch {} }
 }
}
const manifest = paths.map(path => {
 const data = readFileSync(resolve(source, path));
 if ([...secrets].some(secret => data.includes(Buffer.from(secret)))) throw new Error(`Known secret in source: ${path}`);
 return { file: `FILUMIRE_CLAUDE/${path}`, sha: createHash('sha1').update(data).digest('hex'), sha256: createHash('sha256').update(data).digest('hex'), size: data.length };
});
const sourceHash = createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
const destination = resolve(source, '.vercel', `login-filu-preview-${sourceHash.slice(0, 12)}`);
if (existsSync(destination)) throw new Error('Existing staging package preserved');
for (const file of manifest) {
 const target = resolve(destination, file.file);
 if (!target.startsWith(destination + sep)) throw new Error('Unsafe output path');
 mkdirSync(dirname(target), { recursive: true });
 const data = readFileSync(resolve(repo, file.file));
 writeFileSync(target, data, { flag: 'wx' });
 if (!readFileSync(target).equals(data)) throw new Error('Copy verification failed');
}
mkdirSync(resolve(destination, '.vercel'));
writeFileSync(resolve(destination, '.vercel/project.json'), JSON.stringify(project), { flag: 'wx' });
writeFileSync(resolve(destination, '.vercelignore'), '.vercel\n.env*\n**/.env*\nnode_modules\n**/node_modules\n**/.next\n', { flag: 'wx' });
const report = { sourceHash, destination, projectId: project.projectId, teamId: project.orgId, rootDirectory: 'FILUMIRE_CLAUDE/apps/learner', files: manifest.length, bytes: manifest.reduce((total, file) => total + file.size, 0), currentLocalSource: true, copiedByteIdentically: true, containsEnvironmentFiles: false, knownSecretMatches: 0, manifest };
writeFileSync(resolve(source, '.vercel/login-filu-preview-final-source.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, manifest: undefined }, null, 2));
