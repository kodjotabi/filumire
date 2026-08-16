"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { FilumireIdentity } from "@/lib/types";

const STEPS = [
  { label: "Verify identity", segment: "verify" },
  { label: "Verify claims", segment: "claims" },
  { label: "Assess presence", segment: "presence" },
  { label: "Build profile", segment: "profile" },
  { label: "Share", segment: "share" },
  { label: "Monitor", segment: "monitor" },
];

export function StepNav({ identity }: { identity: FilumireIdentity }) {
  const pathname = usePathname();
  const base = `/identity/${identity.filumireId}`;

  return (
    <div className="mb-8 overflow-x-auto">
      <div className="flex min-w-max gap-2">
        {STEPS.map((step, index) => {
          const href = `${base}/${step.segment}`;
          const active = pathname.includes(`/${step.segment}`);
          return (
            <Link
              key={step.segment}
              href={href}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                active
                  ? "border-blue-600 bg-blue-50 text-blue-800"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold">
                {index + 1}
              </span>
              {step.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
