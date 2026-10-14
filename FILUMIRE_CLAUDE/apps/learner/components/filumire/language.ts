"use client";

import { useCallback, useEffect, useState } from "react";

/*
 * One interface language for the whole app. The ?lang= parameter
 * wins (links carry it), then the learner's saved choice, then
 * English. Choosing a language saves it, updates the URL in place
 * and tells every mounted component, so headers, navigation and
 * page copy switch together.
 */
export type Language = "en" | "fr";

export const LANGUAGE_KEY = "filumire.language";
const LANGUAGE_EVENT = "filumire-language";

function isLanguage(value: unknown): value is Language {
  return value === "en" || value === "fr";
}

export function readLanguage(): Language {
  if (typeof window === "undefined") return "en";

  const fromUrl = new URLSearchParams(window.location.search).get("lang");
  if (isLanguage(fromUrl)) return fromUrl;

  try {
    const saved = window.localStorage.getItem(LANGUAGE_KEY);
    if (isLanguage(saved)) return saved;
  } catch {
    /* storage unavailable */
  }

  return "en";
}

export function saveLanguage(language: Language): void {
  try {
    window.localStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    /* storage unavailable: the URL still carries the choice */
  }
}

export function setLanguagePreference(language: Language): void {
  saveLanguage(language);

  const url = new URL(window.location.href);
  if (url.searchParams.get("lang") !== language) {
    url.searchParams.set("lang", language);
    window.history.replaceState(window.history.state, "", url);
  }

  document.documentElement.lang = language;
  window.dispatchEvent(new CustomEvent(LANGUAGE_EVENT, { detail: language }));
}

/*
 * Current language plus a setter. `urlKey` lets pages that already
 * watch the query string (useSearchParams) re-read on navigation.
 */
export function useLanguage(urlKey?: string): [Language, (value: Language) => void] {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    const current = readLanguage();
    setLanguage(current);
    saveLanguage(current);
    document.documentElement.lang = current;
  }, [urlKey]);

  useEffect(() => {
    function onChange(event: Event) {
      const next = (event as CustomEvent<unknown>).detail;
      if (isLanguage(next)) setLanguage(next);
    }

    function onPop() {
      const next = readLanguage();
      setLanguage(next);
      document.documentElement.lang = next;
    }

    window.addEventListener(LANGUAGE_EVENT, onChange);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener(LANGUAGE_EVENT, onChange);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  const choose = useCallback((value: Language) => {
    setLanguage(value);
    setLanguagePreference(value);
  }, []);

  return [language, choose];
}

/* Adds (or replaces) the lang parameter on an app link. */
export function withLang(href: string, language: Language): string {
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("lang", language);
  return `${path}?${params.toString()}`;
}

export function pick<T>(language: Language, text: { en: T; fr: T }): T {
  return text[language];
}
