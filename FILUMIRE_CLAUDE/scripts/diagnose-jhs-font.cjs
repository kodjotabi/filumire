// Read-only instrumentation of Next's font parser. Never changes its result.
const fs = require('node:fs');
const path = require('node:path');
const parser = require('next/dist/compiled/@next/font/dist/google/find-font-files-in-css');
const original = parser.findFontFilesInCss;
parser.findFontFilesInCss = function (css, subsets) {
  const result = original(css, subsets);
  const invalid = result.filter(({ googleFontFileUrl }) => !/\.(woff|woff2|eot|ttf|otf)$/.test(googleFontFileUrl));
  if (invalid.length) {
    fs.writeFileSync(path.resolve(__dirname, '../docs/jhs-development/font-diagnostic-' + process.pid + '.json'), JSON.stringify({ invalid, css }, null, 2));
  }
  return result;
};
