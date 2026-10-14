import { getApiHeaders } from "./learning-client";
import {
  CONVERSATION_TTL_MS, MAX_CONVERSATION_MESSAGES, MAX_QUESTION_LENGTH,
  type ConversationRequest, type ConversationResponse, type ConversationContextResponse,
} from "../../../packages/ai/conversation";
import { conversationSafety } from "../../../packages/ai/conversation-safety";

const KEY = "filumire.filuSessionConversation";
export interface SessionConversation {
  scope: string;
  expiresAt: number;
  response?: ConversationResponse;
  pending?: ConversationRequest;
}
export function clearConversation(): void {
  try { window.sessionStorage.removeItem(KEY); } catch { /* session storage may be disabled */ }
}
export function readConversation(scope: string, now = Date.now()): SessionConversation {
  const empty = { scope, expiresAt: now + CONVERSATION_TTL_MS };
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return empty;
    if (raw.length > 100000) { clearConversation(); return empty; }
    const stored = JSON.parse(raw) as SessionConversation;
    if (stored.scope !== scope || !Number.isFinite(stored.expiresAt) || stored.expiresAt <= now ||
      stored.expiresAt > now + CONVERSATION_TTL_MS ||
      (stored.pending && (typeof stored.pending.question !== "string" || stored.pending.question.length > MAX_QUESTION_LENGTH ||
        typeof stored.pending.requestId !== "string" || !["en", "fr"].includes(stored.pending.language))) ||
      (stored.response && (typeof stored.response.historyToken !== "string" || !Array.isArray(stored.response.messages) || stored.response.messages.length > MAX_CONVERSATION_MESSAGES ||
        stored.response.messages.some((message) => !message || typeof message.text !== "string" || message.text.length > 2000 || !["user", "assistant"].includes(message.role) || !["en", "fr"].includes(message.language))))) {
      clearConversation(); return empty;
    }
    return stored;
  } catch { clearConversation(); return empty; }
}
export function saveConversation(value: SessionConversation): void {
  try {
    if (value.expiresAt <= Date.now()) { clearConversation(); return; }
    // Do not persist a personal/safety disclosure while its request is pending.
    const pending = value.pending && conversationSafety(value.pending.question) ? undefined : value.pending;
    window.sessionStorage.setItem(KEY, JSON.stringify({ ...value, pending }));
  } catch { /* Conversation still works in memory; refresh continuity is unavailable. */ }
}
export class ConversationRequestError extends Error {
  constructor(public readonly code: string, public readonly status: number, public readonly retryAfterSeconds = 0) { super(code); }
}
export async function sendConversation(body: ConversationRequest, signal?: AbortSignal): Promise<ConversationResponse> {
  let response: Response;
  try {
    response = await fetch("/api/tutoring/conversation", {
      method: "POST", headers: getApiHeaders(), credentials: "same-origin", cache: "no-store",
      body: JSON.stringify(body), signal,
    });
  } catch { throw new ConversationRequestError("network", 0); }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ConversationRequestError(data?.code ?? "temporarily_unavailable", response.status, Number(response.headers.get("Retry-After")) || 0);
  if (!data || !Array.isArray(data.messages) || data.messages.length > MAX_CONVERSATION_MESSAGES ||
    data.messages.some((message: unknown) => !message || typeof message !== "object" ||
      !["user", "assistant"].includes((message as { role: string }).role) ||
      !["en", "fr"].includes((message as { language: string }).language) ||
      typeof (message as { text: string }).text !== "string" || (message as { text: string }).text.length > 2000) ||
    typeof data.historyToken !== "string" || data.historyToken.length > 60000 || !Number.isFinite(data.expiresAt) ||
    data.expiresAt <= Date.now() || data.expiresAt > Date.now() + CONVERSATION_TTL_MS ||
    !["mock", "curriculum"].includes(data.provider) || typeof data.assessmentProtected !== "boolean") throw new ConversationRequestError("temporarily_unavailable", 503);
  return data as ConversationResponse;
}

export async function fetchConversationContext(language: "en" | "fr", signal?: AbortSignal): Promise<ConversationContextResponse> {
  const response = await fetch(`/api/tutoring/conversation?language=${language}`, {
    headers: getApiHeaders(), credentials: "same-origin", cache: "no-store", signal,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ConversationRequestError(data?.code ?? "temporarily_unavailable", response.status);
  if (!data || data.language !== language || typeof data.assessmentProtected !== "boolean" || typeof data.hasTeaching !== "boolean" ||
      data.topicTitle !== undefined && (typeof data.topicTitle !== "string" || data.topicTitle.length > 300)) throw new ConversationRequestError("temporarily_unavailable", 503);
  return data;
}
