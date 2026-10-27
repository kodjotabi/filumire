import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import ts from "typescript";
async function load(path){const source=await readFile(new URL(path,import.meta.url),"utf8");return import("data:text/javascript;base64,"+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString("base64"));}
const {COUNTRIES,INTERNATIONAL_COPY,isInternationalPath}=await load("../src/lib/international.ts");
const {PAGE_ROUTES}=await load("../src/lib/locale.ts");

test("country selection offers Ghana, Côte d’Ivoire and Nigeria with real routes",()=>{
 assert.deepEqual(COUNTRIES.map(c=>c.id),["ghana","cote-divoire","nigeria"]);
 for(const country of COUNTRIES){assert.ok(PAGE_ROUTES.includes(country.href),country.href+" is a published route");for(const locale of ["en","fr"])assert.ok(country.name[locale]&&country.summary[locale]);}
 const ghana=COUNTRIES[0];assert.equal(ghana.status,"available");assert.equal(ghana.summary.en,"Primary Basic 4–6 • JHS 1–3");
 for(const country of COUNTRIES.slice(1)){assert.equal(country.status,"coming-soon");assert.equal(country.summary.en,"Coming soon");assert.equal(country.summary.fr,"Bientôt disponible");}
});

test("English and French copy are complete and the CTA leads in the selected language",()=>{
 const en=INTERNATIONAL_COPY.en,fr=INTERNATIONAL_COPY.fr;
 assert.deepEqual(Object.keys(en).sort(),Object.keys(fr).sort());
 assert.equal(en.headline.join(""),"Learning that understands every child.");
 assert.equal(fr.headline.join(""),"Un apprentissage qui comprend chaque enfant.");
 assert.equal(en.ctaPrimary,"Choose Your Country");assert.equal(fr.ctaPrimary,"Choisissez votre pays");
 assert.equal(en.subtitle.join(" "),fr.headline.join(""));assert.equal(fr.subtitle.join(" "),en.headline.join(""));
 for(const [key,value] of Object.entries(fr))if(typeof value==="string"&&!["subtitle","subtitleLang","ctaSecondary"].includes(key))assert.notEqual(value,en[key],key+" is translated");
 assert.match(fr.soonBody("Côte d’Ivoire"),/la Côte d’Ivoire/);assert.match(fr.soonBody("Nigeria"),/le Nigeria/);
});

test("international pages use their own frame; the Ghana site keeps its navigation",()=>{
 for(const path of ["/","/fr","/fr/","/cote-divoire","/fr/cote-divoire","/nigeria","/fr/nigeria"])assert.ok(isInternationalPath(path),path);
 for(const path of ["/ghana","/fr/ghana","/how-it-works","/fr/contact","/francophone","/nigeria-schools"])assert.ok(!isInternationalPath(path),path);
});

test("the Ghana homepage keeps the original home template and the landing has no flags",async()=>{
 const pages=await readFile(new URL("../src/lib/pages.tsx",import.meta.url),"utf8");
 assert.match(pages,/"\/ghana":Home/);
 const sources=await Promise.all(["InternationalLanding.tsx","InternationalShell.tsx","CountryComingSoon.tsx"].map(f=>readFile(new URL("../src/components/international/"+f,import.meta.url),"utf8")));
 for(const source of sources)assert.doesNotMatch(source,/flag|[\u{1F1E6}-\u{1F1FF}]/iu);
 assert.match(sources[0],/<button[^>]*className="intl-cta"/);assert.match(sources[0],/<dialog/);
});
