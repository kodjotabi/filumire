"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useFilumireStore } from "@/lib/store/filumire-store";
import { StepNav } from "@/components/layout/StepNav";
import { FilumireIdBadge } from "@/components/identity/FilumireIdBadge";
import { StatusBadge } from "@/components/verification/StatusBadge";
import { EvidenceList } from "@/components/claims/EvidenceList";

export default function VerifyIdentityPage() {
  const params = useParams<{ id: string }>();
  const getIdentity = useFilumireStore((s) => s.getIdentity);
  const getEvidenceForIdentity = useFilumireStore((s) => s.getEvidenceForIdentity);
  const submitIdentityVerification = useFilumireStore((s) => s.submitIdentityVerification);
  const setActiveIdentity = useFilumireStore((s) => s.setActiveIdentity);

  const identity = getIdentity(params.id);
  const [evidenceLabel, setEvidenceLabel] = useState(
    identity?.type === "business"
      ? "Companies House registration document"
      : "Government-issued photo ID",
  );
  const [fileName, setFileName] = useState("verification-document.pdf");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (identity) setActiveIdentity(identity.filumireId);
  }, [identity, setActiveIdentity]);

  if (!identity) {
    return <p>Identity not found.</p>;
  }

  const evidence = getEvidenceForIdentity(identity.filumireId);
  const canSubmit =
    identity.verificationStatus === "unverified" ||
    identity.verificationStatus === "rejected";

  const handleSubmit = () => {
    submitIdentityVerification(identity.filumireId, evidenceLabel, fileName);
    setSubmitted(true);
  };

  return (
    <div>
      <p className="text-sm uppercase tracking-wide text-slate-500">Step 3 · Verify identity</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{identity.displayName}</h1>
        <FilumireIdBadge filumireId={identity.filumireId} />
        <StatusBadge status={identity.verificationStatus} />
      </div>

      <StepNav identity={identity} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 font-semibold">Identity details</h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Type</dt>
              <dd className="capitalize">{identity.type}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Legal name</dt>
              <dd>{identity.legalName ?? "—"}</dd>
            </div>
            {identity.personDetails?.occupation && (
              <div>
                <dt className="text-slate-500">Occupation</dt>
                <dd>{identity.personDetails.occupation}</dd>
              </div>
            )}
            {identity.businessDetails?.registrationNumber && (
              <div>
                <dt className="text-slate-500">Registration number</dt>
                <dd>{identity.businessDetails.registrationNumber}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 font-semibold">Submit identity evidence</h2>
          <p className="mb-4 text-sm text-slate-600">
            Simulated upload — no real documents are stored in Phase 0.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Evidence label</label>
              <input
                value={evidenceLabel}
                onChange={(e) => setEvidenceLabel(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Simulated file name</label>
              <input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            {canSubmit && (
              <button
                type="button"
                onClick={handleSubmit}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Submit for admin review
              </button>
            )}
            {submitted && (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                Submitted. Status is now pending — approve in Admin to complete verification.
              </p>
            )}
            {!canSubmit && (
              <p className="text-sm text-slate-500">
                Identity is {identity.verificationStatus}. Check Monitor for history.
              </p>
            )}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-semibold">Existing evidence</h2>
        <EvidenceList items={evidence} />
      </section>

      <div className="mt-8">
        <Link
          href={`/identity/${identity.filumireId}/claims`}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Continue to verify claims →
        </Link>
      </div>
    </div>
  );
}
