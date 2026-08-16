"use client";

import type { PresenceChannel } from "@/lib/types";
import { presenceKindLabel } from "@/lib/utils/filumire-id";
import { StatusBadge } from "@/components/verification/StatusBadge";
import { canSubmitForReview } from "@/lib/services/verification";

interface PresenceChannelRowProps {
  channel: PresenceChannel;
  onVerify?: (id: string) => void;
  onTogglePublic?: (id: string, isPublic: boolean) => void;
  showActions?: boolean;
}

export function PresenceChannelRow({
  channel,
  onVerify,
  onTogglePublic,
  showActions = false,
}: PresenceChannelRowProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {presenceKindLabel(channel.kind)}
          </p>
          <p className="font-medium text-slate-900">{channel.value}</p>
          {channel.lastCheckedAt && (
            <p className="text-xs text-slate-500">
              Last checked: {new Date(channel.lastCheckedAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={channel.status} />
          {channel.verified && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
              Verified channel
            </span>
          )}
        </div>
      </div>

      {showActions && (
        <div className="mt-4 flex flex-wrap gap-2">
          {onVerify && canSubmitForReview(channel.status) && (
            <button
              type="button"
              onClick={() => onVerify(channel.id)}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Request verification
            </button>
          )}
          {onTogglePublic && channel.status === "verified" && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={channel.isPublic}
                onChange={(e) => onTogglePublic(channel.id, e.target.checked)}
              />
              Show on public profile
            </label>
          )}
        </div>
      )}
    </div>
  );
}
