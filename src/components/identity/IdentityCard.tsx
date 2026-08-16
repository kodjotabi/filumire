import Link from "next/link";
import type { Claim, FilumireIdentity } from "@/lib/types";
import { FilumireIdBadge } from "@/components/identity/FilumireIdBadge";
import { StatusBadge } from "@/components/verification/StatusBadge";

interface IdentityCardProps {
  identity: FilumireIdentity;
  topClaims?: Claim[];
  matchReasons?: string[];
  score?: number;
  href?: string;
}

export function IdentityCard({
  identity,
  topClaims = [],
  matchReasons,
  score,
  href,
}: IdentityCardProps) {
  const content = (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs uppercase tracking-wide text-slate-600">
              {identity.type}
            </span>
            <StatusBadge status={identity.verificationStatus} />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">{identity.displayName}</h3>
          {identity.legalName && identity.legalName !== identity.displayName && (
            <p className="text-sm text-slate-500">{identity.legalName}</p>
          )}
        </div>
        <FilumireIdBadge filumireId={identity.filumireId} />
      </div>

      {identity.description && (
        <p className="mb-3 text-sm text-slate-600">{identity.description}</p>
      )}

      {topClaims.length > 0 && (
        <ul className="mb-3 space-y-1 text-sm text-slate-600">
          {topClaims.map((claim) => (
            <li key={claim.id} className="flex items-center gap-2">
              <span className="text-blue-600">•</span>
              {claim.statement}
            </li>
          ))}
        </ul>
      )}

      {matchReasons && matchReasons.length > 0 && (
        <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
          {score !== undefined && (
            <p className="mb-1 font-medium">Match score: {score}</p>
          )}
          <ul className="space-y-1">
            {matchReasons.map((reason) => (
              <li key={reason}>• {reason}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
