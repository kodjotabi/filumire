"use client";

import { useLearnerAvatar } from "./avatars";

type Stat = { total: number; completed: number; tracked: number };

type Props = {
  language: "en" | "fr";
  onLanguage: (value: "en" | "fr") => void;
  name: string;
  onRename: (value: string) => void;
  overview: { subjects: Record<string, Stat> } | null;
};

const text = {
  en: {
    edit: "Edit Profile",
    learner: "Learner",
    ach: "Achievements",
    prog: "Progress",
    active: "Active Challenges",
    quote: "Every step you take makes you stronger. Keep going!",
    settings: "My Settings",
    name: "My Name",
    lang: "Language Preference",
    notif: "Notifications",
    look: "App Appearance",
    privacy: "Privacy & Safety",
    help: "Help & Support",
    out: "Log Out",
    soon: "Soon",
    ask: "What should we call you?",
  },
  fr: {
    edit: "Modifier le profil",
    learner: "Apprenant",
    ach: "Réussites",
    prog: "Progrès",
    active: "Défis actifs",
    quote: "Chaque pas te rend plus fort !",
    settings: "Mes paramètres",
    name: "Mon nom",
    lang: "Langue",
    notif: "Notifications",
    look: "Apparence",
    privacy: "Confidentialité et sécurité",
    help: "Aide et assistance",
    out: "Se déconnecter",
    soon: "Bientôt",
    ask: "Comment doit-on t'appeler ?",
  },
};

export default function ProfilePage({
  language,
  onLanguage,
  name,
  onRename,
  overview,
}: Props) {
  const t = text[language];
  const avatarSrc = useLearnerAvatar();
  // The overview lists exactly the subjects of the learner's grade.
  const rows: Array<Stat | undefined> = Object.values(overview?.subjects ?? {});
  const total = rows.reduce((n, r) => n + (r?.total ?? 0), 0);
  const doneAll = rows.reduce((n, r) => n + (r?.completed ?? 0), 0);
  const startedCount = rows.filter((r) => (r?.tracked ?? 0) > 0).length;
  const activeCount = rows.filter(
    (r) => (r?.tracked ?? 0) > 0 && (r?.completed ?? 0) < (r?.total ?? 0)
  ).length;
  const percent = total > 0 ? Math.round((doneAll / total) * 100) : 0;
  const badges =
    (doneAll >= 1 ? 1 : 0) + (startedCount >= 2 ? 1 : 0) + (doneAll >= 5 ? 1 : 0);

  function rename() {
    const value = window.prompt(t.ask, name);
    if (value && value.trim()) onRename(value.trim());
  }

  async function logOut() {
    // Ends the server session (production cookie). Development
    // builds have no session, so a 401 here is expected.
    try {
      await fetch("/api/session/logout", { method: "POST" });
    } catch {}
    try {
      window.localStorage.removeItem("filumire.learnerName");
    } catch {}
    window.location.href = "/";
  }

  return (
    <div className="profilePage">
      <section className="prTop">
        <img className="prAvatar" src={avatarSrc} alt="" />
        <div className="prWho">
          <h1>{name || t.learner}</h1>
          <button type="button" className="prEdit" onClick={rename}>
            {t.edit}
          </button>
        </div>
      </section>

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

        <button type="button" className="prRow" onClick={rename}>
          <span>{t.name}</span>
          <em>{name || t.learner}</em>
        </button>

        <div className="prRow">
          <span>{t.lang}</span>
          <div className="prLang">
            <button
              type="button"
              className={language === "en" ? "on" : ""}
              onClick={() => onLanguage("en")}
            >
              English
            </button>
            <button
              type="button"
              className={language === "fr" ? "on" : ""}
              onClick={() => onLanguage("fr")}
            >
              Français
            </button>
          </div>
        </div>

        {/* No notification service exists yet, so the switch would
            save a setting that does nothing; shown as "Soon". */}
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

        <button type="button" className="prRow out" onClick={logOut}>
          <span>{t.out}</span>
        </button>
      </section>

      <section className="homeFooter">
        <img src="/images/home/landscape%20footer.png" alt="" />
      </section>

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
              "stats settings"
              "quote settings"
              "footer footer";
            grid-template-rows: auto auto 1fr auto;
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