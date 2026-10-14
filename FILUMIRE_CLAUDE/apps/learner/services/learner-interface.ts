import { LearningNetworkError } from "./learning-client";
type Language = "en" | "fr";
const errors = {
  signIn: { en: "Your session has ended. Sign in again to continue.", fr: "Ta session est terminée. Reconnecte-toi pour continuer." },
  access: { en: "This activity is not available to your account. Return to your learning page.", fr: "Cette activité n’est pas disponible pour ton compte. Retourne à ton apprentissage." },
  changed: { en: "Your activity has changed. Reload the current activity before trying again.", fr: "Ton activité a changé. Recharge l’activité actuelle avant de réessayer." },
  wait: { en: "Please wait a moment before trying again. Your recorded work is kept.", fr: "Attends un instant avant de réessayer. Ton travail enregistré est conservé." },
  network: { en: "FILUMIRE cannot reach the server. Check your connection and try again.", fr: "FILUMIRE ne peut pas joindre le serveur. Vérifie ta connexion et réessaie." },
  unavailable: { en: "This action could not be confirmed. Try again; your recorded work is kept.", fr: "Cette action n’a pas pu être confirmée. Réessaie ; ton travail enregistré est conservé." },
};
/** UI wording only: never changes pending answers, retry IDs or authoritative data. */
export function learnerErrorText(error: unknown, language: Language): string {
  const status = error && typeof error === "object" && "status" in error ? (error as { status: unknown }).status : undefined;
  const name = error instanceof Error ? error.name : "";
  const kind = status === 401 ? "signIn" : status === 403 ? "access" : status === 409 ? "changed" : status === 429 ? "wait" : status === 0 || error instanceof LearningNetworkError || name === "LearningNetworkError" ? "network" : "unavailable";
  return errors[kind][language];
}
export function translateLearnerError(text: string, language: Language): string | undefined {
  return Object.values(errors).find((entry) => entry.en === text || entry.fr === text)?.[language];
}
export function lessonLanguageNotice(contentLanguage: "en" | "fr" | undefined, interfaceLanguage: Language): string | undefined {
  if (!contentLanguage || contentLanguage === interfaceLanguage) return;
  return interfaceLanguage === "fr"
    ? "Le texte actuel de cette leçon est en anglais. Une version française validée n’a pas été fournie pour cette activité. Ton apprentissage enregistré est conservé."
    : "The current lesson text is in French. A trusted English version has not been supplied for this activity. Your recorded learning is kept.";
}
