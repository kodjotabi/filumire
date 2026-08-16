import { Suspense } from "react";
import { MatchContent } from "./MatchContent";

export default function MatchPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Loading match...
        </div>
      }
    >
      <MatchContent />
    </Suspense>
  );
}
