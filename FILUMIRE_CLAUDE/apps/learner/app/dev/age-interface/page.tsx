import { notFound } from "next/navigation";

import { AgeInterfacePreview } from "./AgeInterfacePreview";

/*
 * Development-only gallery of the age-band feedback and the hidden
 * Basic 7-9 dashboard panel, with sample data (no learner data, no
 * engine calls). Not available in production builds.
 */
export default function AgeInterfacePreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <AgeInterfacePreview />;
}
