import type { LearnerNavItem } from "../components/filumire/LearnerBottomNav";
import type { Language } from "../components/filumire/language";

export type DashboardView =
  | "setup" | "home" | "learning" | "progress"
  | "challenges" | "ask-filu" | "profile";

export function dashboardView(search: string): DashboardView {
  const view = new URLSearchParams(search).get("view");
  switch (view) {
    case "setup": case "learning": case "progress":
    case "challenges": case "ask-filu": case "profile":
      return view;
    default:
      return "home";
  }
}

// Profile and setup are not menu items, so nothing is highlighted there.
export function navItemForView(view: DashboardView): LearnerNavItem | null {
  switch (view) {
    case "learning": case "progress": case "challenges": return view;
    case "ask-filu": return "filu";
    case "home": return "home";
    default: return null;
  }
}

export function askFiluHref(language: Language, subjectId?: string | null): string {
  const params = new URLSearchParams({ lang: language, view: "ask-filu" });
  if (subjectId) params.set("subjectId", subjectId);
  return `/dashboard?${params}`;
}

// Keep required onboarding, but remember the assistant the learner asked for.
export function setupRedirect(search: string, language: Language): string | null {
  if (dashboardView(search) === "setup") return null;
  const current = new URLSearchParams(search);
  const params = new URLSearchParams({ lang: language, view: "setup" });
  if (dashboardView(search) === "ask-filu") {
    params.set("returnTo", "ask-filu");
    const subjectId = current.get("subjectId");
    if (subjectId) params.set("subjectId", subjectId);
  }
  return `/dashboard?${params}`;
}

export function setupDestination(search: string, language: Language): string {
  const params = new URLSearchParams(search);
  // Only this app-owned destination is accepted; never follow an arbitrary URL.
  return params.get("returnTo") === "ask-filu"
    ? askFiluHref(language, params.get("subjectId"))
    : `/dashboard?lang=${language}`;
}
