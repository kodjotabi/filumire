"use client";

import { create } from "zustand";
import { cloneSeedData } from "@/lib/mock/seed";
import type {
  Claim,
  ClaimVisibility,
  Evidence,
  EvidenceKind,
  FilumireData,
  FilumireIdentity,
  IdentityType,
  PresenceChannel,
  PresenceKind,
  RelationshipKind,
  VerificationEvent,
  VerificationStatus,
} from "@/lib/types";
import { STORAGE_KEY } from "@/lib/types";
import { generateFilumireId, slugFromName } from "@/lib/utils/filumire-id";

const STORAGE = STORAGE_KEY;

interface FilumireStore extends FilumireData {
  hydrated: boolean;
  activeIdentityId: string | null;
  hydrate: () => void;
  resetDemo: () => void;
  setActiveIdentity: (filumireId: string | null) => void;
  getIdentity: (filumireId: string) => FilumireIdentity | undefined;
  getClaimsForIdentity: (filumireId: string) => Claim[];
  getEvidenceForClaim: (claimId: string) => Evidence[];
  getEvidenceForIdentity: (filumireId: string) => Evidence[];
  getPresenceForIdentity: (filumireId: string) => PresenceChannel[];
  getEventsForIdentity: (filumireId: string) => VerificationEvent[];
  getPendingRequests: () => FilumireData["verificationRequests"];
  createIdentity: (input: {
    type: IdentityType;
    displayName: string;
    legalName?: string;
    description?: string;
  }) => FilumireIdentity;
  submitIdentityVerification: (
    filumireId: string,
    evidenceLabel: string,
    fileName?: string,
  ) => void;
  addClaim: (
    filumireId: string,
    statement: string,
    claimType: string,
    evidence: { kind: EvidenceKind; label: string; referenceUrl?: string; fileName?: string },
  ) => void;
  submitClaimForReview: (claimId: string) => void;
  addPresenceChannel: (
    filumireId: string,
    kind: PresenceKind,
    value: string,
  ) => void;
  submitPresenceForReview: (channelId: string) => void;
  updateClaimVisibility: (claimId: string, visibility: ClaimVisibility) => void;
  updatePresenceVisibility: (channelId: string, isPublic: boolean) => void;
  addRelationship: (
    fromId: string,
    toId: string,
    kind: RelationshipKind,
    label?: string,
  ) => void;
  approveRequest: (requestId: string, note: string) => void;
  rejectRequest: (requestId: string, note: string) => void;
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function persist(state: FilumireData) {
  if (typeof window === "undefined") return;
  const { identities, claims, evidence, presenceChannels, relationships, verificationEvents, verificationRequests } = state;
  localStorage.setItem(
    STORAGE,
    JSON.stringify({
      identities,
      claims,
      evidence,
      presenceChannels,
      relationships,
      verificationEvents,
      verificationRequests,
    }),
  );
}

function appendEvent(
  state: FilumireStore,
  event: Omit<VerificationEvent, "id">,
): VerificationEvent {
  const full: VerificationEvent = { ...event, id: uid("evt") };
  state.verificationEvents = [full, ...state.verificationEvents];
  return full;
}

export const useFilumireStore = create<FilumireStore>((set, get) => ({
  ...cloneSeedData(),
  hydrated: false,
  activeIdentityId: "FM-P7K2-9X4M",

  hydrate: () => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(STORAGE);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as FilumireData;
        set({ ...parsed, hydrated: true });
        return;
      } catch {
        // fall through to seed
      }
    }
    set({ ...cloneSeedData(), hydrated: true });
  },

  resetDemo: () => {
    const data = cloneSeedData();
    set({ ...data, activeIdentityId: "FM-P7K2-9X4M", hydrated: true });
    persist(data);
  },

  setActiveIdentity: (filumireId) => set({ activeIdentityId: filumireId }),

  getIdentity: (filumireId) => get().identities.find((i) => i.filumireId === filumireId),

  getClaimsForIdentity: (filumireId) =>
    get().claims.filter((c) => c.identityId === filumireId),

  getEvidenceForClaim: (claimId) =>
    get().evidence.filter((e) => e.claimId === claimId),

  getEvidenceForIdentity: (filumireId) =>
    get().evidence.filter((e) => e.identityId === filumireId),

  getPresenceForIdentity: (filumireId) =>
    get().presenceChannels.filter((p) => p.identityId === filumireId),

  getEventsForIdentity: (filumireId) =>
    get()
      .verificationEvents.filter((e) => e.identityId === filumireId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),

  getPendingRequests: () =>
    get().verificationRequests.filter((r) => r.status === "pending_review"),

  createIdentity: (input) => {
    const prefix = input.type === "business" ? "B" : "P";
    const identity: FilumireIdentity = {
      filumireId: generateFilumireId(prefix),
      type: input.type,
      displayName: input.displayName,
      legalName: input.legalName ?? input.displayName,
      aliases: [],
      verificationStatus: "unverified",
      publicSlug: slugFromName(input.displayName),
      description: input.description,
      createdAt: new Date().toISOString(),
      ...(input.type === "person"
        ? { personDetails: {} }
        : { businessDetails: {} }),
    };

    set((state) => {
      appendEvent(state, {
        identityId: identity.filumireId,
        timestamp: new Date().toISOString(),
        actor: "system",
        action: "Identity created",
        newStatus: "unverified",
        targetType: "identity",
        targetId: identity.filumireId,
      });
      const next = {
        ...state,
        identities: [...state.identities, identity],
        activeIdentityId: identity.filumireId,
      };
      persist(next);
      return next;
    });

    return identity;
  },

  submitIdentityVerification: (filumireId, evidenceLabel, fileName) => {
    set((state) => {
      const identity = state.identities.find((i) => i.filumireId === filumireId);
      if (!identity || identity.verificationStatus === "pending") return state;

      const existing = state.verificationRequests.some(
        (r) =>
          r.targetType === "identity" &&
          r.targetId === filumireId &&
          r.status === "pending_review",
      );
      if (existing) return state;

      const evidence: Evidence = {
        id: uid("evd"),
        identityId: filumireId,
        kind: "upload",
        label: evidenceLabel,
        fileName,
        uploadedAt: new Date().toISOString(),
      };

      const request = {
        id: uid("req"),
        targetType: "identity" as const,
        targetId: filumireId,
        identityId: filumireId,
        status: "pending_review" as const,
        submittedAt: new Date().toISOString(),
        summary: `Identity verification for ${identity.displayName}`,
      };

      appendEvent(state, {
        identityId: filumireId,
        timestamp: new Date().toISOString(),
        actor: "user",
        action: "Identity verification submitted",
        previousStatus: identity.verificationStatus,
        newStatus: "pending",
        targetType: "identity",
        targetId: filumireId,
        note: evidenceLabel,
      });

      const next = {
        ...state,
        identities: state.identities.map((i) =>
          i.filumireId === filumireId ? { ...i, verificationStatus: "pending" as VerificationStatus } : i,
        ),
        evidence: [...state.evidence, evidence],
        verificationRequests: [...state.verificationRequests, request],
      };
      persist(next);
      return next;
    });
  },

  addClaim: (filumireId, statement, claimType, evidenceInput) => {
    set((state) => {
      const claim: Claim = {
        id: uid("clm"),
        identityId: filumireId,
        statement,
        claimType,
        status: "unverified",
        visibility: "private",
        createdAt: new Date().toISOString(),
      };

      const evidence: Evidence = {
        id: uid("evd"),
        claimId: claim.id,
        identityId: filumireId,
        kind: evidenceInput.kind,
        label: evidenceInput.label,
        referenceUrl: evidenceInput.referenceUrl,
        fileName: evidenceInput.fileName,
        uploadedAt: new Date().toISOString(),
      };

      appendEvent(state, {
        identityId: filumireId,
        timestamp: new Date().toISOString(),
        actor: "user",
        action: "Claim added",
        newStatus: "unverified",
        targetType: "claim",
        targetId: claim.id,
        note: statement,
      });

      const next = {
        ...state,
        claims: [...state.claims, claim],
        evidence: [...state.evidence, evidence],
      };
      persist(next);
      return next;
    });
  },

  submitClaimForReview: (claimId) => {
    set((state) => {
      const claim = state.claims.find((c) => c.id === claimId);
      if (!claim || claim.status === "pending") return state;

      const existing = state.verificationRequests.some(
        (r) =>
          r.targetType === "claim" &&
          r.targetId === claimId &&
          r.status === "pending_review",
      );
      if (existing) return state;

      const request = {
        id: uid("req"),
        targetType: "claim" as const,
        targetId: claimId,
        identityId: claim.identityId,
        status: "pending_review" as const,
        submittedAt: new Date().toISOString(),
        summary: `Claim review: ${claim.statement}`,
      };

      appendEvent(state, {
        identityId: claim.identityId,
        timestamp: new Date().toISOString(),
        actor: "user",
        action: "Claim submitted for review",
        previousStatus: claim.status,
        newStatus: "pending",
        targetType: "claim",
        targetId: claimId,
      });

      const next = {
        ...state,
        claims: state.claims.map((c) =>
          c.id === claimId ? { ...c, status: "pending" as VerificationStatus } : c,
        ),
        verificationRequests: [...state.verificationRequests, request],
      };
      persist(next);
      return next;
    });
  },

  addPresenceChannel: (filumireId, kind, value) => {
    set((state) => {
      const channel: PresenceChannel = {
        id: uid("prs"),
        identityId: filumireId,
        kind,
        value,
        verified: false,
        status: "unverified",
        isPublic: false,
      };

      appendEvent(state, {
        identityId: filumireId,
        timestamp: new Date().toISOString(),
        actor: "user",
        action: "Presence channel added",
        newStatus: "unverified",
        targetType: "presence",
        targetId: channel.id,
        note: value,
      });

      const next = {
        ...state,
        presenceChannels: [...state.presenceChannels, channel],
      };
      persist(next);
      return next;
    });
  },

  submitPresenceForReview: (channelId) => {
    set((state) => {
      const channel = state.presenceChannels.find((p) => p.id === channelId);
      if (!channel || channel.status === "pending") return state;

      const existing = state.verificationRequests.some(
        (r) =>
          r.targetType === "presence" &&
          r.targetId === channelId &&
          r.status === "pending_review",
      );
      if (existing) return state;

      const request = {
        id: uid("req"),
        targetType: "presence" as const,
        targetId: channelId,
        identityId: channel.identityId,
        status: "pending_review" as const,
        submittedAt: new Date().toISOString(),
        summary: `Presence verification: ${channel.value}`,
      };

      appendEvent(state, {
        identityId: channel.identityId,
        timestamp: new Date().toISOString(),
        actor: "user",
        action: "Presence channel submitted",
        previousStatus: channel.status,
        newStatus: "pending",
        targetType: "presence",
        targetId: channelId,
      });

      const next = {
        ...state,
        presenceChannels: state.presenceChannels.map((p) =>
          p.id === channelId ? { ...p, status: "pending" as VerificationStatus } : p,
        ),
        verificationRequests: [...state.verificationRequests, request],
      };
      persist(next);
      return next;
    });
  },

  updateClaimVisibility: (claimId, visibility) => {
    set((state) => {
      const next = {
        ...state,
        claims: state.claims.map((c) =>
          c.id === claimId ? { ...c, visibility } : c,
        ),
      };
      persist(next);
      return next;
    });
  },

  updatePresenceVisibility: (channelId, isPublic) => {
    set((state) => {
      const next = {
        ...state,
        presenceChannels: state.presenceChannels.map((p) =>
          p.id === channelId ? { ...p, isPublic } : p,
        ),
      };
      persist(next);
      return next;
    });
  },

  addRelationship: (fromId, toId, kind, label) => {
    set((state) => {
      const relationship = {
        id: uid("rel"),
        fromId,
        toId,
        kind,
        status: "pending" as VerificationStatus,
        label,
      };

      appendEvent(state, {
        identityId: fromId,
        timestamp: new Date().toISOString(),
        actor: "user",
        action: "Relationship linked",
        newStatus: "pending",
        targetType: "identity",
        targetId: toId,
        note: label,
      });

      const next = {
        ...state,
        relationships: [...state.relationships, relationship],
      };
      persist(next);
      return next;
    });
  },

  approveRequest: (requestId, note) => {
    set((state) => {
      const request = state.verificationRequests.find((r) => r.id === requestId);
      if (!request || request.status !== "pending_review") return state;

      let next = { ...state };

      if (request.targetType === "identity") {
        const identity = state.identities.find((i) => i.filumireId === request.targetId);
        appendEvent(state, {
          identityId: request.identityId,
          timestamp: new Date().toISOString(),
          actor: "admin",
          action: "Identity verification approved",
          previousStatus: identity?.verificationStatus,
          newStatus: "verified",
          targetType: "identity",
          targetId: request.targetId,
          note,
        });
        next.identities = state.identities.map((i) =>
          i.filumireId === request.targetId
            ? { ...i, verificationStatus: "verified" as VerificationStatus }
            : i,
        );
      }

      if (request.targetType === "claim") {
        const claim = state.claims.find((c) => c.id === request.targetId);
        appendEvent(state, {
          identityId: request.identityId,
          timestamp: new Date().toISOString(),
          actor: "admin",
          action: "Claim verified",
          previousStatus: claim?.status,
          newStatus: "verified",
          targetType: "claim",
          targetId: request.targetId,
          note,
        });
        next.claims = state.claims.map((c) =>
          c.id === request.targetId
            ? { ...c, status: "verified" as VerificationStatus, visibility: "public" as const }
            : c,
        );
      }

      if (request.targetType === "presence") {
        const channel = state.presenceChannels.find((p) => p.id === request.targetId);
        appendEvent(state, {
          identityId: request.identityId,
          timestamp: new Date().toISOString(),
          actor: "admin",
          action: "Presence channel verified",
          previousStatus: channel?.status,
          newStatus: "verified",
          targetType: "presence",
          targetId: request.targetId,
          note,
        });
        next.presenceChannels = state.presenceChannels.map((p) =>
          p.id === request.targetId
            ? {
                ...p,
                verified: true,
                status: "verified" as VerificationStatus,
                isPublic: true,
                lastCheckedAt: new Date().toISOString(),
              }
            : p,
        );
      }

      next.verificationRequests = state.verificationRequests.map((r) =>
        r.id === requestId ? { ...r, status: "approved" as const } : r,
      );
      next.verificationEvents = state.verificationEvents;
      persist(next);
      return next;
    });
  },

  rejectRequest: (requestId, note) => {
    set((state) => {
      const request = state.verificationRequests.find((r) => r.id === requestId);
      if (!request || request.status !== "pending_review") return state;

      let next = { ...state };

      if (request.targetType === "identity") {
        const identity = state.identities.find((i) => i.filumireId === request.targetId);
        appendEvent(state, {
          identityId: request.identityId,
          timestamp: new Date().toISOString(),
          actor: "admin",
          action: "Identity verification rejected",
          previousStatus: identity?.verificationStatus,
          newStatus: "rejected",
          targetType: "identity",
          targetId: request.targetId,
          note,
        });
        next.identities = state.identities.map((i) =>
          i.filumireId === request.targetId
            ? { ...i, verificationStatus: "rejected" as VerificationStatus }
            : i,
        );
      }

      if (request.targetType === "claim") {
        const claim = state.claims.find((c) => c.id === request.targetId);
        appendEvent(state, {
          identityId: request.identityId,
          timestamp: new Date().toISOString(),
          actor: "admin",
          action: "Claim rejected",
          previousStatus: claim?.status,
          newStatus: "rejected",
          targetType: "claim",
          targetId: request.targetId,
          note,
        });
        next.claims = state.claims.map((c) =>
          c.id === request.targetId ? { ...c, status: "rejected" as VerificationStatus } : c,
        );
      }

      if (request.targetType === "presence") {
        const channel = state.presenceChannels.find((p) => p.id === request.targetId);
        appendEvent(state, {
          identityId: request.identityId,
          timestamp: new Date().toISOString(),
          actor: "admin",
          action: "Presence verification rejected",
          previousStatus: channel?.status,
          newStatus: "rejected",
          targetType: "presence",
          targetId: request.targetId,
          note,
        });
        next.presenceChannels = state.presenceChannels.map((p) =>
          p.id === request.targetId
            ? { ...p, verified: false, status: "rejected" as VerificationStatus }
            : p,
        );
      }

      next.verificationRequests = state.verificationRequests.map((r) =>
        r.id === requestId ? { ...r, status: "rejected" as const } : r,
      );
      next.verificationEvents = state.verificationEvents;
      persist(next);
      return next;
    });
  },
}));
