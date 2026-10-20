import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { resolveRequestIdentity, type RequestIdentity } from "../identity";
import { consumeRateLimit } from "../account/rate-limit";
import { loadConversationContext, type TrustedConversationContext } from "./conversation-context";
import {
  CONVERSATION_TTL_MS, MAX_CONVERSATION_MESSAGES, MAX_QUESTION_LENGTH,
  type ConversationProvider, type ConversationRequest, type ConversationPractice,
  type ConversationResponse, type ConversationMessage,
} from "../../packages/ai/conversation";
import { CurriculumConversationProvider } from "../../packages/ai/curriculum-conversation";
import { conversationSafety, privateQuestionLabel, safetyReply } from "../../packages/ai/conversation-safety";
import { conceptualExplanation } from "../../packages/ai/conceptual-explanations";

const MAX_BODY_BYTES = 64 * 1024;
const MAX_HISTORY_CHARS = 12000;
const localSigningKey = randomBytes(32);
class ConversationError extends Error {
  constructor(public code: string, public status: number) { super(code); }
}
function signingKey(): Buffer {
  const configured = process.env.FILUMIRE_AUTH_JWT_SECRET;
  if (configured && configured.length >= 32) return createHash("sha256").update(`filu-history:${configured}`).digest();
  if (process.env.NODE_ENV === "production") throw new ConversationError("configuration_unavailable", 503);
  return localSigningKey;
}
interface Envelope { owner: string; expiresAt: number; messages: ConversationMessage[]; contextKey?: string; assessmentProtected?: boolean; practice?: ConversationPractice }
function sign(envelope: Envelope): string {
  const payload = Buffer.from(JSON.stringify(envelope)).toString("base64url");
  return `${payload}.${createHmac("sha256", signingKey()).update(payload).digest("base64url")}`;
}
function readHistory(token: string | undefined, owner: string): Envelope {
  if (!token) return { owner, expiresAt: Date.now() + CONVERSATION_TTL_MS, messages: [] };
  const [payload, signature, extra] = token.split(".");
  const expected = createHmac("sha256", signingKey()).update(payload ?? "").digest();
  const actual = Buffer.from(signature ?? "", "base64url");
  if (extra || actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new ConversationError("invalid_history", 409);
  let envelope: Envelope;
  try { envelope = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); }
  catch { throw new ConversationError("invalid_history", 409); }
  if (envelope.owner !== owner || !Array.isArray(envelope.messages) || envelope.messages.length > MAX_CONVERSATION_MESSAGES) throw new ConversationError("invalid_history", 409);
  if (envelope.messages.some(item => !item || !["user", "assistant"].includes(item.role) || !["en", "fr"].includes(item.language) || typeof item.text !== "string" || item.text.length > 2000)) throw new ConversationError("invalid_history", 409);
  if (!Number.isFinite(envelope.expiresAt) || envelope.expiresAt <= Date.now()) throw new ConversationError("history_expired", 409);
  return envelope;
}
async function readRequest(request: Request): Promise<ConversationRequest> {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) throw new ConversationError("request_too_large", 413);
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ConversationError("invalid_request", 400);
  const reader = request.body?.getReader();
  if (!reader) throw new ConversationError("invalid_request", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_BODY_BYTES) { await reader.cancel(); throw new ConversationError("request_too_large", 413); }
    chunks.push(value);
  }
  let body: ConversationRequest;
  try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new ConversationError("invalid_request", 400); }
  if (!body || typeof body !== "object" || Object.keys(body).some((key) => !["question", "language", "requestId", "historyToken"].includes(key)) ||
    typeof body.question !== "string" || !body.question.trim() || body.question.length > MAX_QUESTION_LENGTH ||
    !["en", "fr"].includes(body.language) || typeof body.requestId !== "string" || !/^[a-zA-Z0-9_-]{8,80}$/.test(body.requestId) ||
    (body.historyToken !== undefined && (typeof body.historyToken !== "string" || body.historyToken.length > 60000))) {
    throw new ConversationError("invalid_request", 400);
  }
  return { ...body, question: body.question.trim() };
}
function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store", ...extra } });
}
interface Dependencies {
  identity: (request: Request) => Promise<RequestIdentity>;
  context: typeof loadConversationContext;
  limit: typeof consumeRateLimit;
  provider: ConversationProvider;
  providerTimeoutMs: number;
}
/** The actual route uses the local, curriculum-grounded tutor. Overrides are test-only. */
export function createConversationHandler(overrides: Partial<Dependencies> = {}) {
  const deps: Dependencies = {
    identity: resolveRequestIdentity, context: loadConversationContext, limit: consumeRateLimit,
    provider: new CurriculumConversationProvider(), providerTimeoutMs: 10000, ...overrides,
  };
  const requests = new Map<string, { fingerprint: string; context: string; expiresAt: number; promise: Promise<ConversationResponse> }>();
  // Short-lived duplicate protection only. No transcript database, log or disk writes.
  const sweep = setInterval(() => {
    for (const [key, value] of requests) if (value.expiresAt <= Date.now()) requests.delete(key);
  }, 60000);
  sweep.unref();
  return async function POST(request: Request): Promise<Response> {
    try {
      const origin = request.headers.get("origin");
      const expectedOrigin = new URL(request.url);
      // Next may construct an internal localhost URL behind its HTTP server.
      // The browser's Host identifies the public origin; cross-site Fetch metadata
      // still fails closed. Never accept a client-supplied alternative allowlist.
      const host = request.headers.get("host");
      if (host) expectedOrigin.host = host;
      const forwardedProtocol = request.headers.get("x-forwarded-proto");
      if (process.env.VERCEL && (forwardedProtocol === "https" || forwardedProtocol === "http")) expectedOrigin.protocol = `${forwardedProtocol}:`;
      if ((origin && origin !== expectedOrigin.origin) || request.headers.get("sec-fetch-site") === "cross-site") throw new ConversationError("invalid_origin", 403);
      let identity: RequestIdentity;
      try { identity = await deps.identity(request); }
      catch { throw new ConversationError("unauthenticated", 401); }
      if (!identity.authenticated || !identity.learnerId) throw new ConversationError("unauthenticated", 401);
      signingKey(); // Production configuration must be valid before any provider work.
      const body = await readRequest(request);
      const owner = createHash("sha256").update(JSON.stringify([identity.learnerId, identity.principalId, identity.sessionId, identity.source])).digest("hex");
      const limit = await deps.limit(`filu:${owner}`, 20, 60000);
      if (!limit.allowed) return json({ code: "rate_limited" }, 429, { "Retry-After": String(limit.retryAfterSeconds) });
      const envelope = readHistory(body.historyToken, owner);
      envelope.messages = envelope.messages.map(item => item.role === "user" && conversationSafety(item.text)
        ? { ...item, text: privateQuestionLabel(item.language) } : item);
      const safety = conversationSafety(body.question);
      let context: TrustedConversationContext;
      try { context = await deps.context(identity.learnerId, body.language, identity.source === "development-header"); }
      catch {
        if (!safety) throw new ConversationError("context_unavailable", 409);
        // A child seeking help must receive safety guidance even without a lesson.
        context = { fingerprint: "safety-only", assessmentProtected: true, providerContext: {
          subjectId: "", competencyId: "", prerequisiteIds: [], mastery: 0, confidence: 0,
          diagnosticState: "unknown", difficulties: [], recommendation: "protected", teaching: [],
        } };
      }
      const contextKey = JSON.stringify([context.providerContext.subjectId, context.providerContext.competencyId]);
      if (envelope.contextKey && envelope.contextKey !== contextKey || context.assessmentProtected && envelope.assessmentProtected === false) {
        envelope.messages = []; envelope.practice = undefined;
      }
      const key = `${owner}:${body.requestId}`;
      const fingerprint = createHash("sha256").update(JSON.stringify(body)).digest("hex");
      const cached = requests.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        if (cached.fingerprint !== fingerprint) throw new ConversationError("request_id_conflict", 409);
        if (cached.context !== context.fingerprint) throw new ConversationError("context_changed", 409);
        const response = await cached.promise;
        if (!safety && (await deps.context(identity.learnerId, body.language, identity.source === "development-header")).fingerprint !== context.fingerprint) throw new ConversationError("context_changed", 409);
        return json(response);
      }
      if (requests.size >= 256) {
        for (const [storedKey, entry] of requests) if (entry.expiresAt <= Date.now()) requests.delete(storedKey);
        if (requests.size >= 256) throw new ConversationError("temporarily_unavailable", 503);
      }
      const generate = async (): Promise<ConversationResponse> => {
        let reply: string;
        let practice: ConversationPractice | undefined;
        // Say where the waiting question is and when full help comes back.
        const waitingTitle = context.assessmentProtected ? context.protectingTopicTitle : undefined;
        const guidedRefusal = body.language === "fr"
          ? `${waitingTitle ? `Une question notée t'attend dans ta leçon « ${waitingTitle} ». ` : "Une question notée t'attend dans tes leçons. "}Pour que ta réponse reste la tienne, je ne peux pas donner ni valider de réponse à une activité évaluée, ni expliquer ce qui pourrait y répondre. Relis la consigne, réfléchis à la règle que tu as apprise, puis envoie ta réponse dans la leçon. Ensuite, je pourrai tout t'expliquer avec des exemples.`
          : `${waitingTitle ? `A scored question is waiting for you in your lesson “${waitingTitle}”. ` : "A scored question is waiting for you in your lessons. "}So that your answer stays your own, I cannot give or mark an answer to a scored activity, or explain anything that would answer it. Read the question again, think about the rule you learned, then send your answer in the lesson. After that, I can explain everything with examples.`;
        const concept = safety ? undefined : conceptualExplanation(body.question, body.language);
        if (safety) {
          reply = safetyReply(safety, body.language);
        } else if (context.assessmentProtected) {
          // Never pass learner prompts, transcript, assessment content, options,
          // answer keys or rubrics to a provider during a scored/uncertain activity.
          reply = concept && context.safeConceptualExplanations?.includes(concept.id) ? concept.reply : guidedRefusal;
        } else if (context.otherTopicsOpen && concept && !context.safeConceptualExplanations?.includes(concept.id)) {
          // The current topic is unprotected, but this built-in explanation could
          // answer a question still open in another topic.
          reply = guidedRefusal;
        } else {
          const controller = new AbortController();
          let timer: ReturnType<typeof setTimeout> | undefined;
          try {
            const turn = await Promise.race([
              deps.provider.respond({ question: body.question, language: body.language, history: envelope.messages, context: context.providerContext, practice: envelope.practice, signal: controller.signal }),
              new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error("timeout")); }, deps.providerTimeoutMs); }),
            ]);
            reply = typeof turn === "string" ? turn : turn.reply;
            practice = typeof turn === "string" ? undefined : turn.practice;
            if (typeof reply !== "string" || !reply.trim() || reply.length > 2000) throw new Error("invalid provider response");
          } catch { throw new ConversationError("provider_unavailable", 503); }
          finally { if (timer) clearTimeout(timer); }
        }
        // A lesson may have changed while the provider was waiting. Discard its
        // response rather than leaking old teaching into a newly scored activity.
        if (!safety) {
          const latest = await deps.context(identity.learnerId, body.language, identity.source === "development-header");
          if (latest.fingerprint !== context.fingerprint) throw new ConversationError("context_changed", 409);
        }
        const messages: ConversationMessage[] = [...envelope.messages,
          { role: "user" as const, text: safety ? privateQuestionLabel(body.language) : body.question, language: body.language },
          { role: "assistant" as const, text: reply, language: body.language },
        ].slice(-MAX_CONVERSATION_MESSAGES);
        while (messages.length > 2 && messages.reduce((sum, item) => sum + item.text.length, 0) > MAX_HISTORY_CHARS) messages.splice(0, 2);
        const next = { ...envelope, messages, contextKey, assessmentProtected: context.assessmentProtected, practice };
        return { messages, historyToken: sign(next), expiresAt: next.expiresAt, provider: deps.provider.id === "mock" ? "mock" : "curriculum", assessmentProtected: context.assessmentProtected, practiceActive: Boolean(practice) };
      };
      const promise = generate();
      requests.set(key, { fingerprint, context: context.fingerprint, expiresAt: envelope.expiresAt, promise });
      try { return json(await promise); }
      catch (error) { requests.delete(key); throw error; }
    } catch (error) {
      if (error instanceof ConversationError) return json({ code: error.code }, error.status);
      // Do not log prompts, tokens, context, provider errors or database errors.
      return json({ code: "temporarily_unavailable" }, 503);
    }
  };
}

/** Read-only UI metadata. No transcript, teaching text, assessment answer or learner identity. */
export async function getConversationContext(request: Request): Promise<Response> {
  try {
    let identity: RequestIdentity;
    try { identity = await resolveRequestIdentity(request); }
    catch { return json({ code: "unauthenticated" }, 401); }
    if (!identity.authenticated || !identity.learnerId) return json({ code: "unauthenticated" }, 401);
    const language = new URL(request.url).searchParams.get("language");
    if (language !== "en" && language !== "fr") return json({ code: "invalid_request" }, 400);
    const limited = await consumeRateLimit(`filu-context:${identity.learnerId}:${identity.principalId ?? ""}`, 60, 60000);
    if (!limited.allowed) return json({ code: "rate_limited" }, 429, { "Retry-After": String(limited.retryAfterSeconds) });
    let context: TrustedConversationContext;
    try { context = await loadConversationContext(identity.learnerId, language, identity.source === "development-header"); }
    catch { return json({ code: "context_unavailable" }, 409); }
    return json({ language, topicTitle: context.topicTitle, assessmentProtected: context.assessmentProtected, hasTeaching: context.providerContext.teaching.length > 0 });
  } catch { return json({ code: "temporarily_unavailable" }, 503); }
}
