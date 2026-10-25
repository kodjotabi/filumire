"use client";
import {useId,useState,type FormEvent} from 'react';
import type {PerformanceAttestation} from '../../../../services/teacher-review/jhs-performance';
type Outcome='correct'|'incorrect'|'partial'|'skipped'|'observed';
type Props={language:'en'|'fr';busy:boolean;requirements:{observation:boolean;originalWriting:boolean;artefact:boolean};onReview:(outcome:Outcome,evidence:PerformanceAttestation)=>Promise<void>};
export function PerformanceEvidenceForm({language,busy,requirements,onReview}:Props){
 const id=useId(),[outcome,setOutcome]=useState<Outcome>('partial'),[error,setError]=useState(''),[preparing,setPreparing]=useState(false);
 const fr=language==='fr',correct=outcome==='correct',disabled=busy||preparing;
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(disabled)return;
  const form=event.currentTarget,values=new FormData(form);setError('');setPreparing(true);
  try{
   const files=values.getAll('artefacts').filter((f):f is File=>f instanceof File&&f.size>0);
   if(files.length>10||files.some(f=>f.size>10*1024*1024))throw Error(fr?'Choisis au maximum dix fichiers de moins de 10 Mo chacun.':'Choose at most ten files, each smaller than 10 MB.');
   if(correct&&requirements.originalWriting&&files.length<2)throw Error(fr?'Choisis le texte original complet et une version révisée.':'Choose the original complete text and a revision.');
   if(correct&&requirements.artefact&&!files.length)throw Error(fr?'Choisis la production réelle conservée.':'Choose the actual retained work.');
   const artefacts=await Promise.all(files.map(async file=>({reference:'retained-work/'+file.name,sha256:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))).map(n=>n.toString(16).padStart(2,'0')).join('')})));
   if(correct&&requirements.originalWriting&&new Set(artefacts.map(a=>a.sha256)).size<2)throw Error(fr?'Le texte original et la révision doivent être deux productions distinctes.':'The original and revision must be two distinct works.');
   await onReview(outcome,{performedAt:new Date(String(values.get('performedAt'))).toISOString(),attemptReference:String(values.get('attemptReference')).trim(),notes:String(values.get('notes')).trim(),originalWorkInspected:values.has('inspected'),directlyObserved:values.has('observed'),assistance:values.get('assistance')==='guided'?'guided':'none',artefacts});
  }catch(e){setError(e instanceof Error?e.message:(fr?'Le retour n’a pas pu être enregistré.':'The review could not be recorded.'));}finally{setPreparing(false);}
 }
 return <form onSubmit={submit} aria-label={fr?'Preuves de la réalisation examinée':'Evidence for reviewed performance'}>
  <fieldset disabled={disabled} style={{minWidth:0,border:0,padding:0}}>
   <legend>{fr?'Examine le travail réel avant de confirmer la réussite.':'Inspect the actual work before confirming success.'}</legend>
   <label htmlFor={`${id}-outcome`}>{fr?'Résultat':'Outcome'}</label>
   <select id={`${id}-outcome`} value={outcome} onChange={e=>setOutcome(e.target.value as Outcome)}>
    <option value="partial">{fr?'Partiel':'Partial'}</option><option value="correct">{fr?'Réussi':'Successful'}</option><option value="incorrect">{fr?'À reprendre':'Needs correction'}</option><option value="skipped">{fr?'Non réalisé':'Not completed'}</option><option value="observed">{fr?'Observé, sans validation de réussite':'Observed, without certifying success'}</option>
   </select>
   <label htmlFor={`${id}-date`}>{fr?'Date de réalisation':'Performance date'}</label><input id={`${id}-date`} name="performedAt" type="datetime-local" step={1} required />
   <label htmlFor={`${id}-attempt`}>{fr?'Référence de la tentative dans ton dossier':'Attempt reference in your records'}</label><input id={`${id}-attempt`} name="attemptReference" minLength={8} maxLength={200} required />
   <label><input name="inspected" type="checkbox" required={correct} />{fr?'J’ai examiné le travail original de l’élève.':'I inspected the learner’s original work.'}</label>
   <label><input name="observed" type="checkbox" required={correct&&requirements.observation} />{fr?'J’ai observé directement la réalisation.':'I directly observed the performance.'}</label>
   <label htmlFor={`${id}-assistance`}>{fr?'Aide reçue':'Assistance received'}</label><select id={`${id}-assistance`} name="assistance"><option value="none">{fr?'Aucune : travail autonome':'None: independent work'}</option><option value="guided">{fr?'Travail guidé':'Guided work'}</option></select>
   <label htmlFor={`${id}-files`}>{fr?'Productions conservées à examiner':'Retained work to inspect'}</label><input id={`${id}-files`} name="artefacts" type="file" multiple required={correct&&requirements.artefact} aria-describedby={`${id}-privacy`} />
   <p id={`${id}-privacy`}>{fr?'Les fichiers restent sur cet appareil. Seuls leurs noms et empreintes sont enregistrés. Conserve les originaux en lieu sûr ; ces références ne sauvegardent pas les fichiers.':'Files stay on this device. Only names and checksums are recorded. Keep the originals securely; these references do not back up the files.'}</p>
   <label htmlFor={`${id}-notes`}>{fr?'Observations, limites et corrections':'Observations, limitations and corrections'}</label><textarea id={`${id}-notes`} name="notes" minLength={24} maxLength={4000} required />
   {error&&<p role="alert">{error}</p>}
   <button type="submit" disabled={disabled} aria-busy={disabled}>{preparing?(fr?'Préparation…':'Preparing…'):(fr?'Enregistrer cet examen':'Record this review')}</button>
  </fieldset>
 </form>;
}
