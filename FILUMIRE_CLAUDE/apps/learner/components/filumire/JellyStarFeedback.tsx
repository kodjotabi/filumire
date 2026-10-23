"use client";

import { useEffect } from "react";

import type { AgeBand } from "./ageBand";
import { JellyStar, type JellyStarMood } from "./JellyStar";
import { playFeedbackSound, readSoundPreference, useSoundPreference } from "./feedbackSound";

/*
 * Answer feedback for both age bands. Presentation only: it receives the
 * outcome the server already decided and never the answer, so it cannot
 * reveal one. Basic 4-6 get Jelly Star (glow / bounce, wobble / droop,
 * optional sounds); Basic 7-9 get a quiet academic note. Motion follows
 * prefers-reduced-motion (age-interface.css).
 */
export type FeedbackOutcome = "correct" | "incorrect" | "partial" | "pending-review";

type Copy = { title: string; message: string };

const COPY: Record<AgeBand, Record<"en" | "fr", Record<FeedbackOutcome, Copy>>> = {
  primary: {
    en: {
      correct: { title: "Brilliant!", message: "You got it! Jelly Star is so proud of you." },
      incorrect: { title: "Nearly there!", message: "Mistakes help us learn. Jelly Star will help you with the next step." },
      partial: { title: "Good thinking!", message: "You have part of it. Let’s keep going together." },
      "pending-review": { title: "Answer sent!", message: "Your teacher will look at it soon." },
    },
    fr: {
      correct: { title: "Bravo !", message: "Tu as trouvé ! Jelly Star est très fière de toi." },
      incorrect: { title: "Presque !", message: "Les erreurs nous aident à apprendre. Jelly Star va t’aider pour la suite." },
      partial: { title: "Bonne idée !", message: "Tu as une partie de la réponse. Continuons ensemble." },
      "pending-review": { title: "Réponse envoyée !", message: "Ton enseignant va la regarder bientôt." },
    },
  },
  "junior-high": {
    en: {
      correct: { title: "Correct", message: "Recorded towards your mastery of this topic." },
      incorrect: { title: "Not yet", message: "Recorded. The next step works on this skill." },
      partial: { title: "Partly correct", message: "Part of your reasoning holds. The next step builds on it." },
      "pending-review": { title: "Submitted for review", message: "Your teacher will review this response." },
    },
    fr: {
      correct: { title: "Correct", message: "Pris en compte pour ta maîtrise de ce sujet." },
      incorrect: { title: "Pas encore", message: "Pris en compte. L’étape suivante travaille cette compétence." },
      partial: { title: "En partie correct", message: "Une partie de ton raisonnement tient. L’étape suivante s’appuie dessus." },
      "pending-review": { title: "Envoyé pour correction", message: "Ton enseignant va examiner cette réponse." },
    },
  },
};

/*
 * The button after feedback always leads to the step FILUMIRE already
 * chose. The engine never re-asks the question just answered
 * (services/content-selection controlled reuse), so no label promises
 * the same question again.
 */
const UI = {
  en: { nextPrimary: "Keep going!", learnPrimary: "Let’s keep learning", nextJunior: "Continue", soundOn: "Sound on", soundOff: "Sound off" },
  fr: { nextPrimary: "On continue !", learnPrimary: "Continuons à apprendre", nextJunior: "Continuer", soundOn: "Son activé", soundOff: "Son coupé" },
};

export function continueLabel(band: AgeBand, language: "en" | "fr", outcome: FeedbackOutcome) {
  const ui = UI[language];
  if (band === "junior-high") return ui.nextJunior;
  return outcome === "correct" ? ui.nextPrimary : ui.learnPrimary;
}

export function isFeedbackOutcome(value: unknown): value is FeedbackOutcome {
  return value === "correct" || value === "incorrect" || value === "partial" || value === "pending-review";
}

export function feedbackCopy(band: AgeBand, language: "en" | "fr", outcome: FeedbackOutcome): Copy {
  return COPY[band][language][outcome];
}

function moodFor(outcome: FeedbackOutcome): JellyStarMood {
  return outcome === "correct" ? "happy" : outcome === "incorrect" ? "sad" : "calm";
}

/* Sounds default on for Basic 4-6, off for Basic 7-9; both can switch. */
export function soundDefaultFor(band: AgeBand) {
  return band === "primary";
}

export function JellyStarFeedback({
  outcome,
  band,
  language,
  onContinue,
}: {
  outcome: FeedbackOutcome;
  band: AgeBand;
  language: "en" | "fr";
  onContinue?: () => void;
}) {
  const copy = feedbackCopy(band, language, outcome);
  const ui = UI[language];
  const soundDefault = soundDefaultFor(band);
  const { soundOn, toggle } = useSoundPreference(soundDefault);
  const isPrimary = band === "primary";

  // Once per shown feedback (the page remounts this for each answer).
  // Basic 7-9 get two quiet tones instead of the cartoon sounds.
  useEffect(() => {
    if (!readSoundPreference(soundDefault)) return;
    if (outcome === "correct") playFeedbackSound(isPrimary ? "happy" : "confirm");
    else if (outcome === "incorrect") playFeedbackSound(isPrimary ? "sad" : "notice");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`answerFeedback ${isPrimary ? "jelly" : "academic"} ${outcome}`}
      data-age-band={band}
      role="status"
      aria-live="polite"
    >
      {isPrimary ? (
        <span className="answerFeedbackStar">
          <JellyStar mood={moodFor(outcome)} />
        </span>
      ) : (
        <span className="answerFeedbackMark" aria-hidden="true" />
      )}

      <div className="answerFeedbackBody">
        <p className="answerFeedbackTitle">{copy.title}</p>
        <p className="answerFeedbackMessage">{copy.message}</p>

        {onContinue && (
          <button type="button" className="answerFeedbackContinue" onClick={onContinue}>
            {continueLabel(band, language, outcome)}
          </button>
        )}
      </div>

      <button
        type="button"
        className="answerFeedbackSound"
        aria-pressed={soundOn}
        aria-label={soundOn ? ui.soundOn : ui.soundOff}
        title={soundOn ? ui.soundOn : ui.soundOff}
        onClick={toggle}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 9v6h4l5 4V5L8 9H4Z" />
          {soundOn ? <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /> : <path d="M17 9l5 6M22 9l-5 6" />}
        </svg>
      </button>
    </div>
  );
}
