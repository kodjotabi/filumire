import {readFile,readdir,writeFile} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import ts from 'typescript';
const root=resolve(import.meta.dirname,'..');
const workspace=resolve(root,'..');
const sourceRoot=resolve(workspace,'FILUMIRE_CLAUDE');
const requirements=JSON.parse(await readFile(resolve(root,'src/lib/curriculum/requirements.json'),'utf8'));
const authored=[];
for(const file of (await readdir(resolve(sourceRoot,'services/content-store'))).filter(f=>f.includes('authored')&&f.endsWith('.ts'))){
 const path=resolve(sourceRoot,'services/content-store',file),text=await readFile(path,'utf8');
 const ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
 const competencies=new Set(),activities=[];
 const scalar=node=>node&&ts.isStringLiteral(node)?node.text:null;
 function visit(node){
  if(ts.isVariableDeclaration(node)&&node.name.getText(ast).includes('COMPETENCY_ID')&&scalar(node.initializer))competencies.add(scalar(node.initializer));
  if(ts.isObjectLiteralExpression(node)){
   const props=Object.fromEntries(node.properties.filter(ts.isPropertyAssignment).map(p=>[p.name.getText(ast).replace(/["']/g,''),p.initializer]));
   if(scalar(props.competencyId))competencies.add(scalar(props.competencyId));
   if(props.title&&ts.isObjectLiteralExpression(props.title)&&scalar(props.type)){
    const title=Object.fromEntries(props.title.properties.filter(ts.isPropertyAssignment).map(p=>[p.name.getText(ast),scalar(p.initializer)]));
    if(title.en||title.fr)activities.push({type:scalar(props.type),title});
   }
  }
  ts.forEachChild(node,visit);
 }
 visit(ast);authored.push({path:relative(workspace,path).replaceAll('\\','/'),text,competencies,activities,sha256:createHash('sha256').update(text).digest('hex')});
}
const mappings=[],unmatched=[];
for(const file of (await readdir(resolve(sourceRoot,'packages/curriculum'))).filter(f=>/^ghana-b[456]-(mathematics|english|science|computing)-adaptive.*\.ts$/.test(f))){
 const path=resolve(sourceRoot,'packages/curriculum',file),text=await readFile(path,'utf8'),grade=+file.match(/b([456])/)[1],subject=file.match(/b[456]-(mathematics|english|science|computing)/)[1];
 const ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
 const scalar=node=>node&&ts.isStringLiteral(node)?node.text:null;
 function visit(node){
  if(ts.isObjectLiteralExpression(node)){
   const props=Object.fromEntries(node.properties.filter(ts.isPropertyAssignment).map(p=>[p.name.getText(ast).replace(/["']/g,''),p.initializer]));
   const competencyId=scalar(props.competencyId);
   if(competencyId){
    const links=[];if(scalar(props.code))links.push({code:scalar(props.code),relationship:'direct'});
    if(props.indicatorMappings&&ts.isArrayLiteralExpression(props.indicatorMappings))for(const item of props.indicatorMappings.elements){if(ts.isObjectLiteralExpression(item)){const fields=Object.fromEntries(item.properties.filter(ts.isPropertyAssignment).map(p=>[p.name.getText(ast),scalar(p.initializer)]));if(fields.code)links.push({code:fields.code,relationship:fields.relationship||'unverified'});}}
    const content=authored.filter(a=>a.competencies.has(competencyId)&&a.activities.length);
    for(const link of links){
     const requirement=requirements.find(n=>n.subject===subject&&n.grade===grade&&n.kind==='learning_indicator'&&n.code===link.code);
     if(!requirement){unmatched.push({subject,grade,code:link.code,competencyId,reason:'Adaptive mapping has no matching verified printed requirement in this register.'});continue;}
     const evidence=[{file:relative(workspace,path).replaceAll('\\','/'),line:ast.getLineAndCharacterOfPosition(node.pos).line+1,kind:'adaptive specification',sha256:createHash('sha256').update(text).digest('hex')},...content.map(a=>({file:a.path,line:a.text.slice(0,a.text.indexOf(competencyId)).split('\n').length,kind:'authored learning content',sha256:a.sha256}))];
     mappings.push({requirementId:requirement.id,competencyId,title:scalar(props.title)||scalar(props.description)||scalar(props.statement)||competencyId,relationship:link.relationship,status:'In Development',availability:'Not verified for public access',activities:content.flatMap(a=>a.activities),evidence});
    }
   }
  }
  ts.forEachChild(node,visit);
 }
 visit(ast);
}
const unique=[...new Map(mappings.map(m=>[m.requirementId+':'+m.competencyId,m])).values()];
await writeFile(resolve(root,'src/lib/curriculum/alignment.json'),JSON.stringify(unique,null,2)+'\n');
await writeFile(resolve(root,'src/lib/curriculum/unmatched-mappings.json'),JSON.stringify(unmatched,null,2)+'\n');
console.log(JSON.stringify({mappings:unique.length,withAuthoredActivities:unique.filter(m=>m.activities.length).length,unmatched:unmatched.length,available:0}));
