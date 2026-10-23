/*
 * Age-appropriate presentation bands. Presentation only: the band never
 * changes grade registration, placement, curriculum or adaptive logic.
 *
 * primary      Basic 4-6 (and any grade not listed below)
 * junior-high  Basic 7-9, hidden until their curriculum and lessons are
 *              ready (JUNIOR_HIGH_INTERFACE_READY). Until then every
 *              learner sees the primary interface. Development builds can
 *              preview it with ?ageBand=junior-high.
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
  previewParam?: string | null;
  isProduction: boolean;
}): AgeBand {
  if (!options.isProduction) {
    if (options.previewParam === "junior-high") return "junior-high";
    if (options.previewParam === "primary") return "primary";
  }

  return ageBandForGrade(options.gradeId, options.gradeName);
}

/*
 * Band for the current page, from the learner overview. The preview
 * parameter is read after mount so server and client render the same
 * first frame.
 */
export function useAgeBand(
  overview: { gradeId?: string; gradeName?: string } | null | undefined,
): AgeBand {
  const [previewParam, setPreviewParam] = useState<string | null>(null);

  useEffect(() => {
    setPreviewParam(
      new URLSearchParams(window.location.search).get("ageBand"),
    );
  }, []);

  return resolveAgeBand({
    gradeId: overview?.gradeId,
    gradeName: overview?.gradeName,
    previewParam,
    isProduction: process.env.NODE_ENV === "production",
  });
}
