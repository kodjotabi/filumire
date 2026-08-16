"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useFilumireStore } from "@/lib/store/filumire-store";
import { StepNav } from "@/components/layout/StepNav";
import { FilumireIdBadge } from "@/components/identity/FilumireIdBadge";
import { StatusBadge } from "@/components/verification/StatusBadge";
import { EvidenceList } from "@/components/claims/EvidenceList";
import { RelationshipList } from "@/components/relationships/RelationshipList";
import { canSubmitForReview } from "@/lib/services/verification";
import type { EvidenceKind } from "@/lib/types";

export default function ClaimsPage() {
  const params = useParams<{ id: string }>();
  const getIdentity = useFilumireStore((s) => s.getIdentity);
  const getClaimsForIdentity = useFilumireStore((s) => s.getClaimsForIdentity);
  const getEvidenceForClaim = useFilumireStore((s) => s.getEvidenceForClaim);
  const addClaim = useFilumireStore((s) => s.addClaim);
  const submitClaimForReview = useFilumireStore((s) => s.submitClaimForReview);
  const setActiveIdentity = useFilumireStore((s) => s.setActiveIdentity);

  const identity = getIdentity(params.id);
  const claims = getClaimsForIdentity(params.id);

  const [statement, setStatement] = useState("");
  const [claimType, setClaimType] = useState("role");
  const [evidenceLabel, setEvidenceLabel] = useState("Supporting reference");

  useEffect(() => {
    if (identity) setActiveIdentity(identity.filumireId);
  }, [identity, setActiveIdentity]);

  if (!identity) return <p>Identity not found.</p>;

  const handleAddClaim = () => {
    if (!statement.trim()) return;
    addClaim(identity.filumireId, statement.trim(), claimType, {
      kind: "document" as EvidenceKind,
      label: evidenceLabel,
      fileName: "claim-evidence.pdf",
    });
    setStatement("");
  };

  return (
    <div>
      <p className="text-sm uppercase tracking-wide text-slate-500">Step 4 · Verify claims</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Claims & evidence</h1>
        <FilumireIdBadge filumireId={identity.filumireId} />
      </div>

      <StepNav identity={identity} />

      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-semibold">Add a claim</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <input
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            placeholder="Claim statement"
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
          <select
            value={claimType}
            onChange={(e) => setClaimType(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="role">Role</option>
            <option value="qualification">Qualification</option>
            <option value="registration">Registration</option>
            <option value="affiliation">Affiliation</option>
          </select>
          <input
            value={evidenceLabel}
            onChange={(e) => setEvidenceLabel(e.target.value)}
            placeholder="Evidence label"
            className="rounded-lg border border-slate-300 px-3 py-2 md:col-span-2"
          />
        </div>
        <button
          type="button"
          onClick={handleAddClaim}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add claim with evidence
        </button>
      </div>

      <div className="space-y-4">
        {claims.map((claim) => (
          <div
            key={claim.id}
            className="rounded-xl border border-slate-200 bg-white p-6"
          >
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase text-slate-500">{claim.claimType}</p>
                <h3 className="text-lg font-medium">{claim.statement}</h3>
              </div>
              <StatusBadge status={claim.status} />
            </div>
            <EvidenceList items={getEvidenceForClaim(claim.id)} />
            {canSubmitForReview(claim.status) && (
              <button
                type="button"
                onClick={() => submitClaimForReview(claim.id)}
                className="mt-4 rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
              >
                Submit for review
              </button>
            )}
          </div>
        ))}
      </div>

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-semibold">Related identities</h2>
        <RelationshipList identity={identity} />
      </section>

      <div className="mt-8">
        <Link
          href={`/identity/${identity.filumireId}/presence`}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Continue to assess presence →
        </Link>
      </div>
    </div>
  );
}
