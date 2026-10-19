import type { OutlineVisual } from "./outline-visual";
export interface LessonClosure {
  interventionId: string;
  competencyId: string;
  subjectId: string;
  completedAt: string;
  language: "en" | "fr";
  summary: {
    available: boolean;
    title?: string;
    concepts: string[];
    examples: string[];
    /** Exact authored excerpts, suitable for a future approved read-aloud adapter. */
    narration: string;
    visuals?: OutlineVisual[];
  };
  evidence: {
    attempts: number;
    correct: number;
    partial: number;
    incorrect: number;
    consecutiveErrors: number;
    hasIdentifiedDifficulties: boolean;
    acquisition: "none" | "emerging" | "established";
    retention: string;
    retentionDueAt?: string;
    /** Elapsed recorded history, not observed time-on-task. */
    elapsedToFirstMasteryMs?: number;
  };
}
