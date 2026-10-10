"use client";

import { useState, type FormEvent } from "react";

import {
  accountErrorMessage,
  linkTeacherToLearner,
} from "../../services/account-client";
import type { Language } from "./language";

const TEXT = {
  en: {
    title: "Link a learner",
    intro:
      "Ask the learner's parent or guardian to create a teacher code on their FILUMIRE family page, then enter it here.",
    label: "Teacher code",
    placeholder: "e.g. ABCDE-23456",
    submit: "Link learner",
    linking: "Linking…",
    linked: (name: string) => `${name || "The learner"} is now linked to your account.`,
  },
  fr: {
    title: "Associer un apprenant",
    intro:
      "Demandez au parent ou au tuteur de l’apprenant de créer un code enseignant depuis sa page famille FILUMIRE, puis saisissez-le ici.",
    label: "Code enseignant",
    placeholder: "ex. ABCDE-23456",
    submit: "Associer l’apprenant",
    linking: "Association…",
    linked: (name: string) => `${name || "L’apprenant"} est maintenant associé à votre compte.`,
  },
};

/*
 * For a signed-in teacher: enter the one-time code a learner's
 * guardian created. The server decides everything; this form only
 * passes the code on.
 */
export function TeacherLinkLearner({
  language,
  onLinked,
}: {
  language: Language;
  onLinked: (learnerId: string) => void;
}) {
  const t = TEXT[language];
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const linked = await linkTeacherToLearner(code);
      setCode("");
      setOk(true);
      setMessage(t.linked(linked.displayName));
      onLinked(linked.learnerId);
    } catch (error) {
      setOk(false);
      setMessage(accountErrorMessage(error, language));
    }
    setBusy(false);
  }

  return (
    <section className="card tlCard" aria-labelledby="teacher-link-title">
      <h2 id="teacher-link-title" className="section-heading">{t.title}</h2>
      <p className="section-text">{t.intro}</p>
      <form className="tlForm" onSubmit={submit}>
        <label htmlFor="teacher-link-code">{t.label}</label>
        <div className="tlRow">
          <input
            id="teacher-link-code"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={16}
            required
            placeholder={t.placeholder}
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          <button type="submit" className="primary-button" disabled={busy} aria-busy={busy}>
            {busy ? t.linking : t.submit}
          </button>
        </div>
      </form>
      <p className={`tlMessage${ok ? " ok" : ""}`} role="status">
        {message}
      </p>
      <style>{`
        .tlCard { display: grid; gap: 8px; }
        .tlForm { display: grid; gap: 6px; }
        .tlForm label { font-weight: 700; font-size: 14px; }
        .tlRow { display: flex; flex-wrap: wrap; gap: 8px; }
        .tlRow input { flex: 1 1 180px; min-height: 44px; padding: 0 12px; border: 1px solid #c9d6e8; border-radius: 10px; font: inherit; font-size: 18px; letter-spacing: 0.08em; text-transform: uppercase; }
        .tlMessage { margin: 0; font-size: 14px; color: #b42318; }
        .tlMessage.ok { color: #1a7f37; }
        .tlMessage:empty { display: none; }
      `}</style>
    </section>
  );
}
