import {createHash} from 'node:crypto';
export type PerformanceAttestation={performedAt:string;attemptReference:string;notes:string;originalWorkInspected:boolean;directlyObserved:boolean;assistance:'none'|'guided';artefacts:Array<{reference:string;sha256:string}>};
export class JhsPerformanceEvidenceError extends Error {}
export function requireJhsPerformanceEvidence(metadata:Record<string,string>|undefined,value:unknown,outcome:string){
 if(metadata?.reviewEvidencePolicy!=='jhs-required-performance-v1')return undefined;
 const fail=(message:string):never=>{throw new JhsPerformanceEvidenceError(message);};
 if(!value||typeof value!=='object')return fail('A teacher evidence attestation is required.');
 const e=value as PerformanceAttestation;
 if(!['none','guided'].includes(e.assistance)||typeof e.notes!=='string'||e.notes.trim().length<24||e.notes.length>4000||typeof e.attemptReference!=='string'||e.attemptReference.length<8||e.attemptReference.length>200||typeof e.performedAt!=='string'||!Number.isFinite(Date.parse(e.performedAt))||Date.parse(e.performedAt)>Date.now()||typeof e.originalWorkInspected!=='boolean'||typeof e.directlyObserved!=='boolean'||!Array.isArray(e.artefacts)||e.artefacts.length>10)return fail('Complete dated teacher evidence, assistance and attempt reference.');
 if(e.artefacts.some(a=>!a||typeof a.reference!=='string'||a.reference.trim().length<8||a.reference.length>300||typeof a.sha256!=='string'||!/^[a-f0-9]{64}$/.test(a.sha256)))return fail('Artefact references and SHA-256 hashes must be valid.');
 if(outcome==='correct'){
  if(!e.originalWorkInspected)return fail('Inspect the actual original work before certifying success.');
  if(metadata.requiresObservation==='true'&&!e.directlyObserved)return fail('Direct teacher observation is required for this performance.');
  if(metadata.requiresOriginalWriting==='true'&&(e.artefacts.length<2||new Set(e.artefacts.map(a=>a.sha256)).size<2))return fail('Reference the original complete text and at least one distinct revision artefact.');
  if(metadata.requiresArtefact==='true'&&e.artefacts.length<1)return fail('Reference the actual retained learner artefact.');
 }
 const evidence:PerformanceAttestation={performedAt:e.performedAt,attemptReference:e.attemptReference,notes:e.notes.trim(),originalWorkInspected:e.originalWorkInspected,directlyObserved:e.directlyObserved,assistance:e.assistance,artefacts:e.artefacts.map(a=>({reference:a.reference,sha256:a.sha256}))};
 return {evidence,digest:createHash('sha256').update(JSON.stringify(evidence)).digest('hex'),independence:e.assistance==='none'?'independent':'guided'};
}
