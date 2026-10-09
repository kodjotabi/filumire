"use client";

import Link from "next/link";
import { LanguageToggle } from "./LanguageToggle";
import type { Language } from "./language";

const TEXT = {
  en: {
    choose: "Choose your view",
    parent: "Parent view",
    teacher: "Teacher workspace",
    parentHome: "FILUMIRE parent home",
    teacherHome: "FILUMIRE teacher home",
    site: "FILUMIRE home",
  },
  fr: {
    choose: "Choisir votre espace",
    parent: "Espace parent",
    teacher: "Espace enseignant",
    parentHome: "Accueil parent FILUMIRE",
    teacherHome: "Accueil enseignant FILUMIRE",
    site: "Accueil FILUMIRE",
  },
} as const;

/*
 * Header for the parent and teacher pages. The logo returns to the
 * adult's own home (parent view or teacher workspace); a separate
 * link leads back to the public FILUMIRE home page.
 */
export function AdultHeader({
  active,
  language,
  onLanguage,
}: {
  active: "parent" | "teacher";
  language: Language;
  onLanguage: (value: Language) => void;
}) {
  const t = TEXT[language];
  const home = active === "parent" ? "/adult" : "/teacher";

  return (
    <header className="filumireLearnerHeader filumireAdultHeader">
      <Link
        href={`${home}?lang=${language}`}
        className="filumireHeaderLogo"
        aria-label={active === "parent" ? t.parentHome : t.teacherHome}
      >
        <img src="/filumire-logo-white.svg" alt="FILUMIRE" />
      </Link>
      <div className="filumireHeaderActions">
        <Link href={`/?lang=${language}`} className="filumireAdultSite">
          {t.site}
        </Link>
        <LanguageToggle language={language} onChange={onLanguage} />
      </div>
    </header>
  );
}

/*
 * The home and sign-in pages have one "Parent / Teacher Login"
 * entry that opens /adult. This switch lets the adult move between
 * the parent view and the teacher workspace. Each page still checks
 * the relationship on the server; the switch only navigates.
 */
export function AdultRoleSwitch({
  active,
  language = "en",
}: {
  active: "parent" | "teacher";
  language?: Language;
}) {
  const t = TEXT[language];

  return (
    <nav className="adultRoleSwitch" aria-label={t.choose}>
      <Link
        href={`/adult?lang=${language}`}
        className={active === "parent" ? "active" : undefined}
        aria-current={active === "parent" ? "page" : undefined}
      >
        {t.parent}
      </Link>
      <Link
        href={`/teacher?lang=${language}`}
        className={active === "teacher" ? "active" : undefined}
        aria-current={active === "teacher" ? "page" : undefined}
      >
        {t.teacher}
      </Link>
    </nav>
  );
}
