"use client";
import { useLocaleNavigation } from "@/lib/useLocaleNavigation";
import { localizeHref } from "@/lib/locale";
import Link from "next/link";
import { AccessLink } from "@/components/AccessLink";
import { translateTree } from "@/lib/translate";
import type { Locale } from "@/lib/locale";
import { SITE_CONTENT } from "@/lib/content";

export function Footer(_props: { locale?: Locale }) {
  const { locale, currentHref } = useLocaleNavigation();
  const otherLocale = locale === "fr" ? "en" : "fr";
  const content = SITE_CONTENT.en.footer;

  return translateTree((
    <footer className="site-footer">
      {/* Landscape Banner Artwork */}
      <div className="landscape-art-box">
        <img
          src="/illustrations/landscapefooter.png"
          alt=""
          className="landscape-img"
        />
        <div className="landscape-overlay-text">
          <p className="landscape-tagline">{content.tagline}</p>
          <p className="landscape-subtag">{content.subtagline}</p>
        </div>
      </div>

      <div className="site-container">
        {/* Navigation Grid */}
        <div className="footer-nav-grid">
          {/* Brand Column */}
          <div className="footer-brand-col">
            <Link href="/ghana" className="brand-link">
              <img
                src="/brand/filumire-logo-white.svg"
                alt="FILUMIRE"
                style={{ height: "38px", width: "auto" }}
              />
            </Link>
            <p>{content.description}</p>
            <div style={{ marginTop: "16px", display: "flex", gap: "10px", alignItems: "center" }}>
              <Link href={localizeHref(currentHref, otherLocale)} hrefLang={otherLocale} data-language-switch="true" className="section-eyebrow section-eyebrow-green" style={{ fontSize: "11px", margin: 0 }}>
                {otherLocale === "fr" ? "Français" : "English"}
              </Link>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h2 className="footer-col-title">{content.sections.product.title}</h2>
            <ul className="footer-links-list">
              {content.sections.product.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="footer-link">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Stakeholders & Solutions */}
          <div>
            <h2 className="footer-col-title">{content.sections.stakeholders.title}</h2>
            <ul className="footer-links-list">
              {content.sections.stakeholders.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="footer-link">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Organization */}
          <div>
            <h2 className="footer-col-title">{content.sections.organization.title}</h2>
            <ul className="footer-links-list">
              {content.sections.organization.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="footer-link">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Portals (Configurable Destination Placeholders) */}
          <div>
            <h2 className="footer-col-title">{content.sections.portals.title}</h2>
            <ul className="footer-links-list">
              <li>
                <AccessLink role="learner" 
                  className="footer-link"
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  Learner Access &rarr;
                </AccessLink>
              </li>
              <li>
                <AccessLink role="parent" 
                  className="footer-link"
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  Parent Access &rarr;
                </AccessLink>
              </li>
              <li>
                <AccessLink role="teacher" 
                  className="footer-link"
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  Teacher Access &rarr;
                </AccessLink>
              </li>
              <li>
                <Link href="/contact" className="footer-link">
                  Request Support
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom-row">
          <span>{content.copyright}</span>
          <div style={{ display: "flex", gap: "20px" }}>
            <Link href="/about#laws" className="footer-link">
              Educational Constitutional Laws
            </Link>
            <Link href="/privacy" className="footer-link">
              Website Privacy
            </Link>
            <Link href="/contact" className="footer-link">
              Institutional Inquiries
            </Link>
          </div>
        </div>
      </div>
    </footer>
  ), locale);
}
