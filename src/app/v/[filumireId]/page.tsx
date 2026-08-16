"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useFilumireStore } from "@/lib/store/filumire-store";
import { ProfilePreview } from "@/components/profile/ProfilePreview";
import { QRVerificationCard } from "@/components/share/QRVerificationCard";

export default function PublicProfilePage() {
  const params = useParams<{ filumireId: string }>();
  const getIdentity = useFilumireStore((s) => s.getIdentity);

  const identity = getIdentity(params.filumireId);

  if (!identity) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-slate-900">Profile not found</h1>
          <p className="mt-2 text-slate-600">
            No FILUMIRE identity matches {params.filumireId}
          </p>
          <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">
            Search the network
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-xs font-bold text-white">
              FM
            </div>
            <span className="font-semibold text-slate-900">FILUMIRE Verification</span>
          </div>
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            Search network
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <ProfilePreview identity={identity} />
        <div className="mt-8">
          <QRVerificationCard
            filumireId={identity.filumireId}
            displayName={identity.displayName}
          />
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">
          Public verification profile · Phase 0 prototype
        </p>
      </main>
    </div>
  );
}
