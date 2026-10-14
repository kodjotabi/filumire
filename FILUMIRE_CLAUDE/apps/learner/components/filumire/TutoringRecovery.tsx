"use client";
import {useRef,useState} from 'react';
import {accountErrorMessage,recoverTutoringContext} from '../../services/account-client';
import type {Language} from './language';

export function TutoringRecovery({learnerId,language}:{learnerId:string;language:Language}){
 const fr=language==='fr';
 const [open,setOpen]=useState(false),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const requestId=useRef<string|null>(null);
 async function recover(){
  if(!confirmed||busy)return;
  setBusy(true);setMessage('');
  try{
   requestId.current??=crypto.randomUUID();
   const result=await recoverTutoringContext(learnerId,requestId.current);
   setMessage(result.recovered>0
    ? (fr?'Le contexte ancien a été récupéré. Les dossiers et progrès sont conservés. Les évaluations en cours restent protégées. Rouvre une leçon avant de reprendre une évaluation.' : 'The ended context was recovered. Records and progress are preserved. Current assessments remain protected. Reopen a lesson before resuming an assessment.')
    : (fr?'Aucun contexte terminé ne peut être récupéré actuellement. Les évaluations actives et les vérifications par l’enseignant restent protégées.' : 'No ended context can be recovered right now. Active assessments and teacher reviews remain protected.'));
   setOpen(false);setConfirmed(false);requestId.current=null;
  }catch(error){setMessage(accountErrorMessage(error,language));}
  finally{setBusy(false);}
 }
 return <section aria-label={fr?'Récupération de FILU':'FILU recovery'}>
  <button type="button" className="acButton secondary" onClick={()=>{setOpen(true);setMessage('');}} disabled={busy}>{fr?'Récupérer l’accès à FILU':'Recover Ask FILU'}</button>
  {open&&<div className="acNotice">
   <p>{fr?'Si FILU reste bloqué après une session terminée, cette action récupère uniquement les anciens contextes admissibles. Elle ne supprime ni réponses, ni évaluations, ni progrès. Termine toute évaluation active avant de continuer.' : 'If FILU stays restricted after a session ends, this recovers only eligible old contexts. It does not delete answers, assessments or progress. Finish any active assessment before continuing.'}</p>
   <label><input type="checkbox" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)} disabled={busy}/>{' '}{fr?'Je confirme la conservation de l’historique.':'I confirm that assessment history must be preserved.'}</label>
   <div className="acActions"><button type="button" className="acButton" disabled={!confirmed||busy} aria-busy={busy} onClick={recover}>{busy?(fr?'Récupération…':'Recovering…'):(fr?'Confirmer la récupération':'Confirm recovery')}</button>
   <button type="button" className="acButton quiet" disabled={busy} onClick={()=>{setOpen(false);setConfirmed(false);}}>{fr?'Annuler':'Cancel'}</button></div>
  </div>}
  <p className="acMessage" role="status" aria-live="polite">{message}</p>
 </section>;
}
