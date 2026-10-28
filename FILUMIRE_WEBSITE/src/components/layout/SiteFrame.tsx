import type { ReactNode } from "react";

/** One frame for every public page: shared header, main landmark and footer. */
export function SiteFrame({ header, footer, children }: { header: ReactNode; footer: ReactNode; children: ReactNode }) {
  return <>{header}<main id="main-content" tabIndex={-1} className="fs-main">{children}</main>{footer}</>;
}
