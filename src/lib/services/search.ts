import type {
  Claim,
  FilumireIdentity,
  SearchFilters,
  SearchResult,
} from "@/lib/types";

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

function scoreIdentity(
  identity: FilumireIdentity,
  query: string,
  claims: Claim[],
): { score: number; reasons: string[] } {
  const q = normalize(query);
  let score = 0;
  const reasons: string[] = [];

  if (normalize(identity.filumireId) === q) {
    score += 100;
    reasons.push("Exact FILUMIRE ID match");
  } else if (normalize(identity.filumireId).includes(q)) {
    score += 80;
    reasons.push("Partial FILUMIRE ID match");
  }

  if (normalize(identity.displayName).includes(q)) {
    score += 60;
    reasons.push("Display name match");
  }

  if (identity.legalName && normalize(identity.legalName).includes(q)) {
    score += 50;
    reasons.push("Legal name match");
  }

  identity.aliases.forEach((alias) => {
    if (normalize(alias).includes(q)) {
      score += 40;
      reasons.push(`Alias match: ${alias}`);
    }
  });

  if (identity.description && normalize(identity.description).includes(q)) {
    score += 20;
    reasons.push("Description match");
  }

  const identityClaims = claims.filter((c) => c.identityId === identity.filumireId);
  identityClaims.forEach((claim) => {
    if (normalize(claim.statement).includes(q)) {
      score += 25;
      reasons.push(`Claim match: ${claim.statement}`);
    }
  });

  return { score, reasons: [...new Set(reasons)] };
}

export function searchIdentities(
  identities: FilumireIdentity[],
  claims: Claim[],
  query: string,
  filters: SearchFilters = {},
): SearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const results = identities
    .map((identity) => {
      const { score, reasons } = scoreIdentity(identity, trimmed, claims);
      const topClaims = claims
        .filter((c) => c.identityId === identity.filumireId && c.visibility === "public")
        .slice(0, 2);

      return { identity, score, matchReasons: reasons, topClaims };
    })
    .filter((result) => result.score > 0)
    .filter((result) => {
      if (filters.type && filters.type !== "all" && result.identity.type !== filters.type) {
        return false;
      }
      if (filters.verifiedOnly && result.identity.verificationStatus !== "verified") {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.score - a.score);

  return results;
}

export function getMatchStrength(score: number): string {
  if (score >= 100) return "Exact match";
  if (score >= 60) return "Strong match";
  if (score >= 40) return "Likely match";
  return "Possible match";
}
