/** Learner-safe, curriculum-neutral outline data. No HTML, URLs or answer fields. */
export const VISUAL_STAGES = ["Understand", "Practise", "Apply", "Check", "Reflect"] as const;
export type VisualStage = typeof VISUAL_STAGES[number];
export type VisualLanguage = "en" | "fr";
export type CoverageStatus = "Complete" | "Required" | "Text-first" | "Unreviewed";
export type Point = { x: number; y: number };
/** Recognisable equipment drawn by the renderer's own line-art library, never by DTO geometry. */
export const EQUIPMENT_DEVICES = ["monitor", "system-unit", "keyboard", "mouse", "printer"] as const;
export type EquipmentDevice = typeof EQUIPMENT_DEVICES[number];
export const PROCESS_ICONS = ["open-page", "print-shortcut", "print-preview", "print-settings", "printer-output"] as const;
export type ProcessIcon = typeof PROCESS_ICONS[number];
export type OutlineShape =
  | { kind: "rect"; x: number; y: number; width: number; height: number; accent?: boolean }
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number; accent?: boolean }
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number }
  | { kind: "polyline"; points: Point[] };
export type OutlineModel =
  | { kind: "part-whole"; relation: "equivalent" | "compare"; fractions: Array<{ numerator: number; denominator: number }> }
  | { kind: "number-line"; start: number; end: number; format: "fraction" | "number"; divisions: number; marked: number }
  | { kind: "labelled-diagram"; shapes: OutlineShape[]; labels: Array<Point & { text: string }> }
  | { kind: "sentence-strip"; parts: Array<{ text: string; label: string; language: VisualLanguage }> }
  | { kind: "process"; steps: string[]; icons?: ProcessIcon[] }
  | { kind: "equipment"; devices: Array<{ device: EquipmentDevice; label: string }> };
export interface OutlineVisual {
  id: string;
  revision: number;
  contentId: string;
  contentVersion: string;
  competencyId: string;
  language: VisualLanguage;
  stage: VisualStage;
  title: string;
  description: string;
  model: OutlineModel;
}
export type TeachingVisualReference = Pick<OutlineVisual, "id" | "revision" | "contentId" | "contentVersion" | "competencyId" | "language" | "title" | "description">;

const object = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const keys = (v: Record<string, unknown>, allowed: string[]) => Object.keys(v).every(k => allowed.includes(k));
const text = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= 700 && !/[<>\u0000-\u001f]/.test(v);
const integer = (v: unknown, max: number) => Number.isInteger(v) && Number(v) >= 0 && Number(v) <= max;
const coordinate = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 600;
const language = (v: unknown) => v === "en" || v === "fr";
function shape(v: unknown): boolean {
  if (!object(v)) return false;
  if (v.kind === "polyline") return keys(v, ["kind", "points"]) && Array.isArray(v.points) && v.points.length >= 2 && v.points.length <= 40 &&
    v.points.every(p => object(p) && keys(p, ["x", "y"]) && coordinate(p.x) && coordinate(p.y) && Number(p.y) <= 300);
  if (v.kind === "line") return keys(v, ["kind", "x1", "x2", "y1", "y2"]) && [v.x1, v.x2, v.y1, v.y2].every(coordinate) && Number(v.y1) <= 300 && Number(v.y2) <= 300;
  if (v.accent !== undefined && typeof v.accent !== "boolean") return false;
  if (v.kind === "rect") return keys(v, ["kind", "x", "y", "width", "height", "accent"]) &&
    [v.x, v.y, v.width, v.height].every(coordinate) && Number(v.width) > 0 && Number(v.height) > 0 && Number(v.x) + Number(v.width) <= 600 && Number(v.y) + Number(v.height) <= 300;
  return v.kind === "ellipse" && keys(v, ["kind", "cx", "cy", "rx", "ry", "accent"]) &&
    [v.cx, v.cy, v.rx, v.ry].every(coordinate) && Number(v.rx) > 0 && Number(v.ry) > 0 && Number(v.cx) - Number(v.rx) >= 0 && Number(v.cx) + Number(v.rx) <= 600 && Number(v.cy) - Number(v.ry) >= 0 && Number(v.cy) + Number(v.ry) <= 300;
}
export function validOutlineModel(v: unknown): v is OutlineModel {
  if (!object(v)) return false;
  switch (v.kind) {
    case "part-whole": {
      if (!keys(v, ["kind", "relation", "fractions"]) || !["equivalent", "compare"].includes(String(v.relation)) || !Array.isArray(v.fractions) || v.fractions.length < 1 || v.fractions.length > 3) return false;
      const fractions = v.fractions;
      return fractions.every(f => object(f) && keys(f, ["numerator", "denominator"]) && integer(f.denominator, 24) && Number(f.denominator) > 0 && integer(f.numerator, Number(f.denominator))) &&
        (v.relation === "compare" || fractions.every(f => f.numerator * fractions[0].denominator === fractions[0].numerator * f.denominator));
    }
    case "number-line": return keys(v, ["kind", "start", "end", "format", "divisions", "marked"]) &&
      typeof v.start === "number" && typeof v.end === "number" && Number.isFinite(v.start) && Number.isFinite(v.end) && Math.abs(v.start) <= 100000 && Math.abs(v.end) <= 100000 && v.end > v.start &&
      (v.format === "number" || v.format === "fraction" && v.start === 0 && v.end === 1) && integer(v.divisions, 12) && Number(v.divisions) > 0 && integer(v.marked, Number(v.divisions));
    case "labelled-diagram": return keys(v, ["kind", "shapes", "labels"]) && Array.isArray(v.shapes) && v.shapes.length > 0 && v.shapes.length <= 50 && v.shapes.every(shape) &&
      Array.isArray(v.labels) && v.labels.length > 0 && v.labels.length <= 12 && v.labels.every(p => object(p) && keys(p, ["x", "y", "text"]) && coordinate(p.x) && coordinate(p.y) && Number(p.y) <= 300 && text(p.text));
    case "sentence-strip": return keys(v, ["kind", "parts"]) && Array.isArray(v.parts) && v.parts.length >= 1 && v.parts.length <= 8 &&
      v.parts.every(p => object(p) && keys(p, ["text", "label", "language"]) && text(p.text) && text(p.label) && language(p.language));
    case "process": return keys(v, ["kind", "steps", "icons"]) && Array.isArray(v.steps) && v.steps.length >= 2 && v.steps.length <= 8 && v.steps.every(text) &&
      (v.icons === undefined || Array.isArray(v.icons) && v.icons.length === v.steps.length && v.icons.every(i => PROCESS_ICONS.includes(i as ProcessIcon)));
    case "equipment": return keys(v, ["kind", "devices"]) && Array.isArray(v.devices) && v.devices.length >= 1 && v.devices.length <= EQUIPMENT_DEVICES.length &&
      v.devices.every(d => object(d) && keys(d, ["device", "label"]) && EQUIPMENT_DEVICES.includes(d.device as EquipmentDevice) && text(d.label)) &&
      new Set(v.devices.map(d => (d as { device: string }).device)).size === v.devices.length;
    default: return false;
  }
}
/** Also rejects extra/hidden properties: CSS hiding is not a security boundary. */
export function validOutlineVisual(v: unknown): v is OutlineVisual {
  return object(v) && keys(v, ["id", "revision", "contentId", "contentVersion", "competencyId", "language", "stage", "title", "description", "model"]) &&
    [v.id, v.contentId, v.contentVersion, v.competencyId, v.title, v.description].every(text) &&
    integer(v.revision, 100000) && Number(v.revision) > 0 && language(v.language) && VISUAL_STAGES.includes(v.stage as VisualStage) && validOutlineModel(v.model);
}
/** Future tutor adapter only. Phase 1 does not alter the Ask FILU context or behaviour. */
export function safeTeachingVisualReferences(visuals: readonly OutlineVisual[], assessmentProtected: boolean): TeachingVisualReference[] {
  if (assessmentProtected) return [];
  return visuals.filter(v => validOutlineVisual(v) && ["Understand", "Reflect"].includes(v.stage))
    .map(({ id, revision, contentId, contentVersion, competencyId, language, title, description }) => ({ id, revision, contentId, contentVersion, competencyId, language, title, description }));
}
