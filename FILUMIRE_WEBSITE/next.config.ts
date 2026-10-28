import type { NextConfig } from "next";

/* Pages retired by the public website overhaul (27 Oct 2026) keep working through redirects, with query strings preserved. */
const MOVED: [string, string][] = [
  ["/for-families", "/parents"],
  ["/for-schools", "/schools"],
  ["/curriculum", "/subjects"],
  ["/access", "/contact"],
  ["/partners", "/about#work-with-us"],
];

/* Until payments are live (same flag as src/lib/payments.ts), the learner app's pricing links land on family support instead of a 404 (owner decision, 28 Oct 2026). */
if (process.env.NEXT_PUBLIC_FILUMIRE_PAYMENTS_LIVE !== "true") {
  MOVED.push(["/pricing", "/contact?inquiry=family"]);
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return MOVED.flatMap(([from, to]) => [
      { source: from, destination: to, permanent: false },
      { source: "/fr" + from, destination: "/fr" + to, permanent: false },
    ]);
  },
};

export default nextConfig;
