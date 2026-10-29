"use client";

import Link from "next/link";
import { useLocaleNavigation } from "@/lib/useLocaleNavigation";
import { localizeHref } from "@/lib/locale";
import { learnerDestination } from "@/lib/learner-navigation";
import { COUNTRIES, NAV_LINKS, SHELL_COPY } from "@/lib/site";

export function SiteFooter() {
  const { locale, currentHref } = useLocaleNavigation();
  const copy = SHELL_COPY[locale];
  const href = (path: string) => localizeHref(path, locale);
  const other = locale === "fr" ? "en" : "fr";
  const link = (path: string) => NAV_LINKS.find((item) => item.href === path)!;
  const columns = [
    { title: copy.footerExplore, links: [link("/how-it-works"), link("/subjects"), ...COUNTRIES.map((c) => ({ href: c.href, label: c.name }))] },
    { title: copy.footerAudiences, links: [link("/learners"), link("/parents"), link("/schools")] },
    { title: copy.footerCompany, links: [link("/about"), { href: "/contact", label: { en: SHELL_COPY.en.help, fr: SHELL_COPY.fr.help } }, { href: "/privacy", label: { en: SHELL_COPY.en.privacy, fr: SHELL_COPY.fr.privacy } }] },
  ];

  return (
    <footer className="fs-footer">
      <div className="fs-landscape">
        <div className="fs-landscape-art">
          <img src="/illustrations/landscapefooter.png" alt="" width="1600" height="582" loading="lazy" decoding="async" />
        </div>
        <p className="fs-tagline">{copy.tagline}</p>
      </div>
      <div className="fs-footer-body">
        <div className="fs-container fs-footer-grid">
          <div className="fs-footer-brand">
            <Link href={href("/")} aria-label={copy.home}>
              <img src="/brand/filumire-logo-white.svg" alt="" width="577" height="180" />
            </Link>
            <p>{copy.footerAbout}</p>
            <Link href={localizeHref(currentHref, other)} hrefLang={other} lang={other} data-language-switch="true" className="fs-footer-lang">{copy.otherLanguage}</Link>
            <p className="fs-footer-note">{copy.languageNote}</p>
          </div>
          {columns.map((column) => (
            <div key={column.title}>
              <h2>{column.title}</h2>
              <ul>
                {column.links.map((item) => (
                  <li key={item.href}><Link href={href(item.href)}>{item.label[locale]}</Link></li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h2>{copy.footerSignIn}</h2>
            <ul>
              <li><a href={learnerDestination("login", locale) ?? href("/contact#learner")}>{copy.login}</a></li>
              <li><a href={learnerDestination("start", locale) ?? href("/contact#learner")}>{copy.start}</a></li>
            </ul>
          </div>
        </div>
        <div className="fs-container fs-footer-bottom">
          <span>{copy.copyright}</span>
        </div>
      </div>
    </footer>
  );
}
