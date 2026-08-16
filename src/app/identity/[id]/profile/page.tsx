"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useFilumireStore } from "@/lib/store/filumire-store";
import { StepNav } from "@/components/layout/StepNav";
import { FilumireIdBadge } from "@/components/identity/FilumireIdBadge";
import { ProfilePreview } from "@/components/profile/ProfilePreview";
import { StatusBadge } from "@/components/verification/StatusBadge";
import type { RelationshipKind } from "@/lib/types";
import { relationshipLabel } from "@/lib/utils/filumire-id";

export default function ProfilePage() {
  const params = useParams<{ id: string }>();
  const getIdentity = useFilumireStore((s) => s.getIdentity);
  const getClaimsForIdentity = useFilumireStore((s) => s.getClaimsForIdentity);
  const getPresenceForIdentity = useFilumireStore((s) => s.getPresenceForIdentity);
  const updateClaimVisibility = useFilumireStore((s) => s.updateClaimVisibility);
  const updatePresenceVisibility = useFilumireStore((s) => s.updatePresenceVisibility);
  const addRelationship = useFilumireStore((s) => s.addRelationship);
  const identities = useFilumireStore((s) => s.identities);
  const setActiveIdentity = useFilumireStore((s) => s.setActiveIdentity);

  const identity = getIdentity(params.id);
  const claims = getClaimsForIdentity(params.id);
  const presence = getPresenceForIdentity(params.id);

  const [relTarget, setRelTarget] = useState("");
  const [relKind, setRelKind] = useState<RelationshipKind>("affiliated_with");

  useEffect(() => {
    if (identity) setActiveIdentity(identity.filumireId);
  }, [identity, setActiveIdentity]);

  if (!identity) return <p>Identity not found.</p>;

  const otherIdentities = identities.filter(
    (i) => i.filumireId !== identity.filumireId,
  );

  return (
    <div>
      <p className="text-sm uppercase tracking-wide text-slate-500">Step 6 · Build profile</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Public profile builder</h1>
        <FilumireIdBadge filumireId={identity.filumireId} />
      </div>

      <StepNav identity={identity} />

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 font-semibold">Claims visibility</h2>
            <ul className="space-y-3">
              {claims.map((claim) => (
                <li
                  key={claim.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{claim.statement}</p>
                    <StatusBadge status={claim.status} />
                  </div>
                  <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={claim.visibility === "public"}
                      disabled={claim.status !== "verified"}
                      onChange={(e) =>
                        updateClaimVisibility(
                          claim.id,
                          e.target.checked ? "public" : "private",
                        )
                      }
                    />
                    Public
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 font-semibold">Presence visibility</h2>
            <ul className="space-y-3">
              {presence.map((channel) => (
                <li
                  key={channel.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3 text-sm"
                >
                  <span>{channel.value}</span>
                  <label className="flex items-center gap-2 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={channel.isPublic}
                      disabled={!channel.verified}
                      onChange={(e) =>
                        updatePresenceVisibility(channel.id, e.target.checked)
                      }
                    />
                    Public
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 font-semibold">Link relationship</h2>
            <div className="flex flex-wrap gap-2">
              <select
                value={relKind}
                onChange={(e) => setRelKind(e.target.value as RelationshipKind)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {(
                  [
                    "employed_by",
                    "represents",
                    "owns",
                    "affiliated_with",
                    "verified_connection",
                  ] as RelationshipKind[]
                ).map((k) => (
                  <option key={k} value={k}>
                    {relationshipLabel(k)}
                  </option>
                ))}
              </select>
              <select
                value={relTarget}
                onChange={(e) => setRelTarget(e.target.value)}
                className="min-w-[200px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select identity...</option>
                {otherIdentities.map((i) => (
                  <option key={i.filumireId} value={i.filumireId}>
                    {i.displayName} ({i.filumireId})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  if (!relTarget) return;
                  addRelationship(identity.filumireId, relTarget, relKind);
                  setRelTarget("");
                }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
              >
                Link
              </button>
            </div>
          </section>
        </div>

        <ProfilePreview identity={identity} />
      </div>

      <div className="mt-8">
        <Link
          href={`/identity/${identity.filumireId}/share`}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Continue to share →
        </Link>
      </div>
    </div>
  );
}
