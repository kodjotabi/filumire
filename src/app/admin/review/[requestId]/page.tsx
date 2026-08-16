"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useFilumireStore } from "@/lib/store/filumire-store";
import { FilumireIdBadge } from "@/components/identity/FilumireIdBadge";
import { StatusBadge } from "@/components/verification/StatusBadge";
import { EvidenceList } from "@/components/claims/EvidenceList";
import { VerificationTimeline } from "@/components/verification/VerificationTimeline";
import { formatDate, presenceKindLabel } from "@/lib/utils/filumire-id";

export default function AdminReviewPage() {
  const params = useParams<{ requestId: string }>();
  const router = useRouter();
  const verificationRequests = useFilumireStore((s) => s.verificationRequests);
  const identities = useFilumireStore((s) => s.identities);
  const claims = useFilumireStore((s) => s.claims);
  const evidence = useFilumireStore((s) => s.evidence);
  const presenceChannels = useFilumireStore((s) => s.presenceChannels);
  const getEventsForIdentity = useFilumireStore((s) => s.getEventsForIdentity);
  const approveRequest = useFilumireStore((s) => s.approveRequest);
  const rejectRequest = useFilumireStore((s) => s.rejectRequest);

  const [note, setNote] = useState("");

  const request = verificationRequests.find((r) => r.id === params.requestId);

  if (!request) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-red-800">Review request not found.</p>
        <Link href="/admin" className="mt-4 inline-block text-blue-600 hover:underline">
          Back to admin
        </Link>
      </div>
    );
  }

  const identity = identities.find((i) => i.filumireId === request.identityId);
  const claim =
    request.targetType === "claim"
      ? claims.find((c) => c.id === request.targetId)
      : undefined;
  const channel =
    request.targetType === "presence"
      ? presenceChannels.find((p) => p.id === request.targetId)
      : undefined;

  const relatedEvidence = evidence.filter((e) => {
    if (request.targetType === "claim") return e.claimId === request.targetId;
    if (request.targetType === "identity") return e.identityId === request.targetId;
    return false;
  });

  const history = identity
    ? getEventsForIdentity(identity.filumireId).slice(0, 5)
    : [];

  const handleApprove = () => {
    approveRequest(request.id, note || "Approved by admin");
    router.push("/admin");
  };

  const handleReject = () => {
    rejectRequest(request.id, note || "Rejected by admin");
    router.push("/admin");
  };

  return (
    <div>
      <Link href="/admin" className="text-sm text-blue-600 hover:underline">
        ← Back to admin queue
      </Link>

      <div className="mt-4 mb-8">
        <p className="text-sm uppercase tracking-wide text-slate-500">Review</p>
        <h1 className="text-2xl font-bold">{request.summary}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Submitted {formatDate(request.submittedAt)} · {request.targetType}
        </p>
      </div>

      {identity && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <div>
            <p className="font-medium">{identity.displayName}</p>
            <p className="text-sm capitalize text-slate-500">{identity.type}</p>
          </div>
          <FilumireIdBadge filumireId={identity.filumireId} />
          <StatusBadge status={identity.verificationStatus} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 font-semibold">Subject details</h2>
          {request.targetType === "identity" && identity && (
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-slate-500">Legal name</dt>
                <dd>{identity.legalName}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Description</dt>
                <dd>{identity.description ?? "—"}</dd>
              </div>
            </dl>
          )}
          {claim && (
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-slate-500">Claim</dt>
                <dd className="font-medium">{claim.statement}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Type</dt>
                <dd>{claim.claimType}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd>
                  <StatusBadge status={claim.status} />
                </dd>
              </div>
            </dl>
          )}
          {channel && (
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-slate-500">Channel</dt>
                <dd>{presenceKindLabel(channel.kind)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Value</dt>
                <dd className="font-medium">{channel.value}</dd>
              </div>
            </dl>
          )}

          {relatedEvidence.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold">Evidence</h3>
              <EvidenceList items={relatedEvidence} />
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 font-semibold">Decision</h2>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Review note (optional)"
            rows={4}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          {request.status === "pending_review" ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleApprove}
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              This request has already been {request.status}.
            </p>
          )}

          <div className="mt-8">
            <h3 className="mb-3 text-sm font-semibold">Recent verification history</h3>
            <VerificationTimeline events={history} />
          </div>
        </section>
      </div>
    </div>
  );
}
