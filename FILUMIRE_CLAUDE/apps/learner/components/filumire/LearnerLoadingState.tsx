"use client";
import { useLanguage, type Language } from "./language";
export function LearnerLoadingState({ language: requested }: { language?: Language } = {}) {
  const [current] = useLanguage();
  const language = requested ?? current;
  return <section className="fState" role="status" aria-busy="true" lang={language}>
    <span className="fSpinner" aria-hidden="true" />
    <p>{language === "fr" ? "Préparation de ton apprentissage…" : "Preparing your learning…"}</p>
  </section>;
}
