"use client";
/*
 * The original FILUMIRE landing page (filumire.com), restored from commit
 * e6f56983 (27 Oct 2026, owner-reviewed 26 Oct): its own header, the
 * bilingual headline between the two mascots, Choose Your Country, and the
 * landscape band. The rest of the website sits behind the country choice.
 */
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocaleNavigation } from "@/lib/useLocaleNavigation";
import { localizeHref, type Locale } from "@/lib/locale";
import { learnerDestination } from "@/lib/learner-navigation";
import { COUNTRIES, SHELL_COPY } from "@/lib/site";
import { LANDING_COPY } from "@/lib/site-pages";
import { Arrow, GlobeIcon, Stroke, UserIcon } from "./icons";

function LandingHeader({ locale }: { locale: Locale }) {
  const copy = LANDING_COPY[locale];
  const shell = SHELL_COPY[locale];
  const { currentHref } = useLocaleNavigation();
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const loginHref = learnerDestination("login", locale) ?? localizeHref("/contact#parent", locale);

  useEffect(() => {
    if (!menuOpen) return;
    wrapRef.current?.querySelector<HTMLAnchorElement>("#landing-menu a")?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setMenuOpen(false); toggleRef.current?.focus(); } };
    const onPointer = (event: PointerEvent) => { if (event.target instanceof Node && !wrapRef.current?.contains(event.target)) setMenuOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onPointer); };
  }, [menuOpen]);

  const languageSwitch = (className: string) => (
    <div className={className} role="group" aria-label={shell.language}>
      {(["en", "fr"] as const).map((lang) => (
        <Link key={lang} href={localizeHref(currentHref, lang)} hrefLang={lang} lang={lang} aria-label={lang === "en" ? "English" : "Français"} data-language-switch="true" aria-current={locale === lang ? "page" : undefined} className={locale === lang ? "is-active" : undefined}>
          {lang.toUpperCase()}
        </Link>
      ))}
    </div>
  );

  return (
    <header className="intl-header">
      <div className="intl-header-inner">
        <Link href={localizeHref("/", locale)} className="intl-brand" aria-label={copy.home}>
          <img src="/brand/filumire-logo-white.svg" alt="" width="577" height="180" />
        </Link>
        <div className="intl-header-actions" ref={wrapRef}>
          {languageSwitch("intl-lang")}
          <a href={loginHref} className="intl-login"><UserIcon className="intl-login-icon" /><span>{copy.login}</span></a>
          <button ref={toggleRef} type="button" className="intl-menu-toggle" aria-expanded={menuOpen} aria-controls="landing-menu" aria-label={menuOpen ? shell.menuClose : shell.menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            <span aria-hidden="true" />
          </button>
          <div id="landing-menu" className="intl-menu" hidden={!menuOpen}>
            <a href={loginHref} onClick={() => setMenuOpen(false)}><UserIcon className="intl-login-icon" />{copy.login}</a>
            <div className="intl-menu-lang">
              <span>{shell.languageMenu}</span>
              {languageSwitch("intl-lang intl-lang-menu")}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export function Landing({ locale, boy, girl }: { locale: Locale; boy: ReactNode; girl: ReactNode }) {
  const copy = LANDING_COPY[locale];
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [before, accent, after] = copy.headline;
  const other: Locale = locale === "fr" ? "en" : "fr";

  const open = () => dialogRef.current?.showModal();
  const close = () => dialogRef.current?.close();

  /* "Choose another country" on the coming-soon pages links to /#choose-country. */
  useEffect(() => { if (window.location.hash === "#choose-country" && !dialogRef.current?.open) dialogRef.current?.showModal(); }, []);

  return (
    <div className="intl-page intl-landing">
      <LandingHeader locale={locale} />
      <main id="main-content" tabIndex={-1} className="intl-main">
        <section className="intl-hero" aria-labelledby="intl-headline">
          <div className="intl-hero-grid">
            <div className="intl-copy">
              <p className="intl-pill"><span>{copy.madeForAfrica}</span><span className="intl-pill-bars" aria-hidden="true"><i /><i /><i /></span></p>
              <h1 id="intl-headline" className="intl-headline">{before}<span className="intl-accent">{accent}</span>{after}</h1>
              <Stroke className="intl-stroke intl-stroke-head" />
              <p className="intl-subtitle" lang={other}>{copy.subtitle[0]}<br className="intl-br" /> {copy.subtitle[1]}</p>
              <Stroke className="intl-stroke intl-stroke-sub" />
            </div>
            <div className="intl-mascot intl-mascot-boy" aria-hidden="true">{boy}</div>
            <div className="intl-mascot intl-mascot-girl" aria-hidden="true">{girl}</div>
            <div className="intl-cta-wrap">
              <button ref={triggerRef} type="button" className="intl-cta" aria-haspopup="dialog" aria-controls="choose-country" onClick={open}>
                <GlobeIcon className="intl-cta-globe" />
                <span className="intl-cta-divider" aria-hidden="true" />
                <span className="intl-cta-text">
                  <span className="intl-cta-primary">{copy.ctaPrimary}</span>
                  <span className="intl-cta-secondary" lang={other}>{copy.ctaSecondary}</span>
                </span>
                <Arrow className="intl-cta-arrow" />
              </button>
            </div>
          </div>
        </section>

        <dialog
          ref={dialogRef}
          id="choose-country"
          className="intl-dialog"
          aria-labelledby="intl-dialog-title"
          aria-describedby="intl-dialog-intro"
          onClick={(event) => { if (event.target === event.currentTarget) close(); }}
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
              {COUNTRIES.map((country) => (
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
      </main>
      <footer className="intl-landscape">
        <div className="intl-landscape-art"><img src="/illustrations/landscapefooter.png" alt="" width="1600" height="582" decoding="async" /></div>
        <div className="intl-landscape-band">
          <p className="intl-tagline">{SHELL_COPY[locale].tagline}</p>
          <span className="intl-tagline-bar" aria-hidden="true" />
        </div>
      </footer>
    </div>
  );
}
