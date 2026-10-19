import type { LessonClosure } from "../../../packages/contracts/lesson-closure";
import { getApiHeaders } from "./learning-client";
import type { LearningResponse } from "./learning-client";

const KEY = "filumire.lessonClosure";
export interface ClosureSession {
  scope: string;
  receipt: string;
  phase: "pending" | "summary" | "review" | "dismissed";
  expiresAt: number;
}
export function closureScope(learnerId: string, subjectId?: string, competencyId?: string) { return JSON.stringify([learnerId, subjectId ?? "", competencyId ?? ""]); }
export function isTeachingFirstStep(decision: { action: string; reasonCode: string }) {
  return decision.action === "advance" || ["NEW_TOPIC_INSTRUCTION", "NEW_TOPIC_WORKED_EXAMPLE", "TOPIC_REVISIT"].includes(decision.reasonCode);
}
export function closureMatchesActivity(closure: LessonClosure, data: LearningResponse, language: "en" | "fr") {
  return !isTeachingFirstStep(data.decision) && closure.language === language &&
    closure.competencyId === data.decision.competencyId && closure.subjectId === data.progress.subjectId;
}
export function clearLessonClosure(): void {
  try { window.sessionStorage.removeItem(KEY); } catch { /* optional browser continuity */ }
}
export function readLessonClosure(scope: string): ClosureSession | undefined {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return;
    if (raw.length > 6000) { clearLessonClosure(); return; }
    const value = JSON.parse(raw) as ClosureSession;
    if (value.scope !== scope) return;
    if (typeof value.receipt !== "string" || value.receipt.length > 4096 || !["pending", "summary", "review", "dismissed"].includes(value.phase) || !Number.isFinite(value.expiresAt) || value.expiresAt <= Date.now()) { clearLessonClosure(); return; }
    return value;
  } catch { clearLessonClosure(); return; }
}
export function saveLessonClosure(value: ClosureSession): void {
  try { window.sessionStorage.setItem(KEY, JSON.stringify(value)); } catch { /* still works in memory */ }
}
export class ClosureRequestError extends Error {
  constructor(public code: string, public status: number) { super(code); }
}
export async function fetchLessonClosure(receipt: string, language: "en" | "fr", signal?: AbortSignal): Promise<LessonClosure> {
  let response: Response;
  try {
    response = await fetch("/api/learning/closure", { method: "POST", credentials: "same-origin", cache: "no-store", headers: getApiHeaders(), body: JSON.stringify({ receipt, language }), signal });
  } catch { throw new ClosureRequestError("network", 0); }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ClosureRequestError(data?.code ?? "closure_unavailable", response.status);
  if (!data || typeof data.interventionId !== "string" || !data.summary || !data.evidence || data.language !== language) throw new ClosureRequestError("closure_unavailable", 503);
  return data as LessonClosure;
}
