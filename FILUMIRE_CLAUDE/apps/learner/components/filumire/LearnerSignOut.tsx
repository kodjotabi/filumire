"use client";
import { useRef, useState } from "react";
import { signOut } from "../../services/account-client";
import type { Language } from "./language";
export function LearnerSignOut({ language }: { language: Language }) {
  const working = useRef(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  async function leave() {
    if (working.current) return;
    working.current = true; setBusy(true); setFailed(false);
    try { await signOut(); window.location.assign(`/login?lang=${language}`); }
    catch { working.current = false; setBusy(false); setFailed(true); }
  }
  return <div className="learnerSignOut learnerBottomSignOut">
    <button type="button" className="learnerSignOutButton" disabled={busy} aria-busy={busy} onClick={() => void leave()}>
      {language === "fr" ? (busy ? "Déconnexion…" : "Se déconnecter") : (busy ? "Signing out…" : "Sign out")}
    </button>
    {failed && <p role="alert">{language === "fr" ? "La déconnexion a échoué. Tu es toujours connecté. Réessaie." : "Sign-out failed. You are still signed in. Try again."}</p>}
  </div>;
}
