import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const root = 'C:/Users/tabi/AppData/Local/Temp/filumire-b7-pdf-tools/node_modules';
const pdfjs = await import(pathToFileURL(`${root}/pdfjs-dist/legacy/build/pdf.mjs`).href);
const { createCanvas } = await import(pathToFileURL(`${root}/@napi-rs/canvas/index.js`).href);
const out = 'docs/audits/basic4-6-completion/reconciliation';
fs.mkdirSync(`${out}/page-review`, { recursive: true });
const manifest = JSON.parse(fs.readFileSync(`${out}/source-manifest.json`, 'utf8'));
const selections = { english: [1, 33, 63, 96, 151, 176, 193, 194, 227, 239], mathematics: [1, 59, 60, 67, 86, 88, 98, 122, 123, 149, 151, 167, 168, 171, 176, 182], science: [1, 24, 39, 44, 58, 67], computing: [1, 36, 48, 51, 52, 59, 73] };
for (const source of manifest.sources) {
  const task = pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(source.localPath)), useSystemFonts: true, isEvalSupported: false,
    wasmUrl: `${root}/pdfjs-dist/wasm/`, standardFontDataUrl: `${root}/pdfjs-dist/standard_fonts/` });
  const pdf = await task.promise;
  for (const n of selections[source.subject]) {
    const page = await pdf.getPage(n), viewport = page.getViewport({ scale: 1.6 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await page.render({ canvasContext: canvas.getContext('2d'), viewport, canvas }).promise;
    fs.writeFileSync(`${out}/page-review/${source.subject}-pdf${n}.png`, canvas.toBuffer('image/png'));
  }
  await task.destroy();
  console.log(`${source.subject}: rendered ${selections[source.subject].length} source review pages`);
}
