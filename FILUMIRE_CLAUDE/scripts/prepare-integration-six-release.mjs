import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {parseEnv} from 'node:util';
const root=process.cwd(),out=path.join(root,'.vercel/integration-six-2026-10-13');
const team='team_ZGp9TfdK3M45ks3ViQZ9WgSW';
const known=new Set();
for(const file of [path.join(root,'.env.local'),path.join(root,'.env.preview-accounts.local'),path.join(root,'apps/learner/.env.local'),path.join(root,'../.vercel/.env.preview.private.local'),'C:/Users/tabi/Desktop/filumire/FILUMIRE_WEBSITE/.env.local']){
 if(!fs.existsSync(file))continue;
 for(const [key,value] of Object.entries(parseEnv(fs.readFileSync(file,'utf8')))){
  if(/SECRET|TOKEN|PASSWORD|DATABASE_URL|POSTGRES_URL|API_KEY/.test(key)&&value.length>=16)known.add(value);
  if(/URL/.test(key)){try{const password=decodeURIComponent(new URL(value).password);if(password.length>=12)known.add(password);}catch{}}
 }
}
const configurations=[
 {name:'learner',source:root,prefix:'FILUMIRE_CLAUDE/',dirs:['apps/learner','services','packages'],files:['package.json','package-lock.json','tsconfig.json'],projectId:'prj_jozdDNN1pW1q5Ez66e32RvXhbYwC',projectName:'filumire-learner',rootDirectory:'FILUMIRE_CLAUDE/apps/learner'},
 {name:'website',source:'C:/Users/tabi/Desktop/filumire/FILUMIRE_WEBSITE',prefix:'',dirs:['src','public'],files:['package.json','package-lock.json','tsconfig.json','next.config.ts','next-env.d.ts'],projectId:'prj_wgK6IrwedlpjD7Wm8HBaHmdIdDQc',projectName:'filumire-website',rootDirectory:null},
];
const reports=[];
for(const config of configurations){
 const files=[];
 function walk(relative){for(const item of fs.readdirSync(path.join(config.source,relative),{withFileTypes:true})){
  if(item.isSymbolicLink())throw Error('Source symlink requires review');
  if(/^(node_modules|\.next|\.vercel|\.git|\.turbo|coverage|out)$/.test(item.name)||/^\.env/.test(item.name))continue;
  const file=relative+'/'+item.name;if(item.isDirectory())walk(file);else if(item.isFile()&&!/\.(tsbuildinfo|log|sql|csv|bak|backup|dump|sqlite|db|pre-mobile)$/.test(item.name))files.push(file);
 }}
 for(const dir of config.dirs)walk(dir);files.push(...config.files);files.sort();
 const manifest=files.map(file=>{const data=fs.readFileSync(path.join(config.source,file));if([...known].some(secret=>data.includes(Buffer.from(secret))))throw Error('Known secret found; source file requires review: '+file);return {file:config.prefix+file,sourceFile:file,sha256:createHash('sha256').update(data).digest('hex'),size:data.length};});
 const sourceHash=createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
 const destination=path.join(out,`${config.name}-release-${sourceHash.slice(0,12)}`);
 const existing=fs.existsSync(destination);
 for(const item of manifest){const target=path.join(destination,item.file);if(!target.startsWith(destination+path.sep))throw Error('Unsafe target');const bytes=fs.readFileSync(path.join(config.source,item.sourceFile));if(!existing){fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes,{flag:'wx'});}if(!fs.existsSync(target)||!fs.readFileSync(target).equals(bytes))throw Error('Preserved package mismatch: '+item.file);}
 const project=JSON.stringify({projectId:config.projectId,orgId:team,projectName:config.projectName});
 const ignore='.vercel\n.env*\n**/.env*\n**/node_modules\n**/.next\n**/*.tsbuildinfo\n';
 if(existing){if(fs.readFileSync(path.join(destination,'.vercel/project.json'),'utf8')!==project||fs.readFileSync(path.join(destination,'.vercelignore'),'utf8')!==ignore)throw Error('Preserved package configuration mismatch');}
 else{fs.mkdirSync(path.join(destination,'.vercel'));fs.writeFileSync(path.join(destination,'.vercel/project.json'),project,{flag:'wx'});fs.writeFileSync(path.join(destination,'.vercelignore'),ignore,{flag:'wx'});}
 const report={...config,teamId:team,destination,sourceHash,currentLocalSource:true,byteVerified:true,knownSecretMatches:0,files:manifest.length,manifest};reports.push(report);
 fs.writeFileSync(path.join(out,`${config.name}-release-source.json`),JSON.stringify(report,null,2));
 console.log(JSON.stringify({name:config.name,projectId:config.projectId,sourceHash,files:manifest.length,destination,byteVerified:true,knownSecretMatches:0}));
}
fs.writeFileSync(path.join(out,'release-readiness.json'),JSON.stringify({status:'prepared_not_deployed',preparedFromCurrentLocalSource:true,configurationProposal:'config/integration-production.proposed.json',projects:reports.map(({manifest,...r})=>r)},null,2));
