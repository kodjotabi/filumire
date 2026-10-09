"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(
      "FILUMIRE sign in will continue through the secure identity service."
    );
  }

  return (
    <main className="loginPage">
      <header className="topbar">
        <Link href="/" className="back" aria-label="Back to FILUMIRE home">
          <span aria-hidden="true">‹</span>
          Back
        </Link>

        <img
          className="logo"
          src="/filumire-logo-white.svg"
          alt="FILUMIRE"
        />

        <Link href="/adult" className="adultLink">
          Parent /<br />Teacher Login
        </Link>
      </header>

      <section className="intro">
        <h1>
          Welcome <strong>back</strong>
        </h1>
        <h2>Great to see you again!</h2>
        <p>
          Sign in to continue your learning journey
          <br />
          with FILUMIRE.
        </p>

        <div className="learnerArtwork" aria-hidden="true">
          <span className="sum sumOne">8 + 4 = 12</span>
          <span className="sum sumTwo">6 × 3 = 18</span>
          <span className="mathShape shapeOne">△</span>
          <span className="mathShape shapeTwo">○</span>
          <span className="artworkPlaceholder">
            Learner artwork
          </span>
        </div>
      </section>

      <section className="signInCard">
        <h2>Sign In</h2>
        <p className="cardIntro">Enter your details to continue.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="filumire-identity">
            Email or username
          </label>

          <div className="field">
            <span className="fieldIcon" aria-hidden="true">♙</span>
            <input
              id="filumire-identity"
              name="identity"
              type="text"
              autoComplete="username"
              placeholder="Email or Username"
            />
          </div>

          <label htmlFor="filumire-password">
            Password
          </label>

          <div className="field">
            <span className="fieldIcon lock" aria-hidden="true">●</span>
            <input
              id="filumire-password"
              name="password"
              type={passwordVisible ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Password"
            />
            <button
              type="button"
              className="showPassword"
              onClick={() => setPasswordVisible((visible) => !visible)}
              aria-label={passwordVisible ? "Hide password" : "Show password"}
            >
              {passwordVisible ? "Hide" : "Show"}
            </button>
          </div>

          <button
            type="button"
            className="forgot"
            onClick={() =>
              setMessage(
                "Password recovery will be provided by the secure identity service."
              )
            }
          >
            Forgot your password?
          </button>

          <button type="submit" className="signInButton">
            Sign In <span aria-hidden="true">→</span>
          </button>

          {message ? (
            <p className="authMessage" role="status">
              {message}
            </p>
          ) : null}
        </form>
      </section>

      <section className="newAccount">
        <h2>New to FILUMIRE?</h2>
        <p>
          Create an account and start your learning
          <br />
          journey today.
        </p>

        <button
          type="button"
          className="createButton"
          onClick={() =>
            setMessage(
              "Account creation will continue through the secure identity service."
            )
          }
        >
          Create Account <span aria-hidden="true">→</span>
        </button>
      </section>

      <section className="landscape">
        <img
          src="/images/home/landscape%20footer.png"
          alt=""
        />
        <p>A brighter tomorrow for every learner.</p>
      </section>

      <nav className="bottomNav" aria-label="Learner navigation">
        <Link href="/" className="active">
          <span aria-hidden="true">⌂</span>
          <small>Home</small>
        </Link>

        <span>
          <b aria-hidden="true">▣</b>
          <small>My Learning</small>
        </span>

        <span>
          <b aria-hidden="true">▥</b>
          <small>Progress</small>
        </span>

        <span>
          <b aria-hidden="true">◇</b>
          <small>Challenges</small>
        </span>

        <span>
          <b aria-hidden="true">✦</b>
          <small>Ask FILU</small>
        </span>
      </nav>

      <style>{`
        .loginPage {
          width: 100%;
          max-width: 390px;
          min-height: 844px;
          margin: 0 auto;
          overflow: hidden;
          background: #ffffff;
          color: #123d6b;
          font-family: inherit;
        }

        .topbar {
          height: 72px;
          padding: 0 14px;
          display: grid;
          grid-template-columns: 82px 1fr 86px;
          align-items: center;
          background: #123f78;
          color: #ffffff;
        }

        .back,
        .adultLink {
          color: #ffffff;
          text-decoration: none;
          font-size: 9px;
          font-weight: 600;
          line-height: 1.2;
        }

        .back {
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .back span {
          font-size: 23px;
          font-weight: 300;
          line-height: 1;
        }

        .adultLink {
          justify-self: end;
          text-align: right;
        }

        .logo {
          justify-self: center;
          width: 115px;
          max-height: 48px;
          object-fit: contain;
        }

        .intro {
          position: relative;
          min-height: 204px;
          padding: 13px 25px 0;
          overflow: hidden;
        }

        .intro h1 {
          margin: 0;
          color: #123d6b;
          font-size: 24px;
          line-height: 1.1;
          font-weight: 600;
        }

        .intro h1 strong {
          color: #078bd1;
          font-weight: 800;
        }

        .intro h2 {
          margin: 5px 0 0;
          color: #123d6b;
          font-size: 13px;
          line-height: 1.2;
          font-weight: 700;
        }

        .intro p {
          margin: 5px 0 0;
          color: #466784;
          font-size: 9px;
          line-height: 1.35;
          font-weight: 500;
        }

        .learnerArtwork {
          position: absolute;
          right: 18px;
          bottom: 8px;
          width: 185px;
          height: 116px;
          border-radius: 55% 45% 46% 54%;
          background:
            radial-gradient(circle at 72% 35%, #fff1b6 0 16%, transparent 17%),
            radial-gradient(circle at 27% 60%, #dff3ff 0 24%, transparent 25%),
            #f4f8fb;
        }

        .artworkPlaceholder {
          position: absolute;
          left: 47px;
          bottom: 10px;
          width: 88px;
          height: 88px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #e7f3fb;
          border: 1px dashed #8eb7d5;
          color: #6688a2;
          font-size: 8px;
          text-align: center;
        }

        .sum {
          position: absolute;
          color: #2376a9;
          font-size: 8px;
          font-weight: 700;
          transform: rotate(-8deg);
        }

        .sumOne {
          top: 10px;
          left: 13px;
        }

        .sumTwo {
          right: 4px;
          bottom: 22px;
          transform: rotate(7deg);
        }

        .mathShape {
          position: absolute;
          color: #f5a623;
          font-size: 19px;
          font-weight: 700;
        }

        .shapeOne {
          right: 18px;
          top: 10px;
        }

        .shapeTwo {
          left: 11px;
          bottom: 12px;
        }

        .signInCard {
          width: 342px;
          margin: 0 auto;
          padding: 15px 18px 14px;
          border-radius: 15px;
          background: #eef8ff;
          box-sizing: border-box;
        }

        .signInCard h2,
        .newAccount h2 {
          margin: 0;
          color: #123d6b;
          font-size: 15px;
          line-height: 1.2;
          font-weight: 800;
        }

        .cardIntro,
        .newAccount p {
          margin: 3px 0 11px;
          color: #56748d;
          font-size: 8px;
          line-height: 1.35;
          font-weight: 500;
        }

        form label {
          display: block;
          margin: 8px 0 4px;
          color: #123d6b;
          font-size: 8px;
          font-weight: 700;
        }

        .field {
          height: 35px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 10px;
          border: 1px solid #c6d9e7;
          border-radius: 7px;
          background: #ffffff;
          box-sizing: border-box;
        }

        .fieldIcon {
          width: 13px;
          color: #7795ab;
          font-size: 12px;
          text-align: center;
        }

        .fieldIcon.lock {
          font-size: 7px;
        }

        .field input {
          min-width: 0;
          flex: 1;
          border: 0;
          outline: 0;
          background: transparent;
          color: #123d6b;
          font: inherit;
          font-size: 9px;
        }

        .field input::placeholder {
          color: #8aa1b3;
        }

        .showPassword,
        .forgot {
          border: 0;
          padding: 0;
          background: transparent;
          color: #157fc0;
          font-family: inherit;
          cursor: pointer;
        }

        .showPassword {
          font-size: 7px;
          font-weight: 700;
        }

        .forgot {
          display: block;
          margin: 6px 0 9px auto;
          font-size: 7px;
          font-weight: 600;
        }

        .signInButton,
        .createButton {
          width: 100%;
          height: 35px;
          border: 0;
          border-radius: 7px;
          color: #ffffff;
          font-family: inherit;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        .signInButton {
          background: #078bd1;
        }

        .createButton {
          background: #55ad67;
        }

        .authMessage {
          margin: 7px 0 0;
          color: #466784;
          font-size: 7px;
          line-height: 1.35;
          text-align: center;
        }

        .newAccount {
          width: 342px;
          margin: 9px auto 0;
          padding: 12px 18px;
          border-radius: 15px;
          background: #eff9ef;
          box-sizing: border-box;
        }

        .newAccount p {
          margin-bottom: 8px;
        }

        .landscape {
          position: relative;
          width: 100%;
          height: 88px;
          margin-top: 7px;
          overflow: hidden;
        }

        .landscape img {
          position: absolute;
          left: 0;
          bottom: 0;
          width: 100%;
          height: auto;
          display: block;
        }

        .landscape p {
          position: relative;
          z-index: 1;
          margin: 8px 0 0;
          color: #345a7f;
          font-size: 7px;
          text-align: center;
          font-weight: 600;
        }

        .bottomNav {
          height: 62px;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          align-items: stretch;
          background: #123f78;
        }

        .bottomNav a,
        .bottomNav > span {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          color: rgba(255,255,255,.9);
          text-decoration: none;
        }

        .bottomNav a > span,
        .bottomNav b {
          font-size: 16px;
          line-height: 1;
          font-weight: 400;
        }

        .bottomNav small {
          font-size: 6px;
          line-height: 1;
          font-weight: 600;
        }

        .bottomNav .active {
          color: #35c7ff;
        }

        .bottomNav .active::before {
          content: "";
          position: absolute;
          top: 0;
          left: 20%;
          right: 20%;
          height: 3px;
          border-radius: 0 0 3px 3px;
          background: #35c7ff;
        }

        @media (min-width: 391px) {
          .loginPage {
            box-shadow: 0 0 0 1px #e5e5e5;
          }
        }
      `}</style>
    </main>
  );
}