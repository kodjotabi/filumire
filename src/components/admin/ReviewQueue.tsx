"use client";

import Link from "next/link";
import { useFilumireStore } from "@/lib/store/filumire-store";
import { formatDate } from "@/lib/utils/filumire-id";

export function ReviewQueue() {
  const getPendingRequests = useFilumireStore((s) => s.getPendingRequests);
  const identities = useFilumireStore((s) => s.identities);
  const requests = getPendingRequests();

  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
        No pending verification requests.
      </div>
    );
  }

  const tabs = [
    { key: "identity", label: "Identity" },
    { key: "claim", label: "Claims" },
    { key: "presence", label: "Presence" },
  ] as const;

  return (
    <div className="space-y-8">
      {tabs.map((tab) => {
        const items = requests.filter((r) => r.targetType === tab.key);
        if (items.length === 0) return null;

        return (
          <section key={tab.key}>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              {tab.label} reviews ({items.length})
            </h2>
            <div className="space-y-3">
              {items.map((request) => {
                const identity = identities.find(
                  (i) => i.filumireId === request.identityId,
                );
                return (
                  <Link
                    key={request.id}
                    href={`/admin/review/${request.id}`}
                    className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">
                          {request.summary}
                        </p>
                        <p className="text-sm text-slate-500">
                          {identity?.displayName} · Submitted{" "}
                          {formatDate(request.submittedAt)}
                        </p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                        Pending review
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
