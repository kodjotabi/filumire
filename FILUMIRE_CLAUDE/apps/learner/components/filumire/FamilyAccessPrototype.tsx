"use client";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "./language";
import { clearLearnerProfileFromDevice } from "../../services/account-client";
import type { EntitlementSnapshot } from "../../../../services/family-access/subscriptions";

const COPY = {
  en: { title: "Family access — local prototype", note: "Fictional fixtures only. No SMS is sent. OTP codes are available only to the automated mock test harness. No payments are processed.", phone: "Ghana mobile number", purpose: "Action", register: "Register a new guardian", login: "Sign in", link: "Link to my signed-in guardian account", recover: "Recover my guardian account", name: "Adult display name", consent: "I am the guardian and accept the current test privacy notice", password: "Current password (link) or new password (recovery)", request: "Request test code", code: "Six-digit test code", verify: "Verify", loading: "Please wait…", success: "Verification completed. Registration and login create a FILUMIRE session; recovery requires signing in again.", failed: "Unable to complete this action. Check your test details or wait before retrying.", subscription: "Family access and trial", load: "Refresh account access", start: "Trial started", expiry: "Trial ends", ending: "Your trial ends soon. No payment is taken automatically.", expired: "Your trial has ended. You retain existing Free learning access. Paid choices await approved prices.", plans: "Plus, Family and school plans are prepared. Prices and feature limits require approval; purchases are unavailable here.", cancel: "Cancel future renewal", back: "Return to sign-in", mock: "Mock challenge ready. Enter the code supplied by the test harness." },
  fr: { title: "Accès familial — prototype local", note: "Données fictives uniquement. Aucun SMS n’est envoyé. Les codes sont réservés aux tests automatisés. Aucun paiement n’est effectué.", phone: "Numéro mobile ghanéen", purpose: "Action", register: "Inscrire un nouveau responsable", login: "Se connecter", link: "Associer à mon compte de responsable connecté", recover: "Récupérer mon compte de responsable", name: "Nom affiché de l’adulte", consent: "Je suis le responsable et j’accepte la notice de confidentialité de test", password: "Mot de passe actuel (association) ou nouveau (récupération)", request: "Demander un code de test", code: "Code de test à six chiffres", verify: "Vérifier", loading: "Patientez…", success: "Vérification terminée. L’inscription et la connexion créent une session FILUMIRE ; la récupération exige une nouvelle connexion.", failed: "Action impossible. Vérifie les données de test ou patiente avant de réessayer.", subscription: "Accès familial et essai", load: "Actualiser l’accès au compte", start: "Début de l’essai", expiry: "Fin de l’essai", ending: "L’essai se termine bientôt. Aucun prélèvement automatique.", expired: "L’essai est terminé. L’apprentissage gratuit existant reste accessible. Les offres payantes attendent des tarifs approuvés.", plans: "Les offres Plus, Famille et Écoles sont préparées. Les tarifs et limites doivent être approuvés ; aucun achat n’est disponible ici.", cancel: "Annuler le renouvellement futur", back: "Retour à la connexion", mock: "Code de test prêt. Saisis le code fourni par les tests automatisés." },
};
const PLAN_LABELS = { en: { FREE: "Free access", TRIAL_PLUS: "14-day Plus trial", ACTIVE_PLUS: "Plus access", ACTIVE_FAMILY: "Family access", SCHOOL_LICENSE: "School access" }, fr: { FREE: "Accès gratuit", TRIAL_PLUS: "Essai Plus de 14 jours", ACTIVE_PLUS: "Accès Plus", ACTIVE_FAMILY: "Accès Famille", SCHOOL_LICENSE: "Accès École" } };
export function FamilyAccessPrototype() {
  const [language] = useLanguage(); const t = COPY[language];
  const [purpose, setPurpose] = useState("login"); const [challenge, setChallenge] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); const busyRef = useRef(false);
  const [message, setMessage] = useState<"loading" | "success" | "failed" | "mock" | null>(null);
  const [subscription, setSubscription] = useState<EntitlementSnapshot | null>(null);
  const pending = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; pending.current?.abort(); }; }, []);
  async function request(path: string, body?: unknown) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setMessage("loading");
    const controller = new AbortController(); pending.current = controller;
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(path, { method: body ? "POST" : "GET", credentials: "same-origin", cache: "no-store", signal: controller.signal, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
      if (!response.ok) throw new Error();
      const result = await response.json();
      if (controller.signal.aborted || !mounted.current) return;
      if (result.challengeId) { setChallenge(result.challengeId); setMessage("mock"); }
      else { setMessage("success"); if (path.endsWith("phone")) { setChallenge(null); if (purpose !== "link") { clearLearnerProfileFromDevice(); setSubscription(null); } } }
      if (path.endsWith("subscription")) setSubscription(result);
    } catch { if (mounted.current) setMessage("failed"); }
    finally { clearTimeout(timer); if (pending.current === controller) { pending.current = null; busyRef.current = false; if (mounted.current) setBusy(false); } }
  }
  return <main className="learnerUi" lang={language} style={{ maxWidth: 640, margin: "auto", padding: 20 }}>
    <h1>{t.title}</h1><p>{t.note}</p>
    <form aria-busy={busy} onSubmit={event => {
      event.preventDefault(); if (busyRef.current) return;
      const form = event.currentTarget; const fields = new FormData(form);
      const body = challenge ? { action: "verify", purpose, challengeId: challenge, code: fields.get("code"), displayName: fields.get("name"), language, confirmsGuardian: fields.get("consent") === "on", acceptsNotice: fields.get("consent") === "on", currentPassword: fields.get("password"), newPassword: fields.get("password") } : { action: "start", purpose, phone: fields.get("phone") };
      void request("/api/account/phone", body).then(() => { const input = form.elements.namedItem("code") as HTMLInputElement | null; if (input) input.value = ""; const password = form.elements.namedItem("password") as HTMLInputElement | null; if (password) password.value = ""; });
    }}>
      <p><label htmlFor="family-purpose">{t.purpose}</label><select id="family-purpose" value={purpose} disabled={busy} onChange={event => { setPurpose(event.target.value); setChallenge(null); setMessage(null); setSubscription(null); }}>{(["login", "register", "link", "recover"] as const).map(value => <option key={value} value={value}>{t[value]}</option>)}</select></p>
      <p><label htmlFor="family-phone">{t.phone}</label><input id="family-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0200000001" required disabled={busy || Boolean(challenge)} maxLength={32} /></p>
      {challenge && <>
        <p><label htmlFor="family-code">{t.code}</label><input id="family-code" name="code" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" maxLength={6} disabled={busy} /></p>
        {purpose === "register" && <><p><label htmlFor="family-name">{t.name}</label><input id="family-name" name="name" required maxLength={40} disabled={busy} /></p><p><label><input name="consent" type="checkbox" required disabled={busy} />{t.consent}</label></p></>}
        {(purpose === "link" || purpose === "recover") && <p><label htmlFor="family-password">{t.password}</label><input id="family-password" name="password" type="password" required minLength={8} maxLength={128} autoComplete={purpose === "link" ? "current-password" : "new-password"} disabled={busy} /></p>}
      </>}
      <button disabled={busy} type="submit">{busy ? t.loading : challenge ? t.verify : t.request}</button>
      {challenge && <button type="button" disabled={busy} onClick={() => { setChallenge(null); setMessage(null); }}>{t.request}</button>}
    </form>
    <p role="status" aria-live="polite">{message ? t[message] : ""}</p>
    <h2>{t.subscription}</h2><button disabled={busy} onClick={() => { setSubscription(null); void request("/api/account/subscription"); }}>{t.load}</button>
    {subscription && <><p>{PLAN_LABELS[language][subscription.status]}</p>{subscription.trialStartsAt && <p>{t.start}: <time dateTime={subscription.trialStartsAt}>{new Date(subscription.trialStartsAt).toLocaleDateString(language === "fr" ? "fr-GH" : "en-GH")}</time></p>}{subscription.trialExpiresAt && <p>{t.expiry}: <time dateTime={subscription.trialExpiresAt}>{new Date(subscription.trialExpiresAt).toLocaleDateString(language === "fr" ? "fr-GH" : "en-GH")}</time></p>}{subscription.notice && <p role="status">{subscription.notice === "trial_ending" ? t.ending : t.expired}</p>}{["ACTIVE_PLUS", "ACTIVE_FAMILY"].includes(subscription.status) && <button disabled={busy} onClick={() => void request("/api/account/subscription", { action: "cancel" })}>{t.cancel}</button>}</>}
    <p>{t.plans}</p><a href={`/login?lang=${language}`}>{t.back}</a>
    <style>{`#family-purpose, #family-phone, #family-code, #family-name, #family-password { display:block; width:100%; min-height:44px; font-size:16px; margin-top:6px; box-sizing:border-box; }`}</style>
  </main>;
}
