"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { signOut, type Account } from "../../services/account-client";
import { LanguageToggle } from "./LanguageToggle";
import type { Language } from "./language";

const TEXT = {
  en: {
    choose: "Choose your view",
    family: "Family",
    parent: "Parent view",
    teacher: "Teacher workspace",
    familyHome: "FILUMIRE family home",
    parentHome: "FILUMIRE parent home",
    teacherHome: "FILUMIRE teacher home",
    site: "FILUMIRE home",
    signOut: "Sign out",
    signingOut: "Signing out…",
    signOutFailed: "Sign-out failed. You are still signed in. Try again.",
  },
  fr: {
    choose: "Choisir votre espace",
    family: "Famille",
    parent: "Espace parent",
    teacher: "Espace enseignant",
    familyHome: "Accueil famille FILUMIRE",
    parentHome: "Accueil parent FILUMIRE",
    teacherHome: "Accueil enseignant FILUMIRE",
    site: "Accueil FILUMIRE",
    signOut: "Se déconnecter",
    signingOut: "Déconnexion…",
    signOutFailed: "La déconnexion a échoué. Vous êtes toujours connecté. Réessayez.",
  },
} as const;

/*
 * Who is using the parent/teacher pages: "guardian" or "teacher"
 * once the signed-in account is known, "none" when nobody (or a
 * learner) is signed in, undefined while the account is loading.
 * Only navigation follows this; each page and API still checks the
 * relationship on the server.
 */
export type AdultRole = "guardian" | "teacher" | "none" | undefined;

/* A guardian account that may also use the teacher workspace (server-provided roles). */
export function alsoTeacher(account: Account | null | undefined): boolean {
  return account?.accountKind === "guardian" && account.roles?.includes("teacher") === true;
}

export function adultRole(account: Account | null | undefined): AdultRole {
  if (account === undefined) return undefined;
  if (account?.accountKind === "guardian" || account?.accountKind === "teacher") {
    return account.accountKind;
  }
  return "none";
}

/*
 * Header for the parent and teacher pages. The logo returns to the
 * adult's own home (family page or teacher workspace); a separate
 * link leads back to the public FILUMIRE home page. Signed-in adults
 * also get Family (guardians) and Sign out here, so no page is a
 * dead end.
 */
export function AdultHeader({
  active,
  role,
  language,
  onLanguage,
}: {
  active: "parent" | "teacher";
  role: AdultRole;
  language: Language;
  onLanguage: (value: Language) => void;
}) {
  const t = TEXT[language];
  const [home, homeLabel] =
    role === "guardian"
      ? ["/family", t.familyHome]
      : role === "teacher"
        ? ["/teacher", t.teacherHome]
        : role === "none"
          ? ["/", t.site]
          : active === "parent"
            ? ["/adult", t.parentHome]
            : ["/teacher", t.teacherHome];

  return (
    <header className="filumireLearnerHeader filumireAdultHeader">
      <Link
        href={`${home}?lang=${language}`}
        className="filumireHeaderLogo"
        aria-label={homeLabel}
      >
        <img src="/filumire-logo-white.svg" alt="FILUMIRE" />
      </Link>
      <div className="filumireHeaderActions">
        <Link href={`/?lang=${language}`} className="filumireAdultSite">
          {t.site}
        </Link>
        <LanguageToggle language={language} onChange={onLanguage} />
        {(role === "guardian" || role === "teacher") && (
          <AdultSignOut language={language} />
        )}
      </div>
    </header>
  );
}

function AdultSignOut({ language }: { language: Language }) {
  const t = TEXT[language];
  const working = useRef(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function leave() {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setFailed(false);
    try {
      await signOut();
      window.location.assign(`/login?lang=${language}`);
    } catch {
      working.current = false;
      setBusy(false);
      setFailed(true);
    }
  }

  return (
    <>
      <button
        type="button"
        className="filumireAdultSignOut"
        disabled={busy}
        aria-busy={busy}
        onClick={() => void leave()}
      >
        {busy ? t.signingOut : t.signOut}
      </button>
      {failed && (
        <p className="filumireAdultSignOutError" role="alert">
          {t.signOutFailed}
        </p>
      )}
    </>
  );
}

/*
 * Moves a signed-in adult between their own pages: a guardian
 * between the family page and the parent view, a teacher to the
 * workspace. Nothing is shown until the account is known, or when
 * nobody is signed in. The switch only navigates. A guardian who may
 * also teach (a reviewer in the all-roles test period) gets the
 * workspace too; the server still checks every teacher request.
 */
export function AdultRoleSwitch({
  active,
  role,
  alsoTeacher = false,
  language = "en",
}: {
  active: "parent" | "teacher";
  role: AdultRole;
  alsoTeacher?: boolean;
  language?: Language;
}) {
  const t = TEXT[language];

  if (role !== "guardian" && role !== "teacher") return null;

  return (
    <nav className="adultRoleSwitch" aria-label={t.choose}>
      {role === "guardian" ? (
        <>
          <Link href={`/family?lang=${language}`}>{t.family}</Link>
          <Link
            href={`/adult?lang=${language}`}
            className={active === "parent" ? "active" : undefined}
            aria-current={active === "parent" ? "page" : undefined}
          >
            {t.parent}
          </Link>
          {alsoTeacher ? (
            <Link
              href={`/teacher?lang=${language}`}
              className={active === "teacher" ? "active" : undefined}
              aria-current={active === "teacher" ? "page" : undefined}
            >
              {t.teacher}
            </Link>
          ) : null}
        </>
      ) : (
        <Link
          href={`/teacher?lang=${language}`}
          className={active === "teacher" ? "active" : undefined}
          aria-current={active === "teacher" ? "page" : undefined}
        >
          {t.teacher}
        </Link>
      )}
    </nav>
  );
}
