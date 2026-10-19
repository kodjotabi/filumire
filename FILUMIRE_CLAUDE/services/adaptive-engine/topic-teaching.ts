import type { LearningIntervention } from "../../packages/domain/intervention";

// Reuse the existing persisted policy field: no learner-state reset or schema change.
const PREFIX = "selected-topic-teaching-v1";
export type TeachingStep = "explain" | "worked_example" | "guided_practice";
export function teachingPolicy(cycle: number, step: Exclude<TeachingStep, "guided_practice">) {
  return `${PREFIX}/${cycle}/${step}`;
}
export function teachingBinding(item: LearningIntervention) {
  const match = /^selected-topic-teaching-v1\/(\d+)\/(explain|worked_example)$/.exec(item.policyVersion);
  return match ? { cycle: Number(match[1]), step: match[2] as "explain" | "worked_example" } : undefined;
}
export function nextTeachingCycle(items: LearningIntervention[]) {
  return items.reduce((latest, item) => Math.max(latest, teachingBinding(item)?.cycle ?? 0), 0) + 1;
}
export function currentTeachingCycle(items: LearningIntervention[]) {
  const cycle = nextTeachingCycle(items) - 1;
  const explanation = items.find(item => item.policyVersion === teachingPolicy(cycle, "explain"));
  const example = items.find(item => item.policyVersion === teachingPolicy(cycle, "worked_example"));
  if (!explanation || explanation.status === "cancelled" || example?.status === "cancelled") return;
  if (explanation.status === "active") return { cycle, step: "explain" as const };
  if (!example || example.status === "active") return { cycle, step: "worked_example" as const };
  // The worked example's own intervention owns the subsequent guided question.
  if (!example.evidenceIds.length) return { cycle, step: "guided_practice" as const };
}
