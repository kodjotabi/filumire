"use client";

import { useEffect } from "react";
import { useFilumireStore } from "@/lib/store/filumire-store";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const hydrate = useFilumireStore((s) => s.hydrate);
  const hydrated = useFilumireStore((s) => s.hydrated);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Loading FILUMIRE demo...
      </div>
    );
  }

  return <>{children}</>;
}
