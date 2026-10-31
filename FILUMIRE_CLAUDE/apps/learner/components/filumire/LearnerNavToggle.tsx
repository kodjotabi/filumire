"use client";

import { useEffect, useState } from "react";

/*
 * Laptop and desktop sidebar size (review 31 Oct 2026). From 1024px the
 * learner navigation is a fixed sidebar; the learner can show it with
 * labels ("expanded"), as icons only ("collapsed"), or slide it out of
 * view ("hidden"). The state lives on <html data-learner-nav>, where
 * globals.css changes --filumire-sidebar-width, so every page that
 * reserves the sidebar's width (dashboard, learn) widens its content.
 * Below 1024px the navigation is the bottom bar and these controls are
 * not shown. The choice is a per-browser convenience only.
 */
export type LearnerNavState = "expanded" | "collapsed" | "hidden";

const STORAGE_KEY = "filumire.learnerNav";
const NAV_ID = "filumire-learner-nav";

function storedState(): LearnerNavState | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "expanded" || value === "collapsed" || value === "hidden" ? value : null;
  } catch {
    return null;
  }
}

function applyState(state: LearnerNavState, remember: boolean) {
  document.documentElement.dataset.learnerNav = state;
  if (!remember) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, state);
  } catch {
    // Private windows may refuse storage; the choice then lasts for this page only.
  }
}

const TEXT = {
  en: { collapse: "Collapse menu", expand: "Expand menu", hide: "Hide menu", show: "Show menu" },
  fr: { collapse: "Réduire le menu", expand: "Agrandir le menu", hide: "Masquer le menu", show: "Afficher le menu" },
};

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={direction === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

export const learnerNavId = NAV_ID;

/* Collapse/expand and hide, inside the sidebar. */
export function LearnerNavToggle({ language }: { language: "en" | "fr" }) {
  const t = TEXT[language];
  const [state, setState] = useState<LearnerNavState>("expanded");

  useEffect(() => {
    // Laptops (1024-1279px) start with icons only; wider screens with labels.
    const initial = storedState() ?? (window.innerWidth < 1280 ? "collapsed" : "expanded");
    applyState(initial, false);
    setState(initial);
    const sync = () => setState((document.documentElement.dataset.learnerNav as LearnerNavState) ?? "expanded");
    window.addEventListener("filumire:learner-nav", sync);
    return () => window.removeEventListener("filumire:learner-nav", sync);
  }, []);

  const change = (next: LearnerNavState) => {
    applyState(next, true);
    setState(next);
    window.dispatchEvent(new Event("filumire:learner-nav"));
  };

  const collapsed = state === "collapsed";

  return (
    <div className="filumireNavControls">
      <button
        type="button"
        className="filumireNavControl"
        aria-controls={NAV_ID}
        aria-expanded={!collapsed}
        aria-label={collapsed ? t.expand : t.collapse}
        title={collapsed ? t.expand : t.collapse}
        onClick={() => change(collapsed ? "expanded" : "collapsed")}
      >
        <Chevron direction={collapsed ? "right" : "left"} />
        <span className="filumireNavControlLabel">{collapsed ? t.expand : t.collapse}</span>
      </button>
      <button
        type="button"
        className="filumireNavControl"
        aria-controls={NAV_ID}
        aria-label={t.hide}
        title={t.hide}
        onClick={() => {
          change("hidden");
          // Keep keyboard focus on a control that stays visible.
          requestAnimationFrame(() => document.getElementById(`${NAV_ID}-reveal`)?.focus());
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5h2v14H4zM20 11H11.8l3.6-3.6L14 6l-6 6 6 6 1.4-1.4-3.6-3.6H20z" />
        </svg>
        <span className="filumireNavControlLabel">{t.hide}</span>
      </button>
    </div>
  );
}

/* Brings a hidden sidebar back; shown only while the sidebar is hidden. */
export function LearnerNavReveal({ language }: { language: "en" | "fr" }) {
  const t = TEXT[language];
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const sync = () => setHidden(document.documentElement.dataset.learnerNav === "hidden");
    sync();
    window.addEventListener("filumire:learner-nav", sync);
    return () => window.removeEventListener("filumire:learner-nav", sync);
  }, []);

  return (
    <button
      id={`${NAV_ID}-reveal`}
      type="button"
      className="filumireNavReveal"
      aria-controls={NAV_ID}
      aria-expanded={!hidden}
      hidden={!hidden}
      onClick={() => {
        applyState("expanded", true);
        window.dispatchEvent(new Event("filumire:learner-nav"));
        // After the slide-in (globals.css, 0.2s): a hidden sidebar cannot take focus.
        window.setTimeout(() => (
          document.querySelector<HTMLElement>(`#${NAV_ID} .filumireNavItemActive`) ??
          document.querySelector<HTMLElement>(`#${NAV_ID} .filumireNavItem`)
        )?.focus(), 250);
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z" />
      </svg>
      <span>{t.show}</span>
    </button>
  );
}
