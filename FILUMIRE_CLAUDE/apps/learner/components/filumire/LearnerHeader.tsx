"use client";

import Link from "next/link";
import { useLearnerAvatar } from "./avatars";

type LearnerHeaderProps = {
  backHref?: string;
  showAskFilu?: boolean;
  language?: "en" | "fr";
  setupHeader?: boolean;
};

export function LearnerHeader({
  backHref,
  showAskFilu = true,
  language = "en",
  setupHeader = false,
}: LearnerHeaderProps) {
  const avatarSrc = useLearnerAvatar();
  if (setupHeader) {
    return (
      <header className="filumireLearnerHeader filumireSetupHeader">
        <div className="filumireSetupHeaderLeft">
          <Link
            href={backHref ?? "/login"}
            className="filumireBack"
            aria-label={language === "fr" ? "Retour" : "Back"}
          >
            <span className="filumireBackArrow" aria-hidden="true">‹</span>
            <span>{language === "fr" ? "Retour" : "Back"}</span>
          </Link>

          <Link
            href="/"
            className="filumireHeaderLogo filumireSetupLogo"
            aria-label="FILUMIRE home"
          >
            <img
              src="/filumire-logo-white.svg"
              alt="FILUMIRE"
            />
          </Link>
        </div>

        <div className="filumireSetupHeaderRight">
          <Link
            href={`/dashboard?lang=${language}&view=ask-filu`}
            className="filumireSetupAskFilu"
          >
            <span className="filumireSetupChatIcon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span>Ask FILU</span>
          </Link>

          <Link
            href={`/dashboard?lang=${language}&view=profile`}
            className="filumireSetupAvatar"
            aria-label="My profile"
          >
            <img
              src={avatarSrc}
              alt=""
            />
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="filumireLearnerHeader">
      <div className="filumireHeaderSide">
        {backHref ? (
          <Link
            href={backHref}
            className="filumireBack"
            aria-label={language === "fr" ? "Retour" : "Back"}
          >
            <span className="filumireBackArrow" aria-hidden="true"></span>
            <span>{language === "fr" ? "Retour" : "Back"}</span>
          </Link>
        ) : (
          <Link
            href="/"
            className="filumireHeaderLogo"
            aria-label="FILUMIRE home"
          >
            <img
              src="/filumire-logo-white.svg"
              alt="FILUMIRE"
            />
          </Link>
        )}
      </div>

      {backHref && (
        <Link
          href="/dashboard"
          className="filumireHeaderLogo filumireHeaderLogoCentered"
          aria-label="FILUMIRE learner home"
        >
          <img
            src="/filumire-logo-white.svg"
            alt="FILUMIRE"
          />
        </Link>
      )}

      <div className="filumireHeaderActions">
        {showAskFilu && (
          <Link
            href="/dashboard?view=ask-filu"
            className="filumireAskFilu"
          >
            Ask FILU
          </Link>
        )}

        <span className="filumireBell" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg></span><Link
          href="/dashboard?view=profile"
          className="filumireAvatar"
          aria-label="My profile"
        >
          <img src={avatarSrc} alt="" />
        </Link>
      </div>
    </header>
  );
}
