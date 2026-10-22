import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const cache=new Map();
export async function loadTs(url){url=new URL(url);if(cache.has(url.href))return cache.get(url.href);let source=await readFile(url,'utf8');let output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;for(const match of [...output.matchAll(/from ["'](\.[^"']+)["']/g)]){const path=new URL(match[1]+'.ts',url);const dependency=await loadTs(path);output=output.replaceAll(match[0],'from '+JSON.stringify(dependency));}const result='data:text/javascript;base64,'+Buffer.from(output).toString('base64');cache.set(url.href,result);return result;}
