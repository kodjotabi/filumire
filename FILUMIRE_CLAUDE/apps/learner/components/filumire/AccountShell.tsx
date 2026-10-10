"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LanguageToggle } from "./LanguageToggle";
import type { Language } from "./language";

/*
 * Page frame for the account pages (registration, family, privacy
 * notice): the FILUMIRE top bar with back link, logo and language
 * switch, a centred column of cards, and the shared form styles
 * those pages use (.acCard, .acField, .acButton, ...).
 */
type Props = {
  language: Language;
  onLanguage: (value: Language) => void;
  backHref: string;
  backLabel: string;
  children: ReactNode;
  wide?: boolean;
};

const TEXT = {
  en: { back: "Back", home: "FILUMIRE home", skip: "Skip to content" },
  fr: { back: "Retour", home: "Accueil FILUMIRE", skip: "Aller au contenu" },
};

export function AccountShell({
  language,
  onLanguage,
  backHref,
  backLabel,
  children,
  wide,
}: Props) {
  const t = TEXT[language];

  return (
    <div className={`acPage${wide ? " wide" : ""}`} lang={language}>
      <a className="filumireSkipLink" href="#account-content">
        {t.skip}
      </a>
      <header className="acTop">
        <Link href={backHref} className="acBack" aria-label={backLabel}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 12H5M11 5l-7 7 7 7" />
          </svg>
          {t.back}
        </Link>
        <Link href={`/?lang=${language}`} className="acLogo" aria-label={t.home}>
          <img src="/filumire-logo-white.svg" alt="FILUMIRE" />
        </Link>
        <LanguageToggle language={language} onChange={onLanguage} variant="compact" />
      </header>

      <main id="account-content" className="acMain">
        {children}
      </main>

      <footer className="acFoot">
        <img src="/images/home/landscape%20footer.png" alt="" />
      </footer>

      <style>{`
        .acPage { min-height: 100dvh; display: flex; flex-direction: column; background: #ffffff; color: var(--ui-ink); }
        .acTop { height: 64px; padding: 0 16px; display: flex; align-items: center; gap: 12px; background: var(--ui-bar); color: #fff; }
        .acTop .filumireLangSwitch { margin-left: auto; }
        .acBack { width: 38px; height: 42px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; border-radius: 8px; background: var(--ui-back); color: #fff; text-decoration: none; font-size: 10px; font-weight: 700; line-height: 1; }
        .acBack svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
        .acLogo { display: flex; align-items: center; }
        .acLogo img { width: 103px; height: auto; max-height: 40px; object-fit: contain; }
        .acMain { width: 100%; max-width: 560px; margin: 0 auto; padding: 20px 16px 8px; box-sizing: border-box; display: grid; gap: 14px; align-content: start; }
        .acPage.wide .acMain { max-width: 880px; }
        .acFoot { margin-top: auto; height: 72px; overflow: hidden; }
        .acFoot img { width: 100%; height: auto; display: block; }

        .acMain h1 { margin: 0; font-size: 26px; line-height: 1.15; font-weight: 800; }
        .acMain h1 span { color: var(--ui-brand); }
        .acLead { margin: 0; color: var(--ui-ink-soft); font-size: 15px; line-height: 1.45; }
        .acCard { padding: 16px; border-radius: 16px; background: var(--ui-blue-tint); display: grid; gap: 10px; }
        .acCard.green { background: var(--ui-green-tint); }
        .acCard.plain { background: #fff; border: 1px solid var(--ui-line); }
        .acCard h2 { margin: 0; font-size: 19px; font-weight: 800; }
        .acCard p { margin: 0; color: var(--ui-ink-soft); font-size: 14px; line-height: 1.45; }
        .acNotice { padding: 12px 14px; border-radius: 12px; background: var(--ui-amber-tint); border: 1px solid #f3c66b; color: #6b4300; font-size: 13.5px; line-height: 1.45; }
        .acNotice strong { display: block; margin-bottom: 2px; color: #4f3100; }
        .acForm { display: grid; gap: 12px; }
        .acField { display: grid; gap: 5px; }
        .acField label, .acField .acLabel { font-size: 14px; font-weight: 700; }
        .acField input, .acField select { height: 46px; padding: 0 12px; border: 1px solid var(--ui-line); border-radius: 10px; background: #fff; color: var(--ui-ink); font: inherit; font-size: 15px; box-sizing: border-box; width: 100%; }
        .acField input:focus-visible, .acField select:focus-visible, .acCheck input:focus-visible { outline: 3px solid var(--ui-brand); outline-offset: 2px; }
        .acHelp { margin: 0; color: var(--ui-ink-soft); font-size: 12.5px; line-height: 1.4; }
        .acField[data-invalid="true"] input { border-color: #c62828; }
        .acCheck { display: grid; grid-template-columns: 24px 1fr; gap: 10px; align-items: start; font-size: 14px; line-height: 1.45; }
        .acCheck input { width: 22px; height: 22px; margin: 1px 0 0; accent-color: var(--ui-blue); }
        .acCheck a { color: var(--ui-brand); font-weight: 700; }
        .acButton { min-height: 46px; padding: 0 18px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: 10px; background: var(--ui-blue); color: #fff; font: inherit; font-size: 15px; font-weight: 800; text-decoration: none; cursor: pointer; box-sizing: border-box; }
        .acButton.green { background: var(--ui-green); }
        .acButton.secondary { background: #fff; color: var(--ui-ink); border: 1px solid var(--ui-line); }
        .acButton.quiet { min-height: 38px; padding: 0 12px; background: transparent; color: var(--ui-brand); font-size: 14px; }
        .acButton[disabled] { opacity: 0.65; cursor: progress; }
        .acButton:focus-visible { outline: 3px solid var(--ui-brand); outline-offset: 2px; }
        .acActions { display: flex; flex-wrap: wrap; gap: 8px; }
        .acMessage { margin: 0; font-size: 14px; line-height: 1.4; color: #b3261e; }
        .acMessage.ok { color: #1b6e36; }
        .acMessage:empty { display: none; }
        .acSmall { margin: 0; font-size: 13px; color: var(--ui-ink-soft); }
        .acSmall a { color: var(--ui-brand); font-weight: 700; }

        @media (min-width: 768px) {
          .acTop { height: 72px; padding: 0 32px; }
          .acLogo img { width: 128px; }
          .acMain { padding-top: 32px; gap: 18px; }
          .acMain h1 { font-size: 34px; }
          .acCard { padding: 22px; border-radius: 20px; }
          .acFoot { height: 120px; }
        }
        @media (min-width: 1024px) {
          .acTop { padding: 0 max(40px, calc((100% - 1200px) / 2)); }
          .acFoot { height: clamp(120px, 12vw, 180px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .acPage * { transition: none !important; animation: none !important; }
        }
      `}</style>
    </div>
  );
}
