"use client";

import Link from "next/link";
import { useLearnerAvatar } from "./avatars";
import { withLang, type Language } from "./language";
import { LanguageToggle } from "./LanguageToggle";

type LearnerHeaderProps = {
  backHref?: string;
  showAskFilu?: boolean;
  language?: Language;
  setupHeader?: boolean;
};

const TEXT = {
  en: {
    back: "Back",
    ask: "Ask FILU",
    home: "FILUMIRE learner home",
    profile: "My profile",
  },
  fr: {
    back: "Retour",
    ask: "Aide FILU",
    home: "Accueil apprenant FILUMIRE",
    profile: "Mon profil",
  },
} as const;

/*
 * Inside the learner app the FILUMIRE logo always returns to the
 * learner's home (the dashboard) in the current language. Every
 * link carries the language so it survives navigation.
 */
export function LearnerHeader({
  backHref,
  showAskFilu = true,
  language = "en",
  setupHeader = false,
}: LearnerHeaderProps) {
  const avatarSrc = useLearnerAvatar();
  const t = TEXT[language];
  const homeHref = withLang("/dashboard", language);
  const askHref = withLang("/dashboard?view=ask-filu", language);
  const profileHref = withLang("/dashboard?view=profile", language);
  const back = backHref ? withLang(backHref, language) : undefined;

  if (setupHeader) {
    return (
      <header className="filumireLearnerHeader filumireSetupHeader">
        <div className="filumireSetupHeaderLeft">
          <Link
            href={back ?? withLang("/login", language)}
            className="filumireBack"
          >
            <span className="filumireBackArrow" aria-hidden="true">‹</span>
            <span>{t.back}</span>
          </Link>

          <Link
            href={homeHref}
            className="filumireHeaderLogo filumireSetupLogo"
            aria-label={t.home}
          >
            <img src="/filumire-logo-white.svg" alt="FILUMIRE" />
          </Link>
        </div>

        <div className="filumireSetupHeaderRight">
          <LanguageToggle language={language} variant="compact" />

          {showAskFilu && (
            <Link href={askHref} className="filumireSetupAskFilu">
              <span className="filumireSetupChatIcon" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <span>{t.ask}</span>
            </Link>
          )}

          <Link
            href={profileHref}
            className="filumireSetupAvatar"
            aria-label={t.profile}
          >
            <img src={avatarSrc} alt="" />
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="filumireLearnerHeader">
      <div className="filumireHeaderSide">
        {back ? (
          <Link href={back} className="filumireBack">
            <span className="filumireBackArrow" aria-hidden="true"></span>
            <span>{t.back}</span>
          </Link>
        ) : (
          <Link
            href={homeHref}
            className="filumireHeaderLogo"
            aria-label={t.home}
          >
            <img src="/filumire-logo-white.svg" alt="FILUMIRE" />
          </Link>
        )}
      </div>

      {back && (
        <Link
          href={homeHref}
          className="filumireHeaderLogo filumireHeaderLogoCentered"
          aria-label={t.home}
        >
          <img src="/filumire-logo-white.svg" alt="FILUMIRE" />
        </Link>
      )}

      <div className="filumireHeaderActions">
        <LanguageToggle language={language} variant="compact" />

        {showAskFilu && (
          <Link href={askHref} className="filumireAskFilu">
            {t.ask}
          </Link>
        )}

        <Link
          href={profileHref}
          className="filumireAvatar"
          aria-label={t.profile}
        >
          <img src={avatarSrc} alt="" />
        </Link>
      </div>
    </header>
  );
}
