"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLocaleNavigation } from "@/lib/useLocaleNavigation";
import { localizeHref } from "@/lib/locale";
import { learnerDestination } from "@/lib/learner-navigation";
import { COUNTRIES, NAV_LINKS, SHELL_COPY } from "@/lib/site";
import { GlobeIcon, UserIcon } from "./icons";

export function SiteHeader() {
  const { pathname, locale, currentHref } = useLocaleNavigation();
  const copy = SHELL_COPY[locale];
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const href = (path: string) => localizeHref(path, locale);
  const startHref = learnerDestination("start", locale) ?? href("/contact#learner");
  const loginHref = learnerDestination("login", locale) ?? href("/contact#learner");
  const current = (path: string) => pathname === href(path);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    headerRef.current?.querySelector<HTMLAnchorElement>("#primary-navigation a")?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); toggleRef.current?.focus(); } };
    const onPointer = (event: PointerEvent) => { if (event.target instanceof Node && !headerRef.current?.contains(event.target)) setOpen(false); };
    const onResize = () => { if (window.innerWidth >= 1360) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const languageSwitch = (className: string) => (
    <div className={className} role="group" aria-label={copy.language}>
      {(["en", "fr"] as const).map((lang) => (
        <Link key={lang} href={localizeHref(currentHref, lang)} hrefLang={lang} lang={lang} aria-label={lang === "en" ? "English" : "Français"} data-language-switch="true" aria-current={locale === lang ? "page" : undefined} className={locale === lang ? "is-active" : undefined}>
          {lang.toUpperCase()}
        </Link>
      ))}
    </div>
  );

  return (
    <header className="fs-header" ref={headerRef}>
      <div className="fs-header-inner">
        <Link href={href("/")} className="fs-brand" aria-label={copy.home}>
          <img src="/brand/filumire-logo-white.svg" alt="" width="577" height="180" />
        </Link>
        <nav className="fs-nav" aria-label={copy.mainNav}>
          <ul id="primary-navigation" className={open ? "is-open" : undefined}>
            {NAV_LINKS.map((item) => (
              <li key={item.href}>
                <Link href={href(item.href)} aria-current={current(item.href) ? "page" : undefined}>{item.label[locale]}</Link>
              </li>
            ))}
            <li className="fs-nav-extra">
              <Link href={href("/contact")} aria-current={current("/contact") ? "page" : undefined}>{copy.help}</Link>
            </li>
            <li className="fs-nav-extra fs-nav-countries">
              <span className="fs-nav-label">{copy.country}</span>
              <ul>
                {COUNTRIES.map((country) => (
                  <li key={country.id}><Link href={href(country.href)} aria-current={current(country.href) ? "page" : undefined}>{country.name[locale]}</Link></li>
                ))}
              </ul>
            </li>
            <li className="fs-nav-extra fs-nav-actions">
              <div className="fs-nav-lang"><span>{copy.languageMenu}</span>{languageSwitch("fs-lang")}</div>
              <a href={loginHref} className="fs-btn fs-btn-ghost"><UserIcon className="fs-btn-icon" />{copy.login}</a>
              <a href={startHref} className="fs-btn fs-btn-start fs-nav-start">{copy.start}</a>
            </li>
          </ul>
        </nav>
        <div className="fs-header-actions">
          <details className="fs-country">
            <summary aria-label={copy.countryMenu}><GlobeIcon className="fs-country-icon" /><span>{copy.country}</span></summary>
            <ul>
              {COUNTRIES.map((country) => (
                <li key={country.id}>
                  <Link href={href(country.href)}>
                    <strong>{country.name[locale]}</strong>
                    <span>{country.summary[locale]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </details>
          {languageSwitch("fs-lang fs-lang-desktop")}
          <a href={loginHref} className="fs-login"><UserIcon className="fs-btn-icon" /><span>{copy.login}</span></a>
          <a href={startHref} className="fs-btn fs-btn-start">{copy.start}</a>
          <button ref={toggleRef} type="button" className="fs-menu-toggle" aria-expanded={open} aria-controls="primary-navigation" aria-label={open ? copy.menuClose : copy.menuOpen} onClick={() => setOpen((value) => !value)}>
            <span aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
