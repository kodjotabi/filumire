import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source=await readFile(new URL("../src/lib/site-origin.ts",import.meta.url),"utf8");
const {siteOrigin}=await import("data:text/javascript;base64,"+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString("base64"));
test("Preview metadata uses the current deployment instead of localhost or a production domain",()=>{assert.equal(siteOrigin({VERCEL_ENV:"preview",VERCEL_URL:"preview.vercel.app",NEXT_PUBLIC_FILUMIRE_SITE_URL:"https://filumire.com"}),"https://preview.vercel.app");assert.equal(siteOrigin({}),"http://127.0.0.1:3147");assert.equal(siteOrigin({VERCEL_ENV:"production",NEXT_PUBLIC_FILUMIRE_SITE_URL:"https://approved.example.org"}),"https://approved.example.org");});
