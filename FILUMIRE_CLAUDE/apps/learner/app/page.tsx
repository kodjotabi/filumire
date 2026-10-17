"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LanguageToggle } from "../components/filumire/LanguageToggle";
import { PublicHomeLink } from "../components/filumire/PublicHomeLink";
import { readLanguage, saveLanguage, useLanguage, type Language } from "../components/filumire/language";
import { destinationFor, fetchAccount, hasAccountSession } from "../services/account-client";

/*
 * The public home page is where a learner chooses a language. The
 * page itself follows the saved (or ?lang=) language, the EN | FR
 * switch changes it in place, and choosing a language card saves
 * the choice before opening sign-in.
 */
const TEXT = {
  en: {
    adult: "Parent / Teacher Login",
    welcome: "Welcome to",
    tagline: "Your intelligent learning partner.",
    learnersAlt: "FILUMIRE learners",
    intro: ["FILUMIRE adapts to how you learn, helping you", "build real understanding at your own pace."],
    choose: "Choose your language to get started.",
    features: [
      ["Safe & Secure", "A trusted", "learning space."],
      ["Personalised", "Adapts to", "how you learn."],
      ["Effective", "Build real", "understanding."],
      ["Made for Africa", "Our learners.", "Our future."],
    ],
    future: "Same learners. Brighter futures.",
    rights: "All rights reserved.",
    tag: "LEARN • GROW • CREATE",
    home: "FILUMIRE home",
    skip: "Skip to content",
  },
  fr: {
    adult: "Espace parents / enseignants",
    welcome: "Bienvenue sur",
    tagline: "Ton partenaire d’apprentissage intelligent.",
    learnersAlt: "Apprenants FILUMIRE",
    intro: ["FILUMIRE s’adapte à ta façon d’apprendre et t’aide", "à vraiment comprendre, à ton rythme."],
    choose: "Choisis ta langue pour commencer.",
    features: [
      ["Sûr et sécurisé", "Un espace", "de confiance."],
      ["Personnalisé", "S’adapte à", "ta façon d’apprendre."],
      ["Efficace", "Pour vraiment", "comprendre."],
      ["Fait pour l’Afrique", "Nos apprenants.", "Notre avenir."],
    ],
    future: "Mêmes apprenants. Des avenirs plus brillants.",
    rights: "Tous droits réservés.",
    tag: "APPRENDRE • GRANDIR • CRÉER",
    home: "Accueil FILUMIRE",
    skip: "Aller au contenu",
  },
} as const;

const FEATURE_ICONS = [
  "/images/home/safe%20and%20secure%20icon.svg",
  "/images/home/Personalised.svg",
  "/images/home/Effective.svg",
  "/images/home/Made%20for%20Africa.svg",
];

export default function HomePage() {
  const router = useRouter();
  const [language, setLanguage] = useLanguage();
  const t = TEXT[language];

  // Already signed in on this browser (for example, arriving from the
  // website's Start Learning): go straight on, as the sign-in page does.
  useEffect(() => {
    if (!hasAccountSession()) return;

    let active = true;
    fetchAccount()
      .then((account) => {
        if (active && account) router.replace(destinationFor(account, readLanguage()));
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [router]);

  function chooseLanguage(value: Language) {
    saveLanguage(value);
  }

  return (
    <main className="home" lang={language}>
      <a className="filumireSkipLink" href="#home-content">
        {t.skip}
      </a>

      {/* A real, bilingual header bar at every width. */}
      <header className="wideTopbar">
        <Link href={`/?lang=${language}`} className="wideLogo" aria-label={t.home}>
          <img src="/filumire-logo-white.svg" alt="FILUMIRE" />
        </Link>
        <div className="wideActions">
          <PublicHomeLink language={language} />
          <LanguageToggle language={language} onChange={setLanguage} />
          <Link href={`/login?lang=${language}&returnTo=family`} className="wideAdultLink">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="8.5" cy="7.5" r="3.6" />
              <circle cx="16.5" cy="8.5" r="3" />
              <path d="M1.5 20c0-3.9 3-6.4 7-6.4s7 2.5 7 6.4z" />
              <path d="M16 14.2c3.4 0 6.5 1.9 6.5 5.3V20H17c0-2.3-.4-4.3-1-5.8z" />
            </svg>
            {t.adult}
          </Link>
        </div>
      </header>

      <section className="content" id="home-content">

        <div className="homeLangMobile">
          <PublicHomeLink language={language} />
          <LanguageToggle language={language} onChange={setLanguage} tone="light" />
        </div>

        <h1>
          {t.welcome} <strong>FILUMIRE</strong>
        </h1>

        <p className="tagline">
          {t.tagline}
        </p>

        <img
          className="learners"
          src="/images/home/learners.svg"
          alt={t.learnersAlt}
        />

        <p className="intro">
          {`${t.intro[0]} `}
          <br />
          {t.intro[1]}
        </p>

        <p className="choose" id="choose-language">
          {t.choose}
        </p>

        <div className="languages" role="group" aria-labelledby="choose-language">

          <Link
            href="/login?lang=en"
            className="language"
            lang="en"
            onClick={() => chooseLanguage("en")}
          >
            <img
              src="/images/home/english%20main.svg"
              alt=""
            />
            <span className="languageText">
              <strong>English</strong>
              <small>Learn in English.</small>
            </span>
          </Link>

          <Link
            href="/login?lang=fr"
            className="language"
            lang="fr"
            onClick={() => chooseLanguage("fr")}
          >
            <img
              src="/images/home/french%20main.svg"
              alt=""
            />
            <span className="languageText">
              <strong>Fran&ccedil;ais</strong>
              <small>Apprendre en fran&ccedil;ais.</small>
            </span>
          </Link>

        </div>

        <ul className="features">
          {t.features.map(([title, lineA, lineB], index) => (
            <li className="feature" key={title}>
              <img src={FEATURE_ICONS[index]} alt="" />
              <strong>{title}</strong>
              <span>{lineA}<br />{lineB}</span>
            </li>
          ))}
        </ul>

      </section>

      <footer className="footer">
        <img
          src="/images/home/landscape%20footer.png"
          alt=""
        />
        <p className="future">{t.future}</p>

        <span className="copyright">
          &copy; 2026 FILUMIRE. {t.rights}
        </span>

        <span className="footerTag">
          {t.tag}
        </span>
      </footer>

      <style>{`
        .home { width: 100%; max-width: 390px; min-height: 844px; margin: 0 auto; overflow: hidden; background: #ffffff; color: #093375; font-family: inherit; }
        .content { width: 100%; margin: 0 auto; padding-top: 5px; text-align: center; }
        h1 { margin: 0; color: #093375; font-size: 28px; line-height: 1.15; font-weight: 800; letter-spacing: -0.5px; }
        h1 strong { color: #0357c3; font-weight: 800; }
        .tagline { margin: 3px 0 0; color: #093375; font-size: 17.5px; line-height: 1.2; font-weight: 400; }
        .learners { display: block; width: 100%; height: auto; margin: 4px 0 3px; }
        .intro { margin: 0 auto; color: #093375; font-size: 13.5px; line-height: 1.25; font-weight: 500; }
        .choose { margin: 14px 0 9px; color: #334b81; font-size: 14px; line-height: 1.2; font-weight: 700; }
        .languages { width: min(342px, calc(100% - 32px)); margin: 0 auto; display: flex; flex-direction: column; gap: 8px; }
        .language { position: relative; display: block; width: 100%; text-decoration: none; color: #093375; }
        .language > img { display: block; width: 100%; height: auto; }
        .languageText { position: absolute; left: 22.5%; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; align-items: flex-start; text-align: left; }
        .languageText strong { color: #093375; font-size: 14px; line-height: 1.1; font-weight: 700; }
        .languageText small { margin-top: 2px; color: #093375; font-size: 13.5px; line-height: 1.1; font-weight: 500; }
        .features { width: min(358px, calc(100% - 16px)); margin: 13px auto 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px; }
        .feature { min-width: 0; text-align: center; color: #093375; }
        .feature img { display: block; width: 48px; height: 48px; object-fit: contain; margin: 0 auto 4px; }
        .feature strong { display: block; white-space: nowrap; font-size: 9.5px; line-height: 1.15; font-weight: 700; }
        .feature span { display: block; margin-top: 2px; font-size: 9.5px; line-height: 1.15; font-weight: 400; }
        .footer { position: relative; width: 100%; margin-top: 19px; }
        .footer > img { display: block; width: 100%; height: auto; }
        .future { position: absolute; top: 13px; left: 0; right: 0; margin: 0; z-index: 1; text-align: center; color: #093375; font-size: 8px; line-height: 1; font-weight: 600; }
        .future::after { content: ""; display: block; width: 40px; height: 3px; margin: 3px auto 0; background: #fbd668; transform: rotate(-3deg); }
        .copyright, .footerTag { position: absolute; bottom: 8px; color: rgba(255,255,255,.92); line-height: 1; font-weight: 400; }
        .copyright { left: 24px; font-size: 8.5px; }
        .footerTag { right: 23px; font-size: 6.5px; letter-spacing: .9px; }
        @media (min-width: 391px) { .home { box-shadow: 0 0 0 1px #e5e5e5; } }
        .wideTopbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 64px; padding: 8px 16px; background: #123f78; }
        .wideLogo { display: inline-flex; flex: none; }
        .wideLogo img { display: block; width: 118px; height: auto; }
        .wideActions .filumireLangToggle, .wideActions .filumirePublicHome { display: none; }
        .wideAdultLink { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; max-width: 168px; padding: 6px 12px; border: 1px solid rgba(255,255,255,.35); border-radius: 22px; color: #ffffff; font-size: 12px; line-height: 1.2; font-weight: 700; text-align: left; text-decoration: none; }
        .wideAdultLink svg { width: 20px; height: 20px; flex: none; fill: currentColor; }
        @media (max-width: 380px) { .feature strong { white-space: normal; } }
        /* The longer French copyright wraps before reaching the tagline on the narrowest phones. */
        @media (max-width: 359px) { .home[lang="fr"] .copyright { max-width: calc(50% - 36px); line-height: 1.2; } }

        /* Tablet: full-width page, real header, centred column */
        @media (min-width: 768px) {
          .home { display: flex; flex-direction: column; max-width: none; min-height: 100dvh; box-shadow: none; }
          .home .wideTopbar { gap: 24px; min-height: 76px; padding: 0 max(32px, calc((100% - 1200px) / 2)); }
          .wideLogo img { width: 150px; }
          .wideActions .filumireLangToggle, .wideActions .filumirePublicHome { display: inline-flex; }
          .wideAdultLink { gap: 10px; max-width: none; padding: 8px 18px; border-radius: 999px; font-size: 14px; }
          .wideAdultLink:hover { background: rgba(255,255,255,.1); }
          .wideAdultLink svg { width: 22px; height: 22px; flex: none; fill: currentColor; }
          .home .content { flex: 1; width: min(640px, calc(100% - 64px)); padding-top: 40px; }
          .home h1 { font-size: 40px; }
          .home .tagline { margin-top: 6px; font-size: 21px; }
          .home .learners { max-width: 560px; margin: 18px auto 14px; }
          .home .intro { font-size: 17px; line-height: 1.45; }
          .home .choose { margin: 26px 0 14px; font-size: 17px; }
          .home .languages { width: 420px; gap: 12px; }
          .home .language { border-radius: 16px; transition: transform 140ms ease; }
          .home .language:hover { transform: translateY(-2px); }
          .home .languageText { left: 22.5%; }
          .home .languageText strong { font-size: 18px; }
          .home .languageText small { margin-top: 4px; font-size: 16px; }
          .home .features { width: 100%; margin-top: 40px; gap: 14px; }
          .home .feature { padding: 18px 10px; border-radius: 18px; background: #f2f7fd; }
          .home .feature img { width: 60px; height: 60px; margin-bottom: 10px; }
          .home .feature strong { white-space: normal; font-size: 14px; }
          .home .feature span { margin-top: 4px; font-size: 13px; line-height: 1.3; }
          .home .footer { height: clamp(150px, 20vw, 260px); margin-top: 48px; overflow: hidden; }
          .home .footer > img { height: 100%; object-fit: cover; object-position: center 15%; }
          .home .future { top: 22px; font-size: 14px; }
          .home .future::after { width: 56px; height: 4px; margin-top: 5px; }
          .home .copyright, .home .footerTag { bottom: 16px; }
          .home .copyright { left: max(32px, calc((100% - 1200px) / 2)); font-size: 13px; }
          .home .footerTag { right: max(32px, calc((100% - 1200px) / 2)); font-size: 11px; letter-spacing: 2px; }
        }

        /* Laptop and desktop: welcome and language choice beside the
           learners artwork, benefits in a row underneath */
        @media (min-width: 1024px) {
          .home .content {
            display: grid;
            width: min(1200px, calc(100% - 64px));
            grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
            grid-template-areas: ". art" "title art" "tag art" "intro art" "choose art" "langs art" ". art" "feat feat";
            grid-template-rows: 1fr auto auto auto auto auto 1fr auto;
            column-gap: 56px;
            padding-top: 48px;
            text-align: left;
          }
          .home h1 { grid-area: title; font-size: 48px; }
          .home .tagline { grid-area: tag; font-size: 22px; }
          .home .learners { grid-area: art; align-self: center; max-width: none; margin: 0; }
          .home .intro { grid-area: intro; margin: 22px 0 0; font-size: 18px; }
          .home .choose { grid-area: choose; margin: 28px 0 14px; }
          .home .languages { grid-area: langs; width: min(440px, 100%); margin: 0; }
          .home .features { grid-area: feat; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px; margin-top: 48px; }
          .home .feature { display: grid; grid-template-columns: 56px minmax(0, 1fr); grid-template-rows: auto auto; column-gap: 14px; align-content: center; padding: 18px 20px; text-align: left; }
          .home .feature img { grid-row: span 2; width: 56px; height: 56px; margin: 0; }
          .home .feature span { margin-top: 3px; }
        }

        /* Overhaul: language switch, list resets, French wrapping */
        .homeLangMobile { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 6px 16px 4px; }
        .homeLangMobile .filumirePublicHome { box-shadow: inset 0 0 0 2px #d6e2f5; }
        .features { padding: 0; list-style: none; }
        .home[lang="fr"] .feature strong { white-space: normal; }
        .wideActions { display: flex; align-items: center; gap: 14px; }
        @media (min-width: 768px) {
          .homeLangMobile { display: none; }
          .home .intro br { display: none; }
        }
      `}</style>
    </main>
  );
}
