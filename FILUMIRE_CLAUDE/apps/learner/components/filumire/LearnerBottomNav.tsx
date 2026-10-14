import Link from "next/link";
import { askFiluHref } from "../../services/dashboard-navigation";

export type LearnerNavItem =
  | "home"
  | "learning"
  | "progress"
  | "challenges"
  | "filu";

type LearnerBottomNavProps = {
  active: LearnerNavItem;
  language?: "en" | "fr";
  subjectId?: string | null;
  /*
   * "app" (default) is the bottom bar on mobile and tablet and becomes
   * a fixed sidebar from 1024px. "inline" stays a bar in the page flow
   * at every width (single flowing pages such as sign-in).
   */
  variant?: "app" | "inline";
};

function NavIcon({ name }: { name: string }) {
  return (
    <span className="filumireNavIcon" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        {name === "home" && <path d="M12 3 2 12h3v9h5.5v-6h3v6H19v-9h3z" />}
        {name === "learning" && (
          <path className="line" d="M12 6.5C10 5 7 4.5 3.2 4.5v13c3.8 0 6.8.5 8.8 2 2-1.5 5-2 8.8-2v-13C17 4.5 14 5 12 6.5zM12 6.5V19.5" />
        )}
        {name === "progress" && (
          <g>
            <rect x="3" y="14" width="5" height="7" rx="0.6" />
            <rect x="9.5" y="9" width="5" height="12" rx="0.6" />
            <rect x="16" y="3" width="5" height="18" rx="0.6" />
          </g>
        )}
        {name === "challenges" && (
          <g>
            <path d="M7 3h10v5.5a5 5 0 0 1-10 0z" />
            <path className="line" d="M7 5H3.5v1.5A3.5 3.5 0 0 0 7 10M17 5h3.5v1.5A3.5 3.5 0 0 1 17 10" />
            <rect x="10.8" y="13" width="2.4" height="5" />
            <rect x="7.5" y="18.2" width="9" height="2.8" rx="1.2" />
          </g>
        )}
        {name === "filu" && (
          <g>
            <circle cx="12" cy="3.8" r="1.7" />
            <rect x="11.2" y="5" width="1.6" height="3.2" />
            <rect x="1.5" y="12" width="2.6" height="5" rx="1.3" />
            <rect x="19.9" y="12" width="2.6" height="5" rx="1.3" />
            <rect x="3.8" y="8" width="16.4" height="13" rx="5.5" />
            <circle className="cut" cx="8.8" cy="14" r="1.6" />
            <circle className="cut" cx="15.2" cy="14" r="1.6" />
            <path className="cutline" d="M9.8 17.6c1.2 1.2 3.2 1.2 4.4 0" />
          </g>
        )}
      </svg>
    </span>
  );
}

export function LearnerBottomNav({
  active,
  language = "en",
  variant = "app",
  subjectId,
}: LearnerBottomNavProps) {
  const subjectQuery = subjectId ? `&subjectId=${encodeURIComponent(subjectId)}` : "";
  const items = [
    {
      key: "home" as const,
      label: language === "fr" ? "Accueil" : "Home",
      href: `/dashboard?lang=${language}`,
      icon: "home",
    },
    {
      key: "learning" as const,
      label:
        language === "fr"
          ? "Apprentissage"
          : "My Learning",
      href: `/dashboard?lang=${language}&view=learning${subjectQuery}`,
      icon: "learning",
    },
    {
      key: "progress" as const,
      label:
        language === "fr"
          ? "Progression"
          : "Progress",
      href: `/dashboard?lang=${language}&view=progress${subjectQuery}`,
      icon: "progress",
    },
    {
      key: "challenges" as const,
      label:
        language === "fr"
          ? "Défis"
          : "Challenges",
      href: `/dashboard?lang=${language}&view=challenges${subjectQuery}`,
      icon: "challenges",
    },
    {
      key: "filu" as const,
      label: language === "fr" ? "FILU" : "Ask FILU",
      href: askFiluHref(language, subjectId),
      icon: "filu",
    },
  ];

  return (
    <nav
      className={
        variant === "inline"
          ? "filumireBottomNav filumireBottomNavInline"
          : "filumireBottomNav"
      }
      aria-label={language === "fr" ? "Navigation de l’apprenant" : "Learner navigation"}
    >
      {/* Hidden on mobile and tablet; the sidebar's logo row from 1024px. */}
      <Link
        href={`/dashboard?lang=${language}`}
        className="filumireNavBrand"
        aria-label={language === "fr" ? "Accueil apprenant FILUMIRE" : "FILUMIRE learner home"}
      >
        <img src="/filumire-logo-white.svg" alt="FILUMIRE" />
      </Link>
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={
            active === item.key
              ? "filumireNavItem filumireNavItemActive"
              : "filumireNavItem"
          }
          aria-current={
            active === item.key ? "page" : undefined
          }
        >
          <NavIcon name={item.icon} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
