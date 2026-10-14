const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const source = JSON.parse(fs.readFileSync(path.join(root, '.vercel/audited-private-preview-source.json')));
const dry = JSON.parse(fs.readFileSync(path.join(root, '.vercel/audited-private-preview-dry.json'), 'utf16le').replace(/^\uFEFF/, ''));
const uploaded = new Map(dry.files.map(file => [file.path, file.sha]));
for (const item of source.manifest) {
  for (const filename of [path.join(root, '..', item.file), path.join(source.destination, item.file)]) {
    if (createHash('sha256').update(fs.readFileSync(filename)).digest('hex') !== item.sha256) throw new Error(`Source changed: ${item.file}`);
  }
  if (uploaded.get(item.file) !== item.sha) throw new Error(`Upload mismatch: ${item.file}`);
}
console.log(JSON.stringify({ filesVerified: source.files, sourceHash: source.sourceHash, extraUploadFiles: dry.files.filter(file => !source.manifest.some(item => item.file === file.path)).map(file => file.path), ignored: dry.ignored }));
