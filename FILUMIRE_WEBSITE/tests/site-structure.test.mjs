/* Public website overhaul (27 Oct 2026): structure, bilingual copy, subjects and public wording. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFile,readdir,access} from "node:fs/promises";
import ts from "typescript";
async function load(path){const source=await readFile(new URL(path,import.meta.url),"utf8");return import("data:text/javascript;base64,"+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString("base64"));}
const read=path=>readFile(new URL(path,import.meta.url),"utf8");
const exists=path=>access(new URL(path,import.meta.url)).then(()=>true,()=>false);
const site=await load("../src/lib/site.ts");
const pages=await load("../src/lib/site-pages.ts");
const {PAGE_ROUTES}=await load("../src/lib/locale.ts");

test("one brand homepage at / with the full information architecture",async()=>{
 assert.deepEqual([...PAGE_ROUTES],["/","/how-it-works","/subjects","/learners","/parents","/schools","/about","/contact","/privacy","/ghana","/cote-divoire","/nigeria"]);
 assert.deepEqual(site.NAV_LINKS.map(link=>link.href),["/how-it-works","/subjects","/learners","/parents","/schools","/about"]);
 const router=await read("../src/lib/pages.tsx");
 assert.match(router,/"\/": HomePage/);
 assert.doesNotMatch(router,/International|CountryChooser/);
 const frame=await read("../src/components/layout/SiteFrame.tsx");
 assert.doesNotMatch(frame,/international/i,"every page shares one header and footer");
 const header=await read("../src/components/site/SiteHeader.tsx");
 assert.match(header,/id="primary-navigation"/);assert.match(header,/aria-controls="primary-navigation"/);assert.match(header,/data-language-switch="true"/);
});

test("countries: Ghana covers Basic 4 through JHS 3, the others are coming soon",()=>{
 assert.deepEqual(site.COUNTRIES.map(c=>c.id),["ghana","cote-divoire","nigeria"]);
 for(const country of site.COUNTRIES){assert.ok(PAGE_ROUTES.includes(country.href));for(const locale of ["en","fr"])assert.ok(country.name[locale]&&country.summary[locale]);}
 assert.equal(site.COUNTRIES[0].status,"available");
 assert.equal(site.COUNTRIES[0].summary.en,"From Basic 4 through JHS 3");assert.equal(site.COUNTRIES[0].summary.fr,"De Basic 4 à JHS 3");
 for(const country of site.COUNTRIES.slice(1)){assert.equal(country.status,"coming-soon");assert.equal(country.summary.en,"Coming soon");assert.equal(country.summary.fr,"Bientôt disponible");}
 assert.ok(pages.HOME_COPY.en.facts.includes("Basic 4 through JHS 3"));
 assert.match(pages.SOON_COPY.fr.text("Côte d’Ivoire"),/la Côte d’Ivoire/);assert.match(pages.SOON_COPY.fr.text("Nigeria"),/le Nigeria/);
 assert.equal(pages.SOON_COPY.fr.title("Nigeria"),"FILUMIRE au Nigeria");
});

test("subjects match the learner app: four active, eight JHS Curriculum Review, none for Basic 4–6 yet",async()=>{
 assert.deepEqual(site.ACTIVE_SUBJECTS.map(s=>s.key),["english","mathematics","science","computing"]);
 assert.deepEqual(site.REVIEW_SUBJECTS.jhs.map(s=>s.key),["ghanaian-language","french","arabic","creative-arts-design","career-technology","social-studies","rme","physical-health-education"]);
 assert.deepEqual(site.REVIEW_SUBJECTS.primary,[]);
 assert.equal(site.SUBJECT_COPY.en.review,"Curriculum Review");assert.equal(site.SUBJECT_COPY.fr.review,"Programme en préparation");
 const icons=await read("../src/components/site/icons.tsx");
 for(const subject of [...site.ACTIVE_SUBJECTS,...site.REVIEW_SUBJECTS.jhs])assert.ok(icons.includes(`name === "${subject.key}"`),subject.key+" has an icon");
 const app=(await read("../../FILUMIRE_CLAUDE/apps/learner/components/filumire/subjectCatalogue.ts")).replaceAll("\\u00AD","\u00AD");
 for(const subject of site.REVIEW_SUBJECTS.jhs){assert.ok(app.includes(`"${subject.key}"`));assert.ok(app.includes(`en: "${subject.name.en}", fr: "${subject.name.fr}"`),subject.key+" has the learner app's names");}
});

/* Same keys and shapes in both languages; French differs except for names and grade labels. */
const SAME_ALLOWED=new Set(["Ghana","Basic 4–6","JHS 1–3 (Basic 7–9)","Parents","FILUMIRE","Nigeria","Côte d’Ivoire"]);
function compare(en,fr,path,same){
 if(typeof en==="function"){assert.equal(typeof fr,"function",path);return;}
 if(typeof en==="string"){assert.equal(typeof fr,"string",path);assert.ok(fr.trim(),path+" is empty in French");if(en===fr&&!SAME_ALLOWED.has(en)&&!en.startsWith("/"))same.push(path+": "+en);return;}
 if(Array.isArray(en)){assert.ok(Array.isArray(fr)&&fr.length===en.length,path+" has the same length");en.forEach((v,i)=>compare(v,fr[i],path+"["+i+"]",same));return;}
 assert.deepEqual(Object.keys(fr).sort(),Object.keys(en).sort(),path+" has the same keys");
 for(const key of Object.keys(en))if(key==="id"||key==="href")assert.equal(fr[key],en[key],path+"."+key+" is shared");else compare(en[key],fr[key],path+"."+key,same);
}
test("every page and shell copy is complete in English and French",()=>{
 const same=[];
 for(const [name,value] of Object.entries({...site,...pages}))if(value&&typeof value==="object"&&"en" in value&&"fr" in value)compare(value.en,value.fr,name,same);
 for(const [path,meta] of Object.entries(pages.PAGE_META))compare(meta.en,meta.fr,"PAGE_META"+path,same);
 for(const list of [site.NAV_LINKS,site.COUNTRIES,site.ACTIVE_SUBJECTS,site.REVIEW_SUBJECTS.jhs])for(const item of list)for(const field of ["label","name","summary"])if(item[field])compare(item[field].en,item[field].fr,field,same);
 assert.deepEqual(same,[],"untranslated strings");
 for(const path of PAGE_ROUTES)assert.ok(pages.PAGE_META[path],path+" has metadata");
});

test("site components carry no hard-coded copy",async()=>{
 const allowed=new Set(["PDF"]);
 for(const file of await readdir(new URL("../src/components/site/",import.meta.url))){
  const source=await read("../src/components/site/"+file),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const found=[];
  (function visit(n){if(ts.isJsxText(n)){const s=n.text.replace(/\s+/g," ").trim();if(/\p{L}/u.test(s)&&!allowed.has(s))found.push(s);}if(ts.isJsxAttribute(n)&&["alt","aria-label","title","placeholder"].includes(n.name.getText(ast))&&n.initializer&&ts.isStringLiteral(n.initializer)&&n.initializer.text&&!["English","Français"].includes(n.initializer.text))found.push(n.initializer.text);ts.forEachChild(n,visit);})(ast);
  assert.deepEqual(found,[],file);
 }
});

test("temporary development language is gone from the public pages",async()=>{
 const files=["../src/lib/site.ts","../src/lib/site-pages.ts",...(await readdir(new URL("../src/components/site/",import.meta.url))).map(f=>"../src/components/site/"+f),"../src/app/layout.tsx","../src/lib/inquiries.ts"];
 for(const file of files){
  const source=(await read(file)).replaceAll("inquiry=school-pilot","").replaceAll('"school-pilot"',"");
  assert.doesNotMatch(source,/\bpilot|potential partner|provisional|test payment|development preview|illustrative|placeholder|confirm (it )?with the (FILUMIRE )?team|not a claim|in development|projet pilote|partenariat potentiel|provisoire/i,file);
 }
});

test("pricing stays hidden until payments are live",async()=>{
 assert.ok(!PAGE_ROUTES.includes("/pricing"));
 assert.ok(!site.NAV_LINKS.some(link=>link.href==="/pricing"));
 for(const file of ["SiteHeader.tsx","SiteFooter.tsx","pages.tsx"])assert.doesNotMatch(await read("../src/components/site/"+file),/pricing/);
 const router=await read("../src/lib/pages.tsx");
 assert.match(router,/if\(path === "\/pricing"\) \{ if \(!paymentsLive\(\)\) notFound\(\);/);
 assert.match(await read("../src/lib/payments.ts"),/NEXT_PUBLIC_FILUMIRE_PAYMENTS_LIVE === "true"/);
 for(const file of ["ParentAccount.tsx","LegacyParentAccount.tsx"])assert.match(await read("../src/components/subscriptions/"+file),/paymentsLive\(\) \? <Link[^>]*\/pricing/);
});

test("the learner app's pricing links redirect to family support until payments are live",async()=>{
 const config=await read("../next.config.ts");
 assert.match(config,/if \(process\.env\.NEXT_PUBLIC_FILUMIRE_PAYMENTS_LIVE !== "true"\) \{\s*MOVED\.push\(\["\/pricing", "\/contact\?inquiry=family"\]\);\s*\}/);
 assert.ok(config.indexOf("MOVED.push")<config.indexOf("const nextConfig"),"added before the config reads MOVED");
 assert.match(await read("../src/lib/inquiries.ts"),/"family":"Parent & family support"/);
});

test("retired pages redirect to their replacements in both languages",async()=>{
 const config=await read("../next.config.ts");
 for(const [from,to] of [["/for-families","/parents"],["/for-schools","/schools"],["/curriculum","/subjects"],["/access","/contact"],["/partners","/about#work-with-us"]]){
  assert.ok(config.includes(`["${from}", "${to}"]`),from);
  for(const prefix of ["","fr/"])assert.equal(await exists(`../src/app/${prefix}${from.slice(1)}/page.tsx`),false,prefix+from+" has no page of its own");
 }
 assert.match(config,/source: "\/fr" \+ from, destination: "\/fr" \+ to/);
});

/* Owner decision (27 Oct 2026): public scope is Basic 4–9, without implying JHS content is fully released. */
test("public scope claims use the approved wording and never present JHS as fully released",async()=>{
 const general="Built for learners from Basic 4 through JHS 3",precise="Learning experiences for Basic 4–6, with JHS 1–3 being prepared for full release";
 assert.ok(pages.SUBJECTS_COPY.en.lead.startsWith(general));assert.ok(pages.SUBJECTS_COPY.en.lead.includes(precise));
 assert.ok(pages.GHANA_COPY.en.lead.startsWith(general));assert.ok(pages.GHANA_COPY.en.lead.includes(precise));
 assert.match(pages.HOME_COPY.en.subjectsLead,/for Basic 4–6, with JHS 1–3 being prepared for full release/);
 assert.match(pages.SUBJECTS_COPY.en.jhsNote,/Being prepared for full release/);assert.match(pages.SUBJECTS_COPY.fr.jhsNote,/En préparation pour une ouverture complète/);
 for(const locale of ["fr"])for(const copy of [pages.SUBJECTS_COPY,pages.GHANA_COPY])assert.match(copy[locale].lead,/de Basic 4 à JHS 3.*le JHS 1 à 3 se prépare à une ouverture complète/s);
 const all=JSON.stringify({site:{COUNTRIES:site.COUNTRIES,SHELL_COPY:site.SHELL_COPY,SUBJECT_COPY:site.SUBJECT_COPY},pages});
 assert.doesNotMatch(all,/Basic 4–9|ready for Basic|Programme en revue/);
 const app=await read("../../FILUMIRE_CLAUDE/apps/learner/components/filumire/subjectCatalogue.ts");
 assert.match(app,/status: "Programme en préparation"/);assert.doesNotMatch(app,/Programme en revue/);
});

/* Owner decision (28 Oct 2026): claims state only what can be shown today. */
test("French, curriculum-review and class-setup claims stay precise",()=>{
 const en=JSON.stringify(pages).match(/"[^"]*\bFrench\b[^"]*"/g).filter(s=>/learn|use|works|app/i.test(s)&&!/French lessons/.test(s)&&!/^"(English and French|English or French)"$/.test(s));
 assert.deepEqual(en,[],"every English claim about using FILUMIRE in French notes that French lessons are being prepared");
 assert.match(pages.HOME_COPY.en.trust[1].text,/^New subjects open to learners only after their curriculum has been reviewed\.$/);
 assert.match(pages.HOW_COPY.en.steps[0].text,/^A parent, or the learner, chooses the class\./);
 assert.match(pages.HOW_COPY.fr.steps[0].text,/^Un parent, ou l’élève lui-même, choisit la classe/);
 assert.ok(!pages.HOME_COPY.en.facts.includes("English and French"));
});

/* Owner decision (28 Oct 2026): the footer tagline is the learner app's, in both languages. */
test("footer tagline matches the learner app's home footer in English and French",async()=>{
 const app=await read("../../FILUMIRE_CLAUDE/apps/learner/app/dashboard/page.tsx");
 const line=app.match(/<section className="homeFooter[^"]*">[\s\S]*?<p>\{language === "fr" \? "([^"]+)" : "([^"]+)"\}<\/p>/);
 assert.ok(line,"learner home footer tagline found");
 assert.equal(site.SHELL_COPY.fr.tagline,line[1]);
 assert.equal(site.SHELL_COPY.en.tagline,line[2]);
});

test("mascots are the learner app's boy and girl as transparent PNGs, with matching intrinsic sizes",async()=>{
 const source=await read("../src/components/site/pages.tsx");
 for(const [file,w,h] of [["boy-green-book.png",1283,1226],["girl-purple-book.png",1285,1224]]){
  assert.match(source,new RegExp(`src="/illustrations/learners/${file.replace(".","\\.")}" alt="" width="${w}" height="${h}"`),file);
  const png=await readFile(new URL("../public/illustrations/learners/"+file,import.meta.url));
  assert.equal(png.subarray(1,4).toString(),"PNG",file);
  assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20),png[25]],[w,h,6],file+" size and RGBA");
 }
 assert.doesNotMatch(source,/illustrations\/international\//,"retired cut-outs are not used");
});
