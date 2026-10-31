import type { NextConfig } from "next";

/* Pages retired by the public website overhaul (27 Oct 2026) keep working through redirects, with query strings preserved. */
const MOVED: [string, string][] = [
  ["/for-families", "/parents"],
  ["/for-schools", "/schools"],
  ["/curriculum", "/subjects"],
  ["/access", "/contact"],
  ["/partners", "/about#work-with-us"],
];

/* /pricing is a page of its own, not a redirect: plans once payments are live, subscription information without prices until then (src/lib/pages.tsx; review fix 31 Oct 2026). */

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
