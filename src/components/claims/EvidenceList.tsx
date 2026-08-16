import type { Evidence } from "@/lib/types";
import { formatDate } from "@/lib/utils/filumire-id";

export function EvidenceList({ items }: { items: Evidence[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">No evidence attached.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
        >
          <div>
            <p className="font-medium text-slate-800">{item.label}</p>
            <p className="text-xs uppercase text-slate-500">{item.kind}</p>
            {item.referenceUrl && (
              <a
                href={item.referenceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline"
              >
                {item.referenceUrl}
              </a>
            )}
            {item.fileName && (
              <p className="text-slate-600">File: {item.fileName}</p>
            )}
          </div>
          <span className="whitespace-nowrap text-xs text-slate-400">
            {formatDate(item.uploadedAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}
