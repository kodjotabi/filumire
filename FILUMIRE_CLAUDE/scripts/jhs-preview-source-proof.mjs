import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { JHS_PREVIEW_SOURCES } from '../services/content-store/jhs-representative-preview.ts';
import { CCP_SOURCE_REGISTRATIONS } from '../packages/curriculum/ghana-ccp-runtime.ts';

const toolRoot = process.env.FILUMIRE_PDF_TOOLS ?? 'C:/Users/tabi/AppData/Local/Temp/filumire-b7-pdf-tools/node_modules';
const { getDocument } = await import(pathToFileURL(path.join(toolRoot, 'pdfjs-dist/legacy/build/pdf.mjs')).href);
const { createCanvas } = await import(pathToFileURL(path.join(toolRoot, '@napi-rs/canvas/index.js')).href);
const sourceRoot = process.env.FILUMIRE_CCP_SOURCE_ROOT ?? JSON.parse(fs.readFileSync('docs/jhs-development/lineage-manifest.json')).sourcePdfRoot;
const sourceBatches = [
  { flag:'--science-foundations', id:'batch02-b7-science-foundations', low:41, high:52, count:13 },
  { flag:'--science-systems', id:'batch03-b7-science-systems', low:53, high:62, count:9 },
  { flag:'--science-energy', id:'batch04-b7-science-energy', low:63, high:67, count:6 },
  { flag:'--science-mechanics', id:'batch05-b7-science-mechanics', low:68, high:76, count:13 },
  { flag:'--science-environment', id:'batch06-b7-science-environment', low:78, high:87, count:9 },
];
const selections=sourceBatches.filter(b=>process.argv.includes(b.flag));
assert(selections.length<=1,'Select one source batch');
const selected=selections[0];
const selectedSources=selected?CCP_SOURCE_REGISTRATIONS.filter(r=>r.gradeId==='level-gh-basic-7-ccp'&&r.source.documentId==='science'&&r.source.pdfPages[0]>=selected.low&&r.source.pdfPages[0]<=selected.high):JHS_PREVIEW_SOURCES;
if(selected)assert.equal(selectedSources.length,selected.count);
const output=selected?`docs/jhs-development/completion/${selected.id}/source-review`:'docs/jhs-development/preview-source-review';
fs.mkdirSync(output, { recursive: true });
const documents = new Map(), loadingTasks = [], pages = new Map(), results = [];
try {
  for (const row of selectedSources) {
    const source = row.source;
    if (!documents.has(source.documentId)) {
      const bytes = fs.readFileSync(path.join(sourceRoot, path.basename(source.localPath)));
      assert.equal(createHash('sha256').update(bytes).digest('hex'), source.sha256);
      const task = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true, isEvalSupported: false,
        standardFontDataUrl: pathToFileURL(path.join(toolRoot, 'pdfjs-dist/standard_fonts/')).href,
        wasmUrl: pathToFileURL(path.join(toolRoot, 'pdfjs-dist/wasm/')).href });
      loadingTasks.push(task);
      const pdf = await task.promise;
      documents.set(source.documentId, pdf);
    }
    const pdfPage = source.pdfPages[0], key = `${source.documentId}-${pdfPage}`;
    // Continuation pages are part of the activity evidence, not just the code header.
    for (const pageNumber of source.pdfPages) {
    const key = `${source.documentId}-${pageNumber}`;
    if (!pages.has(key)) {
      const page = await documents.get(source.documentId).getPage(pageNumber);
      const text = (await page.getTextContent()).items.map(i => i.str ?? '').join(' ');
      const viewport = page.getViewport({ scale: 1.2 }), canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      fs.writeFileSync(`${output}/${key}.png`, canvas.toBuffer('image/png'));
      fs.writeFileSync(`${output}/${key}.txt`, text);
      pages.set(key, text);
    }
    }
    assert(pages.get(key).replace(/\s/g, '').includes(row.officialCode.replace(/\s/g, '')), `Printed code absent on pinned page: ${row.id}`);
    results.push({ competencyId: row.id, officialCodeAsPrinted: row.officialCode, sha256: source.sha256, localPath: path.join(sourceRoot, path.basename(source.localPath)), pdfPage, pdfPages: source.pdfPages, renderedPage: `${output}/${key}.png`, renderedPages: source.pdfPages.map(p => `${output}/${source.documentId}-${p}.png`), printedCodeVerified: true, sourceIssueIds: [...row.sourceIssueIds, ...row.globalSourceIssueIds], educationalApproval: 'pending' });
  }
  fs.writeFileSync(`${output}/results.json`, JSON.stringify(results, null, 2) + '\n');
  console.log(`PASS ${results.length} literal indicator codes on ${pages.size} rendered source pages; ${documents.size} pinned PDF hashes. Pedagogical approval remains pending.`);
} finally {
  for (const task of loadingTasks) await task.destroy();
}
