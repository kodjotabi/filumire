"use client";

import { useState } from "react";

import type { AgeBand } from "../../../components/filumire/ageBand";
import { JellyStarFeedback, type FeedbackOutcome } from "../../../components/filumire/JellyStarFeedback";
import { MasteryGoalsPanel } from "../../../components/filumire/MasteryGoalsPanel";
import { SUBJECT_PRESENTATION, type FilumireSubject } from "../../../components/filumire/subjects";

const OUTCOMES: FeedbackOutcome[] = ["correct", "incorrect", "partial", "pending-review"];

const SAMPLE_SUBJECTS: FilumireSubject[] = (["english", "mathematics", "science", "computing"] as const).map((key) => ({
  key,
  subjectId: `sample-${key}`,
  ...SUBJECT_PRESENTATION[key],
}));

const SAMPLE_COUNTS = {
  "sample-english": { total: 12, completed: 5, started: true },
  "sample-mathematics": { total: 16, completed: 3, started: true },
  "sample-science": { total: 10, completed: 10, started: true },
  "sample-computing": { total: 8, completed: 0, started: false },
};

export function AgeInterfacePreview() {
  const [language, setLanguage] = useState<"en" | "fr">("en");
  const [replay, setReplay] = useState(0);

  function column(band: AgeBand, title: string) {
    return (
      <section data-age-band={band} style={{ padding: 16, borderRadius: 12, background: band === "primary" ? "#ffffff" : undefined }}>
        <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>{title}</h2>
        {OUTCOMES.map((outcome) => (
          <JellyStarFeedback
            key={`${band}-${outcome}-${replay}-${language}`}
            outcome={outcome}
            band={band}
            language={language}
            onContinue={() => setReplay((n) => n + 1)}
          />
        ))}
      </section>
    );
  }

  return (
    <main style={{ maxWidth: 920, margin: "0 auto", padding: 16, fontFamily: "inherit" }}>
      <h1 style={{ fontSize: 22, margin: "8px 0" }}>FILUMIRE age-band interface preview</h1>
      <p style={{ margin: "0 0 12px", color: "#556" }}>
        Development only. Sample data. Basic 7&ndash;9 is hidden from learners until its curriculum is ready.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button type="button" onClick={() => setReplay((n) => n + 1)}>Replay animations</button>
        <button type="button" onClick={() => setLanguage(language === "en" ? "fr" : "en")}>
          {language === "en" ? "Français" : "English"}
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        {column("primary", "Basic 4–6: Jelly Star")}
        {column("junior-high", "Basic 7–9: academic")}
      </div>
      <div data-age-band="junior-high" style={{ marginTop: 16, padding: 16, borderRadius: 12 }}>
        <MasteryGoalsPanel subjects={SAMPLE_SUBJECTS} counts={SAMPLE_COUNTS} language={language} />
      </div>
    </main>
  );
}
