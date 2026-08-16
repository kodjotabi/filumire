"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFilumireStore } from "@/lib/store/filumire-store";
import { FilumireIdBadge } from "@/components/identity/FilumireIdBadge";
import { StatusBadge } from "@/components/verification/StatusBadge";

export function ActiveIdentityBar() {
  const pathname = usePathname();
  const getIdentity = useFilumireStore((s) => s.getIdentity);

  const match = pathname.match(/^\/identity\/([^/]+)/);
  const routeId = match?.[1];
  if (!routeId || routeId === "new") return null;

  const identity = getIdentity(routeId);
  if (!identity) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-blue-800">Active identity:</span>
        <span className="font-medium text-blue-950">{identity.displayName}</span>
        <FilumireIdBadge filumireId={identity.filumireId} />
        <StatusBadge status={identity.verificationStatus} />
      </div>
      <Link
        href={`/identity/${identity.filumireId}/monitor`}
        className="text-sm font-medium text-blue-700 hover:underline"
      >
        Open monitor
      </Link>
    </div>
  );
}
