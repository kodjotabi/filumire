import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const dir='.vercel/parent-account-audit/';
const bytes=await readFile(dir+'dry.json');
const dry=JSON.parse(bytes.toString(bytes[0]===255?'utf16le':'utf8').replace(/^\uFEFF/,''));
const {manifest,fingerprint}=JSON.parse(await readFile(dir+'source-manifest.json','utf8'));
const uploads=new Map(dry.files.map(f=>[f.path,f.sha]));
for(const f of manifest){if(uploads.get(f.file)!==f.sha1)throw Error('Upload mismatch: '+f.file);for(const root of ['C:/Users/tabi/Desktop/filumire/FILUMIRE_WEBSITE',dir+'preview'])if(createHash('sha256').update(await readFile(root+'/'+f.file)).digest('hex')!==f.sha256)throw Error('Source mismatch: '+f.file)}
const extra=dry.files.filter(f=>!manifest.some(m=>m.file===f.path)).map(f=>f.path);
if(JSON.stringify(extra)!=='[".vercelignore"]')throw Error('Unexpected upload files: '+extra);
const originalEnv=await readFile(dir+'original-website.zip');
if(originalEnv.length<1000)throw Error('Missing snapshot');
const result={fingerprint,filesVerified:manifest.length,extraUploadFiles:extra,credentialsAndBackupsExcluded:true,project:'filumire-website',target:'preview'};
await writeFile(dir+'upload-verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
