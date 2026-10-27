"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isInternationalPath } from "@/lib/international";

/** International pages bring their own header and footer; country pages keep the Ghana site navigation. */
export function SiteFrame({ header, footer, children }: { header: ReactNode; footer: ReactNode; children: ReactNode }) {
  if (isInternationalPath(usePathname())) return <>{children}</>;
  return <>{header}<main id="main-content" tabIndex={-1} style={{ flex: "1 0 auto" }}>{children}</main>{footer}</>;
}
