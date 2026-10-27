"use client";

import Link from "next/link";
import { useRef } from "react";
import { localizeHref, type Locale } from "@/lib/locale";
import { COUNTRIES, INTERNATIONAL_COPY } from "@/lib/international";
import { InternationalFrame } from "./InternationalShell";

function GlobeIcon() {
  return (
    <svg className="intl-cta-globe" viewBox="0 0 48 48" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="3">
      <circle cx="24" cy="24" r="20" />
      <ellipse cx="24" cy="24" rx="9" ry="20" />
      <path d="M4 24h40M7 14h34M7 34h34" />
    </svg>
  );
}

function Arrow({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

function Stroke({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 140 12" aria-hidden="true" focusable="false" preserveAspectRatio="none">
      <path d="M4 8.5C40 3.5 100 3 136 6.5" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function InternationalLanding({ locale }: { locale: Locale }) {
  const copy = INTERNATIONAL_COPY[locale];
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [before, accent, after] = copy.headline;

  const open = () => dialogRef.current?.showModal();
  const close = () => dialogRef.current?.close();

  return (
    <InternationalFrame locale={locale} className="intl-landing">
      <section className="intl-hero" aria-labelledby="intl-headline">
        <div className="intl-hero-grid">
          <div className="intl-copy">
            <p className="intl-pill"><span>{copy.madeForAfrica}</span><span className="intl-pill-bars" aria-hidden="true"><i /><i /><i /></span></p>
            <h1 id="intl-headline" className="intl-headline">{before}<span className="intl-accent">{accent}</span>{after}</h1>
            <Stroke className="intl-stroke intl-stroke-head" />
            <p className="intl-subtitle" lang={copy.subtitleLang}>{copy.subtitle[0]}<br className="intl-br" /> {copy.subtitle[1]}</p>
            <Stroke className="intl-stroke intl-stroke-sub" />
          </div>
          <img className="intl-mascot intl-mascot-boy" src="/illustrations/international/mascot-boy-green-book.webp" alt="" width="525" height="510" fetchPriority="high" decoding="async" />
          <img className="intl-mascot intl-mascot-girl" src="/illustrations/international/mascot-girl-yellow-book.webp" alt="" width="470" height="490" fetchPriority="high" decoding="async" />
          <div className="intl-cta-wrap">
            <button ref={triggerRef} type="button" className="intl-cta" aria-haspopup="dialog" aria-controls="intl-country-dialog" onClick={open}>
              <GlobeIcon />
              <span className="intl-cta-divider" aria-hidden="true" />
              <span className="intl-cta-text">
                <span className="intl-cta-primary">{copy.ctaPrimary}</span>
                <span className="intl-cta-secondary" lang={copy.subtitleLang}>{copy.ctaSecondary}</span>
              </span>
              <Arrow className="intl-cta-arrow" />
            </button>
          </div>
        </div>
      </section>

      <dialog
        ref={dialogRef}
        id="intl-country-dialog"
        className="intl-dialog"
        aria-labelledby="intl-dialog-title"
        aria-describedby="intl-dialog-intro"
        onClick={event => { if (event.target === event.currentTarget) close(); }}
        onClose={() => triggerRef.current?.focus()}
      >
        <div className="intl-dialog-body">
          <div className="intl-dialog-head">
            <h2 id="intl-dialog-title">{copy.dialogTitle}</h2>
            <button type="button" className="intl-dialog-close" onClick={close} aria-label={copy.close}>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <p id="intl-dialog-intro" className="intl-dialog-intro">{copy.dialogIntro}</p>
          <ul className="intl-country-list">
            {COUNTRIES.map(country => (
              <li key={country.id}>
                <Link href={localizeHref(country.href, locale)} className={"intl-country" + (country.status === "coming-soon" ? " is-soon" : "")} onClick={close}>
                  <span className="intl-country-text">
                    <span className="intl-country-name">{country.name[locale]}</span>
                    <span className="intl-country-summary">{country.summary[locale]}</span>
                  </span>
                  <Arrow className="intl-country-arrow" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </dialog>
    </InternationalFrame>
  );
}
