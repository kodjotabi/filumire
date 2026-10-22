import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const module = require('next/dist/compiled/@next/font/dist/fontkit');
const parse = module.default.default || module.default;
const root = new URL('../public/fonts/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));

test('bundled font assets retain their original bytes and requested weight support', async () => {
  for (const asset of manifest.assets) {
    const bytes = await readFile(new URL(asset.file, root));
    assert.equal(bytes.subarray(0,4).toString(), 'wOF2');
    assert.equal(bytes.length, asset.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256);
    const font = parse(bytes);
    assert.ok(font.familyName.startsWith(asset.family));
    if (asset.family === 'Montserrat') {
      for (const weight of asset.weights) assert.ok(weight >= font.variationAxes.wght.min && weight <= font.variationAxes.wght.max);
    } else assert.equal(font.subfamilyName, asset.weights[0] === 700 ? 'Bold' : 'Regular');
  }
});
test('the bundled regular and bold fonts cover French accents and ligatures', async () => {
  const characters = 'ÀÂÇÉÈÊËÎÏÔÙÛÜŸàâçéèêëîïôùûüÿŒœ';
  for (const family of ['Montserrat','Kalam']) for (const weight of [400,700]) {
    const supported = new Set();
    for (const asset of manifest.assets.filter(asset => asset.family === family && asset.weights.includes(weight))) {
      const font = parse(await readFile(new URL(asset.file, root)));
      for (const point of font.characterSet) supported.add(point);
    }
    for (const character of characters) assert.ok(supported.has(character.codePointAt(0)), family + ' ' + weight + ' missing ' + character);
  }
});
