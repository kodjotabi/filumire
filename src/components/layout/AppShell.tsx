"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFilumireStore } from "@/lib/store/filumire-store";
import { ActiveIdentityBar } from "@/components/layout/ActiveIdentityBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pendingCount = useFilumireStore((s) => s.getPendingRequests().length);
  const resetDemo = useFilumireStore((s) => s.resetDemo);
  const isPublic = pathname.startsWith("/v/");

  if (isPublic) {
    return <div className="min-h-screen bg-white">{children}</div>;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-filumire-navy text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold">
              FM
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight">FILUMIRE</div>
              <div className="text-xs text-slate-300">Trust & verification network</div>
            </div>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/"
              className="rounded-md px-3 py-1.5 hover:bg-white/10"
            >
              Search
            </Link>
            <Link
              href="/admin"
              className="relative rounded-md px-3 py-1.5 hover:bg-white/10"
            >
              Admin
              {pendingCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-xs font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={resetDemo}
              className="rounded-md border border-white/20 px-3 py-1.5 text-slate-200 hover:bg-white/10"
            >
              Reset demo
            </button>
          </nav>
        </div>
        <div className="border-t border-white/10 bg-slate-900/50 px-4 py-2 text-center text-xs text-slate-300">
          Phase 0 clickable prototype — mock data, simulated verification
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <ActiveIdentityBar />
        {children}
      </main>
    </div>
  );
}
