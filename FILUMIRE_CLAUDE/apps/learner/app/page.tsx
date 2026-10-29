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

          {/* Buttons in the public website's style: filled for the first
              choice, outlined for the second. */}
          <Link
            href="/login?lang=en"
            className="language languagePrimary"
            lang="en"
            onClick={() => chooseLanguage("en")}
          >
            <span className="languageText">
              <strong>English</strong>
              <small>Learn in English.</small>
            </span>
            <span className="languageArrow" aria-hidden="true">&rarr;</span>
          </Link>

          <Link
            href="/login?lang=fr"
            className="language languageSecondary"
            lang="fr"
            onClick={() => chooseLanguage("fr")}
          >
            <span className="languageText">
              <strong>Fran&ccedil;ais</strong>
              <small>Apprendre en fran&ccedil;ais.</small>
            </span>
            <span className="languageArrow" aria-hidden="true">&rarr;</span>
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

      {/* The landscape is artwork only; the footer text sits on a solid
          band below it, as on the public website. */}
      <footer className="footer">
        <img
          src="/images/home/landscape%20footer.png"
          alt=""
        />
        <div className="footerBand">
          <p className="future">{t.future}</p>

          <span className="copyright">
            &copy; 2026 FILUMIRE. {t.rights}
          </span>

          <span className="footerTag">
            {t.tag}
          </span>
        </div>
      </footer>

      <style>{`
        .home { width: 100%; max-width: 390px; min-height: 844px; margin: 0 auto; overflow: hidden; background: #ffffff; color: #093375; font-family: inherit; }
        /* Phone: the public website's type scale, colours, 16px gutters and
           pill buttons, so the website and the app read as one product. */
        .content { width: 100%; margin: 0 auto; padding: 8px 16px 0; text-align: left; }
        h1 { margin: 12px 0 0; color: #093375; font-size: 36px; line-height: 1.08; font-weight: 800; letter-spacing: -0.5px; }
        h1 strong { color: #0357c3; font-weight: 800; }
        .tagline { margin: 8px 0 0; color: #093375; font-size: 18px; line-height: 1.35; font-weight: 600; }
        .learners { display: block; width: 100%; height: auto; margin: 16px 0 8px; }
        .intro { margin: 0; color: #093375; font-size: 16px; line-height: 1.6; font-weight: 400; }
        .intro br { display: none; }
        .choose { margin: 20px 0 12px; color: #093375; font-size: 17.6px; line-height: 1.3; font-weight: 800; }
        .languages { width: 100%; margin: 0; display: flex; flex-direction: column; gap: 12px; }
        .language { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; min-height: 56px; padding: 8px 22px; border: 2px solid #0357c3; border-radius: 999px; text-decoration: none; }
        .languagePrimary { background: #0357c3; color: #ffffff; }
        .languageSecondary { background: #ffffff; color: #0357c3; }
        .language:focus-visible { outline: 3px solid #fabc07; outline-offset: 3px; }
        .languageText { display: flex; flex-direction: column; align-items: flex-start; min-width: 0; text-align: left; }
        .languageText strong { color: inherit; font-size: 16px; line-height: 1.25; font-weight: 700; }
        .languageText small { color: inherit; font-size: 13px; line-height: 1.3; font-weight: 500; opacity: .88; }
        .languageArrow { flex: none; font-size: 18px; line-height: 1; font-weight: 700; }
        .features { width: 100%; margin: 24px 0 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .feature { min-width: 0; padding: 12px; border-radius: 16px; background: #f2f7fd; text-align: left; color: #093375; }
        .feature img { display: block; width: 40px; height: 40px; object-fit: contain; margin: 0 0 6px; }
        .feature strong { display: block; font-size: 14px; line-height: 1.25; font-weight: 800; }
        .feature span { display: block; margin-top: 2px; font-size: 13px; line-height: 1.35; font-weight: 400; }
        .footer { width: 100%; margin-top: 28px; }
        .footer > img { display: block; width: 100%; height: auto; }
        .footerBand { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 16px; padding: 16px; background: #062b5c; color: #ffffff; }
        .future { flex-basis: 100%; margin: 0; color: #ffffff; font-size: 15px; line-height: 1.3; font-weight: 700; }
        .future::after { content: ""; display: block; width: 40px; height: 3px; margin: 6px 0 0; background: #fabc07; transform: rotate(-3deg); }
        .copyright, .footerTag { color: rgba(255,255,255,.85); font-size: 12px; line-height: 1.4; font-weight: 400; }
        .footerTag { font-weight: 600; letter-spacing: 1.5px; }
        @media (min-width: 391px) { .home { box-shadow: 0 0 0 1px #e5e5e5; } }
        .wideTopbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 64px; padding: 8px 16px; background: #08448b; }
        .wideLogo { display: inline-flex; flex: none; }
        .wideLogo img { display: block; width: 118px; height: auto; }
        .wideActions .filumireLangToggle, .wideActions .filumirePublicHome { display: none; }
        .wideAdultLink { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; max-width: 176px; padding: 6px 14px; border: 2px solid rgba(255,255,255,.85); border-radius: 999px; color: #ffffff; font-size: 13px; line-height: 1.2; font-weight: 700; text-align: left; text-decoration: none; }
        .wideAdultLink svg { width: 20px; height: 20px; flex: none; fill: currentColor; }

        /* Tablet: full-width page, real header, centred column */
        @media (min-width: 768px) {
          .home { display: flex; flex-direction: column; max-width: none; min-height: 100dvh; box-shadow: none; }
          .home .wideTopbar { gap: 24px; min-height: 76px; padding: 0 max(32px, calc((100% - 1200px) / 2)); }
          .wideLogo img { width: 150px; }
          .wideActions .filumireLangToggle, .wideActions .filumirePublicHome { display: inline-flex; }
          .wideAdultLink { gap: 10px; max-width: none; padding: 8px 18px; border-radius: 999px; font-size: 14px; }
          .wideAdultLink:hover { background: rgba(255,255,255,.1); }
          .wideAdultLink svg { width: 22px; height: 22px; flex: none; fill: currentColor; }
          .home .content { flex: 1; width: min(640px, calc(100% - 64px)); padding: 40px 0 0; text-align: center; }
          .home h1 { margin-top: 0; font-size: 40px; }
          .home .tagline { margin-top: 6px; font-size: 21px; }
          .home .learners { max-width: 560px; margin: 18px auto 14px; }
          .home .intro { font-size: 17px; line-height: 1.45; }
          .home .choose { margin: 26px 0 14px; font-size: 17px; }
          .home .languages { width: 420px; margin: 0 auto; gap: 12px; }
          .home .language { transition: transform 140ms ease; }
          .home .language:hover { transform: translateY(-2px); }
          .home .languageText strong { font-size: 18px; }
          .home .languageText small { margin-top: 2px; font-size: 15px; }
          .home .features { grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 40px; gap: 14px; }
          .home .feature { padding: 18px 10px; border-radius: 18px; text-align: center; }
          .home .feature img { width: 60px; height: 60px; margin: 0 auto 10px; }
          .home .feature strong { font-size: 14px; }
          .home .feature span { margin-top: 4px; font-size: 13px; line-height: 1.3; }
          .home .footer { margin-top: 48px; }
          .home .footer > img { height: clamp(150px, 20vw, 260px); object-fit: cover; object-position: center 15%; }
          .home .footerBand { padding: 20px max(32px, calc((100% - 1200px) / 2)); }
          .home .future { font-size: 16px; }
          .home .future::after { width: 56px; height: 4px; }
          .home .copyright { font-size: 13px; }
          .home .footerTag { letter-spacing: 2px; }
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
        .homeLangMobile { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 6px 0 4px; }
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
