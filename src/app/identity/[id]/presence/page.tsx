"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useFilumireStore } from "@/lib/store/filumire-store";
import { StepNav } from "@/components/layout/StepNav";
import { FilumireIdBadge } from "@/components/identity/FilumireIdBadge";
import { PresenceChannelRow } from "@/components/presence/PresenceChannelRow";
import type { PresenceKind } from "@/lib/types";

export default function PresencePage() {
  const params = useParams<{ id: string }>();
  const getIdentity = useFilumireStore((s) => s.getIdentity);
  const getPresenceForIdentity = useFilumireStore((s) => s.getPresenceForIdentity);
  const addPresenceChannel = useFilumireStore((s) => s.addPresenceChannel);
  const submitPresenceForReview = useFilumireStore((s) => s.submitPresenceForReview);
  const setActiveIdentity = useFilumireStore((s) => s.setActiveIdentity);

  const identity = getIdentity(params.id);
  const channels = getPresenceForIdentity(params.id);

  const [kind, setKind] = useState<PresenceKind>("website");
  const [value, setValue] = useState("");

  useEffect(() => {
    if (identity) setActiveIdentity(identity.filumireId);
  }, [identity, setActiveIdentity]);

  if (!identity) return <p>Identity not found.</p>;

  const verifiedCount = channels.filter((c) => c.verified).length;

  return (
    <div>
      <p className="text-sm uppercase tracking-wide text-slate-500">Step 5 · Assess presence</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Digital presence</h1>
        <FilumireIdBadge filumireId={identity.filumireId} />
      </div>
      <p className="mt-2 text-slate-600">
        Verified channels: {verifiedCount} of {channels.length} — no trust score, just verification status.
      </p>

      <StepNav identity={identity} />

      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-semibold">Add presence channel</h2>
        <div className="flex flex-wrap gap-3">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as PresenceKind)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="website">Website</option>
            <option value="email_domain">Email domain</option>
            <option value="phone">Phone</option>
            <option value="address">Address</option>
            <option value="social_handle">Social handle</option>
          </select>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Channel value"
            className="min-w-[240px] flex-1 rounded-lg border border-slate-300 px-3 py-2"
          />
          <button
            type="button"
            onClick={() => {
              if (!value.trim()) return;
              addPresenceChannel(identity.filumireId, kind, value.trim());
              setValue("");
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add channel
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {channels.map((channel) => (
          <PresenceChannelRow
            key={channel.id}
            channel={channel}
            showActions
            onVerify={submitPresenceForReview}
          />
        ))}
      </div>

      <div className="mt-8">
        <Link
          href={`/identity/${identity.filumireId}/profile`}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Continue to build profile →
        </Link>
      </div>
    </div>
  );
}
