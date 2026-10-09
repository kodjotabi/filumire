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
      `}</style>
    </main>
  );
}