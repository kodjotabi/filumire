export function FilumireIdBadge({ filumireId }: { filumireId: string }) {
  return (
    <code className="rounded-md border border-slate-200 bg-slate-100 px-2 py-1 font-mono text-sm font-semibold text-filumire-navy">
      {filumireId}
    </code>
  );
}
