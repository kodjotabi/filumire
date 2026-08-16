import type { VerificationStatus } from "@/lib/types";

export function statusLabel(status: VerificationStatus): string {
  const labels: Record<VerificationStatus, string> = {
    unverified: "Unverified",
    pending: "Pending review",
    verified: "Verified",
    rejected: "Rejected",
  };
  return labels[status];
}

export function statusColorClass(status: VerificationStatus): string {
  const colors: Record<VerificationStatus, string> = {
    unverified: "bg-slate-100 text-slate-700 border-slate-200",
    pending: "bg-amber-50 text-amber-800 border-amber-200",
    verified: "bg-emerald-50 text-emerald-800 border-emerald-200",
    rejected: "bg-red-50 text-red-800 border-red-200",
  };
  return colors[status];
}

export function canSubmitForReview(status: VerificationStatus): boolean {
  return status === "unverified" || status === "rejected";
}
