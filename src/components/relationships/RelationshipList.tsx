"use client";

import { useFilumireStore } from "@/lib/store/filumire-store";
import type { FilumireIdentity } from "@/lib/types";
import { relationshipLabel } from "@/lib/utils/filumire-id";
import { FilumireIdBadge } from "@/components/identity/FilumireIdBadge";
import { StatusBadge } from "@/components/verification/StatusBadge";

export function RelationshipList({ identity }: { identity: FilumireIdentity }) {
  const relationships = useFilumireStore((s) => s.relationships);
  const identities = useFilumireStore((s) => s.identities);

  const related = relationships.filter(
    (r) => r.fromId === identity.filumireId || r.toId === identity.filumireId,
  );

  if (related.length === 0) {
    return <p className="text-sm text-slate-500">No linked identities yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {related.map((rel) => {
        const otherId =
          rel.fromId === identity.filumireId ? rel.toId : rel.fromId;
        const other = identities.find((i) => i.filumireId === otherId);
        if (!other) return null;

        return (
          <li
            key={rel.id}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">
                  {relationshipLabel(rel.kind)}
                </p>
                <p className="font-medium">{other.displayName}</p>
                {rel.label && (
                  <p className="text-sm text-slate-600">{rel.label}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <FilumireIdBadge filumireId={other.filumireId} />
                <StatusBadge status={rel.status} />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
