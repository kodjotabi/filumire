"use client";

import Link from "next/link";
import { useState } from "react";
import { subjectLabel } from "./subjects";
import { useLearnerAvatar } from "./avatars";
import { FiluAvatar } from "./SubjectIcon";

type Element = { type: string; text: string };

/*
 * FILU answers from the instruction the adaptive engine prepared for
 * the learner's current step (explanation, hints, worked examples).
 * It never invents content and never records evidence.
 */
type Props = {
  language: "en" | "fr";
  subjectName: string;
  topic: string;
  done: number;
  total: number;
  elements: Element[];
  lessonHref?: string;
};

type Mode = "explain" | "hint" | "understand";

const text = {
  en: {
    title: "Ask FILU",
    intro: "Your learning buddy, always here to help.",
    note: "Curious minds grow!",
    current: "Current topic",
    goals: "goals completed",
    of: "of",
    how: "How can I help?",
    choose: "Choose a quick action or ask your own question.",
    explain: "Explain this",
    explainSub: "Give a clearer explanation",
    hint: "Give me a hint",
    hintSub: "A helpful clue",
    understand: "Help me understand",
    understandSub: "In a different way",
    tryThis: "Try this",
    none: "There is no help for this step yet. Keep going and FILU will be here.",
    typing: "Typing your own question is coming soon",
    send: "Send",
    chat: "Conversation with FILU",
    back: "Back to my lesson",
  },
  fr: {
    title: "Parle à FILU",
    intro: "Ton ami d'apprentissage, toujours là pour t'aider.",
    note: "Les esprits curieux grandissent !",
    current: "Sujet actuel",
    goals: "objectifs terminés",
    of: "sur",
    how: "Comment puis-je aider ?",
    choose: "Choisis une action rapide ou pose ta question.",
    explain: "Explique-moi",
    explainSub: "Une explication plus claire",
    hint: "Donne-moi un indice",
    hintSub: "Un petit coup de pouce",
    understand: "Aide-moi à comprendre",
    understandSub: "D'une autre façon",
    tryThis: "Essaie",
    none: "Il n'y a pas encore d'aide pour cette étape. Continue, FILU sera là.",
    typing: "Poser ta propre question sera bientôt possible",
    send: "Envoyer",
    chat: "Conversation avec FILU",
    back: "Retour à ma leçon",
  },
};

function pick(mode: Mode, elements: Element[]): Element[] {
  if (mode === "hint") {
    return elements.filter(
      (e) => e.type === "hint" || e.type === "corrective_feedback",
    );
  }

  if (mode === "understand") {
    return elements.filter(
      (e) => e.type === "worked_example" || e.type === "learner_task",
    );
  }

  return elements.filter((e) => e.type !== "hint");
}

export function AskFiluPage({
  language,
  subjectName,
  topic,
  done,
  total,
  elements,
  lessonHref,
}: Props) {
  const t = text[language];
  const avatarSrc = useLearnerAvatar();
  const [mode, setMode] = useState<Mode>("explain");
  const shown = pick(mode, elements);
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  const choices: { key: Mode; label: string; sub: string }[] = [
    { key: "explain", label: t.explain, sub: t.explainSub },
    { key: "hint", label: t.hint, sub: t.hintSub },
    { key: "understand", label: t.understand, sub: t.understandSub },
  ];

  const chosen = choices.find((c) => c.key === mode)?.label ?? "";

  return (
    <div className="askPage">
      <section className="fHero">
        <div className="fHeroText">
          <h1>{t.title}</h1>
          <p>{t.intro}</p>
        </div>
        <div className="fHeroArt">
          <span className="fNote">{t.note}</span>
          <img src="/images/home/boy-continue.png" alt="" />
        </div>
      </section>

      <section className="fTopic">
        <span className="fTopicIcon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
            <path d="M4 5.5v16" />
          </svg>
        </span>
        <div className="fTopicText">
          <small>{t.current}</small>
          <strong>{subjectLabel(subjectName, language)}</strong>
          <span>{topic}</span>
        </div>
        <div className="fTopicGoals">
          <b>
            {done} {t.of} {total} {t.goals}
          </b>
          <span
            className="fTrack"
            role="progressbar"
            aria-label={t.goals}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <span style={{ width: `${percent}%` }} />
          </span>
        </div>
      </section>

      <section className="fHelp">
        <h2 id="filu-help-title">{t.how}</h2>
        <p>{t.choose}</p>
        <div className="fModes" role="group" aria-labelledby="filu-help-title">
          {choices.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`fMode ${c.key}${mode === c.key ? " on" : ""}`}
              aria-pressed={mode === c.key}
              aria-controls="filu-chat"
              onClick={() => setMode(c.key)}
            >
              <b>{c.label}</b>
              <span>{c.sub}</span>
            </button>
          ))}
        </div>
      </section>

      <section
        id="filu-chat"
        className="fChat"
        role="log"
        aria-live="polite"
        aria-label={t.chat}
        tabIndex={0}
      >
        <div className="fUser">
          <span className="fUserBubble">{chosen}</span>
          <img src={avatarSrc} alt="" />
        </div>

        {shown.length === 0 && (
          <div className="fFilu">
            <FiluAvatar className="fFiluAvatar" />
            <div className="fBubble">
              <small>FILU</small>
              <p>{t.none}</p>
            </div>
          </div>
        )}

        {shown.map((e, index) => (
          <div className="fFilu" key={`${mode}-${e.type}-${index}`}>
            <FiluAvatar className="fFiluAvatar" />
            <div className="fBubble">
              <small>{e.type === "worked_example" ? t.tryThis : "FILU"}</small>
              <p>{e.text}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="fInput">
        <input type="text" disabled placeholder={t.typing} aria-label={t.typing} />
        <button type="button" disabled aria-label={t.send}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff" aria-hidden="true">
            <path d="M3 11.5 21 3l-8.5 18-2.2-7.3z" />
          </svg>
        </button>
      </section>

      {lessonHref ? (
        <Link href={lessonHref} className="fButton fBackToLesson">
          {t.back} <span aria-hidden="true">{"→"}</span>
        </Link>
      ) : null}

      <section className="homeFooter">
        <img src="/images/home/landscape%20footer.png" alt="" />
      </section>

      <style jsx>{`
        .askPage {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 10px;
        }

        .fHero {
          display: flex;
          min-height: 96px;
          justify-content: space-between;
          padding: 10px 4px 0;
        }

        .fHeroText h1 {
          margin: 0;
          color: #0f2a6b;
          font-size: 34px;
          font-weight: 800;
          line-height: 1.05;
        }

        .fHeroText p {
          max-width: 190px;
          margin: 6px 0 0;
          color: #3d5a80;
          font-size: 14px;
        }

        .fHeroArt {
          position: relative;
          width: 130px;
        }

        .fHeroArt img {
          position: absolute;
          right: 0;
          bottom: 0;
          width: auto;
          height: 86px;
        }

        .fNote {
          position: absolute;
          top: 6px; left: 0; width: 84px;
          padding: 8px;
          border-radius: 50%;
          background: #fdf0cf;
          color: #1677ff;
          font-family: var(--font-hand);
          font-size: 12px;
          line-height: 1.1;
          text-align: center;
        }

        .fTopic {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 16px;
          background: #eaf3fc;
        }

        .fTopicIcon {
          display: flex;
          width: 44px;
          height: 44px;
          flex: none;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #f5a00f;
        }

        .fTopicText {
          display: flex;
          flex: 1;
          flex-direction: column;
          min-width: 0;
        }

        .fTopicText small {
          color: #5b7aa3;
          font-size: 11px;
        }

        .fTopicText strong {
          color: #0f2a6b;
          font-size: 17px;
          font-weight: 800;
        }

        .fTopicText span {
          color: #3d5a80;
          font-size: 12px;
        }

        .fTopicGoals {
          display: flex;
          width: 110px;
          flex: none;
          flex-direction: column;
          gap: 6px;
        }

        .fTopicGoals b {
          color: #0f2a6b;
          font-size: 12px;
        }

        .fTrack {
          display: block;
          height: 7px;
          overflow: hidden;
          border-radius: 999px;
          background: #d6e2ee;
        }

        .fTrack span {
          display: block;
          height: 100%;
          background: #3fb34f;
        }

        .fHelp h2 {
          margin: 0;
          color: #0f2a6b;
          font-size: 20px;
          font-weight: 800;
        }

        .fHelp p {
          margin: 2px 0 8px;
          color: #3d5a80;
          font-size: 12px;
        }

        .fModes {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .fMode {
          display: flex;
          min-height: 58px;
          flex-direction: column;
          justify-content: center;
          padding: 6px 10px;
          border: 2px solid transparent;
          border-radius: 14px;
          color: #0f2a6b;
          text-align: left;
        }

        .fMode.explain {
          background: #fdf0cf;
        }

        .fMode.hint {
          background: #dbeafe;
        }

        .fMode.understand {
          background: #dcf1e2;
        }

        .fMode.on {
          border-color: #0f2a6b;
        }

        .fMode b {
          font-size: 13px;
          font-weight: 800;
          line-height: 1.1;
        }

        .fMode span {
          margin-top: 2px;
          color: #3d5a80;
          font-size: 10px;
        }

        .fChat {
          display: flex;
          max-height: 238px;
          flex-direction: column;
          gap: 8px;
          overflow-y: auto;
          padding: 10px;
          border-radius: 16px;
          background: #eef5fd;
        }

        .fUser {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
        }

        .fUser img,
        .fFilu img {
          width: 28px;
          height: 28px;
          flex: none;
          border-radius: 50%;
          background: #fff;
          object-fit: cover;
        }

        .fUserBubble {
          padding: 6px 12px;
          border-radius: 14px;
          background: #dbeafe;
          color: #0f2a6b;
          font-size: 13px;
        }

        .fFilu {
          display: flex;
          align-items: flex-start;
          gap: 6px;
        }

        .fBubble {
          flex: 1;
          padding: 6px 12px;
          border-radius: 14px;
          background: #fff;
        }

        .fBubble small {
          color: #1677ff;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .fBubble p {
          margin: 2px 0 0;
          color: #0f2a6b;
          font-size: 13px;
          line-height: 1.35;
        }

        .fInput {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .fInput input {
          flex: 1;
          min-width: 0;
          height: 40px;
          padding: 0 14px;
          border: 2px solid #cfe2f7;
          border-radius: 999px;
          background: #fff;
          font-size: 13px;
        }

        .fInput button {
          display: flex;
          width: 40px;
          height: 40px;
          flex: none;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 50%;
          background: #7fb2ff;
        }

        /* Tablet: larger tap targets and a taller conversation */
        @media (min-width: 768px) {
          .askPage {
            gap: 16px;
          }

          .fHero {
            min-height: 124px;
          }

          .fHeroText h1 {
            font-size: 38px;
          }

          .fHeroText p {
            max-width: 320px;
            font-size: 16px;
          }

          .fHeroArt {
            width: 190px;
          }

          .fHeroArt img {
            height: 116px;
          }

          .fNote {
            width: 100px;
            font-size: 14px;
          }

          .fTopic {
            gap: 14px;
            padding: 16px 20px;
            border-radius: 18px;
          }

          .fTopicIcon {
            width: 52px;
            height: 52px;
          }

          .fTopicText small {
            font-size: 12px;
          }

          .fTopicText strong {
            font-size: 19px;
          }

          .fTopicText span,
          .fTopicGoals b {
            font-size: 14px;
          }

          .fTopicGoals {
            width: 160px;
          }

          .fTrack {
            height: 9px;
          }

          .fHelp h2 {
            font-size: 22px;
          }

          .fHelp p {
            margin-bottom: 12px;
            font-size: 14px;
          }

          .fModes {
            gap: 12px;
          }

          .fMode {
            min-height: 76px;
            padding: 12px 16px;
            border-radius: 16px;
          }

          .fMode b {
            font-size: 15px;
          }

          .fMode span {
            font-size: 12.5px;
          }

          .fChat {
            max-height: 360px;
            gap: 12px;
            padding: 16px;
            border-radius: 18px;
          }

          .fUser img,
          .fFilu img {
            width: 36px;
            height: 36px;
          }

          .fUserBubble,
          .fBubble p {
            font-size: 15px;
          }

          .fBubble {
            padding: 10px 16px;
          }

          .fBubble small {
            font-size: 11px;
          }

          .fInput input {
            height: 48px;
            padding: 0 18px;
            font-size: 15px;
          }

          .fInput button {
            width: 48px;
            height: 48px;
          }
        }

        /* Laptop and desktop: context and actions on the left,
           the conversation on the right */
        @media (min-width: 1024px) {
          .askPage {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr);
            grid-template-areas:
              "hero chat"
              "topic chat"
              "help chat"
              "help input"
              "help back"
              "footer footer";
            grid-template-rows: auto auto auto auto auto 1fr;
            gap: 20px 24px;
          }

          .askPage > :global(.fBackToLesson) {
            grid-area: back;
            justify-self: start;
            margin: 0;
          }

          .fHero {
            grid-area: hero;
            padding-top: 0;
          }

          .fHeroText {
            min-width: 0;
          }

          .fHeroText h1 {
            font-size: 32px;
          }

          .fHeroArt {
            flex: none;
            width: 110px;
          }

          .fHeroArt img {
            height: 92px;
          }

          .fNote {
            width: 74px;
            padding: 6px;
            font-size: 11.5px;
          }

          .fTopic {
            grid-area: topic;
            flex-wrap: wrap;
          }

          .fTopicGoals {
            width: 100%;
            padding-left: 66px;
          }

          .fHelp {
            grid-area: help;
          }

          .fModes {
            grid-template-columns: minmax(0, 1fr);
          }

          .fChat {
            grid-area: chat;
            min-height: 360px;
            max-height: 640px;
            padding: 20px;
          }

          .fInput {
            grid-area: input;
            align-self: start;
          }

          .homeFooter {
            grid-area: footer;
            align-self: end;
          }
        }

        @media (min-width: 1280px) {
          .askPage {
            column-gap: 32px;
          }

          .fHeroText h1 {
            font-size: 38px;
          }

          .fHeroArt {
            width: 180px;
          }

          .fHeroArt img {
            height: 112px;
          }

          .fNote {
            width: 96px;
            padding: 8px;
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}