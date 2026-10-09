import Link from "next/link";

/*
 * The home and sign-in pages have one "Parent / Teacher Login"
 * entry that opens /adult. This switch lets the adult move between
 * the parent view and the teacher workspace. Each page still checks
 * the relationship on the server; the switch only navigates.
 */
export function AdultRoleSwitch({
  active,
}: {
  active: "parent" | "teacher";
}) {
  return (
    <nav className="adultRoleSwitch" aria-label="Choose your view">
      <Link
        href="/adult"
        className={active === "parent" ? "active" : undefined}
        aria-current={active === "parent" ? "page" : undefined}
      >
        Parent view
      </Link>
      <Link
        href="/teacher"
        className={active === "teacher" ? "active" : undefined}
        aria-current={active === "teacher" ? "page" : undefined}
      >
        Teacher workspace
      </Link>
    </nav>
  );
}
