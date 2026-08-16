const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateFilumireId(prefix: "P" | "B" = "P"): string {
  const segment = (length: number) =>
    Array.from({ length }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
  return `FM-${prefix}${segment(3)}-${segment(4)}`;
}

export function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function relationshipLabel(kind: string): string {
  const labels: Record<string, string> = {
    employed_by: "Employed by",
    represents: "Represents",
    owns: "Owns",
    affiliated_with: "Affiliated with",
    verified_connection: "Verified connection",
  };
  return labels[kind] ?? kind;
}

export function presenceKindLabel(kind: string): string {
  const labels: Record<string, string> = {
    website: "Website",
    email_domain: "Email domain",
    phone: "Phone",
    address: "Address",
    social_handle: "Social handle",
  };
  return labels[kind] ?? kind;
}
