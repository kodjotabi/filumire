import Link from "next/link";

export default function HomePage() {
  return (
    <main className="home">

      <header className="topbar">
        <img
          src="/images/home/top%20bar%20with%20logo%20and%20sign%20in.svg"
          alt="FILUMIRE"
        />
        <Link
          href="/adult"
          className="parentTeacherHotspot"
          aria-label="Parent / Teacher Login"
        />
      </header>

      {/* Tablet and up: a real header bar replaces the 390px artwork. */}
      <header className="wideTopbar">
        <Link href="/" className="wideLogo" aria-label="FILUMIRE home">
          <img src="/filumire-logo-white.svg" alt="FILUMIRE" />
        </Link>
        <Link href="/adult" className="wideAdultLink">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="8.5" cy="7.5" r="3.6" />
            <circle cx="16.5" cy="8.5" r="3" />
            <path d="M1.5 20c0-3.9 3-6.4 7-6.4s7 2.5 7 6.4z" />
            <path d="M16 14.2c3.4 0 6.5 1.9 6.5 5.3V20H17c0-2.3-.4-4.3-1-5.8z" />
          </svg>
          Parent / Teacher Login
        </Link>
      </header>

      <section className="content">

        <h1>
          Welcome to <strong>FILUMIRE</strong>
        </h1>

        <p className="tagline">
          Your intelligent learning partner.
        </p>

        <img
          className="learners"
          src="/images/home/learners.svg"
          alt="FILUMIRE learners"
        />

        <p className="intro">
          FILUMIRE adapts to how you learn, helping you
          <br />
          build real understanding at your own pace.
        </p>

        <p className="choose">
          Choose your language to get started.
        </p>

        <div className="languages">

          <Link href="/login?lang=en" className="language">
            <img
              src="/images/home/english%20main.svg"
              alt=""
            />
            <span className="languageText">
              <strong>English</strong>
              <small>Learn in English.</small>
            </span>
          </Link>

          <Link href="/login?lang=fr" className="language">
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

        <div className="features">

          <div className="feature">
            <img
              src="/images/home/safe%20and%20secure%20icon.svg"
              alt=""
            />
            <strong>Safe &amp; Secure</strong>
            <span>A trusted<br />learning space.</span>
          </div>

          <div className="feature">
            <img
              src="/images/home/Personalised.svg"
              alt=""
            />
            <strong>Personalised</strong>
            <span>Adapts to<br />how you learn.</span>
          </div>

          <div className="feature">
            <img
              src="/images/home/Effective.svg"
              alt=""
            />
            <strong>Effective</strong>
            <span>Build real<br />understanding.</span>
          </div>

          <div className="feature">
            <img
              src="/images/home/Made%20for%20Africa.svg"
              alt=""
            />
            <strong>Made for Africa</strong>
            <span>Our learners.<br />Our future.</span>
          </div>

        </div>

      </section>

      <footer className="footer">
        <img
          src="/images/home/landscape%20footer.png"
          alt=""
        />
        <p className="future">Same learners. Brighter futures.</p>

        <span className="copyright">
          &copy; 2026 FILUMIRE. All rights reserved.
        </span>

        <span className="footerTag">
          LEARN &bull; GROW &bull; CREATE
        </span>
      </footer>

      <style>{`
        .home { width: 100%; max-width: 390px; min-height: 844px; margin: 0 auto; overflow: hidden; background: #ffffff; color: #093375; font-family: inherit; }
        .topbar { position: relative; display: block; width: 100%; height: auto; overflow: hidden; background: #123f78; }
        .topbar img { display: block; width: 100%; height: auto; object-fit: contain; }
        .parentTeacherHotspot { position: absolute; top: 0; right: 0; width: 37%; height: 100%; display: block; cursor: pointer; }
        .content { width: 100%; margin: 0 auto; padding-top: 5px; text-align: center; }
        h1 { margin: 0; color: #093375; font-size: 28px; line-height: 1.15; font-weight: 800; letter-spacing: -0.5px; }
        h1 strong { color: #0357c3; font-weight: 800; }
        .tagline { margin: 3px 0 0; color: #093375; font-size: 17.5px; line-height: 1.2; font-weight: 400; }
        .learners { display: block; width: 100%; height: auto; margin: 4px 0 3px; }
        .intro { margin: 0 auto; color: #093375; font-size: 13.5px; line-height: 1.25; font-weight: 500; }
        .choose { margin: 14px 0 9px; color: #334b81; font-size: 14px; line-height: 1.2; font-weight: 700; }
        .languages { width: 342px; margin: 0 auto; display: flex; flex-direction: column; gap: 8px; }
        .language { position: relative; display: block; width: 100%; text-decoration: none; color: #093375; }
        .language > img { display: block; width: 100%; height: auto; }
        .languageText { position: absolute; left: 77px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; align-items: flex-start; text-align: left; }
        .languageText strong { color: #093375; font-size: 14px; line-height: 1.1; font-weight: 700; }
        .languageText small { margin-top: 2px; color: #093375; font-size: 13.5px; line-height: 1.1; font-weight: 500; }
        .features { width: 358px; margin: 13px auto 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px; }
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
        .wideTopbar { display: none; }

        /* Tablet: full-width page, real header, centred column */
        @media (min-width: 768px) {
          .home { display: flex; flex-direction: column; max-width: none; min-height: 100dvh; box-shadow: none; }
          .home .topbar { display: none; }
          .home .wideTopbar { display: flex; align-items: center; justify-content: space-between; gap: 24px; min-height: 76px; padding: 0 max(32px, calc((100% - 1200px) / 2)); background: #123f78; }
          .wideLogo { display: inline-flex; }
          .wideLogo img { display: block; width: 150px; height: auto; }
          .wideAdultLink { display: inline-flex; align-items: center; gap: 10px; min-height: 44px; padding: 8px 18px; border: 1px solid rgba(255,255,255,.35); border-radius: 999px; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; }
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
      `}</style>
    </main>
  );
}