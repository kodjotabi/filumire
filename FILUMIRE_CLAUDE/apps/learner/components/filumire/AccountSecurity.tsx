"use client";

import { useState, type FormEvent } from "react";

import {
  accountErrorMessage,
  changeOwnPassword,
  signOutOtherDevices,
} from "../../services/account-client";
import type { Language } from "./language";

const TEXT = {
  en: {
    title: "Password and devices",
    change: "Change my password",
    current: "Current password",
    next: "New password",
    nextHelp: (min: number) => `At least ${min} characters.`,
    save: "Save new password",
    saving: "Saving…",
    cancel: "Cancel",
    changed: (n: number) =>
      n > 0
        ? `Password changed. ${n === 1 ? "1 other device was" : `${n} other devices were`} signed out.`
        : "Password changed.",
    others: "Sign out my other devices",
    othersBusy: "Signing out…",
    othersDone: (n: number) =>
      n === 0
        ? "No other device was signed in."
        : `${n === 1 ? "1 other device was" : `${n} other devices were`} signed out.`,
  },
  fr: {
    title: "Mot de passe et appareils",
    change: "Changer mon mot de passe",
    current: "Mot de passe actuel",
    next: "Nouveau mot de passe",
    nextHelp: (min: number) => `Au moins ${min} caractères.`,
    save: "Enregistrer le nouveau mot de passe",
    saving: "Enregistrement…",
    cancel: "Annuler",
    changed: (n: number) =>
      n > 0
        ? `Mot de passe modifié. ${n === 1 ? "1 autre appareil a été déconnecté" : `${n} autres appareils ont été déconnectés`}.`
        : "Mot de passe modifié.",
    others: "Déconnecter mes autres appareils",
    othersBusy: "Déconnexion…",
    othersDone: (n: number) =>
      n === 0
        ? "Aucun autre appareil n'était connecté."
        : `${n === 1 ? "1 autre appareil a été déconnecté" : `${n} autres appareils ont été déconnectés`}.`,
  },
};

/*
 * Lets the signed-in guardian or learner change their own password
 * (giving the current one) and sign out their other devices.
 */
export function AccountSecurity({
  language,
  minLength,
}: {
  language: Language;
  minLength: number;
}) {
  const t = TEXT[language];
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState<"" | "password" | "others">("");
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("password");
    setMessage("");
    try {
      const { otherSessionsEnded } = await changeOwnPassword(current, next);
      setCurrent("");
      setNext("");
      setOpen(false);
      setOk(true);
      setMessage(t.changed(otherSessionsEnded));
    } catch (error) {
      setOk(false);
      setMessage(accountErrorMessage(error, language));
    }
    setBusy("");
  }

  async function signOutOthers() {
    setBusy("others");
    setMessage("");
    try {
      const { ended } = await signOutOtherDevices();
      setOk(true);
      setMessage(t.othersDone(ended));
    } catch (error) {
      setOk(false);
      setMessage(accountErrorMessage(error, language));
    }
    setBusy("");
  }

  return (
    <section className="secPanel" aria-labelledby="security-title">
      <h2 id="security-title">{t.title}</h2>

      {open ? (
        <form className="secForm" onSubmit={savePassword}>
          <label htmlFor="security-current">{t.current}</label>
          <input
            id="security-current"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
          />
          <label htmlFor="security-next">{t.next}</label>
          <input
            id="security-next"
            type="password"
            autoComplete="new-password"
            required
            minLength={minLength}
            maxLength={128}
            aria-describedby="security-next-help"
            value={next}
            onChange={(event) => setNext(event.target.value)}
          />
          <p id="security-next-help" className="secHelp">{t.nextHelp(minLength)}</p>
          <div className="secActions">
            <button type="submit" className="secButton" disabled={busy !== ""} aria-busy={busy === "password"}>
              {busy === "password" ? t.saving : t.save}
            </button>
            <button type="button" className="secButton quiet" onClick={() => setOpen(false)}>
              {t.cancel}
            </button>
          </div>
        </form>
      ) : (
        <div className="secActions">
          <button type="button" className="secButton" onClick={() => { setOpen(true); setMessage(""); }}>
            {t.change}
          </button>
          <button type="button" className="secButton quiet" onClick={signOutOthers} disabled={busy !== ""} aria-busy={busy === "others"}>
            {busy === "others" ? t.othersBusy : t.others}
          </button>
        </div>
      )}

      <p className={`secMessage${ok ? " ok" : ""}`} role="status">
        {message}
      </p>

      <style>{`
        .secPanel { display: grid; gap: 10px; padding: 16px; border-radius: 16px; background: #fff; border: 1px solid var(--ui-line, #dfe7f2); }
        .secPanel h2 { margin: 0; font-size: 18px; font-weight: 800; color: var(--ui-ink, #14213d); }
        .secForm { display: grid; gap: 6px; }
        .secForm label { font-size: 14px; font-weight: 700; color: var(--ui-ink, #14213d); }
        .secForm input { min-height: 44px; padding: 0 12px; border: 1px solid var(--ui-line, #c9d6e8); border-radius: 10px; font: inherit; font-size: 16px; }
        .secHelp { margin: 0; font-size: 13px; color: var(--ui-ink-soft, #4a5d7a); }
        .secActions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
        .secButton { min-height: 44px; padding: 0 16px; border: 0; border-radius: 999px; background: var(--ui-blue, #1f5fbf); color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
        .secButton.quiet { background: var(--ui-blue-tint, #e8f0fb); color: var(--ui-blue, #1f5fbf); }
        .secButton:disabled { opacity: 0.6; cursor: default; }
        .secMessage { margin: 0; min-height: 1em; font-size: 14px; color: #b42318; }
        .secMessage.ok { color: #1a7f37; }
        .secMessage:empty { display: none; }
      `}</style>
    </section>
  );
}
