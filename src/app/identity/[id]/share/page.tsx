"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { useFilumireStore } from "@/lib/store/filumire-store";
import { StepNav } from "@/components/layout/StepNav";
import { FilumireIdBadge } from "@/components/identity/FilumireIdBadge";
import { QRVerificationCard } from "@/components/share/QRVerificationCard";
import { ProfilePreview } from "@/components/profile/ProfilePreview";

export default function SharePage() {
  const params = useParams<{ id: string }>();
  const getIdentity = useFilumireStore((s) => s.getIdentity);
  const setActiveIdentity = useFilumireStore((s) => s.setActiveIdentity);

  const identity = getIdentity(params.id);

  useEffect(() => {
    if (identity) setActiveIdentity(identity.filumireId);
  }, [identity, setActiveIdentity]);

  if (!identity) return <p>Identity not found.</p>;

  return (
    <div>
      <p className="text-sm uppercase tracking-wide text-slate-500">Step 7 · Share</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Share verification profile</h1>
        <FilumireIdBadge filumireId={identity.filumireId} />
      </div>

      <StepNav identity={identity} />

      <div className="grid gap-8 lg:grid-cols-2">
        <QRVerificationCard
          filumireId={identity.filumireId}
          displayName={identity.displayName}
        />
        <div>
          <ProfilePreview identity={identity} />
          <Link
            href={`/v/${identity.filumireId}`}
            target="_blank"
            className="mt-4 inline-block text-sm text-blue-600 hover:underline"
          >
            Open public profile in new tab →
          </Link>
        </div>
      </div>

      <div className="mt-8">
        <Link
          href={`/identity/${identity.filumireId}/monitor`}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Continue to monitor →
        </Link>
      </div>
    </div>
  );
}
