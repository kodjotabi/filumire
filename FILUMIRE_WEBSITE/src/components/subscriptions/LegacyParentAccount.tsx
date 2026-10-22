"use client";
import { LearnerProgress } from './LearnerProgress';
import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { localizeHref, type Locale } from '@/lib/locale';
import { SUBSCRIPTION_COPY } from '@/lib/subscriptions/copy';
import { PLANS } from '@/lib/subscriptions/plans';
import styles from './subscriptions.module.css';
type Payment = {
    reference: string;
    amount: number;
    currency: string;
    status: string;
    channel: string | null;
    plan: {
        id: 'individual' | 'family';
    };
    created_at: string;
    starts_at: string | null;
    ends_at: string | null;
    refunded_amount: number;
    refund_status: string | null;
};
type View = {
    email: string;
    access: boolean;
    learningReady: boolean;
    paymentsReady: boolean;
    trialUsed: boolean;
    eligible: boolean;
    eligibilityRequested: boolean;
    trial: {
        starts_at: string;
        ends_at: string;
    } | null;
    accessEndsAt: string | null;
    paidThrough: string | null;
    learnerLimit: number;
    cancelledAt: string | null;
    learners: {
        id: string;
        display_name: string;
        access: boolean;
    }[];
    payments: Payment[];
    page: number;
    hasMore: boolean;
};
export function LegacyParentAccount({ locale }: {
    locale: Locale;
}) {
    const t = SUBSCRIPTION_COPY[locale];
    const [view, setView] = useState<View | null>(null), [busy, setBusy] = useState(true), [available, setAvailable] = useState(false), [message, setMessage] = useState(''), [token, setToken] = useState(''), [reference, setReference] = useState(''), [email, setEmail] = useState(''), [guardian, setGuardian] = useState(false), [name, setName] = useState(''), [plan, setPlan] = useState<'individual' | 'family'>('individual');
    const date = (value: string | null) => value ? new Intl.DateTimeFormat(locale === 'fr' ? 'fr-GH' : 'en-GH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Accra' }).format(new Date(value)) : '—';
    const label = (value: string) => t.statuses[value as keyof typeof t.statuses] ?? value;
    const errorMessage = useCallback((code: string) => t.errors[code as keyof typeof t.errors] ?? t.errors.service_unavailable, [t]);
    const refresh = useCallback(async (page = 0) => { const response = await fetch('/api/subscriptions?page=' + page, { cache: 'no-store' }); const data = await response.json(); if (response.ok) {
        setView(data);
        setAvailable(true);
    }
    else if (response.status === 401) {
        setView(null);
        setAvailable(true);
    }
    else {
        setAvailable(false);
        throw new Error(data.code ?? 'service_unavailable');
    } }, []);
    useEffect(() => { let mounted = true; const params = new URLSearchParams(window.location.search); const link = new URLSearchParams(window.location.hash.slice(1)).get('token'); if (link) {
        setToken(link);
        window.history.replaceState(null, '', window.location.pathname + (params.size ? '?' + params : ''));
    } const ref = params.get('reference'); if (ref)
        setReference(ref); if (params.get('checkout') === 'cancelled')
        setMessage(t.cancelledCheckout); refresh().catch(error => { if (mounted)
        setMessage(errorMessage(error.message)); }).finally(() => { if (mounted)
        setBusy(false); }); return () => { mounted = false; }; }, [refresh, errorMessage, t.cancelledCheckout]);
    async function send(path: string, body: object) { const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, locale }), cache: 'no-store' }); const data = await response.json(); if (!response.ok)
        throw new Error(data.code ?? 'service_unavailable'); return data; }
    async function action(body: object, success: string) { setBusy(true); setMessage(''); try {
        const data = await send('/api/subscriptions', body);
        setMessage(success);
        await refresh(view?.page ?? 0);
        return data;
    }
    catch (error) {
        setMessage(errorMessage(error instanceof Error ? error.message : 'service_unavailable'));
        return null;
    }
    finally {
        setBusy(false);
    } }
    useEffect(() => {
        function captureLink() {
            const link = new URLSearchParams(window.location.hash.slice(1)).get('token');
            if (link) {
                setToken(link);
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
        }
        window.addEventListener('hashchange', captureLink);
        return () => window.removeEventListener('hashchange', captureLink);
    }, []);
    const validEmail = email.length <= 254 && /^[-A-Za-z0-9.!#$%&'*+/=?^_`{|}~]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email.trim());
    async function login(event: FormEvent) { event.preventDefault(); setBusy(true); setMessage(''); try {
        await send('/api/parent-auth', { action: 'request', email, guardian });
        setMessage(t.linkSent);
    }
    catch (error) {
        setMessage(errorMessage(error instanceof Error ? error.message : 'service_unavailable'));
    }
    finally {
        setBusy(false);
    } }
    async function complete() { setBusy(true); try {
        await send('/api/parent-auth', { action: 'complete', token });
        setToken('');
        setMessage(t.signedIn);
        await refresh();
    }
    catch (error) {
        setMessage(errorMessage(error instanceof Error ? error.message : 'service_unavailable'));
    }
    finally {
        setBusy(false);
    } }
    async function logout() { setBusy(true); try {
        await send('/api/parent-auth', { action: 'logout' });
        setView(null);
        setMessage(t.signedOut);
    }
    catch (error) {
        setMessage(errorMessage(error instanceof Error ? error.message : 'service_unavailable'));
    }
    finally {
        setBusy(false);
    } }
    async function checkout() { setBusy(true); setMessage(''); try {
        const data = await send('/api/subscriptions', { action: 'checkout', plan });
        window.location.assign(data.url);
    }
    catch (error) {
        setMessage(errorMessage(error instanceof Error ? error.message : 'service_unavailable'));
        setBusy(false);
    } }
    async function verify(ref: string) { setBusy(true); try {
        const data = await send('/api/subscriptions', { action: 'verify', reference: ref });
        setMessage(data.status === 'success' ? t.success : data.status === 'pending' ? t.pending : label(data.status));
        await refresh(view?.page ?? 0);
    }
    catch (error) {
        setMessage(errorMessage(error instanceof Error ? error.message : 'service_unavailable'));
    }
    finally {
        setBusy(false);
    } }
    async function history(page: number) { setBusy(true); try {
        await refresh(page);
    }
    catch (error) {
        setMessage(errorMessage(error instanceof Error ? error.message : 'service_unavailable'));
    }
    finally {
        setBusy(false);
    } }
    return <section className={`site-section ${styles.accountSection}`}><div className="site-container">
 <h1 className="section-title">{t.accountTitle}</h1><p className={styles.notice}>{t.preview}</p>
 <div className={styles.actions}><Link className="btn btn-outline" href={localizeHref('/pricing', locale)}>{t.plansLink}</Link><Link className="btn btn-outline" href={localizeHref('/contact?inquiry=family', locale)}>{t.contact}</Link></div>
 <p role="status" aria-live="polite" className={message ? styles.message : undefined}>{busy ? t.busy : message}</p>
 {!available && !busy && <p className={styles.notice}>{t.setup}</p>}
 {token && !view && <div className={styles.panel}><p>{t.authIntro}</p><button className="btn btn-primary" disabled={busy || !available} onClick={complete}>{t.confirmLink}</button></div>}
 {!view && !token && <form className={styles.form} onSubmit={login} aria-busy={busy}><p>{t.authIntro}</p><label>{t.email}<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)}/></label><label className={styles.checkbox}><input type="checkbox" required checked={guardian} onChange={e => setGuardian(e.target.checked)}/><span>{t.guardian}</span></label><button className={`btn btn-primary ${styles.signInButton}`} disabled={busy || !validEmail || !guardian}>{busy ? t.busy : t.sendLink}</button></form>}
 {view && <>
 <div className={styles.actions}><p>{view.email}</p><button className="btn btn-outline" disabled={busy} onClick={logout}>{t.signOut}</button></div>
 {!view.learningReady && <p className={styles.notice}>{t.learningPending}</p>}
 <article className={styles.panel}><h2>{t.subscription}</h2><p>{view.access ? t.active : t.inactive}</p><p>{t.expiry}: {date(view.accessEndsAt)}</p><p>{t.paidThrough}: {date(view.paidThrough)}</p><p>{t.learnerLimit}: {view.learnerLimit}</p>
 {view.trial && <p>{t.trial}: {date(view.trial.starts_at)} – {date(view.trial.ends_at)}</p>}
 {view.trialUsed ? <p>{t.usedTrial}</p> : <><p>{view.eligible ? t.eligible : t.review}</p>{!view.eligible && (view.eligibilityRequested ? <p>{t.reviewRequested}</p> : <button className="btn btn-outline" disabled={busy} onClick={() => action({ action: 'eligibility' }, t.reviewRequested)}>{t.requestReview}</button>)}<div className={styles.actions}><button className="btn btn-primary" disabled={busy || !view.eligible || !view.learningReady || !!view.paidThrough} onClick={() => action({ action: 'trial' }, t.activated)}>{t.activate}</button></div></>}
 <p>{t.cancelText}</p>{view.cancelledAt ? <p>{t.cancelled}</p> : <button className="btn btn-outline" disabled={busy || !view.paidThrough} onClick={() => action({ action: 'cancel' }, t.cancelled)}>{t.cancel}</button>}
 </article>
 <article className={styles.panel}><h2>{t.renew}</h2><p>{t.manual}</p><form className={styles.form} onSubmit={e => { e.preventDefault(); checkout(); }}><label>{t.plan}<select value={plan} onChange={e => setPlan(e.target.value as 'individual' | 'family')}>{Object.values(PLANS).map(p => <option key={p.id} value={p.id}>{t[p.id]} — GH₵{p.amount / 100} / {t.monthly}</option>)}</select></label><button className="btn btn-primary" disabled={busy || !view.learningReady || !view.paymentsReady || view.learners.length > PLANS[plan].learners}>{t.checkout}</button></form>{reference && <div className={styles.record}><p>{t.reference}: {reference}</p><button className="btn btn-outline" disabled={busy} onClick={() => verify(reference)}>{t.verify}</button></div>}</article>
 <article className={styles.panel}><h2>{t.learners}</h2><p>{t.preserved}</p><ul className={styles.list}>{view.learners.map(l => <li className={styles.record} key={l.id}>{l.display_name} — {l.access ? t.eligibleLearner : t.disabledLearner}<LearnerProgress learnerId={l.id} locale={locale}/></li>)}</ul><form className={styles.form} onSubmit={async (e) => { e.preventDefault(); if (await action({ action: 'learner', name }, t.added))
            setName(''); }}><label>{t.learnerName}<input required maxLength={80} value={name} onChange={e => setName(e.target.value)}/></label><button className="btn btn-primary" disabled={busy || view.learners.length >= view.learnerLimit}>{t.addLearner}</button></form></article>
 <article className={styles.panel}><h2>{t.history}</h2>{!view.payments.length && <p>{t.noPayments}</p>}<ul className={styles.list}>{view.payments.map(p => <li className={styles.record} key={p.reference}><dl><dt>{t.date}</dt><dd>{date(p.created_at)}</dd><dt>{t.amount}</dt><dd>GH₵{(p.amount / 100).toFixed(2)}</dd><dt>{t.plan}</dt><dd>{t[p.plan.id]}</dd><dt>{t.status}</dt><dd>{label(p.status)}</dd><dt>{t.method}</dt><dd>{p.channel ? label(p.channel) : '—'}</dd><dt>{t.reference}</dt><dd>{p.reference}</dd><dt>{t.period}</dt><dd>{date(p.starts_at)} – {date(p.ends_at)}</dd><dt>{t.refunded}</dt><dd>GH₵{(p.refunded_amount / 100).toFixed(2)}</dd>{p.refund_status && <><dt>{t.refundStatus}</dt><dd>{label(p.refund_status)}</dd></>}</dl>
 {['pending', 'initialization_failed', 'failed', 'abandoned'].includes(p.status) && <button className="btn btn-outline" disabled={busy} onClick={() => verify(p.reference)}>{t.verify}</button>}
 {['success', 'partially_refunded'].includes(p.status) && !p.refund_status && <form className={styles.form} onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); action({ action: 'refund', reference: p.reference, reason: data.get('reason') }, t.refundRequested); }}><label>{t.refundReason}<textarea name="reason" required minLength={10} maxLength={1000} rows={3}/></label><button className="btn btn-outline" disabled={busy}>{t.refund}</button></form>}
 </li>)}</ul><div className={styles.actions}>{view.page > 0 && <button className="btn btn-outline" disabled={busy} onClick={() => history(view.page - 1)}>{t.newer}</button>}{view.hasMore && <button className="btn btn-outline" disabled={busy} onClick={() => history(view.page + 1)}>{t.older}</button>}</div></article>
 </>}
 <article className={styles.panel}><h2>{t.termsTitle}</h2><p>{t.termsText}</p></article>
 </div></section>;
}
