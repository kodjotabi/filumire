"use client";
import { useState } from 'react';
import type { Locale } from '@/lib/locale';
import { SUBSCRIPTION_COPY } from '@/lib/subscriptions/copy';
import styles from './subscriptions.module.css';
type Progress = {activity_id:string;score:number;completed:boolean|number;updated_at:string};
export function LearnerProgress({learnerId,locale}:{learnerId:string;locale:Locale}){
 const t=SUBSCRIPTION_COPY[locale];const [records,setRecords]=useState<Progress[]|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function load(){setBusy(true);setMessage('');try{const response=await fetch('/api/subscriptions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'progress',learnerId}),cache:'no-store'});const data=await response.json();if(!response.ok){setMessage(t.errors[data.code as keyof typeof t.errors]??t.errors.service_unavailable);return;}setRecords(data);}catch{setMessage(t.errors.service_unavailable);}finally{setBusy(false);}}
 return <div><div className={styles.actions}><button className="btn btn-outline" type="button" disabled={busy} onClick={load}>{busy?t.busy:t.viewProgress}</button></div><p role="status">{message}</p>{records&&(records.length?<ul>{records.map(record=><li key={record.activity_id}>{record.activity_id} — {t.score}: {record.score}% — {record.completed?t.completed:t.inProgress} — {t.updated}: {new Intl.DateTimeFormat(locale==='fr'?'fr-GH':'en-GH',{dateStyle:'medium',timeZone:'Africa/Accra'}).format(new Date(record.updated_at))}</li>)}</ul>:<p>{t.noProgress}</p>)}</div>;
}
