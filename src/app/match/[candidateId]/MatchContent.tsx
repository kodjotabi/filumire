"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useFilumireStore } from "@/lib/store/filumire-store";
import { searchIdentities, getMatchStrength } from "@/lib/services/search";
import { IdentityCard } from "@/components/identity/IdentityCard";
import { FilumireIdBadge } from "@/components/identity/FilumireIdBadge";

export function MatchContent() {
  const params = useParams<{ candidateId: string }>();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";

  const identities = useFilumireStore((s) => s.identities);
  const claims = useFilumireStore((s) => s.claims);
  const setActiveIdentity = useFilumireStore((s) => s.setActiveIdentity);

  const candidate = identities.find((i) => i.filumireId === params.candidateId);
  const match = candidate
    ? searchIdentities(identities, claims, query || candidate.displayName).find(
        (r) => r.identity.filumireId === params.candidateId,
      )
    : undefined;

  if (!candidate) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-red-800">Identity not found.</p>
        <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">
          Back to search
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← Back to search
      </Link>

      <div className="mt-4 mb-8">
        <p className="text-sm uppercase tracking-wide text-slate-500">Step 2 · Match</p>
        <h1 className="text-2xl font-bold text-slate-900">Confirm identity match</h1>
        <p className="mt-2 text-slate-600">
          Review the candidate match before starting verification.
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <p className="font-medium text-blue-900">
          {match ? getMatchStrength(match.score) : "Candidate selected"}
        </p>
        {query && (
          <p className="text-sm text-blue-800">Search query: &quot;{query}&quot;</p>
        )}
        {match?.matchReasons && (
          <ul className="mt-2 text-sm text-blue-900">
            {match.matchReasons.map((reason) => (
              <li key={reason}>• {reason}</li>
            ))}
          </ul>
        )}
      </div>

      <IdentityCard identity={candidate} topClaims={match?.topClaims} />

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-2 font-semibold">Persistent FILUMIRE ID</h2>
        <FilumireIdBadge filumireId={candidate.filumireId} />
        <p className="mt-2 text-sm text-slate-600">
          This ID persists across the network and appears on the public verification profile.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={`/identity/${candidate.filumireId}/verify`}
          onClick={() => setActiveIdentity(candidate.filumireId)}
          className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
        >
          Confirm match & verify identity
        </Link>
        <Link
          href="/identity/new"
          className="rounded-lg border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
        >
          Create new identity instead
        </Link>
      </div>
    </div>
  );
}
