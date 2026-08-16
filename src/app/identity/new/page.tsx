"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFilumireStore } from "@/lib/store/filumire-store";
import type { IdentityType } from "@/lib/types";

export default function NewIdentityPage() {
  const router = useRouter();
  const createIdentity = useFilumireStore((s) => s.createIdentity);
  const [type, setType] = useState<IdentityType>("person");
  const [displayName, setDisplayName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    const identity = createIdentity({
      type,
      displayName: displayName.trim(),
      legalName: legalName.trim() || undefined,
      description: description.trim() || undefined,
    });
    router.push(`/identity/${identity.filumireId}/verify`);
  };

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← Back to search
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Create new identity</h1>
      <p className="mt-2 text-slate-600">
        A persistent FILUMIRE ID will be assigned automatically.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-slate-700">Identity type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as IdentityType)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="person">Person</option>
            <option value="business">Business</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Display name</label>
          <input
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Legal name (optional)</label>
          <input
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-700"
        >
          Create & start verification
        </button>
      </form>
    </div>
  );
}
