import type { VerificationStatus } from "@/lib/types";
import { statusColorClass, statusLabel } from "@/lib/services/verification";

export function StatusBadge({ status }: { status: VerificationStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColorClass(status)}`}
    >
      {statusLabel(status)}
    </span>
  );
}
