"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

// Investor demo only: a slim strip on every screen saying what this is.
export function DemoBanner() {
  const pathname = usePathname();
  const lang = useSearchParams().get("lang");
  const [french, setFrench] = useState(false);
  // Follows the screen's language once mounted (the server renders English).
  useEffect(() => { setFrench(lang === "fr" || (!lang && document.querySelector("main")?.getAttribute("lang") === "fr")); }, [pathname, lang]);
  if (pathname === "/demo") return null;
  return <div className="filumireDemoBanner" role="note">
    <span>{french ? "Démonstration hors ligne · apprenants fictifs · la progression reste sur cet ordinateur" : "Offline demo · fictional learners · progress stays on this laptop"}</span>
    <a href="/demo">{french ? "Changer d’apprenant" : "Switch learner"}</a>
    <style jsx>{`
      .filumireDemoBanner { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 4px 14px; padding: 6px 12px; background: #fff4d6; color: #5a4300; font-size: 13px; line-height: 1.4; text-align: center; border-bottom: 1px solid #f0d58a; }
      a { color: #003b71; font-weight: 700; text-decoration: underline; padding: 6px 0; }
    `}</style>
  </div>;
}
