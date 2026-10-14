import {readFile,writeFile,readdir,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join,dirname} from 'node:path';
const original='C:/Users/tabi/Desktop/filumire/FILUMIRE_WEBSITE',source='.vercel/parent-account-audit/source',stage='.vercel/parent-account-audit/preview';
await mkdir(stage,{recursive:true});
const files=[];
async function walk(path,prefix=''){for(const item of await readdir(path,{withFileTypes:true})){const relative=prefix+item.name;if(item.isDirectory())await walk(join(path,item.name),relative+'/');else if(!/\.(pre-mobile|bak|backup)$/.test(item.name))files.push(relative)}}
for(const directory of ['src','public'])await walk(join(source,directory),directory+'/');
files.push('package.json','package-lock.json','next.config.ts','next-env.d.ts','tsconfig.json');
const manifest=[];
for(const file of files.sort()){
 const value=await readFile(join(source,file)),actual=await readFile(join(original,file));
 if(!value.equals(actual))throw Error('Source mismatch: '+file);
 const destination=join(stage,file);await mkdir(dirname(destination),{recursive:true});await copyFile(join(source,file),destination);
 manifest.push({file,sha256:createHash('sha256').update(value).digest('hex'),sha1:createHash('sha1').update(value).digest('hex')});
}
await writeFile(stage+'/.vercelignore','.env*\n.local-backups\ntmp\nnode_modules\n.next\n**/*.pre-mobile\n');
await mkdir(stage+'/.vercel',{recursive:true});
await writeFile(stage+'/.vercel/project.json',JSON.stringify({projectId:'prj_wgK6IrwedlpjD7Wm8HBaHmdIdDQc',orgId:'team_ZGp9TfdK3M45ks3ViQZ9WgSW',projectName:'filumire-website'}));
const fingerprint=createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
await writeFile('.vercel/parent-account-audit/source-manifest.json',JSON.stringify({fingerprint,manifest},null,2));
console.log(JSON.stringify({fingerprint,files:manifest.length,stage}));
