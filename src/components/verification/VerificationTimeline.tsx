"use client";

import type { VerificationEvent } from "@/lib/types";
import { formatDate } from "@/lib/utils/filumire-id";
import { StatusBadge } from "@/components/verification/StatusBadge";

export function VerificationTimeline({ events }: { events: VerificationEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
        No verification events yet.
      </div>
    );
  }

  return (
    <ol className="space-y-4">
      {events.map((event) => (
        <li
          key={event.id}
          className="relative rounded-xl border border-slate-200 bg-white p-4 pl-8"
        >
          <span className="absolute left-3 top-5 h-2 w-2 rounded-full bg-blue-600" />
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium text-slate-900">{event.action}</p>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {event.actor} · {formatDate(event.timestamp)}
              </p>
            </div>
            {event.newStatus && <StatusBadge status={event.newStatus} />}
          </div>
          {event.note && <p className="mt-2 text-sm text-slate-600">{event.note}</p>}
          {event.previousStatus && event.newStatus && (
            <p className="mt-1 text-xs text-slate-500">
              {event.previousStatus} → {event.newStatus}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
