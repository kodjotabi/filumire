"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { localizeHref, type Locale } from "@/lib/locale";
import { learnerDestination } from "@/lib/learner-navigation";
import { INTERNATIONAL_COPY } from "@/lib/international";

function UserIcon() {
  return (
    <svg className="intl-login-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="8" r="4.2" fill="currentColor" />
      <path d="M3.8 21c.6-4.6 4-7.4 8.2-7.4s7.6 2.8 8.2 7.4z" fill="currentColor" />
    </svg>
  );
}

export function InternationalHeader({ locale }: { locale: Locale }) {
  const copy = INTERNATIONAL_COPY[locale];
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const loginHref = learnerDestination("login", locale) ?? localizeHref("/access", locale);

  useEffect(() => {
    if (!menuOpen) return;
    wrapRef.current?.querySelector<HTMLAnchorElement>("#intl-menu a")?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setMenuOpen(false); toggleRef.current?.focus(); } };
    const onPointer = (event: PointerEvent) => { if (event.target instanceof Node && !wrapRef.current?.contains(event.target)) setMenuOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onPointer); };
  }, [menuOpen]);

  return (
    <header className="intl-header">
      <div className="intl-header-inner">
        <Link href={localizeHref("/", locale)} className="intl-brand" aria-label={copy.home}>
          <img src="/brand/filumire-logo-white.svg" alt="" width="577" height="180" />
        </Link>
        <div className="intl-header-actions" ref={wrapRef}>
          <nav className="intl-lang" aria-label={copy.language}>
            <Link href={localizeHref(pathname, "en")} hrefLang="en" lang="en" aria-label="English" data-language-switch="true" aria-current={locale === "en" ? "page" : undefined} className={locale === "en" ? "is-active" : undefined}>EN</Link>
            <Link href={localizeHref(pathname, "fr")} hrefLang="fr" lang="fr" aria-label="Français" data-language-switch="true" aria-current={locale === "fr" ? "page" : undefined} className={locale === "fr" ? "is-active" : undefined}>FR</Link>
          </nav>
          <a href={loginHref} className="intl-login"><UserIcon /><span>{copy.login}</span></a>
          <button ref={toggleRef} type="button" className="intl-menu-toggle" aria-expanded={menuOpen} aria-controls="intl-menu" aria-label={menuOpen ? copy.menuClose : copy.menuOpen} onClick={() => setMenuOpen(open => !open)}>
            <span aria-hidden="true" />
          </button>
          <div id="intl-menu" className="intl-menu" hidden={!menuOpen}>
            <a href={loginHref} onClick={() => setMenuOpen(false)}><UserIcon />{copy.login}</a>
          </div>
        </div>
      </div>
    </header>
  );
}

export function InternationalLandscape({ locale }: { locale: Locale }) {
  return (
    <footer className="intl-landscape">
      <div className="intl-landscape-art"><img src="/illustrations/landscapefooter.png" alt="" width="1600" height="582" decoding="async" /></div>
      <div className="intl-landscape-band">
        <p className="intl-tagline">{INTERNATIONAL_COPY[locale].tagline}</p>
        <span className="intl-tagline-bar" aria-hidden="true" />
      </div>
    </footer>
  );
}

/** Standalone frame for international pages: own header, main landmark and landscape footer. */
export function InternationalFrame({ locale, children, className }: { locale: Locale; children: ReactNode; className?: string }) {
  return (
    <div className={"intl-page" + (className ? " " + className : "")}>
      <InternationalHeader locale={locale} />
      <main id="main-content" tabIndex={-1} className="intl-main">{children}</main>
      <InternationalLandscape locale={locale} />
    </div>
  );
}
