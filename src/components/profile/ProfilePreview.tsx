"use client";

import { useFilumireStore } from "@/lib/store/filumire-store";
import type { FilumireIdentity } from "@/lib/types";
import { FilumireIdBadge } from "@/components/identity/FilumireIdBadge";
import { StatusBadge } from "@/components/verification/StatusBadge";
import { RelationshipList } from "@/components/relationships/RelationshipList";
import { presenceKindLabel } from "@/lib/utils/filumire-id";

export function ProfilePreview({ identity }: { identity: FilumireIdentity }) {
  const getClaimsForIdentity = useFilumireStore((s) => s.getClaimsForIdentity);
  const getPresenceForIdentity = useFilumireStore((s) => s.getPresenceForIdentity);
  const claims = getClaimsForIdentity(identity.filumireId);
  const presence = getPresenceForIdentity(identity.filumireId);

  const publicClaims = claims.filter(
    (c) => c.visibility === "public" && c.status === "verified",
  );
  const publicPresence = presence.filter((p) => p.isPublic && p.verified);
  const verifiedCount = presence.filter((p) => p.verified).length;

  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-gradient-to-b from-white to-slate-50 p-6">
      <div className="mb-6 border-b border-slate-200 pb-4">
        <p className="text-xs uppercase tracking-widest text-slate-500">
          Public verification profile
        </p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">
          {identity.displayName}
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <FilumireIdBadge filumireId={identity.filumireId} />
          <StatusBadge status={identity.verificationStatus} />
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600">
            {identity.type}
          </span>
        </div>
      </div>

      {identity.description && (
        <p className="mb-6 text-slate-600">{identity.description}</p>
      )}

      <section className="mb-6">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Verified claims
        </h3>
        {publicClaims.length === 0 ? (
          <p className="text-sm text-slate-500">No public verified claims yet.</p>
        ) : (
          <ul className="space-y-2">
            {publicClaims.map((claim) => (
              <li
                key={claim.id}
                className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm"
              >
                {claim.statement}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-6">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Verified presence ({verifiedCount} channels)
        </h3>
        {publicPresence.length === 0 ? (
          <p className="text-sm text-slate-500">No public presence channels yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {publicPresence.map((channel) => (
              <li key={channel.id} className="text-slate-700">
                <span className="font-medium">
                  {presenceKindLabel(channel.kind)}:
                </span>{" "}
                {channel.value}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Relationships
        </h3>
        <RelationshipList identity={identity} />
      </section>
    </div>
  );
}
