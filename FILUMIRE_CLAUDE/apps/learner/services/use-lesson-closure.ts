"use client";
import { useEffect, useRef, useState } from "react";
import type { LessonClosure } from "../../../packages/contracts/lesson-closure";
import type { LearningResponse } from "./learning-client";
import { LearningRequestOrder } from "./learning-continuity";
import { closureScope, closureMatchesActivity, isTeachingFirstStep, readLessonClosure, saveLessonClosure, clearLessonClosure, fetchLessonClosure, ClosureRequestError, type ClosureSession } from "./lesson-closure-client";

export function useLessonClosure(data: LearningResponse | null, language: "en" | "fr") {
  const scope = data ? closureScope(data.learnerState.learnerId, data.progress.subjectId, data.decision.competencyId) : "";
  const order = useRef(new LearningRequestOrder());
  const local = useRef<ClosureSession | undefined>(undefined);
  const [verified, setVerified] = useState<{ scope: string; closure: LessonClosure } | null>(null);
  // Never render a previous learner's or previous language's summary during
  // the render before effects have invalidated the old request.
  const closure = data && verified?.scope === scope && closureMatchesActivity(verified.closure, data, language) ? verified.closure : null;
  const [phase, setPhaseState] = useState<"summary" | "review">("summary");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const ticket = order.current.begin();
    const controller = new AbortController();
    setVerified(null); setError(false);
    // Introduction/revisit cards never restore a previous summary, including
    // a summary from an earlier visit to this very topic.
    if (data && isTeachingFirstStep(data.decision)) {
      local.current = undefined; clearLessonClosure(); setLoading(false); return;
    }
    const session = local.current?.scope === scope ? local.current : readLessonClosure(scope);
    if (!data || !session || session.phase === "dismissed" || session.expiresAt <= Date.now()) { setLoading(false); return; }
    local.current = session;
    setLoading(true);
    fetchLessonClosure(session.receipt, language, controller.signal).then((result) => {
      if (!order.current.accepts(ticket)) return;
      if (!closureMatchesActivity(result, data, language)) {
        local.current = undefined; clearLessonClosure(); return;
      }
      const next = { ...session, phase: session.phase === "pending" ? "summary" as const : session.phase };
      local.current = next; saveLessonClosure(next);
      setVerified({ scope, closure: result }); setPhaseState(next.phase === "review" ? "review" : "summary");
    }).catch((failure) => {
      if (!order.current.accepts(ticket)) return;
      // An undelivered lesson or invalid/expired receipt cannot become a summary.
      if (failure instanceof ClosureRequestError && failure.status === 409 && session.phase === "pending") {
        // A language/navigation refresh may check before the acknowledgement
        // commits. Keep its delivery receipt for the subsequent authoritative
        // activity response; do not fabricate completion or replay the write.
      } else if (failure instanceof ClosureRequestError && [400, 404, 409].includes(failure.status)) {
        local.current = undefined; clearLessonClosure();
      } else setError(true);
    }).finally(() => { if (order.current.accepts(ticket)) setLoading(false); });
    return () => { order.current.invalidate(); controller.abort(); };
  }, [data, language, revision, scope]);
  function prepare(receipt: string | undefined) {
    if (!receipt || !scope || !data || isTeachingFirstStep(data.decision)) return;
    order.current.invalidate(); setVerified(null); setLoading(true); setError(false);
    const session: ClosureSession = { scope, receipt, phase: "pending", expiresAt: Date.now() + 7 * 86400000 };
    local.current = session; saveLessonClosure(session);
  }
  function changePhase(next: "summary" | "review") {
    if (!local.current || local.current.scope !== scope || !closure) return;
    local.current = { ...local.current, phase: next }; saveLessonClosure(local.current); setPhaseState(next);
  }
  function dismiss() {
    order.current.invalidate(); setVerified(null); setError(false); setLoading(false);
    if (local.current?.scope === scope) { local.current = { ...local.current, phase: "dismissed" }; saveLessonClosure(local.current); }
  }
  return { closure, phase, loading, error, prepare, changePhase, dismiss, retry: () => setRevision((value) => value + 1) };
}
