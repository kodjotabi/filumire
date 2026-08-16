"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { useFilumireStore } from "@/lib/store/filumire-store";
import { StepNav } from "@/components/layout/StepNav";
import { FilumireIdBadge } from "@/components/identity/FilumireIdBadge";
import { StatusBadge } from "@/components/verification/StatusBadge";
import { VerificationTimeline } from "@/components/verification/VerificationTimeline";

export default function MonitorPage() {
  const params = useParams<{ id: string }>();
  const getIdentity = useFilumireStore((s) => s.getIdentity);
  const getEventsForIdentity = useFilumireStore((s) => s.getEventsForIdentity);
  const getClaimsForIdentity = useFilumireStore((s) => s.getClaimsForIdentity);
  const getPresenceForIdentity = useFilumireStore((s) => s.getPresenceForIdentity);
  const getPendingRequests = useFilumireStore((s) => s.getPendingRequests);
  const setActiveIdentity = useFilumireStore((s) => s.setActiveIdentity);

  const identity = getIdentity(params.id);

  useEffect(() => {
    if (identity) setActiveIdentity(identity.filumireId);
  }, [identity, setActiveIdentity]);

  if (!identity) return <p>Identity not found.</p>;

  const events = getEventsForIdentity(identity.filumireId);
  const pendingClaims = getClaimsForIdentity(identity.filumireId).filter(
    (c) => c.status === "pending",
  );
  const pendingPresence = getPresenceForIdentity(identity.filumireId).filter(
    (p) => p.status === "pending",
  );
  const pendingRequests = getPendingRequests().filter(
    (r) => r.identityId === identity.filumireId,
  );

  return (
    <div>
      <p className="text-sm uppercase tracking-wide text-slate-500">Step 8 · Monitor</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Verification dashboard</h1>
        <FilumireIdBadge filumireId={identity.filumireId} />
        <StatusBadge status={identity.verificationStatus} />
      </div>

      <StepNav identity={identity} />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Identity status</p>
          <div className="mt-2">
            <StatusBadge status={identity.verificationStatus} />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Pending claims</p>
          <p className="mt-2 text-2xl font-bold">{pendingClaims.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Admin queue items</p>
          <p className="mt-2 text-2xl font-bold">{pendingRequests.length}</p>
        </div>
      </div>

      {(identity.verificationStatus === "pending" ||
        pendingClaims.length > 0 ||
        pendingPresence.length > 0) && (
        <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-medium text-amber-900">Action required</p>
          <ul className="mt-2 text-sm text-amber-800">
            {identity.verificationStatus === "pending" && (
              <li>• Identity verification awaiting admin review</li>
            )}
            {pendingClaims.length > 0 && (
              <li>• {pendingClaims.length} claim(s) pending review</li>
            )}
            {pendingPresence.length > 0 && (
              <li>• {pendingPresence.length} presence channel(s) pending</li>
            )}
          </ul>
          <Link
            href="/admin"
            className="mt-3 inline-block text-sm font-medium text-blue-700 hover:underline"
          >
            Open admin review →
          </Link>
        </div>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold">Verification history</h2>
        <VerificationTimeline events={events} />
      </section>
    </div>
  );
}
