'use client';
import { useMemo, useState, useEffect } from 'react';
import requirements from '@/lib/curriculum/requirements.json';
import alignment from '@/lib/curriculum/alignment.json';
import sources from '@/lib/curriculum/sources.json';
import inventory from '@/lib/curriculum/inventory.json';
import type { Locale } from '@/lib/locale';
type Requirement = typeof requirements[number];
const labels = { en: { title: 'Explore the official curriculum', intro: 'Choose a class and subject, then expand each level. Official statements are quoted in their original English; French navigation does not change the English Language subject. Source extraction and printed-code exceptions remain under review. This is not a claim of full FILUMIRE lesson coverage or NaCCA endorsement.', grade: 'Class', subject: 'Subject', strand: 'Strand', sub_strand: 'Sub-strand', content_standard: 'Content standard', learning_indicator: 'Learning indicator', source: 'Official source PDF', page: 'PDF page', original: 'Official wording (English)', unnamed: 'Heading awaiting source verification', mapping: 'FILUMIRE alignment', development: 'In Development', none: 'No verified learning-content mapping', availability: 'Public lesson availability has not been verified.', issues: 'Source notes and verification exceptions', note: 'Printed codes and table associations may differ. Consult the linked source; no missing requirement is invented.', count: 'learning indicators', evidence: 'Local implementation evidence', available: 'Available', planned: 'Planned' }, fr: { title: 'Explorer le programme officiel', intro: 'Choisissez une classe et une matière, puis dépliez chaque niveau. Les énoncés officiels sont cités dans leur anglais d’origine ; la navigation en français ne change pas la matière « Langue anglaise ». L’extraction et les anomalies des codes imprimés restent à vérifier. Ce registre ne signifie ni couverture complète des leçons FILUMIRE, ni approbation de NaCCA.', grade: 'Classe', subject: 'Matière', strand: 'Domaine', sub_strand: 'Sous-domaine', content_standard: 'Standard de contenu', learning_indicator: 'Indicateur d’apprentissage', source: 'Document officiel PDF', page: 'Page du PDF', original: 'Texte officiel (anglais)', unnamed: 'Intitulé à vérifier dans la source', mapping: 'Correspondance FILUMIRE', development: 'En développement', none: 'Aucune correspondance vérifiée avec un contenu pédagogique', availability: 'La disponibilité publique des leçons n’a pas été vérifiée.', issues: 'Notes sur les sources et points à vérifier', note: 'Les codes imprimés peuvent différer des liens indiqués dans les tableaux. Consultez la source ; aucune exigence manquante n’est inventée.', count: 'indicateurs d’apprentissage', evidence: 'Éléments de réalisation locale', available: 'Disponible', planned: 'Prévu' } };
const frenchReasons:Record<string,string> = {"Hierarchy name not extracted; code retained, no title invented.":"L’intitulé n’a pas été extrait ; le code est conservé sans inventer de titre.","Printed code differs from class heading; retained without correction.":"Le code imprimé diffère de la classe indiquée ; il est conservé sans correction.","Printed indicator prefix differs from its table content standard; table association retained.":"Le préfixe de l’indicateur imprimé diffère du standard du tableau ; le lien du tableau est conservé.","Same printed indicator code has a different statement or table occurrence; both retained for verification.":"Un même code imprimé figure avec un énoncé ou un lien différent ; les deux occurrences sont conservées pour vérification.","Malformed content-standard code printed in source; original retained.":"La source contient un code de standard mal formé ; le code original est conservé.","Four-part code printed in the learning-indicator column; original retained.":"Un code à quatre parties figure dans la colonne des indicateurs ; le code original est conservé.","Printed strand heading says WORD PROCESSING although the table concerns introductory computing; source heading retained for review.":"Le domaine imprimé indique WORD PROCESSING alors que le tableau concerne les bases de l’informatique ; l’intitulé de la source est conservé pour vérification."};
const subjects = { mathematics: ['Mathematics', 'Mathématiques'], english: ['English Language', 'Langue anglaise'], science: ['Science', 'Sciences'], computing: ['Computing', 'Informatique'] };
export function CurriculumExplorer({ locale = 'en' }: {
    locale?: Locale;
}) {
    const t = labels[locale];
    const [grade, setGrade] = useState(4);
    const [subject, setSubject] = useState('mathematics');
    useEffect(() => { const readSelection = () => { const params = new URLSearchParams(window.location.search); const selectedGrade = Number(params.get('class')); const selectedSubject = params.get('subject'); if ([4, 5, 6].includes(selectedGrade))
        setGrade(selectedGrade); if (selectedSubject && Object.hasOwn(subjects, selectedSubject))
        setSubject(selectedSubject); }; readSelection(); window.addEventListener('popstate', readSelection); return () => window.removeEventListener('popstate', readSelection); }, []);
    function select(nextGrade: number, nextSubject: string) { setGrade(nextGrade); setSubject(nextSubject); const url = new URL(window.location.href); url.searchParams.set('class', String(nextGrade)); url.searchParams.set('subject', nextSubject); window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash); }
    const nodes = useMemo(() => requirements.filter(n => n.grade === grade && n.subject === subject), [grade, subject]);
    const source = sources.find(s => s.id === subject)!;
    const mapping = useMemo(() => { const map = new Map<string, typeof alignment>(); for (const item of alignment) {
        const list = map.get(item.requirementId) || [];
        list.push(item);
        map.set(item.requirementId, list);
    } return map; }, []);
    const children = useMemo(() => { const result = new Map<string | null, Requirement[]>(); for (const n of nodes) {
        const list = result.get(n.parentCode) || [];
        list.push(n);
        result.set(n.parentCode, list);
    } return result; }, [nodes]);
    const issues = inventory.find(i => i.subject === subject)?.issues.filter(i => nodes.some(n => n.code === i.code && n.pages.includes(i.page))) || [];
    function branch(n: Requirement): React.ReactNode {
        const nested = children.get(n.code) || [];
        const mapped = mapping.get(n.id) || [];
        const variants = 'variants' in n ? n.variants || [] : [];
        const body = <><p lang={n.statement ? 'en' : locale} className='curriculum-quotation'>{n.statement || t.unnamed}</p><a className='text-link' href={source.file + '#page=' + n.pages[0]} target='_blank' rel='noopener noreferrer'>{t.source} — {t.page} {n.pages.join(', ')}</a>{variants.map((variant, index) => <div key={index}><p>{t.note}</p><p lang='en'>{variant.statement}</p><a href={source.file + '#page=' + variant.pages[0]} target='_blank' rel='noopener noreferrer'>{t.page} {variant.pages.join(', ')}</a></div>)}{n.kind === 'learning_indicator' && <div className='curriculum-alignment'><strong>{t.mapping}</strong>{mapped.length ? mapped.map(m => <div key={m.competencyId}><p><span className='curriculum-status'>{t.development}</span></p><p lang={m.activities[0]?.title[locale] ? locale : 'en'}>{m.activities[0]?.title[locale] || m.title}</p><details><summary>{t.evidence}</summary><ul>{m.evidence.map(e => <li key={e.file + e.line}><code>{e.file}:{e.line}</code></li>)}</ul></details></div>) : <p>{t.none}</p>}<p>{t.availability}</p></div>}{nested.map(branch)}</>;
        return <details className='curriculum-node' key={n.id}><summary><span>{t[n.kind as keyof typeof t]} <code>{n.code}</code></span>{(n.kind === 'strand' || n.kind === 'sub_strand') && n.statement && <span lang='en'>{n.statement}</span>}</summary>{body}</details>;
    }
    const reachable = new Set<string>();
    function mark(n: Requirement) { reachable.add(n.id); for (const c of children.get(n.code) || [])
        if (!reachable.has(c.id))
            mark(c); }
    for (const n of children.get(null) || [])
        mark(n);
    const unlinked = nodes.filter(n => !reachable.has(n.id));
    return <section className='site-section site-section-alt' id='curriculum-explorer' aria-labelledby='curriculum-explorer-title'><div className='site-container'><h2 id='curriculum-explorer-title' className='section-title'>{t.title}</h2><p>{t.intro}</p><div className='curriculum-selectors'><div><label htmlFor='curriculum-class'>{t.grade}</label><select id='curriculum-class' value={grade} onChange={e => select(Number(e.target.value), subject)}>{[4, 5, 6].map(g => <option key={g} value={g}>Basic {g}</option>)}</select></div><div><label htmlFor='curriculum-subject'>{t.subject}</label><select id='curriculum-subject' value={subject} onChange={e => select(grade, e.target.value)}>{Object.entries(subjects).map(([id, names]) => <option key={id} value={id}>{names[locale === 'fr' ? 1 : 0]}</option>)}</select></div></div><p role='status'>Basic {grade} · {subjects[subject as keyof typeof subjects][locale === 'fr' ? 1 : 0]} · {nodes.filter(n => n.kind === 'learning_indicator').length} {t.count}</p><div key={grade + subject}>{(children.get(null) || []).map(branch)}</div>{unlinked.length > 0 && <details className='curriculum-node'><summary>{t.issues}</summary><p>{t.note}</p>{unlinked.map(branch)}</details>}<details className='curriculum-node'><summary>{t.issues} ({issues.length})</summary><p>{t.note}</p><ul>{issues.map((i, index) => <li key={index}><code>{i.code}</code> — <span>{locale === "fr" ? frenchReasons[i.reason] || t.note : i.reason}</span> — <a href={source.file + '#page=' + i.page} target='_blank' rel='noopener noreferrer'>{t.page} {i.page}</a></li>)}</ul></details></div></section>;
}
