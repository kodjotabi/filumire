export type IdentityType = "person" | "business";

export type VerificationStatus =
  | "unverified"
  | "pending"
  | "verified"
  | "rejected";

export type EvidenceKind = "document" | "link" | "reference" | "upload";

export type PresenceKind =
  | "website"
  | "email_domain"
  | "phone"
  | "address"
  | "social_handle";

export type RelationshipKind =
  | "employed_by"
  | "represents"
  | "owns"
  | "affiliated_with"
  | "verified_connection";

export type VerificationActor = "user" | "admin" | "system";

export type VerificationTargetType =
  | "identity"
  | "claim"
  | "presence";

export type ClaimVisibility = "public" | "private";

export interface FilumireIdentity {
  filumireId: string;
  type: IdentityType;
  displayName: string;
  legalName?: string;
  aliases: string[];
  verificationStatus: VerificationStatus;
  publicSlug: string;
  description?: string;
  personDetails?: {
    dateOfBirth?: string;
    occupation?: string;
  };
  businessDetails?: {
    registrationNumber?: string;
    industry?: string;
  };
  createdAt: string;
}

export interface Claim {
  id: string;
  identityId: string;
  statement: string;
  claimType: string;
  status: VerificationStatus;
  visibility: ClaimVisibility;
  createdAt: string;
}

export interface Evidence {
  id: string;
  claimId?: string;
  identityId?: string;
  kind: EvidenceKind;
  label: string;
  referenceUrl?: string;
  fileName?: string;
  uploadedAt: string;
}

export interface PresenceChannel {
  id: string;
  identityId: string;
  kind: PresenceKind;
  value: string;
  verified: boolean;
  status: VerificationStatus;
  isPublic: boolean;
  lastCheckedAt?: string;
}

export interface Relationship {
  id: string;
  fromId: string;
  toId: string;
  kind: RelationshipKind;
  status: VerificationStatus;
  claimId?: string;
  label?: string;
}

export interface VerificationEvent {
  id: string;
  identityId: string;
  timestamp: string;
  actor: VerificationActor;
  action: string;
  note?: string;
  previousStatus?: VerificationStatus;
  newStatus?: VerificationStatus;
  targetType: VerificationTargetType;
  targetId: string;
}

export interface VerificationRequest {
  id: string;
  targetType: VerificationTargetType;
  targetId: string;
  identityId: string;
  status: "pending_review" | "approved" | "rejected";
  submittedAt: string;
  summary: string;
}

export interface SearchFilters {
  type?: IdentityType | "all";
  verifiedOnly?: boolean;
}

export interface SearchResult {
  identity: FilumireIdentity;
  score: number;
  matchReasons: string[];
  topClaims: Claim[];
}

export interface FilumireData {
  identities: FilumireIdentity[];
  claims: Claim[];
  evidence: Evidence[];
  presenceChannels: PresenceChannel[];
  relationships: Relationship[];
  verificationEvents: VerificationEvent[];
  verificationRequests: VerificationRequest[];
}

export const MVP_STEPS = [
  { key: "search", label: "Search", path: "/" },
  { key: "match", label: "Match", path: "/match" },
  { key: "verify", label: "Verify identity", path: "/verify" },
  { key: "claims", label: "Verify claims", path: "/claims" },
  { key: "presence", label: "Assess presence", path: "/presence" },
  { key: "profile", label: "Build profile", path: "/profile" },
  { key: "share", label: "Share", path: "/share" },
  { key: "monitor", label: "Monitor", path: "/monitor" },
] as const;

export const STORAGE_KEY = "filumire-demo-state-v1";
