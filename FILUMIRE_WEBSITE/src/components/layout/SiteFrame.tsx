"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Every page shares the site header, main landmark and footer, except the
 * landing page (/ and /fr), which brings its own header and landscape band.
 */
export function SiteFrame({ header, footer, children }: { header: ReactNode; footer: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/" || pathname === "/fr") return <>{children}</>;
  return <>{header}<main id="main-content" tabIndex={-1} className="fs-main">{children}</main>{footer}</>;
}
