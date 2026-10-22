/** Only deliberate, safe portal destinations can leave the public website. */
export function verifiedPortalUrl(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return null;
    if (url.username || url.password || /(^|\.)(example\.(com|org|net)|invalid|test)$/.test(url.hostname)) return null;
    return url.href;
  } catch { return null; }
}

export function contactEmail(value: string | undefined, fallback: string): string {
  const email = value?.trim();
  return email && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ? email : fallback;
}

/** Approval is separate from URL syntax; a protected Preview is never enabled implicitly. */
export function approvedPortalUrl(value: string | undefined, approval: string | undefined): string | null { return approval === "true" ? verifiedPortalUrl(value) : null; }
