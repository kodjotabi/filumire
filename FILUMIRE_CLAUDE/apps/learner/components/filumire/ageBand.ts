/*
 * Age-appropriate presentation bands. Presentation only: the band never
 * changes grade registration, placement, curriculum or adaptive logic.
 *
 * primary      Basic 4-6 (and any grade not listed below)
 * junior-high  Basic 7-9, shown only when the server's private presentation
 *              gate is enabled. The server remains authoritative; a URL
 *              parameter or client-side setting cannot enable this band.
 */
import { useEffect, useState } from "react";

export type AgeBand = "primary" | "junior-high";

export const JUNIOR_HIGH_INTERFACE_READY = false;

const JUNIOR_HIGH_GRADES = new Set([7, 8, 9]);

/* "level-gh-basic-7-pilot" or a grade name such as "Basic 7" / "JHS 1". */
export function basicGradeNumber(
  gradeId?: string | null,
  gradeName?: string | null,
): number | null {
  const fromId = /basic-(\d+)/i.exec(gradeId ?? "");
  if (fromId) return Number(fromId[1]);

  const fromName = /basic\s*(\d+)/i.exec(gradeName ?? "");
  if (fromName) return Number(fromName[1]);

  const jhs = /\bjhs\s*([123])\b/i.exec(gradeName ?? "");
  if (jhs) return 6 + Number(jhs[1]);

  return null;
}

export function ageBandForGrade(
  gradeId?: string | null,
  gradeName?: string | null,
  ready: boolean = JUNIOR_HIGH_INTERFACE_READY,
): AgeBand {
  const grade = basicGradeNumber(gradeId, gradeName);
  return ready && grade !== null && JUNIOR_HIGH_GRADES.has(grade)
    ? "junior-high"
    : "primary";
}

export function resolveAgeBand(options: {
  gradeId?: string | null;
  gradeName?: string | null;
  presentationEnabled?: boolean;
}): AgeBand {
  return ageBandForGrade(
    options.gradeId,
    options.gradeName,
    options.presentationEnabled === true,
  );
}

/* Read the same server-side gate that controls grade and content registration. */
export function useAgeBand(
  overview: { gradeId?: string; gradeName?: string } | null | undefined,
): AgeBand {
  const gradeId = overview?.gradeId ?? "";
  const gradeName = overview?.gradeName ?? "";
  const gradeKey = `${gradeId}:${gradeName}`;
  const gradeNumber = basicGradeNumber(gradeId, gradeName);
  const isJuniorHigh = gradeNumber !== null && JUNIOR_HIGH_GRADES.has(gradeNumber);
  const [presentation, setPresentation] = useState<{
    gradeKey: string;
    enabled: boolean;
  } | null>(null);

  useEffect(() => {
    if (!isJuniorHigh) {
      setPresentation(null);
      return;
    }

    const controller = new AbortController();
    fetch("/api/presentation-scope", {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Presentation scope unavailable");
        return response.json() as Promise<{ enabled?: boolean }>;
      })
      .then((scope) => {
        setPresentation({ gradeKey, enabled: scope.enabled === true });
      })
      .catch(() => {
        if (!controller.signal.aborted) setPresentation({ gradeKey, enabled: false });
      });

    return () => controller.abort();
  }, [gradeKey, isJuniorHigh]);

  return resolveAgeBand({
    gradeId,
    gradeName,
    presentationEnabled:
      isJuniorHigh && presentation?.gradeKey === gradeKey && presentation.enabled,
  });
}
