/** Transport types contain no identity, assessment authority or mastery writes. */
export type ConversationLanguage = "en" | "fr";
export interface ConversationMessage {
  role: "user" | "assistant";
  text: string;
  language: ConversationLanguage;
}
export interface ConversationRequest {
  question: string;
  language: ConversationLanguage;
  requestId: string;
  historyToken?: string;
}
export interface ConversationResponse {
  messages: ConversationMessage[];
  historyToken: string;
  expiresAt: number;
  provider: "mock" | "curriculum";
  assessmentProtected: boolean;
  practiceActive?: boolean;
}
export interface ConversationContextResponse {
  language: ConversationLanguage;
  topicTitle?: string;
  assessmentProtected: boolean;
  hasTeaching: boolean;
}
export const CONVERSATION_TTL_MS = 30 * 60 * 1000;
export const MAX_CONVERSATION_MESSAGES = 20;
export const MAX_QUESTION_LENGTH = 1000;

/** A future provider only gets this projected context, never records or keys. */
export interface TutoringConversationContext {
  language?: ConversationLanguage;
  subjectId: string;
  competencyId: string;
  prerequisiteIds: string[];
  mastery: number;
  confidence: number;
  diagnosticState: string;
  difficulties: string[];
  recommendation: string;
  strategy?: string;
  activity?: { id: string; type: string };
  teachingSource?: { id: string; title: string };
  prerequisiteReadiness?: Record<string, string>;
  diagnosticHistory?: Array<{ state: string; confidence: number; difficulties: string[] }>;
  misconceptionHistory?: Array<{ state: string; confidence: number; difficulties: string[] }>;
  teaching: Array<{ type: string; text: string }>;
}
/** Ungraded chat practice, derived only from approved teaching; never an assessment. */
export interface ConversationPractice {
  language: ConversationLanguage;
  prompt: string;
  answer: string;
  explanation: string;
  attempts: number;
}
export interface ConversationTurn {
  reply: string;
  practice?: ConversationPractice;
}
export interface ConversationProvider {
  readonly id: string;
  respond(input: {
    question: string;
    language: ConversationLanguage;
    history: readonly ConversationMessage[];
    context: TutoringConversationContext;
    practice?: ConversationPractice;
    signal: AbortSignal;
  }): Promise<string | ConversationTurn>;
}

/** Scripted workflow double. No model, semantic understanding or network calls. */
export class MockConversationProvider implements ConversationProvider {
  readonly id = "mock" as const;
  async respond(input: Parameters<ConversationProvider["respond"]>[0]): Promise<string> {
    input.signal.throwIfAborted();
    const turns = input.history.filter((item) => item.role === "assistant").length;
    const teaching = input.context.teaching;
    const step = turns < teaching.length ? teaching[turns].text : "";
    const intro = input.language === "fr"
      ? turns ? "Continuons notre réflexion sur la leçon." : "Regardons ensemble cette partie de ta leçon."
      : turns ? "Let’s continue thinking about the lesson." : "Let’s look at this part of your lesson together.";
    const prompt = input.language === "fr"
      ? "Quelle étape voudrais-tu expliquer avec tes propres mots ? Ce prototype utilise des réponses préparées, pas une IA qui comprend ta question."
      : "Which step would you explain in your own words? This prototype uses prepared responses, not an AI that understands your question.";
    return [intro, step, prompt].filter(Boolean).join("\n\n").slice(0, 1800);
  }
}
