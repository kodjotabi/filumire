"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLocaleNavigation } from "@/lib/useLocaleNavigation";
import { localizeHref } from "@/lib/locale";
import { translateTree, text } from "@/lib/translate";
import { learnerDestination } from "@/lib/learner-navigation";
import { FILUMIRE_CONFIG } from "@/lib/constants";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { pathname, locale, currentHref } = useLocaleNavigation();
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    headerRef.current?.querySelector<HTMLAnchorElement>("#primary-navigation a")?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") { setMobileMenuOpen(false); toggleRef.current?.focus(); }
    }
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) setMobileMenuOpen(false);
    }
    function closeOnResize() { if (window.innerWidth > 1100) setMobileMenuOpen(false); }
    function closeOnFocus(event: FocusEvent) {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) setMobileMenuOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOnFocus);
    window.addEventListener("resize", closeOnResize);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("focusin", closeOnFocus);
      window.removeEventListener("resize", closeOnResize);
    };
  }, [mobileMenuOpen]);

  const closeMenu = () => setMobileMenuOpen(false);
  const french = locale === "fr";
  return translateTree((
    <header className="header-wrapper" ref={headerRef}>
      <div className="top-announcement">
        <span className="announcement-message">
          <strong>FILUMIRE</strong>: Adaptive Learning<span className="mobile-announcement-break"><br /></span> Infrastructure for African Children
        </span>
        <div className="announcement-actions">
          <nav className="language-selector" aria-label="Select language">
            <Link href={localizeHref(currentHref,"en")} hrefLang="en" aria-label="English" lang="en" data-language-switch="true" className={"language-option" + (!french ? " language-active" : "")} aria-current={!french ? "page" : undefined} onClick={closeMenu}>EN</Link>
            <span aria-hidden="true">|</span>
            <Link href={localizeHref(currentHref,"fr")} hrefLang="fr" lang="fr" aria-label="Français" data-language-switch="true" className={"language-option" + (french ? " language-active" : "")} aria-current={french ? "page" : undefined} onClick={closeMenu}>FR</Link>
          </nav>
          <Link href="/access" onClick={closeMenu} style={{ color: "#ffffff", fontSize: "12px", textDecoration: "none" }}>
            Parent &amp; Teacher Access &rarr;
          </Link>
        </div>
      </div>
      <div className="site-container">
        <div className="site-header">
          <Link href="/" className="brand-link" onClick={closeMenu}>
            <img src="/brand/filumire-f.svg" alt="" className="brand-mark-img" width="28" height="28" style={{background:"white", borderRadius:"50%", padding:8, width:44, height:44, flexShrink:0}} /><img src="/brand/filumire-logo-blue.svg" alt="FILUMIRE home" className="brand-logo-img" width="190" height="42" />
          </Link>
          <nav aria-label="Main navigation">
            <ul id="primary-navigation" className={"nav-menu" + (mobileMenuOpen ? " mobile-open" : "")}>
              {FILUMIRE_CONFIG.navLinks.map((item) => (
                <li key={item.href} className={item.href === "/pricing" ? "nav-item-pricing" : undefined}>
                  <Link href={item.href} className={"nav-link" + (pathname === localizeHref(item.href,locale) ? " active" : "")} aria-current={pathname === localizeHref(item.href,locale) ? "page" : undefined} onClick={closeMenu}>
                    {item.href === "/pricing" ? (french ? "S’abonner" : "Subscribe") : item.label}
                  </Link>
                </li>
              ))}
              <li className="mobile-nav-actions">
                <a href={learnerDestination('start',locale) ?? localizeHref('/access#learner',locale)} onClick={closeMenu} className="btn btn-primary">{french ? "Espace apprenant" : "Learner Portal"}</a>
                <a href={learnerDestination('login',locale) ?? localizeHref('/access#learner',locale)} className="btn btn-outline">{french ? "Se connecter" : "Log In"}</a>
                <Link href="/pricing" className="btn btn-outline">{french ? "Abonnements" : "Subscribe"}</Link>
                <Link href="/contact?inquiry=school-pilot" className="btn btn-outline" onClick={closeMenu}>School Pilot Inquiries</Link>
                <Link href="/partners" className="nav-link" onClick={closeMenu}>Potential Partners</Link>
              </li>
            </ul>
          </nav>
          <div className="header-actions">
            <Link href="/contact?inquiry=school-pilot" className="btn btn-outline btn-sm" onClick={closeMenu}>School Pilots</Link>
            <a href={learnerDestination('start',locale) ?? localizeHref('/access#learner',locale)} onClick={closeMenu} className="btn btn-primary btn-sm">{french ? "Espace apprenant" : "Learner Portal"}</a>
            <a href={learnerDestination('login',locale) ?? localizeHref('/access#learner',locale)} className="btn btn-outline btn-sm">{french ? "Connexion" : "Log In"}</a>
            <button ref={toggleRef} type="button" className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(open => !open)} aria-label={text(mobileMenuOpen ? "Close navigation menu" : "Open navigation menu",locale)} aria-expanded={mobileMenuOpen} aria-controls="primary-navigation">
              <span aria-hidden="true">{mobileMenuOpen ? "✕" : "☰"}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  ), locale);
}
