// Read-only source inspection. Never edits/copies the existing official PDFs.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
const out = 'docs/audits/basic4-6-completion/reconciliation';
fs.mkdirSync(out, { recursive: true });
const shared = 'C:/FILUMIRE/filumire-batch1/FILUMIRE_WEBSITE';
const pdfjsPath = process.env.FILUMIRE_PDFJS_MODULE ?? 'C:/Users/tabi/AppData/Local/Temp/filumire-b7-pdf-tools/node_modules/pdfjs-dist/legacy/build/pdf.mjs';
const pdfjs = await import(pathToFileURL(pdfjsPath).href);
const sources = JSON.parse(fs.readFileSync(`${shared}/src/lib/curriculum/sources.json`, 'utf8'));
const urls = {
  english: 'https://nacca.gov.gh/wp-content/uploads/2019/06/ENGLISH-B4-B6.pdf',
  mathematics: 'https://nacca.gov.gh/wp-content/uploads/2019/04/MATHS-UPPER-PRIMARY-B4-B6.pdf',
  science: 'https://nacca.gov.gh/wp-content/uploads/2019/04/SCIENCE-UPPER-PRIMARY-B4-B6.pdf',
  computing: 'https://nacca.gov.gh/wp-content/uploads/2019/04/COMPUTING-B4-B6.pdf',
};
const manifest = [];
for (const s of sources) {
  const localPath = `${shared}/public${s.file}`;
  const bytes = fs.readFileSync(localPath);
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== s.sha256) throw Error(`Shared source changed: ${localPath}`);
  const task = pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: true, isEvalSupported: false });
  const pdf = await task.promise;
  const pages = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n), viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items = content.items.filter(i => 'str' in i && i.str.trim()).map(i => ({ text: i.str, x: i.transform[4], y: viewport.height - i.transform[5], width: i.width, height: i.height }));
    const groups = [];
    for (const item of [...items].sort((a, b) => a.y - b.y || a.x - b.x)) {
      let line = groups.find(g => Math.abs(g.y - item.y) < 1.6);
      if (!line) { line = { y: item.y, items: [] }; groups.push(line); }
      line.items.push(item);
    }
    const lines = groups.sort((a, b) => a.y - b.y).map(g => ({ y: g.y, items: g.items.sort((a, b) => a.x - b.x), text: g.items.sort((a, b) => a.x - b.x).map(i => i.text).join(' ').replace(/\s+/g, ' ').trim() }));
    pages.push({ page: n, width: viewport.width, height: viewport.height, lines, text: lines.map(l => l.text).join('\n') });
  }
  const meta = await pdf.getMetadata();
  fs.writeFileSync(`${out}/${s.id}-pages.json`, JSON.stringify(pages, null, 2) + '\n');
  fs.writeFileSync(`${out}/${s.id}-pages.txt`, pages.map(p => `\n=== PHYSICAL PDF PAGE ${p.page} ===\n${p.text}`).join('\n') + '\n');
  manifest.push({ subject: s.id, localPath, sha256, bytes: bytes.length, pdfPages: pdf.numPages,
    sourceUrl: urls[s.id], existingManifestHashMatches: true, existingManifest: `${shared}/src/lib/curriculum/sources.json`,
    publisherClaim: s.authority, editionClaim: s.edition, gradeRange: 'Basic 4–6',
    provenanceStatus: 'existing local document; checksum agrees with existing repository manifest; official HTTPS not re-downloaded',
    coverAndPublicationText: pages.slice(0, 3).map(p => ({ page: p.page, text: p.text })), metadata: meta.info });
  console.log(JSON.stringify({ subject: s.id, pages: pdf.numPages, sha256, cover: pages[0].text.slice(0, 350) }));
  await task.destroy();
}
fs.writeFileSync(`${out}/source-manifest.json`, JSON.stringify({ checkedAt: new Date().toISOString(), sources: manifest }, null, 2) + '\n');
