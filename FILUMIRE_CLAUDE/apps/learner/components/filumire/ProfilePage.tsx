"use client";

import { useState, type FormEvent } from "react";
import { AVATAR_KEY, LEARNER_AVATARS, useLearnerAvatar } from "./avatars";
import { computeAchievements } from "./achievements";

type Stat = { total: number; completed: number; tracked: number };

type Props = {
  language: "en" | "fr";
  onLanguage: (value: "en" | "fr") => void;
  name: string;
  onRename: (value: string) => void;
  overview: { subjects: Record<string, Stat> } | null;
  gradeName?: string;
  /* A real FILUMIRE sign-in: details save to the account. */
  signedIn?: boolean;
  /* A parent or guardian learning as their child on this device. */
  guardianSession?: boolean;
  onAvatar?: (avatarId: string) => void;
  onSignOut?: () => Promise<void>;
};

const text = {
  en: {
    edit: "Edit name",
    learner: "Learner",
    ach: "Achievements",
    prog: "Progress",
    active: "Active Subjects",
    quote: "Every step you take makes you stronger. Keep going!",
    settings: "My Settings",
    name: "My Name",
    nameLabel: "Your name",
    save: "Save",
    cancel: "Cancel",
    saved: "Saved.",
    grade: "My Class",
    gradeUnknown: "Set by your school",
    avatar: "My Avatar",
    chooseAvatar: "Choose avatar",
    lang: "Language",
    notif: "Notifications",
    look: "App Appearance",
    privacy: "Privacy & Safety",
    help: "Help & Support",
    out: "Log Out",
    soon: "Coming soon",
    device: "Your name and avatar are saved on this device only.",
    account: "Your name, avatar and language are saved to your FILUMIRE account.",
    family: "Back to the family page",
  },
  fr: {
    edit: "Modifier le prénom",
    learner: "Apprenant",
    ach: "Réussites",
    prog: "Progrès",
    active: "Matières actives",
    quote: "Chaque pas te rend plus fort !",
    settings: "Mes paramètres",
    name: "Mon prénom",
    nameLabel: "Ton prénom",
    save: "Enregistrer",
    cancel: "Annuler",
    saved: "Enregistré.",
    grade: "Ma classe",
    gradeUnknown: "Définie par ton école",
    avatar: "Mon avatar",
    chooseAvatar: "Choisir l’avatar",
    lang: "Langue",
    notif: "Notifications",
    look: "Apparence",
    privacy: "Confidentialité et sécurité",
    help: "Aide et assistance",
    out: "Se déconnecter",
    soon: "Bientôt",
    device: "Ton prénom et ton avatar sont enregistrés seulement sur cet appareil.",
    account: "Ton prénom, ton avatar et ta langue sont enregistrés dans ton compte FILUMIRE.",
    family: "Retour à la page famille",
  },
};

export default function ProfilePage({
  language,
  onLanguage,
  name,
  onRename,
  overview,
  gradeName,
  signedIn,
  guardianSession,
  onAvatar,
  onSignOut,
}: Props) {
  const t = text[language];
  const avatarSrc = useLearnerAvatar();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [status, setStatus] = useState("");
  // The overview lists exactly the subjects of the learner's grade.
  const rows: Array<Stat | undefined> = Object.values(overview?.subjects ?? {});
  const total = rows.reduce((n, r) => n + (r?.total ?? 0), 0);
  const doneAll = rows.reduce((n, r) => n + (r?.completed ?? 0), 0);
  const activeCount = rows.filter(
    (r) => (r?.tracked ?? 0) > 0 && (r?.completed ?? 0) < (r?.total ?? 0)
  ).length;
  const percent = total > 0 ? Math.round((doneAll / total) * 100) : 0;
  const badges = computeAchievements(rows, language).filter((a) => a.earned).length;

  function startEditing() {
    setDraft(name);
    setStatus("");
    setEditing(true);
  }

  function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = draft.trim();
    if (value) {
      onRename(value);
      setStatus(t.saved);
    }
    setEditing(false);
  }

  function chooseAvatar(id: string) {
    try {
      window.localStorage.setItem(AVATAR_KEY, id);
    } catch {
      /* storage unavailable */
    }
    window.dispatchEvent(new Event("filumire-avatar"));
    onAvatar?.(id);
  }

  async function logOut() {
    if (onSignOut) {
      await onSignOut();
      return;
    }

    // Ends the server session (production cookie). Development
    // builds have no session, so a 401 here is expected.
    try {
      await fetch("/api/session/logout", { method: "POST" });
    } catch {}
    try {
      window.localStorage.removeItem("filumire.learnerName");
      window.localStorage.removeItem(AVATAR_KEY);
    } catch {}
    window.location.href = `/?lang=${language}`;
  }

  return (
    <div className="profilePage">
      <section className="prTop">
        <img className="prAvatar" src={avatarSrc} alt="" />
        <div className="prWho">
          <h1>{name || t.learner}</h1>
          {gradeName ? <p className="prGrade">{gradeName}</p> : null}
          {!editing ? (
            <button type="button" className="prEdit" onClick={startEditing}>
              {t.edit}
            </button>
          ) : null}
        </div>
      </section>

      {editing ? (
        <form className="prNameForm" onSubmit={saveName}>
          <label htmlFor="profile-name">{t.nameLabel}</label>
          <input
            id="profile-name"
            type="text"
            value={draft}
            maxLength={40}
            autoComplete="given-name"
            autoFocus
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className="prNameActions">
            <button type="submit" className="fButton" disabled={!draft.trim()}>
              {t.save}
            </button>
            <button type="button" className="fButton secondary" onClick={() => setEditing(false)}>
              {t.cancel}
            </button>
          </div>
        </form>
      ) : null}

      <p className="visuallyHidden" role="status">
        {status}
      </p>

      <section className="prStats">
        <div>
          <b>{badges}</b>
          <span>{t.ach}</span>
        </div>
        <div>
          <b>{percent}%</b>
          <span>{t.prog}</span>
        </div>
        <div>
          <b>{activeCount}</b>
          <span>{t.active}</span>
        </div>
      </section>

      <section className="prQuote">
        <img src="/images/home/boy-continue.png" alt="" />
        <p>{t.quote}</p>
      </section>

      <section className="prList">
        <h2>{t.settings}</h2>

        <button type="button" className="prRow" onClick={startEditing}>
          <span>{t.name}</span>
          <em>{name || t.learner}</em>
        </button>

        <div className="prRow">
          <span>{t.grade}</span>
          <em>{gradeName || t.gradeUnknown}</em>
        </div>

        <div className="prRow prAvatarRow">
          <span id="profile-avatar-label">{t.avatar}</span>
          <div className="prAvatars" role="group" aria-labelledby="profile-avatar-label">
            {LEARNER_AVATARS.map((avatar, index) => (
              <button
                key={avatar.id}
                type="button"
                className={avatarSrc === avatar.src ? "on" : undefined}
                aria-pressed={avatarSrc === avatar.src}
                aria-label={`${t.chooseAvatar} ${index + 1}`}
                onClick={() => chooseAvatar(avatar.id)}
              >
                <img src={avatar.src} alt="" />
              </button>
            ))}
          </div>
        </div>

        <div className="prRow">
          <span id="profile-language-label">{t.lang}</span>
          <div className="prLang" role="group" aria-labelledby="profile-language-label">
            <button
              type="button"
              lang="en"
              className={language === "en" ? "on" : ""}
              aria-pressed={language === "en"}
              onClick={() => onLanguage("en")}
            >
              English
            </button>
            <button
              type="button"
              lang="fr"
              className={language === "fr" ? "on" : ""}
              aria-pressed={language === "fr"}
              onClick={() => onLanguage("fr")}
            >
              Français
            </button>
          </div>
        </div>

        {/* No notification, theme, privacy or help service exists yet,
            so these rows say so instead of offering controls that do
            nothing. */}
        <div className="prRow dim">
          <span>{t.notif}</span>
          <em>{t.soon}</em>
        </div>

        <div className="prRow dim">
          <span>{t.look}</span>
          <em>{t.soon}</em>
        </div>
        <div className="prRow dim">
          <span>{t.privacy}</span>
          <em>{t.soon}</em>
        </div>
        <div className="prRow dim">
          <span>{t.help}</span>
          <em>{t.soon}</em>
        </div>

        <p className="prDevice">{signedIn ? t.account : t.device}</p>

        {guardianSession ? (
          <a className="prRow" href={`/family?lang=${language}`}>
            <span>{t.family}</span>
          </a>
        ) : null}

        <button type="button" className="prRow out" onClick={logOut}>
          <span>{t.out}</span>
        </button>
      </section>

      <section className="homeFooter">
        <img src="/images/home/landscape%20footer.png" alt="" />
      </section>

      <style jsx>{`
        @media (min-width: 1024px) {
          .prNameForm {
            grid-area: name;
          }
        }

        .prGrade {
          margin: 0 0 8px;
          color: #3d5a80;
          font-size: 14px;
          font-weight: 700;
        }

        .prNameForm {
          display: grid;
          gap: 8px;
          padding: 14px;
          border-radius: 14px;
          background: #eaf3fc;
        }

        .prNameForm label {
          color: #0f2a6b;
          font-size: 14px;
          font-weight: 800;
        }

        .prNameForm input {
          height: 44px;
          padding: 0 12px;
          border: 2px solid #bcd8ef;
          border-radius: 10px;
          background: #fff;
          color: #0f2a6b;
          font: inherit;
          font-size: 15px;
        }

        .prNameActions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .prAvatarRow {
          flex-wrap: wrap;
          gap: 8px;
          padding-top: 6px;
          padding-bottom: 6px;
        }

        .prAvatars {
          display: flex;
          gap: 6px;
        }

        .prAvatars button {
          width: 40px;
          height: 40px;
          padding: 0;
          overflow: hidden;
          border: 2px solid transparent;
          border-radius: 50%;
          background: #fff;
        }

        .prAvatars button.on {
          border-color: #1677ff;
          box-shadow: 0 0 0 2px #fff, 0 0 0 4px #1677ff;
        }

        .prAvatars img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .prDevice {
          margin: 6px 4px 8px;
          color: #3d5a80;
          font-size: 12px;
          line-height: 1.4;
        }
      `}</style>

      <style jsx>{`
        .profilePage {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 10px;
        }

        .prTop {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 4px 0;
        }

        .prAvatar {
          width: 76px;
          height: 76px;
          border-radius: 50%;
          border: 3px solid #1677ff;
          background: #fff;
          object-fit: cover;
        }

        .prWho h1 {
          margin: 0 0 6px;
          color: #0f2a6b;
          font-size: 30px;
          font-weight: 800;
          line-height: 1;
        }

        .prEdit {
          padding: 6px 16px;
          border: 0;
          border-radius: 999px;
          background: #1677ff;
          color: #fff;
          font-size: 13px;
          font-weight: 700;
        }

        .prStats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .prStats div {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px 4px;
          border-radius: 14px;
          background: #eaf3fc;
          text-align: center;
        }

        .prStats b {
          color: #0f2a6b;
          font-size: 22px;
          font-weight: 800;
        }

        .prStats span {
          color: #3d5a80;
          font-size: 12px;
        }

        .prQuote {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 12px;
          border-radius: 14px;
          background: #fdf0cf;
        }

        .prQuote img {
          width: auto;
          height: 44px;
        }

        .prQuote p {
          margin: 0;
          color: #0f2a6b;
          font-size: 14px;
          font-weight: 600;
        }

        .prList h2 {
          margin: 0 0 6px;
          color: #0f2a6b;
          font-size: 18px;
          font-weight: 800;
        }

        .prRow {
          display: flex;
          width: 100%;
          min-height: 38px;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
          padding: 0 12px;
          border: 0;
          border-radius: 12px;
          background: #eaf3fc;
          color: #0f2a6b;
          font-size: 14px;
          font-weight: 700;
          text-align: left;
        }

        .prRow em {
          color: #5b7aa3;
          font-size: 13px;
          font-style: normal;
          font-weight: 600;
        }

        .prRow.dim {
          opacity: 0.7;
        }

        .prRow.out {
          color: #c0392b;
        }

        .prLang {
          display: flex;
          gap: 4px;
        }

        .prLang button {
          padding: 4px 10px;
          border: 0;
          border-radius: 999px;
          background: #fff;
          color: #0f2a6b;
          font-size: 12px;
          font-weight: 700;
        }

        .prLang button.on {
          background: #1677ff;
          color: #fff;
        }

        .prSwitch {
          position: relative;
          width: 44px;
          height: 24px;
          border: 0;
          border-radius: 999px;
          background: #b9c9dc;
        }

        .prSwitch i {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
        }

        .prSwitch.on {
          background: #1677ff;
        }

        .prSwitch.on i {
          left: 23px;
        }

        /* Tablet: larger identity block, stats and settings rows */
        @media (min-width: 768px) {
          .profilePage {
            gap: 16px;
          }

          .prTop {
            gap: 20px;
          }

          .prAvatar {
            width: 104px;
            height: 104px;
          }

          .prWho {
            min-width: 0;
          }

          .prWho h1 {
            margin-bottom: 10px;
            font-size: 36px;
            overflow-wrap: anywhere;
          }

          .prEdit {
            padding: 9px 20px;
            font-size: 14px;
          }

          .prStats {
            gap: 12px;
          }

          .prStats div {
            padding: 16px 8px;
            border-radius: 18px;
          }

          .prStats b {
            font-size: 30px;
          }

          .prStats span {
            font-size: 14px;
          }

          .prQuote {
            gap: 16px;
            padding: 12px 18px;
            border-radius: 18px;
          }

          .prQuote img {
            height: 64px;
          }

          .prQuote p {
            font-size: 16px;
          }

          .prList h2 {
            margin-bottom: 10px;
            font-size: 21px;
          }

          .prRow {
            min-height: 50px;
            margin-bottom: 8px;
            padding: 0 18px;
            border-radius: 14px;
            font-size: 15px;
          }

          .prRow em {
            font-size: 14px;
          }

          .prLang button {
            padding: 7px 14px;
            font-size: 13px;
          }
        }

        /* Laptop and desktop: summary on the left, settings on the right */
        @media (min-width: 1024px) {
          .profilePage {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
            grid-template-areas:
              "top settings"
              "name settings"
              "stats settings"
              "quote settings"
              "footer footer";
            grid-template-rows: auto auto auto 1fr auto;
            gap: 20px 24px;
            align-items: start;
          }

          .prTop {
            grid-area: top;
            padding-top: 0;
          }

          .prAvatar {
            flex: none;
            width: 88px;
            height: 88px;
          }

          .prWho h1 {
            font-size: 30px;
          }

          .prStats {
            grid-area: stats;
          }

          .prQuote {
            grid-area: quote;
          }

          .prList {
            grid-area: settings;
            padding: 20px;
            border: 1px solid var(--filumire-border);
            border-radius: 20px;
            background: var(--filumire-surface);
          }

          .prRow:last-child {
            margin-bottom: 0;
          }

          .homeFooter {
            grid-area: footer;
          }
        }

        @media (min-width: 1280px) {
          .profilePage {
            column-gap: 32px;
          }

          .prAvatar {
            width: 104px;
            height: 104px;
          }

          .prWho h1 {
            font-size: 36px;
          }
        }
      `}</style>
    </div>
  );
}