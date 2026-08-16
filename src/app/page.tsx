"use client";

import { useMemo, useState } from "react";
import { useFilumireStore } from "@/lib/store/filumire-store";
import { searchIdentities } from "@/lib/services/search";
import type { IdentityType, SearchFilters } from "@/lib/types";
import { IdentityCard } from "@/components/identity/IdentityCard";
import { DemoJourney } from "@/components/layout/DemoJourney";

export default function SearchPage() {
  const identities = useFilumireStore((s) => s.identities);
  const claims = useFilumireStore((s) => s.claims);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({
    type: "all",
    verifiedOnly: false,
  });

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return searchIdentities(identities, claims, query, filters);
  }, [identities, claims, query, filters]);

  return (
    <div>
      <section className="mb-10 rounded-2xl bg-gradient-to-br from-filumire-navy to-slate-800 p-8 text-white">
        <h1 className="text-3xl font-bold tracking-tight">
          Search the verification network
        </h1>
        <p className="mt-2 max-w-2xl text-slate-300">
          Find people and businesses by name, alias, FILUMIRE ID, or claim. Start
          the MVP flow: Search → Match → Verify → Share → Monitor.
        </p>
        <div className="mt-6">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, alias, or FILUMIRE ID (e.g. FM-P7K2-9X4M)"
            className="w-full max-w-2xl rounded-xl border-0 px-4 py-3 text-slate-900 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <span className="text-slate-300">Type:</span>
            <select
              value={filters.type ?? "all"}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  type: e.target.value as IdentityType | "all",
                }))
              }
              className="rounded-lg border-0 px-2 py-1 text-slate-900"
            >
              <option value="all">All</option>
              <option value="person">Person</option>
              <option value="business">Business</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-slate-200">
            <input
              type="checkbox"
              checked={filters.verifiedOnly ?? false}
              onChange={(e) =>
                setFilters((f) => ({ ...f, verifiedOnly: e.target.checked }))
              }
            />
            Verified only
          </label>
        </div>
      </section>

      {!query.trim() && <DemoJourney />}

      {!query.trim() && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Try a demo search
          </h2>
          <div className="flex flex-wrap gap-2">
            {["Jordan Ellis", "Ellis Electrical", "FM-P7K2-9X4M", "Samira"].map(
              (term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setQuery(term)}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm hover:border-blue-400 hover:text-blue-700"
                >
                  {term}
                </button>
              ),
            )}
          </div>
        </section>
      )}

      {query.trim() && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            {results.length} result{results.length !== 1 ? "s" : ""}
          </h2>
          {results.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
              No matches found. Try another term or create a new identity.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {results.map((result) => (
                <IdentityCard
                  key={result.identity.filumireId}
                  identity={result.identity}
                  topClaims={result.topClaims}
                  matchReasons={result.matchReasons}
                  score={result.score}
                  href={`/match/${result.identity.filumireId}?q=${encodeURIComponent(query)}`}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
