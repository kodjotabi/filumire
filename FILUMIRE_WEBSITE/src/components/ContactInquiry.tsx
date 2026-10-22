"use client";
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { translateTree, text } from '@/lib/translate';
import type { Locale } from '@/lib/locale';
import { InquiryError, prepareInquiry, type InquiryFields } from '@/lib/inquiries';
const recipients = { inquiriesEmail: 'info@filumire.com', schoolsEmail: 'info@filumire.com', partnershipsEmail: 'info@filumire.com' };
const emptyFields: InquiryFields = { name: '', email: '', phone: '', organization: '', country: '', message: '' };
function InquiryForm({ locale }: {
    locale: Locale;
}) {
    const [fields, setFields] = useState<InquiryFields>({ ...emptyFields });
    const [error, setError] = useState('');
    const [errorField, setErrorField] = useState('');
    const [status, setStatus] = useState('');
    const [busy, setBusy] = useState(false);
    const [available, setAvailable] = useState<boolean | null>(null);
    const [token, setToken] = useState('');
    const [honeypot, setHoneypot] = useState('');
    const [accepted, setAccepted] = useState(false);
    const nameRef = useRef<HTMLInputElement>(null);
    const confirmationRef = useRef<HTMLDivElement>(null);
    const t = (value: string) => text(value, locale);
    useEffect(() => { const controller = new AbortController(); fetch('/api/contact', { signal: controller.signal, credentials: 'same-origin', cache: 'no-store' }).then(async (response) => { const data = await response.json(); setAvailable(data.available === true); setToken(data.token || ''); }).catch(() => { if (!controller.signal.aborted)
        setAvailable(false); }); return () => controller.abort(); }, []);
    useEffect(() => { if (accepted)
        confirmationRef.current?.focus(); }, [accepted]);
    const update = (key: keyof InquiryFields, value: string) => setFields(previous => ({ ...previous, [key]: value }));
    async function send(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy)
            return;
        setError('');
        setErrorField('');
        setStatus('');
        try {
            prepareInquiry('general', fields, recipients, locale);
        }
        catch (error) {
            setError(error instanceof Error ? error.message : t('Please check your details.'));
            const field = error instanceof InquiryError ? error.field : 'name';
            setErrorField(field);
            document.getElementById('inquiry-' + field)?.focus();
            return;
        }
        if (!available) {
            setError(t('Messaging is currently unavailable. No message was sent. Please try again later.'));
            return;
        }
        setBusy(true);
        try {
            const response = await fetch('/api/contact', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { name: fields.name, email: fields.email, message: fields.message }, locale, token, website: honeypot }) });
            const data = await response.json();
            if (response.ok && data.accepted === true) {
                setStatus(data.message);
                setFields({ ...emptyFields });
                setAccepted(true);
            }
            else {
                setError(data.message || t('Please try again later.'));
                if (data.field) {
                    setErrorField(data.field);
                    document.getElementById('inquiry-' + data.field)?.focus();
                }
            }
        }
        catch {
            setError(t('We could not confirm acceptance by the email server. Please try again later.'));
        }
        finally {
            setBusy(false);
        }
    }
    return translateTree(<div className="contact-form-card contact-form-simple" id="inquiry-form">{accepted ? <div tabIndex={-1} ref={confirmationRef} aria-labelledby="contact-confirmation"><h2 id="contact-confirmation">Message accepted for delivery</h2><p role="status">{status}</p><button type="button" className="btn btn-outline" onClick={() => { setAccepted(false); setStatus(''); window.setTimeout(() => nameRef.current?.focus(), 0); }}>Write another inquiry</button></div> : <form onSubmit={send} noValidate aria-label="Contact FILUMIRE" aria-busy={busy}>
      <div><label htmlFor="inquiry-name">Your name</label><input ref={nameRef} id="inquiry-name" aria-invalid={errorField === "name" || undefined} aria-describedby={errorField === "name" ? "inquiry-error" : undefined} name="name" autoComplete="name" required maxLength={120} value={fields.name} onChange={event => update("name", event.target.value)} /></div>
      <div><label htmlFor="inquiry-email">Your email address</label><input id="inquiry-email" aria-invalid={errorField === "email" || undefined} aria-describedby={errorField === "email" ? "inquiry-error" : undefined} name="email" type="email" autoComplete="email" required maxLength={254} value={fields.email} onChange={event => update("email", event.target.value)} /></div>
      <div><label htmlFor="inquiry-message">Your message</label><textarea id="inquiry-message" aria-invalid={errorField === "message" || undefined} aria-describedby={errorField === "message" ? "inquiry-error" : undefined} name="message" rows={6} required minLength={10} maxLength={3000} value={fields.message} onChange={event => update("message", event.target.value)} /></div>
      <div className="contact-honeypot" aria-hidden="true"><label htmlFor="inquiry-website">Website</label><input id="inquiry-website" name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={event => setHoneypot(event.target.value)} /></div>
      {error ? <p id="inquiry-error" role="alert" className="form-error">{error}</p> : null}
      {available === false && !error ? <p id="inquiry-status" role="status" className="form-status">{t("Messaging is currently unavailable. No message was sent. Please try again later.")}</p> : null}
      <button type="submit" disabled={busy || available !== true} className="btn btn-primary btn-lg" aria-describedby={available === false && !error ? "inquiry-status" : undefined}>{busy ? t("Sending…") : t("Send Message")}</button>
    </form>}</div>, locale);
}
export function ContactInquiry({ locale = 'en' }: { locale?: Locale }) {
    return <InquiryForm key={locale} locale={locale} />;
}
