"use client";

import { setLanguagePreference, type Language } from "./language";

type LanguageToggleProps = {
  language: Language;
  onChange?: (value: Language) => void;
  /*
   * "segmented" shows EN | FR side by side. "compact" is a single
   * button naming the other language, for the crowded 390px
   * learner header.
   */
  variant?: "segmented" | "compact";
  tone?: "dark" | "light";
};

export function LanguageToggle({
  language,
  onChange,
  variant = "segmented",
  tone = "dark",
}: LanguageToggleProps) {
  function choose(value: Language) {
    if (onChange) onChange(value);
    else setLanguagePreference(value);
  }

  if (variant === "compact") {
    const other: Language = language === "fr" ? "en" : "fr";
    return (
      <button
        type="button"
        className={`filumireLangSwitch ${tone}`}
        lang={other}
        aria-label={other === "fr" ? "Passer en français" : "Switch to English"}
        title={other === "fr" ? "Français" : "English"}
        onClick={() => choose(other)}
      >
        {other.toUpperCase()}
      </button>
    );
  }

  return (
    <div
      className={`filumireLangToggle ${tone}`}
      role="group"
      aria-label={language === "fr" ? "Langue" : "Language"}
    >
      {(["en", "fr"] as const).map((value) => (
        <button
          key={value}
          type="button"
          lang={value}
          className={language === value ? "on" : undefined}
          aria-pressed={language === value}
          aria-label={value === "en" ? "English" : "Français"}
          onClick={() => choose(value)}
        >
          {value.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
