"use client";

import Link from "next/link";
import { ReviewQueue } from "@/components/admin/ReviewQueue";
import { useFilumireStore } from "@/lib/store/filumire-store";

export default function AdminPage() {
  const pendingCount = useFilumireStore((s) => s.getPendingRequests().length);

  return (
    <div>
      <p className="text-sm uppercase tracking-wide text-slate-500">Admin</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">
        Verification review dashboard
      </h1>
      <p className="mt-2 text-slate-600">
        Review pending identity, claim, and presence verification requests.
        {pendingCount > 0
          ? ` ${pendingCount} item(s) awaiting review.`
          : " All caught up."}
      </p>

      <div className="mt-8">
        <ReviewQueue />
      </div>

      <p className="mt-8 text-sm text-slate-500">
        Tip: approve items here, then check the identity Monitor page for updated history.
      </p>
      <Link
        href="/identity/FM-P7K2-9X4M/monitor"
        className="mt-2 inline-block text-sm text-blue-600 hover:underline"
      >
        View Jordan Ellis monitor →
      </Link>
    </div>
  );
}
