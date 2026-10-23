"use client";

import { useEffect, useId, useState, type FormEvent } from 'react';
import { accountErrorMessage, fetchLearnerPlacement, placeLearner, type PlacementOptions } from '../../services/account-client';
import type { Language } from './language';
import { subjectLabel } from './subjects';

/** Server subject names are English; French uses the shared discipline labels. */
export function placementSubjectName(subject: { id: string; name: string }, language: Language): string {
  const discipline = subject.id.match(/english|mathematics|science|computing/)?.[0];
  return language === 'fr' && discipline ? subjectLabel(discipline, 'fr') : subject.name;
}

export function GuardianPlacement({ learnerId, language }: { learnerId: string; language: Language }) {
  const id = useId();
  const [options, setOptions] = useState<PlacementOptions | null>(null);
  const [gradeId, setGradeId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const fr = language === 'fr';
  useEffect(() => {
    let cancelled = false;
    fetchLearnerPlacement(learnerId).then(result => {
      if (cancelled) return;
      setOptions(result);
      // A stored class that is no longer offered starts the form on the first offered class.
      const offered = result.choices.some(choice => choice.gradeId === result.current?.gradeId);
      setGradeId(offered ? result.current!.gradeId : result.choices[0]?.gradeId ?? '');
      setSubjectId(offered ? result.current!.activeSubjectId : result.choices[0]?.subjects[0]?.id ?? '');
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [learnerId, language]);
  const grade = options?.choices.find(choice => choice.gradeId === gradeId);
  // Only where it applies: a private presentation class is offered, or the stored
  // class is no longer offered and the guardian must choose again. Otherwise the
  // family card stays exactly as before.
  const current = options?.current;
  const applies = options && (options.choices.some(choice => choice.draft)
    || (current && !options.choices.some(choice => choice.curriculumVersionId === current.curriculumVersionId && choice.gradeId === current.gradeId)));
  if (!applies) return null;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!grade || !subjectId) return;
    setBusy(true); setMessage('');
    try {
      await placeLearner(learnerId, { curriculumVersionId: grade.curriculumVersionId, gradeId, subjectId });
      setMessage(fr ? 'Classe et matière enregistrées. Les progrès précédents sont conservés.' : 'Class and subject saved. Previous progress is kept.');
    } catch (error) { setMessage(accountErrorMessage(error, language)); }
    finally { setBusy(false); }
  }
  return <section aria-label={fr ? 'Classe de l’apprenant' : 'Learner class'}>
    <h4>{fr ? 'Classe et matière' : 'Class and subject'}</h4>
    <form className="acForm" onSubmit={submit}>
      <div className="acField"><label htmlFor={`${id}-grade`}>{fr ? 'Classe' : 'Class'}</label>
        <select id={`${id}-grade`} value={gradeId} disabled={busy} onChange={event => {
          const choice = options.choices.find(item => item.gradeId === event.target.value);
          setGradeId(event.target.value); setSubjectId(choice?.subjects[0]?.id ?? ''); setMessage('');
        }}>{options.choices.map(choice => <option key={choice.gradeId} value={choice.gradeId}>{choice.name}</option>)}</select>
      </div>
      <div className="acField"><label htmlFor={`${id}-subject`}>{fr ? 'Matière' : 'Subject'}</label>
        <select id={`${id}-subject`} value={subjectId} disabled={busy} onChange={event => setSubjectId(event.target.value)}>
          {grade?.subjects.map(subject => <option key={subject.id} value={subject.id}>{placementSubjectName(subject, language)}</option>)}
        </select>
      </div>
      {grade?.draft && <p>{fr ? 'Aperçu privé : activités bilingues disponibles uniquement. Le programme complet et la validation pédagogique restent en attente.' : 'Private preview: available bilingual activities only. Full curriculum coverage and educational approval remain pending.'}</p>}
      <button className="acButton secondary" disabled={busy || !grade || !subjectId} type="submit">{fr ? 'Enregistrer la classe' : 'Save class'}</button>
    </form>
    <p role="status">{message}</p>
  </section>;
}
