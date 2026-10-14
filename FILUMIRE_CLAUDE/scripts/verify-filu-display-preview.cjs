const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const source = JSON.parse(fs.readFileSync(path.join(root, '.vercel/filu-display-preview-source.json')));
const previous = JSON.parse(fs.readFileSync(path.join(root, '.vercel/audit2-preview-source.json')));
const old = new Map(previous.manifest.map(item => [item.file, item.sha256]));
for (const item of source.manifest) {
 for (const file of [path.join(root, '..', item.file), path.join(source.destination, item.file)]) {
  if (createHash('sha256').update(fs.readFileSync(file)).digest('hex') !== item.sha256) throw new Error(`Hash mismatch: ${item.file}`);
 }
}
const project = JSON.parse(fs.readFileSync(path.join(source.destination, '.vercel/project.json')));
if (project.projectId !== source.projectId || project.orgId !== source.teamId) throw new Error('Project mismatch');
const report = { filesVerified: source.files, sourceHash: source.sourceHash, changed: source.manifest.filter(item => old.has(item.file) && old.get(item.file) !== item.sha256).map(item => item.file), added: source.manifest.filter(item => !old.has(item.file)).map(item => item.file), excludedEnvironmentFiles: !source.manifest.some(item => /(^|\/)\.env/.test(item.file)) };
const dryFile = path.join(root, '.vercel/filu-display-preview-dry.json');
if (fs.existsSync(dryFile)) {
 const bytes = fs.readFileSync(dryFile);
 const dry = JSON.parse(bytes.toString(bytes[0] === 255 ? 'utf16le' : 'utf8').replace(/^\uFEFF/, ''));
 const upload = new Map(dry.files.map(item => [item.path,item.sha]));
 for (const item of source.manifest) if (upload.get(item.file) !== item.sha) throw new Error(`Upload mismatch: ${item.file}`);
 report.uploadVerified = true; report.extraUploadFiles = dry.files.filter(item => !source.manifest.some(file => file.file === item.path)).map(item => item.path);
}
fs.writeFileSync(path.join(root, '.vercel/filu-display-preview-verification.json'), JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
